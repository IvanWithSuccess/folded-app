use std::sync::Arc;
use anyhow::{Result, anyhow};
use grammers_client::message::InputMessage;
use grammers_tl_types as tl;
use crate::cluster::ClusterOrchestrator;

impl ClusterOrchestrator {
    pub async fn update_note(
        &self,
        account_id: &str,
        peer_id: i64,
        message_id: i32,
        new_content: String,
        session_manager: Arc<crate::session_manager::SessionManager>,
        cache: Arc<crate::cache::MetadataCache>,
        note_id: &str,
    ) -> Result<()> {
        let client = session_manager.get_client_by_id(account_id).await
            .ok_or_else(|| anyhow!("Account not connected"))?;
        
        let peer = if peer_id == 0 { 
            tl::enums::InputPeer::PeerSelf 
        } else {
             // Basic support for other peers if needed, though mostly PeerSelf for Saved Messages
             tl::enums::InputPeer::PeerSelf
        };

        client.edit_message(
            peer,
            message_id,
            InputMessage::new().text(&new_content)
        ).await?;

        sqlx::query("UPDATE notes SET content = ? WHERE id = ?")
            .bind(&new_content)
            .bind(note_id)
            .execute(cache.get_pool()).await?;

        Ok(())
    }

    pub async fn delete_note(
        &self,
        account_id: &str,
        _peer_id: i64,
        message_id: i32,
        session_manager: Arc<crate::session_manager::SessionManager>,
        cache: Arc<crate::cache::MetadataCache>,
        note_id: &str,
    ) -> Result<()> {
        let client = session_manager.get_client_by_id(account_id).await
            .ok_or_else(|| anyhow!("Account not connected"))?;

        // Try to delete from Telegram, but don't fail if it's already gone
        let _ = client.invoke(&tl::functions::messages::DeleteMessages {
            id: vec![message_id],
            revoke: true,
        }).await.map_err(|e| {
            log::warn!("Failed to delete note {} from Telegram (might be already gone): {}", message_id, e);
            e
        });

        // Always delete from local DB
        sqlx::query("DELETE FROM notes WHERE id = ?")
            .bind(note_id)
            .execute(cache.get_pool()).await?;

        Ok(())
    }
}
