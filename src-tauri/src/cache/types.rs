use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderHistoryEvent {
    pub id: String,
    pub folder_id: String,
    pub event_type: String,
    pub target_name: String,
    pub target_id: Option<String>,
    pub details: Option<String>,
    pub occurred_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityEntry {
    pub id: String,
    pub item_id: String,
    pub item_name: String,
    pub item_type: String,
    pub action_type: String,
    pub details: Option<String>,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct PendingTask {
    pub id: String,
    pub task_type: String,
    pub payload: String, // JSON
    pub status: String,
    pub retries: i32,
    pub error: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MirrorRule {
    pub id: String,
    pub account_id: String,
    pub local_path: String,
    pub remote_folder_name: String,
    pub remote_folder_id: Option<String>,
    pub keep_history: bool,
    pub enabled: bool,
    pub last_sync_at: Option<i64>,
}
