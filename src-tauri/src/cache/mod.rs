use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use sqlx::{Pool, Sqlite, Row};
use anyhow::Result;
use crate::cluster::FileManifest;
use std::str::FromStr;
use serde::{Serialize, Deserialize};

pub struct MetadataCache {
    pool: Pool<Sqlite>,
}

impl std::fmt::Debug for MetadataCache {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MetadataCache").finish()
    }
}

impl MetadataCache {
    pub async fn new(db_path: &str) -> Result<Self> {
        let opts = SqliteConnectOptions::from_str(&format!("sqlite:{}", db_path))?
            .create_if_missing(true);
        let pool = SqlitePool::connect_with(opts).await?;
        
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id TEXT,
                account_id TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(parent_id) REFERENCES folders(id)
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                size INTEGER NOT NULL,
                chunk_size INTEGER NOT NULL,
                folder_id TEXT,
                account_id TEXT,
                storage_hub_id INTEGER, -- Chat ID of the channel/saved messages
                storage_hub_access_hash INTEGER, -- Access hash required for private channels
                is_external BOOLEAN DEFAULT FALSE,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(folder_id) REFERENCES folders(id)
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS chunks (
                file_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                message_id INTEGER NOT NULL,
                part_index INTEGER NOT NULL,
                FOREIGN KEY(file_id) REFERENCES files(id)
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                peer_id INTEGER NOT NULL,
                message_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                from_self INTEGER DEFAULT 1,
                sender_name TEXT,
                attachment_ids TEXT
            )"
        ).execute(&pool).await?;

        // MIGRATION: Ensure sender_name exists if the table was created previously
        let _ = sqlx::query("ALTER TABLE notes ADD COLUMN sender_name TEXT")
            .execute(&pool).await;


        sqlx::query(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS account_sync_state (
                account_id TEXT PRIMARY KEY,
                last_forward_id INTEGER,
                last_backward_id INTEGER,
                last_indexed_at INTEGER
            )"
        ).execute(&pool).await?;

        // Add performance indices
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_chunks_msg ON chunks(message_id)").execute(&pool).await;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_msg ON notes(message_id)").execute(&pool).await;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_files_acc ON files(account_id)").execute(&pool).await;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_acc ON notes(account_id)").execute(&pool).await;

        let cache = Self { pool };
        cache.run_migrations().await?;
        Ok(cache)
    }

    async fn run_migrations(&self) -> Result<()> {
        // Files table additions
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN folder_id TEXT").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN account_id TEXT").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN storage_hub_id INTEGER").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN storage_hub_access_hash INTEGER").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN is_external BOOLEAN DEFAULT FALSE").execute(&self.pool).await;
        
        // Folders table additions
        let _ = sqlx::query("ALTER TABLE folders ADD COLUMN account_id TEXT").execute(&self.pool).await;

        // Notes table additions
        let _ = sqlx::query("ALTER TABLE notes ADD COLUMN attachment_ids TEXT").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE notes ADD COLUMN peer_id INTEGER").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE notes ADD COLUMN from_self INTEGER DEFAULT 1").execute(&self.pool).await;
        
        Ok(())
    }

    pub async fn save_file(&self, file: FileManifest) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        
        sqlx::query("INSERT INTO files (id, name, size, chunk_size, folder_id, account_id, storage_hub_id, storage_hub_access_hash, is_external, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&file.id)
            .bind(&file.name)
            .bind(file.total_size as i64)
            .bind(file.chunk_size as i64)
            .bind(&file.folder_id)
            .bind(&file.account_id)
            .bind(file.storage_hub_id)
            .bind(file.storage_hub_access_hash)
            .bind(file.is_external)
            .bind(file.created_at)
            .execute(&mut *tx).await?;

        for chunk in &file.chunks {
            sqlx::query("INSERT INTO chunks (file_id, account_id, message_id, part_index) VALUES (?, ?, ?, ?)")
                .bind(&file.id)
                .bind(&chunk.account_id)
                .bind(chunk.message_id)
                .bind(chunk.part_index as i64)
                .execute(&mut *tx).await?;
        }
        
        tx.commit().await?;
        Ok(())
    }

    pub async fn get_total_used_bytes(&self, account_id: &str) -> Result<u64> {
        let row: (i64,) = sqlx::query_as("SELECT COALESCE(SUM(size), 0) FROM files WHERE account_id = ?")
            .bind(account_id)
            .fetch_one(&self.pool).await?;
        Ok(row.0 as u64)
    }

    pub async fn get_files(&self) -> Result<Vec<FileManifest>> {
        
        let files_rows = sqlx::query("SELECT * FROM files").fetch_all(&self.pool).await?;
        let mut files = Vec::new();

        for row in files_rows {
            let file_id: String = row.get("id");
            let name: String = row.get("name");
            let total_size: i64 = row.get("size");
            let chunk_size: i64 = row.get("chunk_size");
            let created_at: i64 = row.get("created_at");

            let chunk_rows = sqlx::query("SELECT * FROM chunks WHERE file_id = ? ORDER BY part_index ASC")
                .bind(&file_id)
                .fetch_all(&self.pool).await?;

            let mut chunks = Vec::new();
            for c_row in chunk_rows {
                let account_id: String = c_row.get("account_id");
                let message_id: i64 = c_row.get("message_id");
                let part_index: i64 = c_row.get("part_index");

                chunks.push(crate::cluster::ChunkMeta {
                    account_id,
                    message_id,
                    part_index: part_index as usize,
                });
            }

            let folder_id: Option<String> = row.get("folder_id");
            let account_id: Option<String> = row.get("account_id");
            let storage_hub_id: Option<i64> = row.get("storage_hub_id");
            let storage_hub_access_hash: Option<i64> = row.get("storage_hub_access_hash");
            let is_external: bool = row.get("is_external");

            files.push(FileManifest {
                id: file_id,
                name,
                total_size: total_size as u64,
                chunk_size: chunk_size as u64,
                folder_id,
                account_id,
                storage_hub_id,
                storage_hub_access_hash,
                is_external,
                created_at,
                chunks,
            });
        }

        Ok(files)
    }

    pub async fn get_file_by_name(&self, name: &str) -> Result<Option<FileManifest>> {
        use sqlx::Row;
        
        // 1. Try exact match first (standard case-sensitive or whatever DB defaults to)
        let mut row_opt = sqlx::query("SELECT * FROM files WHERE name = ?")
            .bind(name)
            .fetch_optional(&self.pool).await?;
            
        // 2. Fallback: Case-insensitive match (crucial for macOS/Windows behavior)
        if row_opt.is_none() {
            row_opt = sqlx::query("SELECT * FROM files WHERE name = ? COLLATE NOCASE")
                .bind(name)
                .fetch_optional(&self.pool).await?;
        }

        // 3. Fallback: Pattern matching (can help with some normalization/encoding quirks)
        if row_opt.is_none() {
            row_opt = sqlx::query("SELECT * FROM files WHERE name LIKE ?")
                .bind(name)
                .fetch_optional(&self.pool).await?;
        }

        let row = match row_opt {
            Some(r) => r,
            None => return Ok(None),
        };

        let file_id: String = row.get("id");
        let name: String = row.get("name");
        let total_size: i64 = row.get("size");
        let chunk_size: i64 = row.get("chunk_size");
        let created_at: i64 = row.get("created_at");

        let chunk_rows = sqlx::query("SELECT * FROM chunks WHERE file_id = ? ORDER BY part_index ASC")
            .bind(&file_id)
            .fetch_all(&self.pool).await?;

        let mut chunks = Vec::new();
        for c_row in chunk_rows {
            let account_id: String = c_row.get("account_id");
            let message_id: i64 = c_row.get("message_id");
            let part_index: i64 = c_row.get("part_index");

            chunks.push(crate::cluster::ChunkMeta {
                account_id,
                message_id,
                part_index: part_index as usize,
            });
        }

        let folder_id: Option<String> = row.get("folder_id");
        let account_id: Option<String> = row.get("account_id");
        let storage_hub_id: Option<i64> = row.get("storage_hub_id");
        let storage_hub_access_hash: Option<i64> = row.get("storage_hub_access_hash");
        let is_external: bool = row.get("is_external");

        Ok(Some(FileManifest {
            id: file_id,
            name,
            total_size: total_size as u64,
            chunk_size: chunk_size as u64,
            folder_id,
            account_id,
            storage_hub_id,
            storage_hub_access_hash,
            is_external,
            created_at,
            chunks,
        }))
    }

    pub async fn get_file_by_id(&self, id: &str) -> Result<Option<FileManifest>> {
        use sqlx::Row;
        
        let row_opt = sqlx::query("SELECT * FROM files WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool).await?;
            
        let row = match row_opt {
            Some(r) => r,
            None => return Ok(None),
        };

        let file_id: String = row.get("id");
        let name: String = row.get("name");
        let total_size: i64 = row.get("size");
        let chunk_size: i64 = row.get("chunk_size");
        let created_at: i64 = row.get("created_at");

        let chunk_rows = sqlx::query("SELECT * FROM chunks WHERE file_id = ? ORDER BY part_index ASC")
            .bind(&file_id)
            .fetch_all(&self.pool).await?;

        let mut chunks = Vec::new();
        for c_row in chunk_rows {
            let account_id: String = c_row.get("account_id");
            let message_id: i64 = c_row.get("message_id");
            let part_index: i64 = c_row.get("part_index");

            chunks.push(crate::cluster::ChunkMeta {
                account_id,
                message_id,
                part_index: part_index as usize,
            });
        }

        let folder_id: Option<String> = row.get("folder_id");
        let account_id: Option<String> = row.get("account_id");
        let storage_hub_id: Option<i64> = row.get("storage_hub_id");
        let storage_hub_access_hash: Option<i64> = row.get("storage_hub_access_hash");
        let is_external: bool = row.get("is_external");

        Ok(Some(FileManifest {
            id: file_id,
            name,
            total_size: total_size as u64,
            chunk_size: chunk_size as u64,
            folder_id,
            account_id,
            storage_hub_id,
            storage_hub_access_hash,
            is_external,
            created_at,
            chunks,
        }))
    }

    pub async fn delete_file(&self, file_id: &str) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        
        // Delete all chunks associated with the file first
        sqlx::query("DELETE FROM chunks WHERE file_id = ?")
            .bind(file_id)
            .execute(&mut *tx).await?;

        // Delete the file metadata
        sqlx::query("DELETE FROM files WHERE id = ?")
            .bind(file_id)
            .execute(&mut *tx).await?;

        tx.commit().await?;
        Ok(())
    }

    // --- Folder Support ---

    pub async fn create_folder(&self, name: String, parent_id: Option<String>, account_id: Option<String>) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().timestamp();

        sqlx::query("INSERT INTO folders (id, name, parent_id, account_id, created_at) VALUES (?, ?, ?, ?, ?)")
            .bind(&id)
            .bind(name)
            .bind(parent_id)
            .bind(account_id)
            .bind(created_at)
            .execute(&self.pool).await?;

        Ok(id)
    }

    pub async fn get_folders_in(&self, parent_id: Option<String>, account_id: Option<String>) -> Result<Vec<FolderInfo>> {
        use sqlx::Row;
        
        let query = match (&parent_id, &account_id) {
            (None, None) => "SELECT * FROM folders WHERE parent_id IS NULL",
            (None, Some(_)) => "SELECT * FROM folders WHERE parent_id IS NULL AND account_id = ?",
            (Some(_), _) => "SELECT * FROM folders WHERE parent_id = ?",
        };

        let mut q = sqlx::query(query);
        if let Some(pid) = &parent_id {
            q = q.bind(pid);
        } else if let Some(aid) = &account_id {
            q = q.bind(aid);
        }

        let rows = q.fetch_all(&self.pool).await?;
        let folders = rows.into_iter().map(|r| FolderInfo {
            id: r.get("id"),
            name: r.get("name"),
            parent_id: r.get("parent_id"),
            account_id: r.get("account_id"),
            created_at: r.get("created_at"),
        }).collect();

        Ok(folders)
    }

    pub async fn get_files_in(&self, folder_id: Option<String>, account_id: Option<String>) -> Result<Vec<FileManifest>> {
        use sqlx::Row;
        
        let query = match (&folder_id, &account_id) {
            (None, None) => "SELECT id FROM files WHERE folder_id IS NULL",
            (None, Some(_)) => "SELECT id FROM files WHERE folder_id IS NULL AND account_id = ?",
            (Some(_), _) => "SELECT id FROM files WHERE folder_id = ?",
        };

        let mut q = sqlx::query(query);
        if let Some(fid) = &folder_id {
            q = q.bind(fid);
        } else if let Some(aid) = &account_id {
            q = q.bind(aid);
        }

        let ids: Vec<String> = q.fetch_all(&self.pool).await?.into_iter().map(|r| r.get(0)).collect();
        let mut files = Vec::new();
        for id in ids {
            if let Some(f) = self.get_file_by_id(&id).await? {
                files.push(f);
            }
        }
        Ok(files)
    }
    pub fn get_pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }

    // --- Recursive folder deletion ---
    pub async fn delete_folder_recursive(&self, folder_id: &str) -> Result<Vec<String>> {
        // Collect all descendant folder IDs (BFS)
        let mut all_folder_ids = vec![folder_id.to_string()];
        let mut queue = vec![folder_id.to_string()];

        while let Some(current_id) = queue.pop() {
            let children = self.get_folders_in(Some(current_id), None).await?;
            for child in children {
                all_folder_ids.push(child.id.clone());
                queue.push(child.id);
            }
        }

        // Collect ALL file IDs inside these folders (for Telegram deletion later)
        let mut all_file_ids = Vec::new();
        for fid in &all_folder_ids {
            let files = self.get_files_in(Some(fid.clone()), None).await?;
            for f in files {
                all_file_ids.push(f.id);
            }
        }

        let mut tx = self.pool.begin().await?;

        // Delete chunks for all files in these folders
        for file_id in &all_file_ids {
            sqlx::query("DELETE FROM chunks WHERE file_id = ?")
                .bind(file_id)
                .execute(&mut *tx).await?;
        }

        // Delete files in these folders
        for fid in &all_folder_ids {
            sqlx::query("DELETE FROM files WHERE folder_id = ?")
                .bind(fid)
                .execute(&mut *tx).await?;
        }

        // Delete folders (children first, then parents)
        for fid in all_folder_ids.iter().rev() {
            sqlx::query("DELETE FROM folders WHERE id = ?")
                .bind(fid)
                .execute(&mut *tx).await?;
        }

        tx.commit().await?;
        Ok(all_file_ids)
    }

    pub async fn rename_folder(&self, folder_id: &str, new_name: &str) -> Result<()> {
        sqlx::query("UPDATE folders SET name = ? WHERE id = ?")
            .bind(new_name)
            .bind(folder_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn rename_file(&self, file_id: &str, new_name: &str) -> Result<()> {
        sqlx::query("UPDATE files SET name = ? WHERE id = ?")
            .bind(new_name)
            .bind(file_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn move_folder(&self, folder_id: &str, new_parent_id: Option<String>) -> Result<()> {
        sqlx::query("UPDATE folders SET parent_id = ? WHERE id = ?")
            .bind(&new_parent_id)
            .bind(folder_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn move_file(&self, file_id: &str, new_folder_id: Option<String>) -> Result<()> {
        sqlx::query("UPDATE files SET folder_id = ? WHERE id = ?")
            .bind(&new_folder_id)
            .bind(file_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn copy_file(&self, file_id: &str, new_folder_id: Option<String>, new_name_opt: Option<String>) -> Result<String> {
        let file = self.get_file_by_id(file_id).await?.ok_or_else(|| anyhow::anyhow!("File not found"))?;
        let new_id = uuid::Uuid::new_v4().to_string();
        let new_name = match new_name_opt {
            Some(n) => n,
            None => self.generate_available_name(new_folder_id.clone(), &file.name, false).await?,
        };

        let mut tx = self.pool.begin().await?;

        // 1. Copy file record
        sqlx::query("INSERT INTO files (id, name, size, chunk_size, folder_id, account_id, storage_hub_id, is_external, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&new_id)
            .bind(&new_name)
            .bind(file.total_size as i64)
            .bind(file.chunk_size as i64)
            .bind(&new_folder_id)
            .bind(&file.account_id)
            .bind(file.storage_hub_id)
            .bind(file.is_external)
            .bind(chrono::Utc::now().timestamp())
            .execute(&mut *tx).await?;

        // 2. Copy chunks
        for chunk in &file.chunks {
            sqlx::query("INSERT INTO chunks (file_id, account_id, message_id, part_index) VALUES (?, ?, ?, ?)")
                .bind(&new_id)
                .bind(&chunk.account_id)
                .bind(chunk.message_id)
                .bind(chunk.part_index as i64)
                .execute(&mut *tx).await?;
        }

        tx.commit().await?;
        Ok(new_id)
    }

    pub async fn copy_folder(&self, folder_id: &str, new_parent_id: Option<String>, new_name_opt: Option<String>) -> Result<String> {
        let folder = sqlx::query_as::<_, FolderInfo>("SELECT * FROM folders WHERE id = ?")
            .bind(folder_id)
            .fetch_one(&self.pool).await?;

        let new_id = uuid::Uuid::new_v4().to_string();
        let new_name = match new_name_opt {
            Some(n) => n,
            None => self.generate_available_name(new_parent_id.clone(), &folder.name, true).await?,
        };

        sqlx::query("INSERT INTO folders (id, name, parent_id, account_id, created_at) VALUES (?, ?, ?, ?, ?)")
            .bind(&new_id)
            .bind(&new_name)
            .bind(&new_parent_id)
            .bind(&folder.account_id)
            .bind(chrono::Utc::now().timestamp())
            .execute(&self.pool).await?;

        // Recursively copy subfolders
        let subfolders = self.get_folders_in(Some(folder_id.to_string()), None).await?;
        for sf in subfolders {
            Box::pin(self.copy_folder(&sf.id, Some(new_id.clone()), Some(sf.name))).await?;
        }

        // Copy files in this folder
        let files = self.get_files_in(Some(folder_id.to_string()), None).await?;
        for f in files {
            self.copy_file(&f.id, Some(new_id.clone()), Some(f.name)).await?;
        }

        Ok(new_id)
    }

    async fn generate_available_name(&self, folder_id: Option<String>, base_name: &str, is_folder: bool) -> Result<String> {
        let mut final_name = base_name.to_string();
        let mut counter = 1;

        loop {
            let exists = if is_folder {
                sqlx::query("SELECT 1 FROM folders WHERE parent_id IS ? AND name = ?")
                    .bind(&folder_id)
                    .bind(&final_name)
                    .fetch_optional(&self.pool).await?.is_some()
            } else {
                sqlx::query("SELECT 1 FROM files WHERE folder_id IS ? AND name = ?")
                    .bind(&folder_id)
                    .bind(&final_name)
                    .fetch_optional(&self.pool).await?.is_some()
            };

            if !exists { break; }

            counter += 1;
            if counter == 2 {
                final_name = format!("{} - Copy", base_name);
            } else {
                final_name = format!("{} - Copy ({})", base_name, counter - 1);
            }
        }
        Ok(final_name)
    }

    pub async fn get_notes(&self) -> Result<Vec<NoteInfo>> {
        use sqlx::Row;
        let rows = sqlx::query("SELECT * FROM notes ORDER BY created_at DESC").fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| NoteInfo {
            id: r.get("id"),
            account_id: r.get("account_id"),
            peer_id: r.get::<Option<i64>, _>("peer_id").unwrap_or(0),
            message_id: r.get("message_id"),
            content: r.get("content"),
            created_at: r.get("created_at"),
            from_self: r.get::<Option<i64>, _>("from_self").unwrap_or(1) == 1,
            sender_name: r.get::<Option<String>, _>("sender_name"),
            attachment_ids: r.get::<Option<String>, _>("attachment_ids"),
        }).collect())
    }

    pub async fn save_note(&self, id: &str, account_id: &str, peer_id: i64, message_id: i64, content: &str, from_self: bool, sender_name: Option<String>, attachment_ids: Option<String>) -> Result<()> {
        let created_at = chrono::Utc::now().timestamp();
        sqlx::query("INSERT OR REPLACE INTO notes (id, account_id, peer_id, message_id, content, created_at, from_self, sender_name, attachment_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(id)
            .bind(account_id)
            .bind(peer_id)
            .bind(message_id)
            .bind(content)
            .bind(created_at)
            .bind(if from_self { 1i64 } else { 0i64 })
            .bind(sender_name)
            .bind(attachment_ids)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_notes_by_account(&self, account_id: &str) -> Result<()> {
        sqlx::query("DELETE FROM notes WHERE account_id = ?")
            .bind(account_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_files_by_account(&self, account_id: &str) -> Result<()> {
        // Get all file IDs for this account (files where any chunk belongs to this account)
        use sqlx::Row;
        let file_ids: Vec<String> = sqlx::query(
            "SELECT DISTINCT file_id FROM chunks WHERE account_id = ?"
        )
        .bind(account_id)
        .fetch_all(&self.pool).await?
        .into_iter().map(|r| r.get(0)).collect();

        let mut tx = self.pool.begin().await?;
        for fid in &file_ids {
            sqlx::query("DELETE FROM chunks WHERE file_id = ?").bind(fid).execute(&mut *tx).await?;
            sqlx::query("DELETE FROM files WHERE id = ?").bind(fid).execute(&mut *tx).await?;
        }
        tx.commit().await?;
        Ok(())
    }

    pub async fn get_all_folders(&self) -> Result<Vec<FolderInfo>> {
        use sqlx::Row;
        let rows = sqlx::query("SELECT * FROM folders").fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| FolderInfo {
            id: r.get("id"),
            name: r.get("name"),
            parent_id: r.get("parent_id"),
            account_id: r.get("account_id"),
            created_at: r.get("created_at"),
        }).collect())
    }

    pub async fn get_all_files(&self) -> Result<Vec<FileManifest>> {
        use sqlx::Row;
        let ids: Vec<String> = sqlx::query("SELECT id FROM files").fetch_all(&self.pool).await?
            .into_iter().map(|r| r.get(0)).collect();
        let mut files = Vec::new();
        for id in ids {
            if let Some(f) = self.get_file_by_id(&id).await? {
                files.push(f);
            }
        }
        Ok(files)
    }

    pub async fn purge_all_metadata(&self) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("DELETE FROM chunks").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM files").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM folders").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM notes").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM account_sync_state").execute(&mut *tx).await?;
        tx.commit().await?;
        Ok(())
    }

    /// Clear only files/folders/chunks belonging to a specific account, leaving others untouched.
    pub async fn clear_explorer_data_for_account(&self, account_id: &str) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        // Delete chunks for files owned by this account
        sqlx::query("DELETE FROM chunks WHERE account_id = ?")
            .bind(account_id).execute(&mut *tx).await?;
        // Delete files owned by this account
        sqlx::query("DELETE FROM files WHERE account_id = ?")
            .bind(account_id).execute(&mut *tx).await?;
        // Delete folders owned by this account
        sqlx::query("DELETE FROM folders WHERE account_id = ?")
            .bind(account_id).execute(&mut *tx).await?;
        tx.commit().await?;
        Ok(())
    }

    pub async fn get_folders_by_account(&self, account_id: &str) -> Result<Vec<FolderInfo>> {
        use sqlx::Row;
        let rows = sqlx::query("SELECT * FROM folders WHERE account_id = ?")
            .bind(account_id)
            .fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| FolderInfo {
            id: r.get("id"),
            name: r.get("name"),
            parent_id: r.get("parent_id"),
            account_id: r.get("account_id"),
            created_at: r.get("created_at"),
        }).collect())
    }

    pub async fn get_folders_by_ids(&self, ids: Vec<String>) -> Result<Vec<FolderInfo>> {
        if ids.is_empty() { return Ok(vec![]); }
        use sqlx::Row;
        let mut placeholders = Vec::new();
        for _ in 0..ids.len() { placeholders.push("?"); }
        let query = format!("SELECT * FROM folders WHERE id IN ({})", placeholders.join(","));
        
        let mut q = sqlx::query(&query);
        for id in &ids { q = q.bind(id); }
        
        let rows = q.fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| FolderInfo {
            id: r.get("id"),
            name: r.get("name"),
            parent_id: r.get("parent_id"),
            account_id: r.get("account_id"),
            created_at: r.get("created_at"),
        }).collect())
    }

    pub async fn get_files_by_account(&self, account_id: &str) -> Result<Vec<FileManifest>> {
        use sqlx::Row;
        let ids: Vec<String> = sqlx::query("SELECT id FROM files WHERE account_id = ?")
            .bind(account_id)
            .fetch_all(&self.pool).await?
            .into_iter().map(|r| r.get(0)).collect();
        let mut files = Vec::new();
        for id in ids {
            if let Some(f) = self.get_file_by_id(&id).await? {
                files.push(f);
            }
        }
        Ok(files)
    }

    pub async fn purge_account_data(&self, account_id: &str) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        
        sqlx::query("DELETE FROM notes WHERE account_id = ?")
            .bind(account_id)
            .execute(&mut *tx).await?;
            
        sqlx::query("DELETE FROM chunks WHERE account_id = ?")
            .bind(account_id)
            .execute(&mut *tx).await?;
            
        // Orphaned files cleanup
        sqlx::query("DELETE FROM files WHERE id NOT IN (SELECT DISTINCT file_id FROM chunks)")
            .execute(&mut *tx).await?;
            
        // If no chunks left across any accounts, clear remaining folders to completely sanitize DB
        let remaining: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM chunks")
            .fetch_one(&mut *tx)
            .await
            .unwrap_or((1,));
            
        if remaining.0 == 0 {
            sqlx::query("DELETE FROM folders").execute(&mut *tx).await?;
            sqlx::query("DELETE FROM files").execute(&mut *tx).await?; // Just in case
        }
        
        tx.commit().await?;
        Ok(())
    }

    /// Reconciles the database with the list of currently active account IDs.
    /// Removes all chunks, notes, files, and folders belonging to accounts NOT in the list.
    pub async fn reconcile_with_active_accounts(&self, active_ids: &[String]) -> Result<Vec<String>> {
        use sqlx::Row;
        
        // Find all distinct account_ids in chunks that are NOT in active_ids
        let chunk_accounts: Vec<String> = sqlx::query("SELECT DISTINCT account_id FROM chunks")
            .fetch_all(&self.pool).await?
            .into_iter().map(|r| r.get(0)).collect();
        
        let note_accounts: Vec<String> = sqlx::query("SELECT DISTINCT account_id FROM notes")
            .fetch_all(&self.pool).await?
            .into_iter().map(|r| r.get(0)).collect();

        let mut orphaned: Vec<String> = Vec::new();
        for aid in chunk_accounts.iter().chain(note_accounts.iter()) {
            if !active_ids.contains(aid) && !orphaned.contains(aid) {
                orphaned.push(aid.clone());
            }
        }

        if orphaned.is_empty() {
            return Ok(orphaned);
        }

        log::info!("Reconciliation: found {} orphaned account(s) in DB: {:?}", orphaned.len(), orphaned);

        for aid in &orphaned {
            self.purge_account_data(aid).await?;
        }

        log::info!("Reconciliation: purge complete");
        Ok(orphaned)
    }

    pub async fn get_setting(&self, key: &str) -> Result<Option<String>> {
        use sqlx::Row;
        let row = sqlx::query("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool).await?;
        Ok(row.map(|r| r.get(0)))
    }

    pub async fn update_setting(&self, key: &str, value: &str) -> Result<()> {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
            .bind(key)
            .bind(value)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_all_note_attachments(&self, account_id: &str) -> Result<std::collections::HashMap<String, Vec<String>>> {
        use sqlx::Row;
        use std::collections::HashMap;

        let rows = sqlx::query("SELECT id, attachment_ids FROM notes WHERE account_id = ?")
            .bind(account_id)
            .fetch_all(&self.pool).await?;
            
        let mut results = HashMap::new();
        for r in rows {
            let note_id: String = r.get(0);
            let att_str: Option<String> = r.get(1);
            if let Some(s) = att_str {
                let ids: Vec<String> = s.split(',').filter(|i| !i.is_empty()).map(String::from).collect();
                if !ids.is_empty() {
                    results.insert(note_id, ids);
                }
            }
        }
        Ok(results)
    }

    pub async fn get_sync_state(&self, account_id: &str) -> Result<Option<(i32, i32)>> {
        let row = sqlx::query("SELECT last_forward_id, last_backward_id FROM account_sync_state WHERE account_id = ?")
            .bind(account_id)
            .fetch_optional(&self.pool).await?;
        
        if let Some(r) = row {
            let f: i32 = r.get(0);
            let b: i32 = r.get(1);
            Ok(Some((f, b)))
        } else {
            Ok(None)
        }
    }

    pub async fn update_sync_state(&self, account_id: &str, forward_id: Option<i32>, backward_id: Option<i32>) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        
        sqlx::query("INSERT INTO account_sync_state (account_id, last_forward_id, last_backward_id, last_indexed_at) 
                     VALUES (?, ?, ?, ?) 
                     ON CONFLICT(account_id) DO UPDATE SET 
                        last_forward_id = COALESCE(excluded.last_forward_id, last_forward_id),
                        last_backward_id = COALESCE(excluded.last_backward_id, last_backward_id),
                        last_indexed_at = excluded.last_indexed_at")
            .bind(account_id)
            .bind(forward_id)
            .bind(backward_id)
            .bind(now)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_all_linked_message_ids(&self, account_id: &str) -> Result<std::collections::HashSet<i32>> {
        let mut ids = std::collections::HashSet::new();
        
        let chunks: Vec<(i64,)> = sqlx::query_as("SELECT DISTINCT message_id FROM chunks WHERE account_id = ?")
            .bind(account_id)
            .fetch_all(&self.pool).await?;
        for c in chunks { ids.insert(c.0 as i32); }

        let notes: Vec<(i64,)> = sqlx::query_as("SELECT DISTINCT message_id FROM notes WHERE account_id = ?")
            .bind(account_id)
            .fetch_all(&self.pool).await?;
        for n in notes { ids.insert(n.0 as i32); }

        Ok(ids)
    }

    pub async fn delete_by_message_id(&self, account_id: &str, message_id: i32) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        
        // 1. Delete associated notes
        sqlx::query("DELETE FROM notes WHERE account_id = ? AND message_id = ?")
            .bind(account_id)
            .bind(message_id as i64)
            .execute(&mut *tx).await?;

        // 2. Identify and delete files associated with these chunks
        let file_ids: Vec<(String,)> = sqlx::query_as("SELECT DISTINCT file_id FROM chunks WHERE account_id = ? AND message_id = ?")
            .bind(account_id)
            .bind(message_id as i64)
            .fetch_all(&mut *tx).await?;
        
        for (fid,) in file_ids {
            sqlx::query("DELETE FROM chunks WHERE file_id = ?").bind(&fid).execute(&mut *tx).await?;
            sqlx::query("DELETE FROM files WHERE id = ?").bind(&fid).execute(&mut *tx).await?;
        }

        tx.commit().await?;
        Ok(())
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NoteInfo {
    pub id: String,
    pub account_id: String,
    pub peer_id: i64,
    pub message_id: i64,
    pub content: String,
    pub created_at: i64,
    pub from_self: bool,
    pub sender_name: Option<String>,
    pub attachment_ids: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct FolderInfo {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub account_id: Option<String>,
    pub created_at: i64,
}
