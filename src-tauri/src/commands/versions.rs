use tauri::State;
use std::sync::Arc;
use crate::session_manager::SessionManager;
use crate::cluster::{ClusterOrchestrator, FileManifest};
use crate::cache::{MetadataCache, FolderHistoryEvent};

/// Get all versions of a file (current + archived).
#[tauri::command]
pub async fn get_file_versions(
    file_id: String,
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<FileManifest>, String> {
    cache_state.get_file_versions(&file_id).await
        .map_err(|e| e.to_string())
}

/// Restore an older version: re-uploads it as a new current version.
/// Also writes the file to disk if part of a mirrored folder.
#[tauri::command]
pub async fn restore_file_version(
    version_file_id: String,
    cache_state: State<'_, Arc<MetadataCache>>,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
) -> Result<(), String> {
    // 1. Get the version manifest
    let version = cache_state.get_file_by_id(&version_file_id).await
        .map_err(|e| e.to_string())?
        .ok_or("Version not found".to_string())?;

    // 2. Find the current version (same name/folder, is_current_version=TRUE)
    let current_files = cache_state.get_files_in(version.folder_id.clone(), version.account_id.clone()).await
        .map_err(|e| e.to_string())?;
    let current = current_files.into_iter().find(|f| f.name == version.name && f.id != version_file_id);

    // 3. Download the old version to a temp file
    let tmp_dir = std::env::temp_dir();
    let tmp_path = tmp_dir.join(format!("{}_restore_{}", &version_file_id[..8], &version.name));
    
    cluster_state.download_file(
        version.clone(),
        tmp_path.clone(),
        Arc::clone(&session_state),
        None,
        None,
    ).await.map_err(|e| e.to_string())?;

    // 4. Upload it as a new version
    let new_manifest = cluster_state.upload_file(
        tmp_path.clone(),
        Arc::clone(&session_state),
        Arc::clone(&cache_state),
        version.name.clone(),
        None,
        version.folder_id.clone(),
        version.account_id.clone().unwrap_or_default(),
        None,
        None,
    ).await.map_err(|e| e.to_string())?;

    // 5. Set the new version as current (archives old current)
    if let Some(old_current) = current {
        cache_state.set_new_current_version(&old_current.id, new_manifest.clone()).await
            .map_err(|e| e.to_string())?;
    } else {
        cache_state.save_file(new_manifest.clone()).await
            .map_err(|e| e.to_string())?;
    }

    // 6. Log folder event
    if let Some(folder_id) = &version.folder_id {
        let _ = cache_state.log_folder_event(
            folder_id,
            "FILE_RESTORED",
            &version.name,
            Some(&new_manifest.id),
            Some(&format!("Restored from archived version {}", &version_file_id[..8])),
        ).await;
    }

    // 7. Write to local disk if part of a mirror rule
    let rules = cache_state.get_mirror_rules().await.map_err(|e| e.to_string())?;
    for rule in rules {
        if Some(&rule.account_id) == version.account_id.as_ref() {
            let local_path = std::path::PathBuf::from(&rule.local_path).join(&version.name);
            if let Err(e) = tokio::fs::copy(&tmp_path, &local_path).await {
                log::warn!("Could not write restored file to disk at {:?}: {}", local_path, e);
            } else {
                log::info!("Restored file written to disk: {:?}", local_path);
            }
        }
    }

    let _ = tokio::fs::remove_file(&tmp_path).await;
    Ok(())
}

/// Download a specific version of a file to the user's Downloads folder.
#[tauri::command]
pub async fn download_file_version(
    version_file_id: String,
    cache_state: State<'_, Arc<MetadataCache>>,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
) -> Result<String, String> {
    let version = cache_state.get_file_by_id(&version_file_id).await
        .map_err(|e| e.to_string())?
        .ok_or("Version not found".to_string())?;

    let home = std::env::var("HOME").unwrap_or_default();
    let downloads = if !home.is_empty() {
        std::path::PathBuf::from(home).join("Downloads")
    } else {
        std::env::temp_dir()
    };
    let dest_path = downloads.join(&version.name);

    cluster_state.download_file(
        version.clone(),
        dest_path.clone(),
        Arc::clone(&session_state),
        None,
        None,
    ).await.map_err(|e| e.to_string())?;

    Ok(dest_path.to_string_lossy().to_string())
}

/// Get the history log for a folder.
#[tauri::command]
pub async fn get_folder_history(
    folder_id: String,
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<FolderHistoryEvent>, String> {
    cache_state.get_folder_history(&folder_id).await
        .map_err(|e| e.to_string())
}

/// Restore a soft-deleted file (one deleted from a mirrored local folder).
/// Re-downloads to disk and makes it visible in FileManager again.
#[tauri::command]
pub async fn restore_deleted_item(
    file_id: String,
    cache_state: State<'_, Arc<MetadataCache>>,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
) -> Result<(), String> {
    let file = cache_state.get_soft_deleted_file(&file_id).await
        .map_err(|e| e.to_string())?
        .ok_or("File not found".to_string())?;

    // Download to temp
    let tmp_dir = std::env::temp_dir();
    let tmp_path = tmp_dir.join(format!("mrestore_{}_{}", &file_id[..8], &file.name));
    
    cluster_state.download_file(
        file.clone(),
        tmp_path.clone(),
        Arc::clone(&session_state),
        None,
        None,
    ).await.map_err(|e| e.to_string())?;

    // Find mirror rule to determine where to restore on disk
    let rules = cache_state.get_mirror_rules().await.map_err(|e| e.to_string())?;
    let mut restored_to_disk = false;
    for rule in &rules {
        if Some(&rule.account_id) == file.account_id.as_ref() {
            let local_path = std::path::PathBuf::from(&rule.local_path).join(&file.name);
            if let Ok(_) = tokio::fs::copy(&tmp_path, &local_path).await {
                log::info!("Mirror-deleted file restored to disk: {:?}", local_path);
                restored_to_disk = true;
                break;
            }
        }
    }
    if !restored_to_disk {
        log::warn!("Could not find mirror rule to restore {} to disk", file.name);
    }

    // Clear soft-delete flag
    cache_state.restore_soft_deleted_file(&file_id).await
        .map_err(|e| e.to_string())?;

    // Log folder event
    if let Some(folder_id) = &file.folder_id {
        let _ = cache_state.log_folder_event(
            folder_id,
            "FILE_RESTORED",
            &file.name,
            Some(&file_id),
            Some("Restored from mirror deletion history"),
        ).await;
    }

    let _ = tokio::fs::remove_file(&tmp_path).await;
    Ok(())
}

/// Delete a file and ALL its version history from Telegram and DB.
#[tauri::command]
pub async fn delete_file_with_all_versions(
    file_id: String,
    cache_state: State<'_, Arc<MetadataCache>>,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
) -> Result<(), String> {
    let all_versions = cache_state.get_all_file_versions_for_delete(&file_id).await
        .map_err(|e| e.to_string())?;

    let folder_id = all_versions.first().and_then(|f| f.folder_id.clone()).unwrap_or_default();
    let file_name = all_versions.first().map(|f| f.name.clone()).unwrap_or_default();

    for version in all_versions {
        if let Err(e) = cluster_state.delete_file(
            version.clone(),
            Arc::clone(&session_state),
            None,
            None,
        ).await {

            log::warn!("Could not delete version {} from Telegram: {}", version.id, e);
        }
        if let Err(e) = cache_state.delete_file(&version.id).await {
            log::warn!("Could not delete version {} from DB: {}", version.id, e);
        }
    }

    let _ = cache_state.log_folder_event(
        &folder_id,
        "FILE_REMOVED",
        &file_name,
        None,
        Some("Permanently deleted with all versions"),
    ).await;

    Ok(())
}
