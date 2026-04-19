use std::path::PathBuf;
use anyhow::{Result, anyhow};
use super::ClusterOrchestrator;

impl ClusterOrchestrator {
    pub(crate) fn determine_chunk_size(total_bytes: u64) -> u64 {
        const MB: u64 = 1024 * 1024;
        const GB: u64 = 1024 * MB;
        
        if total_bytes < 50 * MB {
            10 * MB // Smaller files: 10MB chunks (better distribution across accounts)
        } else if total_bytes < 1 * GB {
            50 * MB // Up to 1GB: 50MB chunks
        } else if total_bytes < 10 * GB {
            500 * MB // 1-10GB: 500MB chunks
        } else {
            1900 * MB // 10GB+: 1.9GB chunks safely under Telegram's 2.0GB limit
        }
    }

    pub(crate) fn plan_chunks(&self, file_path: PathBuf, account_ids: &[String]) -> Result<Vec<(usize, String, u64)>> {
        if account_ids.is_empty() {
            return Err(anyhow!("No active accounts available for storage cluster"));
        }

        let metadata = std::fs::metadata(&file_path)?;
        let total_size = metadata.len();
        let chunk_size = Self::determine_chunk_size(total_size);
        let num_chunks = (total_size as f64 / chunk_size as f64).ceil() as usize;

        let mut distribution = Vec::new();
        for i in 0..num_chunks {
            let target_account = &account_ids[i % account_ids.len()];
            distribution.push((i, target_account.clone(), chunk_size));
        }

        Ok(distribution)
    }
}
