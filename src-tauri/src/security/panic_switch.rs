use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::Emitter;
use crate::security::secure_wipe::wipe_directory;

pub static IS_PANIC_ACTIVE: AtomicBool = AtomicBool::new(false);
pub static REGISTERED_CACHE_DIR: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn set_panic_cache_dir(dir: PathBuf) {
    if let Ok(mut guard) = REGISTERED_CACHE_DIR.lock() {
        *guard = Some(dir);
    }
}

/// Triggers an immediate, emergency Panic Wipe.
/// Unmounts connections, shreds local caches, wipes memory buffers, and locks the vault.
pub fn trigger_panic<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) -> Result<(), anyhow::Error> {
    IS_PANIC_ACTIVE.store(true, Ordering::SeqCst);
    log::warn!("🚨 PANIC SWITCH TRIGGERED! Executing unmount, session destruction, cache shredding, and lock.");

    // 1. Emit event to UI so frontend immediately switches to Emergency Panic view
    let _ = app_handle.emit("panic-status-changed", true);

    // 2. Immediately unmount virtual drive from OS
    let _ = crate::os_integration::unmount_drive("Z:", None);

    // 3. Shred local session directory (~/.folded/sessions and ~/.folded metadata) to log out user
    if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
        let folded_dir = std::path::PathBuf::from(&home).join(".folded");
        if folded_dir.exists() {
            if let Err(e) = wipe_directory(&folded_dir) {
                log::error!("Error during Telegram session wipe: {:?}", e);
            } else {
                log::info!("Telegram session files and .folded directory shredded successfully.");
            }
        }
        
        let vault_dir = std::path::PathBuf::from(&home).join("FoldedVault");
        if vault_dir.exists() {
            if let Err(e) = wipe_directory(&vault_dir) {
                log::error!("Error during FoldedVault directory wipe: {:?}", e);
            } else {
                log::info!("Local FoldedVault directory shredded successfully.");
            }
        }
    }

    // 4. Wipe registered local cache directory
    if let Ok(guard) = REGISTERED_CACHE_DIR.lock() {
        if let Some(ref cache_dir) = *guard {
            if let Err(e) = wipe_directory(cache_dir) {
                log::error!("Error during panic directory wipe: {:?}", e);
            } else {
                log::info!("Local cache shredded successfully.");
            }
        }
    }

    Ok(())
}


pub fn is_panic_mode() -> bool {
    IS_PANIC_ACTIVE.load(Ordering::SeqCst)
}

pub fn reset_panic_mode() {
    IS_PANIC_ACTIVE.store(false, Ordering::SeqCst);
}
