use tauri::State;
use std::sync::Arc;
use crate::session_manager::SessionManager;
use crate::cluster::ClusterOrchestrator;
use crate::cache::MetadataCache;
use grammers_tl_types as tl;
use grammers_client::media::Media;

#[tauri::command]
pub async fn open_system_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd").args(["/C", "start", "", &path]).spawn().map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn read_preview_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_file_preview(
    app_handle: tauri::AppHandle,
    session_state: State<'_, Arc<SessionManager>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    file_id: String,
) -> Result<String, String> {
    use tauri::Manager;
    
    let manifest = cache_state.get_file_by_id(&file_id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| "File not found".to_string())?;
    
    let previews_dir = app_handle.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("previews");
    
    if !previews_dir.exists() {
        std::fs::create_dir_all(&previews_dir).map_err(|e| e.to_string())?;
    }
    
    let preview_path = previews_dir.join(format!("{}.jpg", file_id));
    
    if preview_path.exists() {
        return Ok(preview_path.to_string_lossy().to_string());
    }

    let chunk = manifest.chunks.first().ok_or_else(|| "No chunks available".to_string())?;
    let client = session_state.get_client_by_id(&chunk.account_id).await
        .ok_or_else(|| "Account not connected".to_string())?;
    
    let peer = if let Some(hub_id) = manifest.storage_hub_id {
        tl::enums::InputPeer::Channel(tl::types::InputPeerChannel {
            channel_id: hub_id,
            access_hash: manifest.storage_hub_access_hash.unwrap_or(0),
        })
    } else {
        tl::enums::InputPeer::PeerSelf
    };

    let message_ids = vec![chunk.message_id as i32];
    let messages = client.get_messages_by_id(&peer, &message_ids).await
        .map_err(|e: grammers_client::InvocationError| format!("Telegram API Error: {}", e))?;
    
    let message = messages.into_iter().next().flatten()
        .ok_or_else(|| "Message not found in Telegram".to_string())?;
    
    if let Some(media) = message.media() {
        let thumb_opt = match media {
            Media::Photo(p) => p.thumbs().get(0).cloned(),
            Media::Document(d) => d.thumbs().get(0).cloned(),
            _ => None,
        };

        if let Some(thumb) = thumb_opt {
            client.download_media(&thumb, &preview_path).await
                .map_err(|e| format!("Download failed: {}", e))?;
            
            return Ok(preview_path.to_string_lossy().to_string());
        }
    }
    
    Err("No thumbnail available for this file".to_string())
}

#[tauri::command]
pub async fn get_chats(
    session_state: State<'_, Arc<SessionManager>>,
    account_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    let client = session_state.get_client_by_id(&account_id).await
        .ok_or_else(|| "Account not connected".to_string())?;
    
    let mut dialogs = client.iter_dialogs();
    let mut results = Vec::new();
    let mut count = 0;
    
    while let Some(dialog) = dialogs.next().await.map_err(|e: grammers_client::InvocationError| e.to_string())? {
        let (raw_id, title) = match &dialog.peer {
            grammers_client::peer::Peer::User(u) => (u.id().bare_id(), u.first_name().unwrap_or("User").to_string()),
            grammers_client::peer::Peer::Group(g) => (g.id().bare_id(), g.title().unwrap_or("Group").to_string()),
            grammers_client::peer::Peer::Channel(c) => (c.id().bare_id(), c.title().to_string()),
        };
        
        results.push(serde_json::json!({
            "id": raw_id,
            "title": title,
            "username": match &dialog.peer {
                grammers_client::peer::Peer::User(u) => u.username().map(String::from),
                grammers_client::peer::Peer::Group(g) => g.username().map(String::from),
                grammers_client::peer::Peer::Channel(c) => c.username().map(String::from),
            }
        }));
        count += 1;
        if count >= 30 { break; }
    }
    
    Ok(results)
}

#[tauri::command]
pub async fn share_file(
    session_state: State<'_, Arc<SessionManager>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    file_id: String,
    target_chat_id: i64,
) -> Result<(), String> {
    let manifest = cache_state.get_file_by_id(&file_id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| "File not found".to_string())?;
    
    let chunk = manifest.chunks.first().ok_or_else(|| "No chunks available".to_string())?;
    let client = session_state.get_client_by_id(&chunk.account_id).await
        .ok_or_else(|| "Account not connected".to_string())?;
    
    let mut dialogs = client.iter_dialogs();
    let mut target_peer = None;
    while let Some(dialog) = dialogs.next().await.map_err(|e: grammers_client::InvocationError| e.to_string())? {
        if dialog.peer.id().bare_id() == target_chat_id {
            target_peer = Some(dialog.peer.clone());
            break;
        }
    }
    
    let peer = target_peer.ok_or_else(|| "Could not find target contact in dialogs.".to_string())?;
    
    let to_peer = match peer {
        grammers_client::peer::Peer::User(u) => tl::enums::InputPeer::User(tl::types::InputPeerUser {
            user_id: u.id().bare_id(),
            access_hash: 0, 
        }),
        grammers_client::peer::Peer::Group(g) => tl::enums::InputPeer::Chat(tl::types::InputPeerChat {
            chat_id: g.id().bare_id(),
        }),
        grammers_client::peer::Peer::Channel(c) => tl::enums::InputPeer::Channel(tl::types::InputPeerChannel {
            channel_id: c.id().bare_id(),
            access_hash: 0,
        }),
    };

    let request = tl::functions::messages::ForwardMessages {
        silent: false,
        background: false,
        with_my_score: false,
        drop_author: false,
        drop_media_captions: false,
        noforwards: false,
        from_peer: tl::enums::InputPeer::PeerSelf,
        id: vec![chunk.message_id as i32],
        random_id: vec![uuid::Uuid::new_v4().as_u128() as i64],
        to_peer,
        top_msg_id: None,
        reply_to: None,
        schedule_date: None,
        schedule_repeat_period: None,
        send_as: None,
        quick_reply_shortcut: None,
        allow_paid_floodskip: false,
        effect: None,
        video_timestamp: None,
        allow_paid_stars: None,
        suggested_post: None,
    };

    client.invoke(&request).await.map_err(|e: grammers_client::InvocationError| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn mount_drive() -> Result<String, String> {
    crate::os_integration::mount_drive(9876, "Z:", None)
        .map_err(|e| e.to_string())?;
    Ok("Drive mounted".to_string())
}

#[tauri::command]
pub async fn unmount_drive() -> Result<String, String> {
    crate::os_integration::unmount_drive("Z:", None)
        .map_err(|e| e.to_string())?;
    Ok("Drive unmounted".to_string())
}

#[tauri::command]
pub async fn create_alias(source_path: String, destination_folder: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "tell application \"Finder\"
                set sourceFile to POSIX file \"{}\"
                set targetFolder to POSIX file \"{}\"
                make new alias file at targetFolder to sourceFile
            end tell",
            source_path, destination_folder
        );
        let _ = std::process::Command::new("osascript").args(["-e", &script]).spawn().map_err(|e| e.to_string())?;
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (source_path, destination_folder);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_home_dir() -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
    Ok(home)
}

#[tauri::command]
pub async fn download_items_to_path(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    item_ids: Vec<String>,
    item_types: Vec<String>,
    target_path: String,
) -> Result<(), String> {
    for (id, itype) in item_ids.into_iter().zip(item_types.into_iter()) {
        if itype == "folder" {
            let folder = cache_state.get_folders_by_ids(vec![id.clone()]).await
                .map_err(|e| e.to_string())?.into_iter().next()
                .ok_or_else(|| format!("Folder {} not found", id))?;
            
            let dest = std::path::Path::new(&target_path).join(&folder.name);
            download_folder_recursive(&id, &dest, &session_state, &cluster_state, &cache_state).await?;
        } else {
            let manifest = cache_state.get_file_by_id(&id).await.map_err(|e| e.to_string())?
                .ok_or_else(|| format!("File {} not found", id))?;
            let dest = std::path::Path::new(&target_path).join(&manifest.name);
            cluster_state.download_file(manifest, dest, Arc::clone(&session_state), None).await.map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

async fn download_folder_recursive(
    folder_id: &str,
    dest_path: &std::path::Path,
    session_state: &Arc<SessionManager>,
    cluster_state: &Arc<ClusterOrchestrator>,
    cache_state: &Arc<MetadataCache>,
) -> Result<(), String> {
    std::fs::create_dir_all(dest_path).map_err(|e| e.to_string())?;

    let files = cache_state.get_files_in(Some(folder_id.to_string()), None).await.map_err(|e| e.to_string())?;
    for f in files {
        let file_dest = dest_path.join(&f.name);
        cluster_state.download_file(f, file_dest, Arc::clone(session_state), None).await.map_err(|e| e.to_string())?;
    }

    let subfolders = cache_state.get_folders_in(Some(folder_id.to_string()), None).await.map_err(|e| e.to_string())?;
    for sf in subfolders {
        let sub_dest = dest_path.join(&sf.name);
        Box::pin(download_folder_recursive(&sf.id, &sub_dest, session_state, cluster_state, cache_state)).await?;
    }

    Ok(())
}
