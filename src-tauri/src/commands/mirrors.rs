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
    // 1. Validation: Path must exist and be a directory
    let path = std::path::Path::new(&local_path);
    if !path.exists() {
        return Err("Local path does not exist".to_string());
    }
    if !path.is_dir() {
        return Err("Local path is not a directory".to_string());
    }

    // 2. Validation: Prevent duplicate or nested mirrors
    let existing_rules = cache_state.get_mirror_rules().await.map_err(|e| e.to_string())?;
    for rule in existing_rules {
        let existing_path = std::path::Path::new(&rule.local_path);
        if path == existing_path {
            return Err("This folder is already being mirrored".to_string());
        }
        if path.starts_with(existing_path) || existing_path.starts_with(path) {
            return Err("Mirroring nested folders is not allowed to prevent conflicts".to_string());
        }
    }

    // 3. Ensure "Mirrors" root exists in DB
    let _ = cache_state.create_folder("Mirrors".to_string(), None, None).await;

    let folder_name = path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    let rule = MirrorRule {
        id: Uuid::new_v4().to_string(),
        account_id,
        local_path: local_path.clone(),
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
