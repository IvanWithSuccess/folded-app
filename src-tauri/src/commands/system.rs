use tauri::State;
use std::sync::Arc;
use crate::session_manager::SessionManager;
use crate::cluster::ClusterOrchestrator;
use crate::cache::MetadataCache;
use grammers_tl_types as tl;
use grammers_client::media::Media;
use grammers_client::message::InputMessage;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
fn create_cmd(program: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    cmd
}

#[tauri::command]
pub async fn open_system_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "windows")]
    create_cmd("cmd").args(["/C", "start", "", &path]).spawn().map_err(|e| e.to_string())?;
    
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
    app_handle: tauri::AppHandle,
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    file_id: String,
    target_chat_id: i64,
) -> Result<(), String> {
    let manifest = cache_state.get_file_by_id(&file_id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| "File not found".to_string())?;

    // Check Telegram limits (2GB for standard users)
    let limit_2gb = 2 * 1024 * 1024 * 1024;
    if manifest.total_size > limit_2gb {
        return Err(format!(
            "File is too large to share via Telegram ({} GB). Telegram limits single file sharing to 2 GB.",
            (manifest.total_size as f64 / (1024.0 * 1024.0 * 1024.0)).round()
        ));
    }
    
    let chunk = manifest.chunks.first().ok_or_else(|| "No chunks available".to_string())?;
    let client = session_state.get_client_by_id(&chunk.account_id).await
        .ok_or_else(|| "Account not connected".to_string())?;
    
    // 1. Get or Download the file
    let temp_path = if let Some(cached_path) = cache_state.get_cached_file(&file_id).await {
        std::path::PathBuf::from(cached_path)
    } else {
        let app_data = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
        let tmp_dir = app_data.join("tmp");
        if !tmp_dir.exists() {
            std::fs::create_dir_all(&tmp_dir).map_err(|e| e.to_string())?;
        }
        let download_path = tmp_dir.join(format!("{}_{}", file_id, manifest.name));
        cluster_state.download_file(manifest.clone(), download_path.clone(), Arc::clone(&session_state), None, None)
            .await.map_err(|e| format!("Download failed: {}", e))?;
        download_path
    };

    // 2. Find target peer
    let mut dialogs = client.iter_dialogs();
    let mut target_peer = None;
    while let Some(dialog) = dialogs.next().await.map_err(|e: grammers_client::InvocationError| e.to_string())? {
        if dialog.peer.id().bare_id() == target_chat_id {
            target_peer = Some(dialog.peer.clone());
            break;
        }
    }
    
    let peer = target_peer.ok_or_else(|| "Could not find target contact in dialogs.".to_string())?;
    
    // 3. Upload and Send
    let mut file = tokio::fs::File::open(&temp_path).await.map_err(|e: std::io::Error| e.to_string())?;
    let metadata = file.metadata().await.map_err(|e: std::io::Error| e.to_string())?;
    let stream_size = metadata.len() as usize;
    
    let uploaded_file = client.upload_stream(&mut file, stream_size, manifest.name.clone()).await
        .map_err(|e: std::io::Error| format!("Upload failed: {}", e))?;
    
    let input_peer = match peer {
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

    client.send_message(&input_peer, InputMessage::new().document(uploaded_file)).await
        .map_err(|e: grammers_client::InvocationError| format!("Send failed: {}", e))?;

    // 4. Cleanup if it was a temporary download (not from cache)
    if !temp_path.to_string_lossy().contains("cache") {
        let _ = tokio::fs::remove_file(&temp_path).await;
    }
    
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
    
    #[cfg(target_os = "windows")]
    {
        // On Windows, the WebDAV drive is mounted as Z: by default.
        // If the source_path is a local path (like C:\Users\...\FoldedCloud), we point it to the mounted Z:\ drive instead.
        let target_path = if source_path.contains("FoldedCloud") {
            "Z:\\".to_string()
        } else {
            source_path
        };
        
        let destination_lnk = std::path::Path::new(&destination_folder).join("FoldedCloud.lnk");
        let script = format!(
            "$WshShell = New-Object -ComObject WScript.Shell; \
             $Shortcut = $WshShell.CreateShortcut('{}'); \
             $Shortcut.TargetPath = '{}'; \
             $Shortcut.Save()",
            destination_lnk.to_string_lossy().replace('\'', "''"),
            target_path.replace('\'', "''")
        );
        let _ = create_cmd("powershell")
            .args(["-NoProfile", "-Command", &script])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (source_path, destination_folder);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_home_dir() -> Result<String, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| "/tmp".into());
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
            cluster_state.download_file(manifest, dest, Arc::clone(&session_state), None, None).await.map_err(|e| e.to_string())?;
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
        cluster_state.download_file(f, file_dest, Arc::clone(session_state), None, None).await.map_err(|e| e.to_string())?;
    }

    let subfolders = cache_state.get_folders_in(Some(folder_id.to_string()), None).await.map_err(|e| e.to_string())?;
    for sf in subfolders {
        let sub_dest = dest_path.join(&sf.name);
        Box::pin(download_folder_recursive(&sf.id, &sub_dest, session_state, cluster_state, cache_state)).await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_system_report() -> Result<serde_json::Value, String> {
    let home_dir = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).map_err(|_| "Could not find home directory".to_string())?;
    let app_data_dir = std::path::PathBuf::from(home_dir).join(".folded");
    let log_path = app_data_dir.join("app.log");
    
    let run_cmd = |cmd: &str, args: &[&str]| -> String {
        #[cfg(target_os = "windows")]
        let mut command = create_cmd(cmd);
        #[cfg(not(target_os = "windows"))]
        let mut command = std::process::Command::new(cmd);
        
        command
            .args(args)
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .unwrap_or_else(|_| "Unknown".to_string())
    };

    #[cfg(target_os = "macos")]
    let device_model = run_cmd("sysctl", &["-n", "hw.model"]);
    #[cfg(target_os = "macos")]
    let os_name = run_cmd("sw_vers", &["-productName"]);
    #[cfg(target_os = "macos")]
    let os_version = run_cmd("sw_vers", &["-productVersion"]);

    #[cfg(target_os = "windows")]
    let device_model = run_cmd("powershell", &["-NoProfile", "-Command", "(Get-CimInstance Win32_ComputerSystem).Model"]);
    #[cfg(target_os = "windows")]
    let os_name = "Windows".to_string();
    #[cfg(target_os = "windows")]
    let os_version = run_cmd("powershell", &["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).Caption + ' ' + (Get-CimInstance Win32_OperatingSystem).Version"]);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let device_model = "Unknown".to_string();
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let os_name = std::env::consts::OS.to_string();
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let os_version = "Unknown".to_string();
    let arch = std::env::consts::ARCH;
    let app_version = env!("CARGO_PKG_VERSION");
    let local_time = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let logs = std::fs::read_to_string(&log_path)
        .unwrap_or_else(|_| "No logs found".to_string());
    
    let log_lines: Vec<&str> = logs.lines().collect();
    let last_lines = if log_lines.len() > 50 {
        &log_lines[log_lines.len() - 50..]
    } else {
        &log_lines[..]
    };
    let logs_summary = last_lines.join("\n");

    Ok(serde_json::json!({
        "device_model": device_model,
        "os_name": os_name,
        "os_version": os_version,
        "arch": arch,
        "app_version": app_version,
        "local_time": local_time,
        "logs": logs_summary,
    }))
}

