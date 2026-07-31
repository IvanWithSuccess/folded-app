use tauri::State;
use std::sync::Arc;
use std::path::PathBuf;
use crate::session_manager::SessionManager;
use crate::cluster::{ClusterOrchestrator, FileManifest};
use crate::cache::{MetadataCache, FolderInfo, PendingTask};
use crate::cluster::task_manager::TaskManager;

#[tauri::command]
pub async fn cluster_upload_file(
    cache_state: State<'_, Arc<MetadataCache>>,
    file_path: String,
    folder_id: Option<String>,
    account_id: Option<String>,
) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    let file_name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
    let aid = account_id.ok_or_else(|| "Account ID required".to_string())?;

    let payload = serde_json::json!({
        "file_path": file_path,
        "file_name": file_name,
        "account_id": aid,
        "folder_id": folder_id
    });

    cache_state.enqueue_task("UPLOAD_FILE", &payload.to_string())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn upload_directory(
    cache_state: State<'_, Arc<MetadataCache>>,
    directory_path: String,
    target_parent_id: Option<String>,
    account_id: String,
) -> Result<(), String> {
    let payload = serde_json::json!({
        "directory_path": directory_path,
        "target_parent_id": target_parent_id,
        "account_id": account_id
    });

    cache_state.enqueue_task("UPLOAD_FOLDER", &payload.to_string())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn cluster_list_files(
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<FileManifest>, String> {
    cache_state.get_files().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_tasks(
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<PendingTask>, String> {
    cache_state.get_pending_tasks().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_folder(
    cache_state: State<'_, Arc<MetadataCache>>,
    name: String,
    parent_id: Option<String>,
    account_id: Option<String>,
) -> Result<String, String> {
    let id = cache_state.create_folder(name.clone(), parent_id, account_id).await.map_err(|e| e.to_string())?;
    let _ = cache_state.log_activity(&id, &name, "FOLDER", "CREATE", None).await;
    Ok(id)
}

#[tauri::command]
pub async fn list_folder_content(
    cache_state: State<'_, Arc<MetadataCache>>,
    folder_id: Option<String>,
    account_id: Option<String>,
) -> Result<(Vec<FolderInfo>, Vec<FileManifest>), String> {
    let folders = cache_state.get_folders_in(folder_id.clone(), account_id.clone()).await.map_err(|e| e.to_string())?;
    let files = cache_state.get_files_in(folder_id, account_id).await.map_err(|e| e.to_string())?;
    Ok((folders, files))
}

#[tauri::command]
pub async fn delete_folder(
    app: tauri::AppHandle,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    task_manager: State<'_, Arc<TaskManager>>,
    folder_id: String,
) -> Result<(), String> {
    let files_to_delete = {
        let mut all_files = Vec::new();
        let mut folder_queue = vec![folder_id.clone()];
        while let Some(fid) = folder_queue.pop() {
            let subfolders = cache_state.get_folders_in(Some(fid.clone()), None).await.map_err(|e| e.to_string())?;
            for sf in subfolders {
                folder_queue.push(sf.id);
            }
            let files = cache_state.get_files_in(Some(fid), None).await.map_err(|e| e.to_string())?;
            all_files.extend(files);
        }
        all_files
    };

    // Cancel any active upload tasks for this folder
    task_manager.cancel_tasks_by_folder(&folder_id).await;

    // Delete from cache immediately so the UI responds instantly
    cache_state.delete_folder_recursive(&folder_id).await.map_err(|e| e.to_string())?;

    // Spawn a background task to clean up files from Telegram
    let session_arc = Arc::clone(&session_state);
    let cluster_arc = Arc::clone(&cluster_state);
    let cache_arc = Arc::clone(&cache_state);
    let app_handle = app.clone();
    
    tokio::spawn(async move {
        log::info!("Starting background cleanup of {} files from deleted folder", files_to_delete.len());
        for file in files_to_delete {
            let session = Arc::clone(&session_arc);
            let cache = Arc::clone(&cache_arc);
            if let Err(e) = cluster_arc.delete_file(file, session, Some(cache), Some(app_handle.clone())).await {
                log::warn!("Failed to delete file from Telegram during background folder delete: {}", e);
            }
        }
        log::info!("Background folder cleanup completed.");
    });

    Ok(())
}


#[tauri::command]
pub async fn rename_item(
    cache_state: State<'_, Arc<MetadataCache>>,
    item_id: String,
    new_name: String,
    item_type: String, 
) -> Result<(), String> {
    match item_type.as_str() {
        "file" => cache_state.rename_file(&item_id, &new_name).await.map_err(|e| e.to_string())?,
        "folder" => cache_state.rename_folder(&item_id, &new_name).await.map_err(|e| e.to_string())?,
        _ => return Err("Unknown item type".to_string()),
    };
    let _ = cache_state.log_activity(&item_id, &new_name, &item_type.to_uppercase(), "RENAME", None).await;
    Ok(())
}

#[tauri::command]
pub async fn move_item(
    cache_state: State<'_, Arc<MetadataCache>>,
    item_id: String,
    new_parent_id: Option<String>,
    item_type: String, 
) -> Result<(), String> {
    match item_type.as_str() {
        "file" => cache_state.move_file(&item_id, new_parent_id).await.map_err(|e| e.to_string()),
        "folder" => cache_state.move_folder(&item_id, new_parent_id).await.map_err(|e| e.to_string()),
        _ => Err("Unknown item type".to_string()),
    }
}

#[tauri::command]
pub async fn copy_item(
    cache_state: State<'_, Arc<MetadataCache>>,
    item_id: String,
    new_parent_id: Option<String>,
    item_type: String,
) -> Result<String, String> {
    match item_type.as_str() {
        "file" => cache_state.copy_file(&item_id, new_parent_id, None).await.map_err(|e| e.to_string()),
        "folder" => cache_state.copy_folder(&item_id, new_parent_id, None).await.map_err(|e| e.to_string()),
        _ => Err("Unknown item type".to_string()),
    }
}

#[tauri::command]
pub async fn global_search(
    cache_state: State<'_, Arc<MetadataCache>>,
    query: String,
) -> Result<Vec<FileManifest>, String> {
    cache_state.search_files_global(&query).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_item_path(
    cache_state: State<'_, Arc<MetadataCache>>,
    item_id: String,
) -> Result<Vec<String>, String> {
    // Check if it's a file first to get its parent directory
    let folder_id = if let Some(file) = cache_state.get_file_by_id(&item_id).await.map_err(|e| e.to_string())? {
        file.folder_id
    } else {
        // If not a file, assume it's a folder ID
        Some(item_id)
    };

    if let Some(fid) = folder_id {
        cache_state.get_folder_path_ids(&fid).await.map_err(|e| e.to_string())
    } else {
        Ok(vec![]) // Root
    }
}

#[tauri::command]
pub async fn toggle_item_starred(
    cache_state: State<'_, Arc<MetadataCache>>,
    id: String,
    item_type: String,
    starred: bool,
) -> Result<(), String> {
    cache_state.toggle_starred(&id, &item_type, starred).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_category_content(
    cache_state: State<'_, Arc<MetadataCache>>,
    category: String,
    account_id: String,
) -> Result<(Vec<FolderInfo>, Vec<FileManifest>), String> {
    cache_state.get_category_content(&account_id, &category).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_item_history(
    cache_state: State<'_, Arc<MetadataCache>>,
    item_id: String,
) -> Result<Vec<crate::cache::ActivityEntry>, String> {
    cache_state.get_item_history(&item_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_recent_activity(
    cache_state: State<'_, Arc<MetadataCache>>,
    limit: Option<i64>,
) -> Result<Vec<crate::cache::ActivityEntry>, String> {
    cache_state.get_recent_activity(limit.unwrap_or(30)).await.map_err(|e| e.to_string())
}

