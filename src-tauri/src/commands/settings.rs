use tauri::State;
use std::sync::Arc;
use crate::cache::MetadataCache;
use crate::sync_tracker::SyncTracker;

#[tauri::command]
pub async fn get_setting(
    cache_state: State<'_, Arc<MetadataCache>>,
    key: String,
) -> Result<Option<String>, String> {
    cache_state.get_setting(&key).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_setting(
    app: tauri::AppHandle,
    cache_state: State<'_, Arc<MetadataCache>>,
    key: String,
    value: String,
) -> Result<(), String> {
    cache_state.update_setting(&key, &value).await.map_err(|e| e.to_string())?;

    // Immediate action for certain settings
    if key == "show_tray_icon" {
        let visible = value == "true";
        if let Some(tray) = app.tray_by_id("main-tray") {
            let _ = tray.set_visible(visible);
        }
    } else if key == "launch_on_startup" {
        let enable = value == "true";
        let _ = crate::os_integration::set_autostart(enable);
    } else if key == "mount_drive" {
        let enable = value == "true";
        if enable {
            // Re-mount (assuming port 9876 for now, which is the default)
            let _ = crate::os_integration::mount_drive(9876, "Z:", None);
        } else {
            // Unmount
            let _ = crate::os_integration::unmount_drive("Z:", None);
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn purge_local_cache(
    cache_state: State<'_, Arc<MetadataCache>>,
    sync_tracker: State<'_, Arc<SyncTracker>>,
    _mirror_manager: State<'_, Arc<crate::cluster::mirrors::MirrorManager>>,
) -> Result<(), String> {
    log::warn!("SYSTEM: GLOBAL PURGE INITIATED. Stopping all background tasks...");
    
    // 1. Stop all background crawlers
    sync_tracker.stop_all().await;
    
    // 2. Stop all file mirrors
    // We don't have a global stop_all for mirrors yet, so we'll just let them fail or we can add one.
    // For now, stopping crawlers is the most important to stop DB writes.
    
    // 3. Purge metadata
    cache_state.purge_all_metadata().await.map_err(|e| e.to_string())
}
