use std::sync::Arc;
use anyhow::{Result, anyhow};
use grammers_tl_types as tl;
use crate::cluster::{ClusterOrchestrator, ChannelInfo};

impl ClusterOrchestrator {
    pub async fn get_user_channels(
        &self,
        account_id: &str,
        session_manager: Arc<crate::session_manager::SessionManager>,
    ) -> Result<Vec<ChannelInfo>> {
        let client = session_manager.get_client_by_id(account_id).await
            .ok_or_else(|| anyhow!("Account not connected"))?;

        let request = tl::functions::messages::GetDialogs {
            exclude_pinned: false,
            folder_id: None,
            offset_date: 0,
            offset_id: 0,
            offset_peer: tl::enums::InputPeer::Empty,
            limit: 100,
            hash: 0,
        };
        
        let response = client.invoke(&request).await?;
        
        let chats = match response {
            tl::enums::messages::Dialogs::Dialogs(d) => d.chats,
            tl::enums::messages::Dialogs::Slice(d) => d.chats,
            tl::enums::messages::Dialogs::NotModified(_) => Vec::new(),
        };

        let mut channels = Vec::new();
        for chat in chats {
            if let tl::enums::Chat::Channel(c) = chat {
                if c.broadcast {
                    channels.push(ChannelInfo {
                        id: c.id,
                        title: c.title.clone(),
                    });
                }
            }
        }
        
        Ok(channels)
    }

    pub async fn create_storage_hub(
        &self,
        account_id: &str,
        title: String,
        session_manager: Arc<crate::session_manager::SessionManager>,
    ) -> Result<(i64, i64)> {
        let client = session_manager.get_client_by_id(account_id).await
            .ok_or_else(|| anyhow!("Account not connected"))?;

        let request = tl::functions::channels::CreateChannel {
            broadcast: true,
            megagroup: false,
            for_import: false,
            forum: false,
            title: title.clone(),
            about: "Folded Storage Hub".to_string(),
            geo_point: None,
            address: None,
            ttl_period: None,
        };

        let updates = client.invoke(&request).await?;
        
        match updates {
            tl::enums::Updates::Updates(u) => {
                for chat in u.chats {
                    if let tl::enums::Chat::Channel(c) = chat {
                        return Ok((c.id, c.access_hash.unwrap_or(0)));
                    }
                }
            }
            _ => {}
        }

        Err(anyhow!("Failed to extract channel ID from updates"))
    }
}
