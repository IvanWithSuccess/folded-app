use tauri::State;
use std::sync::Arc;
use crate::cache::MetadataCache;
use serde::Serialize;

#[derive(Serialize)]
pub struct CacheStats {
    pub file_count: u64,
    pub total_bytes: u64,
}

#[tauri::command]
pub async fn get_cache_stats(
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<CacheStats, String> {
    let (file_count, total_bytes) = cache_state
        .get_cache_stats()
        .await
        .map_err(|e| e.to_string())?;
    Ok(CacheStats { file_count, total_bytes })
}

#[tauri::command]
pub async fn clear_file_cache(
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<(), String> {
    cache_state
        .clear_file_cache()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn evict_cache(
    cache_state: State<'_, Arc<MetadataCache>>,
    limit_mb: u64,
) -> Result<u64, String> {
    let limit_bytes = limit_mb * 1024 * 1024;
    let evicted = cache_state
        .evict_cache_to_limit(limit_bytes)
        .await
        .map_err(|e| e.to_string())?;
    Ok(evicted.len() as u64)
}
