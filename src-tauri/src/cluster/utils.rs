use std::path::PathBuf;
use anyhow::{Result, anyhow};
use super::ClusterOrchestrator;

impl ClusterOrchestrator {
    pub(crate) fn determine_chunk_size(total_bytes: u64, max_chunk_size_bytes: u64) -> u64 {
        // Use the user-configured chunk size directly.
        // If the file is smaller than the chunk size, upload it as a single chunk.
        max_chunk_size_bytes.min(total_bytes).max(1)
    }

    pub(crate) fn plan_chunks(&self, file_path: PathBuf, account_ids: &[String], max_chunk_size_bytes: u64) -> Result<Vec<(usize, String, u64)>> {
        if account_ids.is_empty() {
            return Err(anyhow!("No active accounts available for storage cluster"));
        }

        let metadata = std::fs::metadata(&file_path)?;
        let total_size = metadata.len();
        let chunk_size = Self::determine_chunk_size(total_size, max_chunk_size_bytes);
        let num_chunks = (total_size as f64 / chunk_size as f64).ceil() as usize;

        let mut distribution = Vec::new();
        for i in 0..num_chunks {
            let target_account = &account_ids[i % account_ids.len()];
            distribution.push((i, target_account.clone(), chunk_size));
        }

        Ok(distribution)
    }
}
