use tauri::State;
use std::sync::Arc;
use crate::session_manager::{SessionManager, AuthResponse, TelegramAccount};
use crate::cache::MetadataCache;
use crate::SyncTracker;
use crate::cluster::mirrors::MirrorManager;

#[tauri::command]
pub async fn auth_request_code(state: State<'_, Arc<SessionManager>>, phone: String) -> Result<AuthResponse, String> {
    state.request_login_code(&phone).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn auth_verify_code(state: State<'_, Arc<SessionManager>>, phone: String, code: String) -> Result<AuthResponse, String> {
    state.verify_login_code(&phone, &code).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn auth_verify_password(state: State<'_, Arc<SessionManager>>, phone: String, password: String) -> Result<AuthResponse, String> {
    state.verify_password(&phone, &password).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn auth_request_qr(state: State<'_, Arc<SessionManager>>) -> Result<AuthResponse, String> {
    state.request_qr_login().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn auth_poll_qr(state: State<'_, Arc<SessionManager>>) -> Result<AuthResponse, String> {
    state.poll_qr_login().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn auth_cancel(state: State<'_, Arc<SessionManager>>) -> Result<(), String> {
    state.clear_pending_auths().await;
    Ok(())
}

#[tauri::command]
pub async fn auth_logout(
    state: State<'_, Arc<SessionManager>>, 
    cache_state: State<'_, Arc<MetadataCache>>,
    sync_tracker: State<'_, Arc<SyncTracker>>,
    mirror_manager: State<'_, Arc<MirrorManager>>,
    account_id: String
) -> Result<(), String> {
    log::info!("Initiating graceful logout for account {}", account_id);
    
    // 1. Stop background crawler
    sync_tracker.stop_crawler(&account_id).await;
    
    // 2. Stop all associated mirrors
    let _ = mirror_manager.stop_all_for_account(&account_id).await;
    
    // 3. Give it a tiny bit of time for tasks to yield (optional but safer)
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    // 4. Perform actual logout and purge
    state.logout_account(&account_id).await.map_err(|e| e.to_string())?;
    let _ = cache_state.purge_account_data(&account_id).await;
    
    log::info!("Logout completed for account {}", account_id);
    Ok(())
}

#[tauri::command]
pub async fn get_accounts(
    state: State<'_, Arc<SessionManager>>,
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<TelegramAccount>, String> {
    let mut accounts = state.get_active_accounts().await;
    for acc in &mut accounts {
        if let Ok(bytes) = cache_state.get_total_used_bytes(&acc.id).await {
            acc.used_bytes = bytes;
        }
    }
    Ok(accounts)
}

#[tauri::command]
pub async fn verify_session_health(
    session_state: State<'_, Arc<SessionManager>>,
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<String>, String> {
    let accounts = session_state.get_active_accounts().await;
    let mut expired = Vec::new();

    for account in &accounts {
        let is_valid = session_state.check_session_health(&account.id).await;
        if !is_valid {
            expired.push(account.id.clone());
        }
    }

    for account_id in &expired {
        let _ = cache_state.purge_account_data(account_id).await;
        let _ = session_state.logout_account(account_id).await;
    }

    Ok(expired)
}
