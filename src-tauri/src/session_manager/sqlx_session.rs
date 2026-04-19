use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use futures_util::future::BoxFuture;
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool, Row};
use grammers_session::{Session, SessionData};
use grammers_session::types::{
    ChannelKind, ChannelState, DcOption, PeerAuth, PeerId, PeerInfo, PeerKind, UpdateState,
    UpdatesState,
};

const VERSION: i32 = 1;

#[repr(u8)]
enum PeerSubtype {
    UserSelf = 1,
    UserBot = 2,
    UserSelfBot = 3,
    Megagroup = 4,
    Broadcast = 8,
    Gigagroup = 12,
}

struct Cache {
    pub home_dc: i32,
    pub dc_options: HashMap<i32, DcOption>,
}

pub struct SqlxSession {
    pool: SqlitePool,
    cache: Mutex<Cache>,
}

impl SqlxSession {
    pub async fn open<P: AsRef<Path>>(path: P) -> anyhow::Result<Self> {
        let path_str = path.as_ref().to_str().ok_or_else(|| anyhow::anyhow!("Invalid path"))?;
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&format!("sqlite:{}?mode=rwc", path_str))
            .await?;

        // Initialize schema
        sqlx::query("PRAGMA journal_mode = WAL").execute(&pool).await?;
        
        let user_version: i32 = sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&pool)
            .await?;

        if user_version == 0 {
            let mut tx = pool.begin().await?;
            sqlx::query("CREATE TABLE dc_home (dc_id INTEGER PRIMARY KEY)").execute(&mut *tx).await?;
            sqlx::query("CREATE TABLE dc_option (dc_id INTEGER PRIMARY KEY, ipv4 TEXT NOT NULL, ipv6 TEXT NOT NULL, auth_key BLOB)").execute(&mut *tx).await?;
            sqlx::query("CREATE TABLE peer_info (peer_id INTEGER PRIMARY KEY, hash INTEGER, subtype INTEGER)").execute(&mut *tx).await?;
            sqlx::query("CREATE TABLE update_state (pts INTEGER NOT NULL, qts INTEGER NOT NULL, date INTEGER NOT NULL, seq INTEGER NOT NULL)").execute(&mut *tx).await?;
            sqlx::query("CREATE TABLE channel_state (peer_id INTEGER PRIMARY KEY, pts INTEGER NOT NULL)").execute(&mut *tx).await?;
            sqlx::query(&format!("PRAGMA user_version = {}", VERSION)).execute(&mut *tx).await?;
            tx.commit().await?;
        }

        let home_dc = sqlx::query_scalar::<_, i32>("SELECT dc_id FROM dc_home LIMIT 1")
            .fetch_optional(&pool)
            .await?
            .unwrap_or_else(|| SessionData::default().home_dc);

        let dc_rows = sqlx::query("SELECT dc_id, ipv4, ipv6, auth_key FROM dc_option")
            .fetch_all(&pool)
            .await?;

        let mut dc_options = HashMap::new();
        for row in dc_rows {
            let id: i32 = row.get(0);
            let ipv4: String = row.get(1);
            let ipv6: String = row.get(2);
            let auth_key: Option<Vec<u8>> = row.get(3);
            
            dc_options.insert(id, DcOption {
                id,
                ipv4: ipv4.parse().unwrap(),
                ipv6: ipv6.parse().unwrap(),
                auth_key: auth_key.map(|k| k.try_into().unwrap()),
            });
        }

        Ok(Self {
            pool,
            cache: Mutex::new(Cache { home_dc, dc_options }),
        })
    }
}

impl Session for SqlxSession {
    fn home_dc_id(&self) -> i32 {
        self.cache.lock().unwrap().home_dc
    }

    fn set_home_dc_id(&self, dc_id: i32) -> BoxFuture<'_, ()> {
        self.cache.lock().unwrap().home_dc = dc_id;
        Box::pin(async move {
            let mut tx = self.pool.begin().await.unwrap();
            sqlx::query("DELETE FROM dc_home").execute(&mut *tx).await.unwrap();
            sqlx::query("INSERT INTO dc_home (dc_id) VALUES (?)").bind(dc_id).execute(&mut *tx).await.unwrap();
            tx.commit().await.unwrap();
        })
    }

    fn dc_option(&self, dc_id: i32) -> Option<DcOption> {
        self.cache.lock().unwrap().dc_options.get(&dc_id).cloned().or_else(|| {
            SessionData::default().dc_options.get(&dc_id).cloned()
        })
    }

    fn set_dc_option(&self, dc_option: &DcOption) -> BoxFuture<'_, ()> {
        self.cache.lock().unwrap().dc_options.insert(dc_option.id, dc_option.clone());
        let dc_option = dc_option.clone();
        Box::pin(async move {
            sqlx::query("INSERT OR REPLACE INTO dc_option (dc_id, ipv4, ipv6, auth_key) VALUES (?, ?, ?, ?)")
                .bind(dc_option.id)
                .bind(dc_option.ipv4.to_string())
                .bind(dc_option.ipv6.to_string())
                .bind(dc_option.auth_key.map(|k| k.to_vec()))
                .execute(&self.pool)
                .await
                .unwrap();
        })
    }

    fn peer(&self, peer: PeerId) -> BoxFuture<'_, Option<PeerInfo>> {
        Box::pin(async move {
            let row = if peer.kind() == PeerKind::UserSelf {
                sqlx::query("SELECT peer_id, hash, subtype FROM peer_info WHERE subtype & ? LIMIT 1")
                    .bind(PeerSubtype::UserSelf as i64)
                    .fetch_optional(&self.pool)
                    .await
                    .unwrap()
            } else {
                sqlx::query("SELECT peer_id, hash, subtype FROM peer_info WHERE peer_id = ? LIMIT 1")
                    .bind(peer.bot_api_dialog_id())
                    .fetch_optional(&self.pool)
                    .await
                    .unwrap()
            };

            row.map(|r| {
                let pid: i64 = r.get(0);
                let hash: Option<i64> = r.get(1);
                let subtype = r.get::<Option<i64>, _>(2).map(|s| s as u8);
                
                match peer.kind() {
                    PeerKind::User | PeerKind::UserSelf => PeerInfo::User {
                        id: PeerId::user_unchecked(pid).bare_id(),
                        auth: hash.map(PeerAuth::from_hash),
                        bot: subtype.map(|s| s & PeerSubtype::UserBot as u8 != 0),
                        is_self: subtype.map(|s| s & PeerSubtype::UserSelf as u8 != 0),
                    },
                    PeerKind::Chat => PeerInfo::Chat { id: peer.bare_id() },
                    PeerKind::Channel => PeerInfo::Channel {
                        id: peer.bare_id(),
                        auth: hash.map(PeerAuth::from_hash),
                        kind: subtype.and_then(|s| {
                            if (s & PeerSubtype::Gigagroup as u8) == PeerSubtype::Gigagroup as u8 {
                                Some(ChannelKind::Gigagroup)
                            } else if s & PeerSubtype::Broadcast as u8 != 0 {
                                Some(ChannelKind::Broadcast)
                            } else if s & PeerSubtype::Megagroup as u8 != 0 {
                                Some(ChannelKind::Megagroup)
                            } else {
                                None
                            }
                        }),
                    },
                }
            })
        })
    }

    fn cache_peer(&self, peer: &PeerInfo) -> BoxFuture<'_, ()> {
        let peer = peer.clone();
        Box::pin(async move {
            let subtype = match peer {
                PeerInfo::User { bot, is_self, .. } => {
                    match (bot.unwrap_or_default(), is_self.unwrap_or_default()) {
                        (true, true) => Some(PeerSubtype::UserSelfBot),
                        (true, false) => Some(PeerSubtype::UserBot),
                        (false, true) => Some(PeerSubtype::UserSelf),
                        (false, false) => None,
                    }
                }
                PeerInfo::Chat { .. } => None,
                PeerInfo::Channel { kind, .. } => kind.map(|k| match k {
                    ChannelKind::Megagroup => PeerSubtype::Megagroup,
                    ChannelKind::Broadcast => PeerSubtype::Broadcast,
                    ChannelKind::Gigagroup => PeerSubtype::Gigagroup,
                }),
            };
            
            let peer_id = peer.id().bot_api_dialog_id();
            let hash = peer.auth().map(|a| a.hash());
            let subtype_val = subtype.map(|s| s as i64);

            sqlx::query("INSERT OR REPLACE INTO peer_info (peer_id, hash, subtype) VALUES (?, ?, ?)")
                .bind(peer_id)
                .bind(hash)
                .bind(subtype_val)
                .execute(&self.pool)
                .await
                .unwrap();
        })
    }

    fn updates_state(&self) -> BoxFuture<'_, UpdatesState> {
        Box::pin(async move {
            let state_row = sqlx::query("SELECT pts, qts, date, seq FROM update_state LIMIT 1")
                .fetch_optional(&self.pool)
                .await
                .unwrap();
            
            let mut state = state_row.map(|r| UpdatesState {
                pts: r.get(0),
                qts: r.get(1),
                date: r.get(2),
                seq: r.get(3),
                channels: Vec::new(),
            }).unwrap_or_default();

            let channels = sqlx::query("SELECT peer_id, pts FROM channel_state")
                .fetch_all(&self.pool)
                .await
                .unwrap();
            
            state.channels = channels.into_iter().map(|r| ChannelState {
                id: r.get(0),
                pts: r.get(1),
            }).collect();

            state
        })
    }

    fn set_update_state(&self, update: UpdateState) -> BoxFuture<'_, ()> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.unwrap();
            match update {
                UpdateState::All(s) => {
                    sqlx::query("DELETE FROM update_state").execute(&mut *tx).await.unwrap();
                    sqlx::query("INSERT INTO update_state (pts, qts, date, seq) VALUES (?, ?, ?, ?)")
                        .bind(s.pts).bind(s.qts).bind(s.date).bind(s.seq)
                        .execute(&mut *tx).await.unwrap();
                    
                    sqlx::query("DELETE FROM channel_state").execute(&mut *tx).await.unwrap();
                    for c in s.channels {
                        sqlx::query("INSERT INTO channel_state (peer_id, pts) VALUES (?, ?)")
                            .bind(c.id).bind(c.pts)
                            .execute(&mut *tx).await.unwrap();
                    }
                }
                UpdateState::Primary { pts, date, seq } => {
                    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM update_state)")
                        .fetch_one(&mut *tx).await.unwrap();
                    if exists {
                        sqlx::query("UPDATE update_state SET pts = ?, date = ?, seq = ?")
                            .bind(pts).bind(date).bind(seq)
                            .execute(&mut *tx).await.unwrap();
                    } else {
                        sqlx::query("INSERT INTO update_state (pts, qts, date, seq) VALUES (?, 0, ?, ?)")
                            .bind(pts).bind(date).bind(seq)
                            .execute(&mut *tx).await.unwrap();
                    }
                }
                UpdateState::Secondary { qts } => {
                   let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM update_state)")
                        .fetch_one(&mut *tx).await.unwrap();
                    if exists {
                        sqlx::query("UPDATE update_state SET qts = ?")
                            .bind(qts).execute(&mut *tx).await.unwrap();
                    } else {
                        sqlx::query("INSERT INTO update_state (pts, qts, date, seq) VALUES (0, ?, 0, 0)")
                            .bind(qts).execute(&mut *tx).await.unwrap();
                    }
                }
                UpdateState::Channel { id, pts } => {
                    sqlx::query("INSERT OR REPLACE INTO channel_state (peer_id, pts) VALUES (?, ?)")
                        .bind(id).bind(pts).execute(&mut *tx).await.unwrap();
                }
            }
            tx.commit().await.unwrap();
        })
    }
}
