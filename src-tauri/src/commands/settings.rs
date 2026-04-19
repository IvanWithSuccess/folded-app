use tauri::State;
use std::sync::Arc;
use crate::cache::MetadataCache;

#[tauri::command]
pub async fn get_setting(
    cache_state: State<'_, Arc<MetadataCache>>,
    key: String,
) -> Result<Option<String>, String> {
    cache_state.get_setting(&key).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_setting(
    cache_state: State<'_, Arc<MetadataCache>>,
    key: String,
    value: String,
) -> Result<(), String> {
    cache_state.update_setting(&key, &value).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn purge_local_cache(cache_state: State<'_, Arc<MetadataCache>>) -> Result<(), String> {
    cache_state.purge_all_metadata().await.map_err(|e| e.to_string())
}
