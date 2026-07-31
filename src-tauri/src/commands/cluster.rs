use tauri::State;
use std::sync::Arc;
use crate::session_manager::SessionManager;
use crate::cluster::{ClusterOrchestrator, ChannelInfo};
use grammers_tl_types as tl;
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
        .download_file(manifest, dest, Arc::clone(&session_state), Some(app), None)
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

    // 1. Check if the file is already cached and exists with the correct size on disk
    if let Some(cached_path) = cache_state.get_cached_file(&file_id).await {
        let path = std::path::PathBuf::from(&cached_path);
        if path.exists() {
            if let Ok(metadata) = std::fs::metadata(&path) {
                if metadata.len() == manifest.total_size {
                    log::info!("File {} found in cache, skipping download: {:?}", file_id, path);
                    return Ok(cached_path);
                }
            }
        }
    }

    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).unwrap_or_else(|_| "/tmp".into());
    let tmp_dir = std::path::PathBuf::from(home).join(".folded").join("tmp");
    let _ = std::fs::create_dir_all(&tmp_dir);
    let dest = tmp_dir.join(&manifest.name);

    // 2. Also check if it exists at the destination path with correct size
    if dest.exists() {
        if let Ok(metadata) = std::fs::metadata(&dest) {
            if metadata.len() == manifest.total_size {
                log::info!("File {} already exists in temp directory with correct size, skipping download: {:?}", file_id, dest);
                let _ = cache_state.record_cached_file(&manifest.id, &dest.to_string_lossy(), manifest.total_size).await;
                return Ok(dest.to_string_lossy().to_string());
            }
        }
    }

    // Coordinate concurrent downloads
    let notify_opt = {
        let mut active = cluster_state.active_downloads.lock().await;
        if let Some(notify) = active.get(&file_id) {
            Some(Arc::clone(notify))
        } else {
            let notify = Arc::new(tokio::sync::Notify::new());
            active.insert(file_id.clone(), Arc::clone(&notify));
            None
        }
    };

    if let Some(notify) = notify_opt {
        log::info!("File {} is already downloading in another thread, waiting...", file_id);
        notify.notified().await;
        
        // After waking up, verify if it was successfully downloaded and cached
        if let Some(cached_path) = cache_state.get_cached_file(&file_id).await {
            let path = std::path::PathBuf::from(&cached_path);
            if path.exists() {
                if let Ok(metadata) = std::fs::metadata(&path) {
                    if metadata.len() == manifest.total_size {
                        log::info!("File {} was downloaded by another thread, using cached path: {:?}", file_id, path);
                        return Ok(cached_path);
                    }
                }
            }
        }
        if dest.exists() {
            if let Ok(metadata) = std::fs::metadata(&dest) {
                if metadata.len() == manifest.total_size {
                    log::info!("File {} was downloaded by another thread, using dest path: {:?}", file_id, dest);
                    let _ = cache_state.record_cached_file(&manifest.id, &dest.to_string_lossy(), manifest.total_size).await;
                    return Ok(dest.to_string_lossy().to_string());
                }
            }
        }
        return Err("Download failed in concurrent task".to_string());
    }

    let download_result = cluster_state
        .download_file(manifest.clone(), dest.clone(), Arc::clone(&session_state), Some(app), None)
        .await;

    // Remove file_id from active_downloads and notify any waiters
    {
        let mut active = cluster_state.active_downloads.lock().await;
        if let Some(notify) = active.remove(&file_id) {
            notify.notify_waiters();
        }
    }

    match download_result {
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

    // Run the chunk audit in the background — it has inter-batch delays to avoid FLOOD_WAIT
    // and a 1-hour cooldown, so it's safe to fire-and-forget here.
    {
        let account_id_audit = account_id.clone();
        let session_audit = Arc::clone(&session_state);
        let cluster_audit = Arc::clone(&cluster_state);
        let cache_audit = Arc::clone(&cache_state);
        tokio::spawn(async move {
            log::info!("[audit] Background audit started for {}", account_id_audit);
            let deleted = cluster_audit
                .audit_manifest_chunks(&account_id_audit, Arc::clone(&session_audit), Arc::clone(&cache_audit))
                .await
                .unwrap_or(0);
            if deleted > 0 {
                let _ = cluster_audit
                    .push_manifest(&account_id_audit, Arc::clone(&session_audit), Arc::clone(&cache_audit))
                    .await;
            }
        });
    }


    let mut active = sync_tracker.active_crawlers.lock().await;
    if !active.contains_key(&account_id) {
        let token = tokio_util::sync::CancellationToken::new();
        active.insert(account_id.clone(), token.clone());
        
        let account_id_clone = account_id.clone();
        let session_clone = Arc::clone(&session_state);
        let cluster_clone = Arc::clone(&cluster_state);
        let cache_clone = Arc::clone(&cache_state);
        let tracker_clone = Arc::clone(&sync_tracker);

        tokio::spawn(async move {
            log::info!("Background maintenance crawler spawned for {}", account_id_clone);
            loop {
                tokio::select! {
                    _ = token.cancelled() => {
                        log::info!("Crawler for {} received cancellation signal", account_id_clone);
                        break;
                    }
                    crawl_res = cluster_clone.maintenance_crawl(&account_id_clone, Arc::clone(&session_clone), Arc::clone(&cache_clone)) => {
                        if let Err(e) = crawl_res {
                            let err_msg = e.to_string();
                            if err_msg.contains("code: 26") || err_msg.contains("not a database") {
                                log::warn!("Crawler for {} encountered reset database (code 26). Stopping crawler.", account_id_clone);
                                break;
                            }
                            log::error!("Background crawl error for {}: {}", account_id_clone, e);
                        }
                    }

                }
                
                tokio::select! {
                    _ = token.cancelled() => break,
                    _ = tokio::time::sleep(std::time::Duration::from_secs(30)) => {}
                }

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
    app: tauri::AppHandle,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    file_id: String,
) -> Result<(), String> {
    let manifest = cache_state.get_file_by_id(&file_id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| format!("File {} not found", file_id))?;

    let session_arc = Arc::clone(&session_state);
    let cache_arc = Arc::clone(&cache_state);
    cluster_state.delete_file(manifest, session_arc, Some(cache_arc), Some(app)).await.map_err(|e| e.to_string())?;
    cache_state.delete_file(&file_id).await.map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn format_storage(
    app: tauri::AppHandle,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    account_id: String,
    mode: String, // "ALL" or "APP_DATA"
) -> Result<(), String> {
    let client = session_state.get_client_by_id(&account_id).await
        .ok_or_else(|| "Account not connected".to_string())?;

    // Check if already formatting this account
    {
        let mut active = cluster_state.active_ops.lock().await;
        if active.contains(&account_id) {
            return Err("Formatting already in progress for this account".to_string());
        }
        active.insert(account_id.clone());
    }

    let cluster_clone = Arc::clone(&cluster_state);
    // Spawn a background task for the long-running operation
    tokio::spawn(async move {
        let mut deleted_count = 0;
        let mut messages = client.iter_messages(tl::enums::InputPeer::PeerSelf);
        let mut to_delete = Vec::new();

        use tauri::Emitter;
        let _ = app.emit("format-status", format!("Scanning storage on {}...", account_id));

        let mut process_next = true;
        while process_next {
            match messages.next().await {
                Ok(Some(msg)) => {
                    let should_delete = if mode == "ALL" {
                        true
                    } else {
                        let mut is_folded = false;
                        let text = msg.text();
                        if text.contains("#folded_manifest") {
                            is_folded = true;
                        }
                        if !is_folded {
                            if let Some(media) = msg.media() {
                                if let grammers_client::media::Media::Document(doc) = media {
                                    if let Some(name) = doc.name() {
                                        if name.starts_with("FOLDED-") || name == "manifest.json" {
                                            is_folded = true;
                                        }
                                    }
                                }
                            }
                        }
                        is_folded
                    };

                    if should_delete {
                        to_delete.push(msg.id());
                        deleted_count += 1;
                        
                        if to_delete.len() >= 50 { // Smaller batches for better feedback
                            let batch = to_delete.split_off(0);
                            let _ = app.emit("format-status", format!("Deleting batch... (Total: {})", deleted_count));
                            if let Err(e) = client.invoke(&tl::functions::messages::DeleteMessages {
                                id: batch,
                                revoke: true,
                            }).await {
                                let _ = app.emit("format-error", e.to_string());
                                return;
                            }
                            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                        }
                    }
                }
                Ok(None) => {
                    process_next = false;
                }
                Err(e) => {
                    let err_msg = e.to_string();
                    log::error!("Format error during message iteration: {}", err_msg);
                    let _ = app.emit("format-error", err_msg);
                    return;
                }
            }
        }

        if !to_delete.is_empty() {
            let _ = app.emit("format-status", format!("Finalizing... (Total: {})", deleted_count));
            if let Err(e) = client.invoke(&tl::functions::messages::DeleteMessages {
                id: to_delete,
                revoke: true,
            }).await {
                let _ = app.emit("format-error", e.to_string());
                return;
            }
        }
        log::info!("FORMAT TASK: Completed successfully. Deleted {} messages.", deleted_count);
        {
            let mut active = cluster_clone.active_ops.lock().await;
            active.remove(&account_id);
        }
        let _ = app.emit("format-finished", deleted_count);
    });

    Ok(())
}
