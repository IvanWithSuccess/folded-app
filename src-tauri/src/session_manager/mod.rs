use grammers_client::{Client, SignInError, client::LoginToken, peer::User};
use grammers_session::storages::MemorySession;
use grammers_session::Session;
use grammers_session::types::{PeerId, UpdateState};
mod sqlx_session;
use sqlx_session::SqlxSession;
use grammers_client::sender::SenderPool;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, anyhow};
use std::path::PathBuf;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use grammers_tl_types as tl;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TelegramAccount {
    pub id: String,
    pub phone: String,
    pub name: String,
    pub username: Option<String>,
    pub is_active: bool,
    pub last_indexed_at: Option<i64>,
    pub used_bytes: u64,
}

pub struct PendingAuth {
    pub client: Client,
    pub session: Arc<MemorySession>,
    pub phone: String,
    pub token: LoginToken,
}

pub struct PendingPasswordAuth {
    pub client: Client,
    pub session: Arc<MemorySession>,
    pub phone: String,
    pub token: grammers_client::client::PasswordToken,
}

pub struct PendingQRAuth {
    pub client: Client,
    pub session: Arc<MemorySession>,
    pub token: Vec<u8>,
    pub expires: std::time::Instant,
}

pub struct ActiveSession {
    pub client: Client,
    pub account_info: TelegramAccount,
}

#[derive(Serialize, Deserialize)]
pub enum AuthResponse {
    CodeSent,
    QRReady { uri: String },
    PasswordRequired,
    Success(TelegramAccount),
    Error(String),
}

pub struct SessionManager {
    active_sessions: Arc<Mutex<Vec<ActiveSession>>>,
    pending_auths: Arc<Mutex<Vec<PendingAuth>>>,
    pending_qr: Arc<Mutex<Option<PendingQRAuth>>>,
    pending_passwords: Arc<Mutex<Vec<PendingPasswordAuth>>>,
    storage_path: PathBuf,
    api_id: i32,
    api_hash: String,
}

impl std::fmt::Debug for SessionManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SessionManager").finish()
    }
}

impl SessionManager {
    pub fn new(storage_path: PathBuf, api_id: i32, api_hash: String) -> Self {
        let _ = std::fs::create_dir_all(&storage_path);
        
        Self {
            active_sessions: Arc::new(Mutex::new(Vec::new())),
            pending_auths: Arc::new(Mutex::new(Vec::new())),
            pending_qr: Arc::new(Mutex::new(None)),
            pending_passwords: Arc::new(Mutex::new(Vec::new())),
            storage_path,
            api_id,
            api_hash,
        }
    }

    fn save_accounts_metadata(&self, accounts: &[TelegramAccount]) -> Result<()> {
        let path = self.storage_path.join("accounts.json");
        let json = serde_json::to_string(accounts)?;
        std::fs::write(path, json)?;
        Ok(())
    }

    fn load_accounts_metadata(&self) -> Vec<TelegramAccount> {
        let path = self.storage_path.join("accounts.json");
        if let Ok(data) = std::fs::read_to_string(path) {
            if let Ok(accounts) = serde_json::from_str::<Vec<TelegramAccount>>(&data) {
                return accounts;
            }
        }
        Vec::new()
    }

    /// Loads saved sessions. Returns a list of dead account IDs (missing session files or expired).
    /// Dead accounts are automatically removed from accounts.json.
    pub async fn load_sessions(&self) -> Result<Vec<String>> {
        let accounts = self.load_accounts_metadata();
        log::info!("Found {} accounts in metadata", accounts.len());
        let mut active = self.active_sessions.lock().await;
        let mut dead_account_ids: Vec<String> = Vec::new();

        for acc in &accounts {
            let session_path = self.storage_path.join(format!("{}.session", acc.id));
            log::info!("Checking session file for account {}: {:?}", acc.id, session_path);
            if !session_path.exists() {
                log::warn!("Session file not found for account {} — marking as dead", acc.id);
                dead_account_ids.push(acc.id.clone());
                continue;
            }

            let session = match SqlxSession::open(&session_path).await {
                Ok(s) => Arc::new(s),
                Err(e) => {
                    log::warn!("Failed to open session DB for account {}: {} — marking as dead", acc.id, e);
                    dead_account_ids.push(acc.id.clone());
                    continue;
                }
            };
            log::info!("Successfully opened SqlxSession for account {}", acc.id);
            
            let SenderPool { runner, handle, .. } = SenderPool::new(Arc::clone(&session) as Arc<_>, self.api_id);
            let client = Client::new(handle);
            tokio::spawn(runner.run());

            // Check if the session is still valid
            match client.get_me().await {
                Ok(_user) => {
                    log::info!("Session for account {} is valid", acc.id);
                    active.push(ActiveSession {
                        client,
                        account_info: acc.clone(),
                    });
                }
                Err(e) => {
                    log::warn!("Session for account {} expired or invalid: {} — marking as dead", acc.id, e);
                    dead_account_ids.push(acc.id.clone());
                    client.disconnect();
                    // Remove the broken session file
                    let _ = std::fs::remove_file(&session_path);
                }
            }
        }

        // Clean up accounts.json — remove all dead entries
        if !dead_account_ids.is_empty() {
            let surviving: Vec<TelegramAccount> = accounts.into_iter()
                .filter(|a| !dead_account_ids.contains(&a.id))
                .collect();
            log::info!("Cleaning accounts.json: removed {} dead entries, {} remaining", dead_account_ids.len(), surviving.len());
            let _ = self.save_accounts_metadata(&surviving);
        }

        Ok(dead_account_ids)
    }

    pub async fn get_active_accounts(&self) -> Vec<TelegramAccount> {
        let active = self.active_sessions.lock().await;
        active.iter().map(|s| s.account_info.clone()).collect()
    }

    pub async fn update_account_last_indexed(&self, account_id: &str, timestamp: i64) -> Result<()> {
        let mut active = self.active_sessions.lock().await;
        if let Some(session) = active.iter_mut().find(|s| s.account_info.id == account_id) {
            session.account_info.last_indexed_at = Some(timestamp);
            
            // Persist to accounts.json
            let accounts = self.load_accounts_metadata();
            let mut updated = accounts;
            if let Some(acc) = updated.iter_mut().find(|a| a.id == account_id) {
                acc.last_indexed_at = Some(timestamp);
                self.save_accounts_metadata(&updated)?;
            }
        }
        Ok(())
    }

    pub async fn get_client_by_id(&self, account_id: &str) -> Option<Client> {
        let active = self.active_sessions.lock().await;
        active.iter().find(|s| s.account_info.id == account_id).map(|s| s.client.clone())
    }

    pub async fn request_login_code(&self, phone: &str) -> Result<AuthResponse> {
        let session = Arc::new(MemorySession::default());
        
        let SenderPool { runner, handle, .. } = SenderPool::new(Arc::clone(&session) as Arc<_>, self.api_id);
        let client = Client::new(handle);
        tokio::spawn(runner.run());

        let token = client.request_login_code(phone, &self.api_hash).await?;
        
        let mut pending = self.pending_auths.lock().await;
        pending.push(PendingAuth {
            client,
            session,
            phone: phone.to_string(),
            token,
        });

        Ok(AuthResponse::CodeSent)
    }

    pub async fn verify_login_code(&self, phone: &str, code: &str) -> Result<AuthResponse> {
        let mut pending = self.pending_auths.lock().await;
        let idx = pending.iter().position(|p| p.phone == phone)
            .ok_or_else(|| anyhow!("No pending auth for this phone"))?;
        
        let auth = pending.remove(idx);
        match auth.client.sign_in(&auth.token, code).await {
            Ok(user) => {
                let account = self.register_active_session(auth.client, auth.session, user, phone).await?;
                Ok(AuthResponse::Success(account))
            }
            Err(SignInError::PasswordRequired(password_token)) => {
                let mut passwords = self.pending_passwords.lock().await;
                passwords.push(PendingPasswordAuth {
                    client: auth.client,
                    session: auth.session,
                    phone: phone.to_string(),
                    token: password_token,
                });
                Ok(AuthResponse::PasswordRequired)
            }
            Err(e) => Ok(AuthResponse::Error(e.to_string())),
        }
    }

    pub async fn verify_password(&self, phone: &str, password: &str) -> Result<AuthResponse> {
        let mut pending = self.pending_passwords.lock().await;
        let idx = pending.iter().position(|p| p.phone == phone)
            .ok_or_else(|| anyhow!("No pending password auth for this phone"))?;
        
        let auth = pending.remove(idx);
        
        match auth.client.check_password(auth.token, password).await {
            Ok(user) => {
                let account = self.register_active_session(auth.client, auth.session, user, phone).await?;
                Ok(AuthResponse::Success(account))
            }
            Err(e) => {
                // Try to put it back so the user can re-enter password
                if let Ok(new_password) = auth.client.invoke(&tl::functions::account::GetPassword {}).await {
                    let pw: tl::types::account::Password = new_password.into();
                    pending.push(PendingPasswordAuth {
                        client: auth.client,
                        session: auth.session,
                        phone: phone.to_string(),
                        token: grammers_client::client::PasswordToken::new(pw),
                    });
                }
                Ok(AuthResponse::Error(e.to_string()))
            }
        }
    }

    pub async fn request_qr_login(&self) -> Result<AuthResponse> {
        let session = Arc::new(MemorySession::default());
        
        let SenderPool { runner, handle, .. } = SenderPool::new(Arc::clone(&session) as Arc<_>, self.api_id);
        let client = Client::new(handle);
        tokio::spawn(runner.run());

        let login_token = client.invoke(&tl::functions::auth::ExportLoginToken {
            api_id: self.api_id,
            api_hash: self.api_hash.clone(),
            except_ids: Vec::new(),
        }).await?;

        if let tl::enums::auth::LoginToken::Token(token_data) = login_token {
            let base64_token = URL_SAFE_NO_PAD.encode(&token_data.token);
            let uri = format!("tg://login?token={}", base64_token);
            
            let mut qr_slot = self.pending_qr.lock().await;
            *qr_slot = Some(PendingQRAuth {
                client,
                session,
                token: token_data.token,
                expires: std::time::Instant::now() + std::time::Duration::from_secs(token_data.expires as u64),
            });

            Ok(AuthResponse::QRReady { uri })
        } else {
            Err(anyhow!("Failed to export login token"))
        }
    }

    pub async fn poll_qr_login(&self) -> Result<AuthResponse> {
        let mut qr_slot = self.pending_qr.lock().await;
        let qr = qr_slot.as_mut().ok_or_else(|| anyhow!("No pending QR auth"))?;

        if std::time::Instant::now() > qr.expires {
            return Ok(AuthResponse::Error("QR code expired".into()));
        }

        let auth_result = qr.client.invoke(&tl::functions::auth::ImportLoginToken {
            token: qr.token.clone(),
        }).await;

        match auth_result {
            Ok(tl::enums::auth::LoginToken::Success(_)) => {
                let user = qr.client.get_me().await?;
                let account = self.register_active_session(qr.client.clone(), qr.session.clone(), user, "QR Login").await?;
                *qr_slot = None;
                Ok(AuthResponse::Success(account))
            }
            Ok(tl::enums::auth::LoginToken::Token(_)) => {
                Ok(AuthResponse::CodeSent) // Still waiting
            }
            Ok(tl::enums::auth::LoginToken::MigrateTo(migrate)) => {
                Ok(AuthResponse::Error(format!("Migration required to DC {}", migrate.dc_id)))
            }
            Err(grammers_client::InvocationError::Rpc(rpc)) if rpc.name == "SESSION_PASSWORD_NEEDED" => {
                let password_resp = qr.client.invoke(&tl::functions::account::GetPassword {}).await?;
                let pw: tl::types::account::Password = password_resp.into();
                let password_token = grammers_client::client::PasswordToken::new(pw);
                
                let mut passwords = self.pending_passwords.lock().await;
                passwords.push(PendingPasswordAuth {
                    client: qr.client.clone(),
                    session: qr.session.clone(),
                    phone: "QR Login".to_string(),
                    token: password_token,
                });
                
                *qr_slot = None;
                Ok(AuthResponse::PasswordRequired)
            }
            Err(e) => {
                Err(e.into())
            }
        }
    }

    pub async fn logout_account(&self, account_id: &str) -> Result<()> {
        let mut active = self.active_sessions.lock().await;
        if let Some(idx) = active.iter().position(|s| s.account_info.id == account_id) {
            let session = active.remove(idx);
            let _ = session.client.invoke(&tl::functions::auth::LogOut {}).await;
            session.client.disconnect();
            // Also delete session file
            let path = self.storage_path.join(format!("{}.session", account_id));
            let _ = std::fs::remove_file(path);
        }
        Ok(())
    }

    async fn register_active_session(&self, old_client: Client, old_session: Arc<MemorySession>, user: User, phone: &str) -> Result<TelegramAccount> {
        let account_id = user.id().to_string();
        let account = TelegramAccount {
            id: account_id.clone(),
            phone: phone.to_string(),
            name: user.first_name().unwrap_or("").to_string(),
            username: user.username().map(|s| s.to_string()),
            is_active: true,
            last_indexed_at: None,
            used_bytes: 0,
        };

        // Create permanent session
        let permanent_path = self.storage_path.join(format!("{}.session", account_id));
        let permanent_session = Arc::new(SqlxSession::open(&permanent_path).await?);
        
        // Migrate data from memory session to SQLx session
        let home_dc = old_session.home_dc_id();
        let updates = old_session.updates_state().await;
        
        permanent_session.set_home_dc_id(home_dc).await;
        permanent_session.set_update_state(UpdateState::All(updates)).await;
        
        // Migrate DC options (important for auth keys)
        for dc_id in 1..=10 { // Checks more DCs just in case
            if let Some(opt) = old_session.dc_option(dc_id) {
                permanent_session.set_dc_option(&opt).await;
            }
        }
        
        // Migrate Self peer info
        if let Some(me) = old_session.peer(PeerId::self_user()).await {
            permanent_session.cache_peer(&me).await;
        }

        // Create new client with permanent session
        let SenderPool { runner, handle, .. } = SenderPool::new(Arc::clone(&permanent_session) as Arc<_>, self.api_id);
        let client = Client::new(handle);
        tokio::spawn(runner.run());

        let mut active = self.active_sessions.lock().await;
        active.push(ActiveSession {
            client,
            account_info: account.clone(),
        });

        // Persist account list
        let mut all_accounts = self.load_accounts_metadata();
        if !all_accounts.iter().any(|a| a.id == account.id) {
            all_accounts.push(account.clone());
            self.save_accounts_metadata(&all_accounts)?;
        }

        // Shutdown old client
        old_client.disconnect();

        Ok(account)
    }

}
