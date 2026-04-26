use sqlx::sqlite::SqliteConnectOptions;
use sqlx::SqlitePool;
use anyhow::Result;
use std::str::FromStr;
use super::MetadataCache;

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

        // Drop and recreate chunks with new schema (chunk_id + size_bytes for resilient reassembly)
        sqlx::query("DROP TABLE IF EXISTS chunks").execute(&pool).await?;
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
            "CREATE TABLE IF NOT EXISTS pending_tasks (
                id TEXT PRIMARY KEY,
                task_type TEXT NOT NULL, -- 'UPLOAD_FILE', 'UPLOAD_FOLDER'
                payload TEXT NOT NULL, -- JSON
                status TEXT NOT NULL, -- 'PENDING', 'RUNNING', 'FAILED', 'COMPLETED'
                retries INTEGER DEFAULT 0,
                error TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
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
}
