use sqlx::sqlite::SqliteConnectOptions;
use sqlx::SqlitePool;
use anyhow::Result;
use std::str::FromStr;
use super::MetadataCache;

impl MetadataCache {
    pub async fn new(db_path: &str) -> Result<Self> {
        let path = std::path::Path::new(db_path);
        if path.exists() {
            if let Ok(meta) = std::fs::metadata(path) {
                if meta.len() < 100 {
                    log::warn!("Corrupted DB file (<100 bytes) detected. Removing: {}", db_path);
                    let _ = std::fs::remove_file(path);
                }
            }
        }

        let opts = SqliteConnectOptions::from_str(&format!("sqlite:{}", db_path))?
            .create_if_missing(true);

        let pool = match SqlitePool::connect_with(opts.clone()).await {
            Ok(p) => p,
            Err(e) => {
                let err_msg = e.to_string();
                if err_msg.contains("code: 26") || err_msg.contains("not a database") {
                    log::warn!("SQLITE_NOTADB (code 26) detected. Deleting corrupted database file and recreating: {}", db_path);
                    let _ = std::fs::remove_file(db_path);
                    SqlitePool::connect_with(opts).await?
                } else {
                    return Err(e.into());
                }
            }
        };

        
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id TEXT,
                account_id TEXT,
                is_starred BOOLEAN DEFAULT FALSE,
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
                storage_hub_id INTEGER,
                storage_hub_access_hash INTEGER,
                is_external BOOLEAN DEFAULT FALSE,
                is_starred BOOLEAN DEFAULT FALSE,
                created_at INTEGER NOT NULL,
                is_current_version BOOLEAN DEFAULT TRUE,
                version_of TEXT,
                version_number INTEGER DEFAULT 1,
                deleted_at INTEGER,
                FOREIGN KEY(folder_id) REFERENCES folders(id)
            )"
        ).execute(&pool).await?;

        // Create chunks with schema (chunk_id + size_bytes for resilient reassembly)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS chunks (
                file_id TEXT NOT NULL,
                chunk_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                message_id INTEGER NOT NULL,
                part_index INTEGER NOT NULL,
                size_bytes INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (file_id, chunk_id),
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
                last_indexed_at INTEGER,
                last_sync_message_id INTEGER DEFAULT 0
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS activity_log (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                item_name TEXT NOT NULL,
                item_type TEXT NOT NULL, -- 'FILE' or 'FOLDER'
                action_type TEXT NOT NULL, -- 'UPLOAD', 'RENAME', 'MOVE', 'DELETE', 'STAR', 'MIRROR_SYNC'
                details TEXT,
                timestamp INTEGER NOT NULL
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS file_cache (
                file_id TEXT PRIMARY KEY,
                path_on_disk TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                last_accessed_at INTEGER NOT NULL
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS mirror_rules (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                local_path TEXT NOT NULL,
                remote_folder_name TEXT NOT NULL,
                keep_history BOOLEAN NOT NULL DEFAULT 1,
                enabled BOOLEAN NOT NULL DEFAULT 1,
                last_sync_at INTEGER
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY,
                seq INTEGER NOT NULL,
                device_name TEXT NOT NULL,
                file_count INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                manifest_data TEXT
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS pending_tasks (
                id TEXT PRIMARY KEY,
                task_type TEXT NOT NULL, -- 'UPLOAD_FILE', 'UPLOAD_FOLDER'
                payload TEXT NOT NULL, -- JSON
                status TEXT NOT NULL, -- 'PENDING', 'RUNNING', 'FAILED', 'COMPLETED'
                retries INTEGER DEFAULT 0,
                error TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                processed_files INTEGER DEFAULT 0,
                total_files INTEGER DEFAULT 0
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS git_repositories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                local_path TEXT NOT NULL,
                telegram_chat_id TEXT NOT NULL,
                current_head TEXT,
                remote_head TEXT,
                current_branch TEXT NOT NULL DEFAULT 'main',
                created_at INTEGER NOT NULL
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS git_commits (
                id TEXT PRIMARY KEY,
                repository_id TEXT NOT NULL,
                parent_id TEXT,
                message_summary TEXT NOT NULL,
                message_description TEXT,
                author TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                manifest_data TEXT NOT NULL,
                is_pushed BOOLEAN DEFAULT FALSE,
                branch_name TEXT NOT NULL DEFAULT 'main',
                FOREIGN KEY(repository_id) REFERENCES git_repositories(id)
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS git_branches (
                id TEXT PRIMARY KEY,
                repository_id TEXT NOT NULL,
                name TEXT NOT NULL,
                head_commit_id TEXT,
                created_at INTEGER NOT NULL,
                UNIQUE(repository_id, name),
                FOREIGN KEY(repository_id) REFERENCES git_repositories(id)
            )"
        ).execute(&pool).await?;

        // MIGRATION: Ensure columns exist in existing databases
        let _ = sqlx::query("ALTER TABLE pending_tasks ADD COLUMN processed_files INTEGER DEFAULT 0")
            .execute(&pool).await;
        let _ = sqlx::query("ALTER TABLE pending_tasks ADD COLUMN total_files INTEGER DEFAULT 0")
            .execute(&pool).await;
        let _ = sqlx::query("ALTER TABLE git_repositories ADD COLUMN current_branch TEXT NOT NULL DEFAULT 'main'")
            .execute(&pool).await;
        let _ = sqlx::query("ALTER TABLE git_commits ADD COLUMN branch_name TEXT NOT NULL DEFAULT 'main'")
            .execute(&pool).await;

        // MIGRATION: Seed 'main' branch for all existing repositories that have no branches yet
        let _ = sqlx::query(
            "INSERT OR IGNORE INTO git_branches (id, repository_id, name, head_commit_id, created_at)
             SELECT lower(hex(randomblob(16))), id, 'main', current_head, created_at
             FROM git_repositories"
        ).execute(&pool).await;

        // Git Pull Requests table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS git_pull_requests (
                id TEXT PRIMARY KEY,
                repository_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                source_branch TEXT NOT NULL,
                target_branch TEXT NOT NULL,
                author TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(repository_id) REFERENCES git_repositories(id)
            )"
        ).execute(&pool).await?;

        // Add performance indices
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_chunks_msg ON chunks(message_id)").execute(&pool).await;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_msg ON notes(message_id)").execute(&pool).await;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_tasks_status ON pending_tasks(status)").execute(&pool).await;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_files_acc ON files(account_id)").execute(&pool).await;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_acc ON notes(account_id)").execute(&pool).await;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_files_version ON files(version_of)").execute(&pool).await;

        // folder_history table for tracking events (mirroring, changes, deletions)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS folder_history (
                id TEXT PRIMARY KEY,
                folder_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                target_name TEXT NOT NULL,
                target_id TEXT,
                details TEXT,
                occurred_at INTEGER NOT NULL
            )"
        ).execute(&pool).await?;
        let _ = sqlx::query("CREATE INDEX IF NOT EXISTS idx_folder_history ON folder_history(folder_id, occurred_at)").execute(&pool).await;

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
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN is_starred BOOLEAN DEFAULT FALSE").execute(&self.pool).await;
        
        // Folders table additions
        let _ = sqlx::query("ALTER TABLE folders ADD COLUMN account_id TEXT").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE folders ADD COLUMN is_starred BOOLEAN DEFAULT FALSE").execute(&self.pool).await;

        // Activity Log additions (if table existed without some columns, but it's new, so just ensuring)
        let _ = sqlx::query("CREATE TABLE IF NOT EXISTS activity_log (id TEXT PRIMARY KEY, item_id TEXT, item_name TEXT, item_type TEXT, action_type TEXT, details TEXT, timestamp INTEGER)").execute(&self.pool).await;

        // Notes table additions
        let _ = sqlx::query("ALTER TABLE notes ADD COLUMN attachment_ids TEXT").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE notes ADD COLUMN peer_id INTEGER").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE notes ADD COLUMN from_self INTEGER DEFAULT 1").execute(&self.pool).await;

        // Delta sync: track last known message ID per account
        let _ = sqlx::query("ALTER TABLE account_sync_state ADD COLUMN last_sync_message_id INTEGER DEFAULT 0").execute(&self.pool).await;
        
        // Mirror rules table migration
        // Mirror rules table migration
        let _ = sqlx::query("ALTER TABLE mirror_rules ADD COLUMN remote_folder_id TEXT").execute(&self.pool).await;

        // Versioning & soft-delete migrations
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN is_current_version BOOLEAN DEFAULT TRUE").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN version_of TEXT").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN version_number INTEGER DEFAULT 1").execute(&self.pool).await;
        let _ = sqlx::query("ALTER TABLE files ADD COLUMN deleted_at INTEGER").execute(&self.pool).await;

        Ok(())
    }

    pub async fn reset_database(&self) -> Result<()> {
        log::info!("Resetting database: purging all metadata tables and vacuuming...");
        let _ = sqlx::query("DELETE FROM files").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM folders").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM chunks").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM pending_tasks").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM settings").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM notes").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM snapshots").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM folder_history").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM mirror_rules").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM file_cache").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM account_sync_state").execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM activity_log").execute(&self.pool).await;
        let _ = sqlx::query("VACUUM").execute(&self.pool).await;
        log::info!("Database successfully reset.");
        Ok(())
    }
}

