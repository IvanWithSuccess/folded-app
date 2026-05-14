use tauri::State;
use std::sync::Arc;
use crate::session_manager::SessionManager;
use crate::cluster::ClusterOrchestrator;
use crate::cache::{MetadataCache, NoteInfo};
use grammers_client::message::InputMessage;
use grammers_tl_types as tl;

#[tauri::command]
pub async fn get_notes(
    cache_state: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<NoteInfo>, String> {
    cache_state.get_notes().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_note(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    account_id: String,
    peer_id: i64,
    message_id: i32,
    new_content: String,
    note_id: String,
) -> Result<(), String> {
    cluster_state.update_note(&account_id, peer_id, message_id, new_content, Arc::clone(&session_state), Arc::clone(&cache_state), &note_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_note(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    account_id: String,
    peer_id: i64,
    message_id: i32,
    note_id: String,
) -> Result<(), String> {
    cluster_state.delete_note(&account_id, peer_id, message_id, Arc::clone(&session_state), Arc::clone(&cache_state), &note_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_note(
    session_state: State<'_, Arc<SessionManager>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    account_id: String,
    content: String,
) -> Result<NoteInfo, String> {
    let client = session_state.get_client_by_id(&account_id).await
        .ok_or_else(|| format!("Account {} not connected", account_id))?;

    let msg = client.send_message(
        tl::enums::InputPeer::PeerSelf,
        InputMessage::new().text(&content),
    ).await.map_err(|e| e.to_string())?;

    let message_id = msg.id() as i64;
    let note_id = format!("{}_{}", account_id, message_id);
    let peer_id = msg.peer_id().bot_api_dialog_id();

    let accounts = session_state.get_active_accounts().await;
    let my_account = accounts.iter().find(|a| a.id == account_id);
    let sender_display = my_account.map(|a| {
        a.username.as_ref().map(|u| format!("@{}", u)).unwrap_or_else(|| a.name.clone())
    });

    cache_state.save_note(&note_id, &account_id, peer_id, message_id, &content, true, sender_display.clone(), None)
        .await.map_err(|e| e.to_string())?;

    Ok(NoteInfo {
        id: note_id,
        account_id,
        peer_id,
        message_id,
        content,
        created_at: chrono::Utc::now().timestamp(),
        from_self: true,
        sender_name: sender_display,
        attachment_ids: None,
    })
}

#[tauri::command]
pub async fn note_attach_file(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    account_id: String,
    note_id: String,
    file_id: String,
) -> Result<(), String> {
    let notes = cache_state.get_notes().await.map_err(|e| e.to_string())?;
    let note = notes.iter().find(|n| n.id == note_id).ok_or("Note not found")?;
    
    let mut current_ids = note.attachment_ids.clone().unwrap_or_default();
    if !current_ids.contains(&file_id) {
        if !current_ids.is_empty() { current_ids.push(','); }
        current_ids.push_str(&file_id);
    }
    
    sqlx::query("UPDATE notes SET attachment_ids = ? WHERE id = ?")
        .bind(&current_ids)
        .bind(&note_id)
        .execute(cache_state.get_pool()).await.map_err(|e| e.to_string())?;
         
    let orchestrator = Arc::clone(&cluster_state);
    let session = Arc::clone(&session_state);
    let cache = Arc::clone(&cache_state);
    let acc_id = account_id.clone();
    tokio::spawn(async move {
        let _ = orchestrator.push_manifest(&acc_id, session, cache).await;
    });
        
    Ok(())
}

#[tauri::command]
pub async fn note_detach_file(
    session_state: State<'_, Arc<SessionManager>>,
    cluster_state: State<'_, Arc<ClusterOrchestrator>>,
    cache_state: State<'_, Arc<MetadataCache>>,
    account_id: String,
    note_id: String,
    file_id: String,
) -> Result<(), String> {
    let notes = cache_state.get_notes().await.map_err(|e| e.to_string())?;
    let note = notes.iter().find(|n| n.id == note_id).ok_or("Note not found")?;
    
    let current_ids = note.attachment_ids.clone().unwrap_or_default();
    let new_ids: Vec<&str> = current_ids.split(',').filter(|id| *id != file_id && !id.is_empty()).collect();
    let new_ids_str = if new_ids.is_empty() { None } else { Some(new_ids.join(",")) };
    
    sqlx::query("UPDATE notes SET attachment_ids = ? WHERE id = ?")
        .bind(new_ids_str)
        .bind(&note_id)
        .execute(cache_state.get_pool()).await.map_err(|e| e.to_string())?;
        
    let orchestrator = Arc::clone(&cluster_state);
    let session = Arc::clone(&session_state);
    let cache = Arc::clone(&cache_state);
    let acc_id = account_id.clone();
    tokio::spawn(async move {
        let _ = orchestrator.push_manifest(&acc_id, session, cache).await;
    });
        
    Ok(())
}
