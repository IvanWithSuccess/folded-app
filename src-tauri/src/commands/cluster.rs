use tauri::State;
use std::sync::Arc;
use crate::session_manager::SessionManager;
use crate::cluster::{ClusterOrchestrator, ChannelInfo};
use crate::cache::MetadataCache;
use crate::SyncTracker;

#[tauri::command]
pub async fn cluster_download_file(
    app: tauri::AppHandle,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    file_id: String,
    dest_path: String,
) -> Result<(), String> {
    let files = cache_state.get_files().await.map_err(|e| e.to_string())?;
    let manifest = files
        .into_iter()
        .find(|f| f.id == file_id)
        .ok_or_else(|| format!("File {} not found in metadata", file_id))?;

    let dest = std::path::PathBuf::from(&dest_path);
    match cluster_state
        .download_file(manifest, dest, Arc::clone(&session_state), Some(app))
        .await {
            Ok(_) => Ok(()),
            Err(e) => {
                let err_msg = e.to_string();
                if err_msg.contains("not found") || err_msg.contains("no media") {
                    log::warn!("File {} missing in Telegram, removing from metadata.", file_id);
                    let _ = cache_state.delete_file(&file_id).await;
                }
                Err(err_msg)
            }
        }
}

#[tauri::command]
pub async fn cluster_download_to_tmp(
    app: tauri::AppHandle,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    file_id: String,
) -> Result<String, String> {
    let manifest = cache_state.get_file_by_id(&file_id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("File {} not found", file_id))?;

    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).unwrap_or_else(|_| "/tmp".into());
    let tmp_dir = std::path::PathBuf::from(home).join(".folded").join("tmp");
    let _ = std::fs::create_dir_all(&tmp_dir);
    let dest = tmp_dir.join(&manifest.name);

    match cluster_state
        .download_file(manifest.clone(), dest.clone(), Arc::clone(&session_state), Some(app))
        .await {
            Ok(_) => {
                let _ = cache_state.record_cached_file(&manifest.id, &dest.to_string_lossy(), manifest.total_size).await;
                Ok(dest.to_string_lossy().to_string())
            },
            Err(e) => {
                let err_msg = e.to_string();
                if err_msg.contains("not found") || err_msg.contains("no media") {
                    log::warn!("File {} missing in Telegram during tmp open, removing from metadata.", file_id);
                    let _ = cache_state.delete_file(&file_id).await;
                }
                Err(err_msg)
            }
        }
}

#[tauri::command]
pub async fn cluster_index_account(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    account_id: String,
) -> Result<(), String> {
    cluster_state.index_account(&account_id, Arc::clone(&session_state), Arc::clone(&cache_state))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cluster_create_hub(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    account_id: String,
    title: String,
) -> Result<i64, String> {
    cluster_state.create_storage_hub(&account_id, title, Arc::clone(&session_state))
        .await
        .map(|(id, _)| id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_account(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    sync_tracker: State<'_, Arc<SyncTracker>>,
    account_id: String,
) -> Result<(), String> {
    log::info!("Starting intelligent sync for account {}", account_id);
    
    let _ = cluster_state.pull_manifest(&account_id, Arc::clone(&session_state), Arc::clone(&cache_state)).await;
    
    // Always perform an immediate "burst" crawl to find new messages/notes before returning to UI
    log::info!("Performing immediate maintenance crawl for {}", account_id);
    let _ = cluster_state.maintenance_crawl(&account_id, Arc::clone(&session_state), Arc::clone(&cache_state)).await;


    let mut active = sync_tracker.active_crawlers.lock().await;
    if !active.contains(&account_id) {
        active.insert(account_id.clone());
        let account_id_clone = account_id.clone();
        let session_clone = Arc::clone(&session_state);
        let cluster_clone = Arc::clone(&cluster_state);
        let cache_clone = Arc::clone(&cache_state);
        let tracker_clone = Arc::clone(&sync_tracker);

        tokio::spawn(async move {
            log::info!("Background maintenance crawler spawned for {}", account_id_clone);
            loop {
                if let Err(e) = cluster_clone.maintenance_crawl(&account_id_clone, Arc::clone(&session_clone), Arc::clone(&cache_clone)).await {
                    log::error!("Background crawl error for {}: {}", account_id_clone, e);
                }
                
                tokio::time::sleep(std::time::Duration::from_secs(30)).await;

                if session_clone.get_client_by_id(&account_id_clone).await.is_none() {
                    log::info!("Stopping crawler for {} - session invalid or removed", account_id_clone);
                    break;
                }
            }
            let mut active = tracker_clone.active_crawlers.lock().await;
            active.remove(&account_id_clone);
        });
    }

    Ok(())
}

#[tauri::command]
pub async fn push_manifest(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    account_id: String,
) -> Result<(), String> {
    cluster_state.push_manifest(&account_id, Arc::clone(&session_state), Arc::clone(&cache_state))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pull_manifest(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    account_id: String,
) -> Result<(), String> {
    cluster_state.pull_manifest(&account_id, Arc::clone(&session_state), Arc::clone(&cache_state))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_user_channels(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    account_id: String,
) -> Result<Vec<ChannelInfo>, String> {
    cluster_state.get_user_channels(&account_id, Arc::clone(&session_state))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_storage_hub(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    account_id: String,
    title: String,
) -> Result<i64, String> {
    cluster_state.create_storage_hub(&account_id, title, Arc::clone(&session_state))
        .await
        .map(|(id, _)| id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cluster_delete_file(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    file_id: String,
) -> Result<(), String> {
    let manifest = cache_state.get_file_by_id(&file_id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("File {} not found", file_id))?;

    let session_arc = Arc::clone(&session_state);
    cluster_state.delete_file(manifest, session_arc).await.map_err(|e| e.to_string())?;
    cache_state.delete_file(&file_id).await.map_err(|e| e.to_string())?;
    
    Ok(())
}
