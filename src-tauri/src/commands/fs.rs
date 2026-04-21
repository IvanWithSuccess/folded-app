use tauri::State;
use std::sync::Arc;
use std::path::PathBuf;
use crate::session_manager::SessionManager;
use crate::cluster::{ClusterOrchestrator, FileManifest};
use crate::cache::{MetadataCache, FolderInfo};

#[tauri::command]
pub async fn cluster_upload_file(
    app: tauri::AppHandle,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    file_path: String,
    folder_id: Option<String>,
    account_id: Option<String>,
) -> Result<(), String> {
    let path = PathBuf::from(file_path);
    let file_name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
    
    let aid = account_id.clone().ok_or_else(|| "Account ID required".to_string())?;
    
    match cluster_state.upload_file(path, Arc::clone(&session_state), file_name, Some(app), folder_id, aid).await {
        Ok(mut manifest) => {
            manifest.account_id = account_id;
            cache_state.save_file(manifest).await.map_err(|e| e.to_string())
        },
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn upload_directory(
    app: tauri::AppHandle,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    directory_path: String,
    target_parent_id: Option<String>,
    account_id: String,
) -> Result<(), String> {
    let root_path = PathBuf::from(&directory_path);
    if !root_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    use std::collections::HashMap;
    let mut folder_mapping: HashMap<PathBuf, String> = HashMap::new();
    
    let root_folder_name = root_path.file_name().unwrap_or_default().to_string_lossy().into_owned();
    let root_folder_id = cache_state.create_folder(root_folder_name, target_parent_id, Some(account_id.clone())).await.map_err(|e| e.to_string())?;
    folder_mapping.insert(root_path.clone(), root_folder_id);

    let mut it = walkdir::WalkDir::new(&root_path).into_iter();
    it.next(); 

    for entry in it {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path().to_path_buf();
        let parent = path.parent().unwrap_or(&root_path);
        let remote_parent_id = folder_mapping.get(parent).cloned().unwrap_or_default();

        if entry.file_type().is_dir() {
            let name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
            let new_fid = cache_state.create_folder(name, Some(remote_parent_id), Some(account_id.clone())).await.map_err(|e| e.to_string())?;
            folder_mapping.insert(path, new_fid);
        } else {
            let file_name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
            match cluster_state.upload_file(path, Arc::clone(&session_state), file_name, Some(app.clone()), Some(remote_parent_id), account_id.clone()).await {
                Ok(mut manifest) => {
                    manifest.account_id = Some(account_id.clone());
                    cache_state.save_file(manifest).await.map_err(|e| e.to_string())?;
                },
                Err(e) => eprintln!("Failed to upload file {}: {}", entry.path().display(), e),
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn cluster_list_files(
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<FileManifest>, String> {
    cache_state.get_files().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_folder(
    cache_state: State<'_, Arc<MetadataCache>>,
    name: String,
    parent_id: Option<String>,
    account_id: Option<String>,
) -> Result<String, String> {
    cache_state.create_folder(name, parent_id, account_id).await.map_err(|e| e.to_string())
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
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
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

    for file in files_to_delete {
        let session_arc = Arc::clone(&session_state);
        if let Err(e) = cluster_state.delete_file(file, session_arc).await {
            log::warn!("Failed to delete file from Telegram during folder delete: {}", e);
        }
    }

    cache_state.delete_folder_recursive(&folder_id).await.map_err(|e| e.to_string())?;
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
        "file" => cache_state.rename_file(&item_id, &new_name).await.map_err(|e| e.to_string()),
        "folder" => cache_state.rename_folder(&item_id, &new_name).await.map_err(|e| e.to_string()),
        _ => Err("Unknown item type".to_string()),
    }
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
