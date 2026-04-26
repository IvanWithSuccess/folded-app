use sqlx::{Pool, Sqlite};
use serde::{Serialize, Deserialize};

mod init;
mod files;
mod folders;
mod mirror;
mod history;
mod notes;
mod tasks;
mod settings;
mod search;
mod sync;
mod maintenance;
mod types;

pub use types::*;

pub struct MetadataCache {
    pool: Pool<Sqlite>,
}

impl std::fmt::Debug for MetadataCache {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MetadataCache").finish()
    }
}

impl MetadataCache {
    pub fn get_pool(&self) -> &Pool<Sqlite> {
        &self.pool
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
    pub is_starred: bool,
    pub is_managed: bool,
    pub created_at: i64,
}
