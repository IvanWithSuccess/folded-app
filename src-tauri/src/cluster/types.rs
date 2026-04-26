use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize)]
pub struct ProgressPayload {
    pub file_id: String,
    pub file_name: String,
    pub status: String,
    pub processed_bytes: u64,
    pub total_bytes: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChunkMeta {
    pub chunk_id: String,      // Unique UUID v4 for this chunk
    pub account_id: String,
    pub part_index: usize,
    pub message_id: i64,
    pub size_bytes: u64,       // Actual byte size of this chunk
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileManifest {
    pub id: String,
    pub name: String,
    pub total_size: u64,
    pub chunk_size: u64,
    pub chunks: Vec<ChunkMeta>,
    pub folder_id: Option<String>,
    pub account_id: Option<String>,
    pub storage_hub_id: Option<i64>,
    pub storage_hub_access_hash: Option<i64>,
    pub is_external: bool,
    pub is_starred: bool,
    pub created_at: i64,
    pub is_current_version: bool,
    pub version_of: Option<String>,
    pub version_number: i32,
    pub deleted_at: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FoldedManifest {
    pub version: u32,
    pub folders: Vec<crate::cache::FolderInfo>,
    pub files: Vec<FileManifest>,
    pub note_attachments: HashMap<String, Vec<String>>,
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChannelInfo {
    pub id: i64,
    pub title: String,
}
