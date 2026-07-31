use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkMeta {
    pub chunk_id: String,
    pub index: u32,
    pub size: usize,
    pub encrypted_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub relative_path: String,
    pub size: u64,
    pub is_dir: bool,
    pub modified_at: i64,
    pub chunks: Vec<ChunkMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotManifest {
    pub snapshot_id: String,
    pub sequence_num: u64,
    pub timestamp: i64,
    pub device_id: String,
    pub files: Vec<FileNode>,
}

impl SnapshotManifest {
    pub fn new(device_id: String, sequence_num: u64, files: Vec<FileNode>) -> Self {
        Self {
            snapshot_id: uuid::Uuid::new_v4().to_string(),
            sequence_num,
            timestamp: chrono::Utc::now().timestamp(),
            device_id,
            files,
        }
    }
}
