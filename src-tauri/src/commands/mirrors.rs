use tauri::State;
use std::sync::Arc;
use crate::cache::{MetadataCache, MirrorRule};
use uuid::Uuid;
use crate::cluster::mirrors::MirrorManager;

#[tauri::command]
pub async fn get_mirror_rules(
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<MirrorRule>, String> {
    cache_state.get_mirror_rules().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
pub async fn add_mirror_rule(
    cache_state: State<'_, Arc<MetadataCache>>,
    mirror_manager: State<'_, Arc<MirrorManager>>,
    account_id: String,
    local_path: String,
    keep_history: bool,
) -> Result<(), String> {
    let folder_name = std::path::Path::new(&local_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    let rule = MirrorRule {
        id: Uuid::new_v4().to_string(),
        account_id,
        local_path,
        remote_folder_name: format!("Mirrors/{}", folder_name),
        remote_folder_id: None,
        keep_history,
        enabled: true,
        last_sync_at: None,
    };

    cache_state.upsert_mirror_rule(rule.clone()).await.map_err(|e: anyhow::Error| e.to_string())?;
    
    // Trigger MirrorManager to start watching this new path
    mirror_manager.start_watching(rule).await.map_err(|e: anyhow::Error| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn remove_mirror_rule(
    cache_state: State<'_, Arc<MetadataCache>>,
    mirror_manager: State<'_, Arc<MirrorManager>>,
    id: String,
) -> Result<(), String> {
    cache_state.delete_mirror_rule(&id).await.map_err(|e: anyhow::Error| e.to_string())?;
    
    // Trigger MirrorManager to stop watching
    let _ = mirror_manager.stop_watching(&id).await;
    
    Ok(())
}

#[tauri::command]
pub async fn toggle_mirror_rule(
    cache_state: State<'_, Arc<MetadataCache>>,
    mirror_manager: State<'_, Arc<MirrorManager>>,
    id: String,
    enabled: bool,
) -> Result<(), String> {
    let rules = cache_state.get_mirror_rules().await.map_err(|e: anyhow::Error| e.to_string())?;
    if let Some(mut rule) = rules.into_iter().find(|r| r.id == id) {
        rule.enabled = enabled;
        cache_state.upsert_mirror_rule(rule.clone()).await.map_err(|e: anyhow::Error| e.to_string())?;
        
        if enabled {
            mirror_manager.start_watching(rule).await.map_err(|e: anyhow::Error| e.to_string())?;
        } else {
            let _ = mirror_manager.stop_watching(&id).await;
        }
    }
    
    Ok(())
}
