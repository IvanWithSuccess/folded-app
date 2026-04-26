use std::sync::Arc;
use anyhow::{Result, anyhow};
use std::collections::HashSet;
use grammers_tl_types as tl;
use crate::cluster::{ClusterOrchestrator, FileManifest, FoldedManifest, ChunkMeta};

impl ClusterOrchestrator {
    pub async fn index_account(
        &self,
        account_id: &str,
        session_manager: Arc<crate::session_manager::SessionManager>,
        cache: Arc<crate::cache::MetadataCache>,
    ) -> Result<()> {
        log::info!("Performing full initial index for account {}", account_id);
        // 1. Get the latest cloud state (file tree)
        let _ = self.pull_manifest(account_id, Arc::clone(&session_manager), Arc::clone(&cache)).await;
        // 2. Scan for any new messages/notes since last run
        let _ = self.maintenance_crawl(account_id, Arc::clone(&session_manager), Arc::clone(&cache)).await;
        Ok(())
    }

    pub async fn push_manifest(
        &self,
        account_id: &str,
        session_manager: Arc<crate::session_manager::SessionManager>,
        cache: Arc<crate::cache::MetadataCache>,
    ) -> Result<()> {
        let client = session_manager.get_client_by_id(account_id).await
            .ok_or_else(|| anyhow!("Account not connected"))?;

        let folders = cache.get_folders_by_account(account_id).await?;
        let files = cache.get_files_by_account(account_id).await?;
        let note_attachments = cache.get_all_note_attachments(account_id).await?;

        let manifest = FoldedManifest {
            version: 1,
            folders,
            files,
            note_attachments,
            updated_at: chrono::Utc::now().timestamp(),
        };

        let json = serde_json::to_vec(&manifest)?;
        
        let search_request = tl::functions::messages::Search {
            peer: tl::enums::InputPeer::PeerSelf,
            q: "#folded_manifest".to_string(),
            filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
            min_date: 0,
            max_date: 0,
            offset_id: 0,
            add_offset: 0,
            limit: 10,
            max_id: 0,
            min_id: 0,
            hash: 0,
            from_id: None,
            saved_peer_id: None,
            saved_reaction: None,
            top_msg_id: None,
        };

        let search_result = client.invoke(&search_request).await?;
        let old_ids = match search_result {
            tl::enums::messages::Messages::Messages(m) => m.messages.into_iter().map(|msg| msg.id()).collect::<Vec<_>>(),
            tl::enums::messages::Messages::Slice(m) => m.messages.into_iter().map(|msg| msg.id()).collect::<Vec<_>>(),
            _ => Vec::new(),
        };

        let uploaded_file = client.upload_stream(&mut &json[..], json.len(), "manifest.json".to_string()).await?;
        client.send_message(
            tl::enums::InputPeer::PeerSelf,
            grammers_client::message::InputMessage::new()
                .text("#folded_manifest")
                .document(uploaded_file)
        ).await?;

        if !old_ids.is_empty() {
             let _ = client.invoke(&tl::functions::messages::DeleteMessages {
                 id: old_ids,
                 revoke: true,
             }).await;
        }

        Ok(())
    }

    pub async fn pull_manifest(
        &self,
        account_id: &str,
        session_manager: Arc<crate::session_manager::SessionManager>,
        cache: Arc<crate::cache::MetadataCache>,
    ) -> Result<()> {
        let client = session_manager.get_client_by_id(account_id).await
            .ok_or_else(|| anyhow!("Account not connected"))?;

        let search_request = tl::functions::messages::Search {
            peer: tl::enums::InputPeer::PeerSelf,
            q: "#folded_manifest".to_string(),
            filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
            min_date: 0,
            max_date: 0,
            offset_id: 0,
            add_offset: 0,
            limit: 1,
            max_id: 0,
            min_id: 0,
            hash: 0,
            from_id: None,
            saved_peer_id: None,
            saved_reaction: None,
            top_msg_id: None,
        };

        let search_result = client.invoke(&search_request).await?;
        
        let msg_enum = match search_result {
            tl::enums::messages::Messages::Messages(m) => m.messages.into_iter().next(),
            tl::enums::messages::Messages::Slice(m) => m.messages.into_iter().next(),
            _ => None,
        }.ok_or_else(|| anyhow!("No Folded manifest found in Saved Messages"))?;

        let media = match msg_enum {
             tl::enums::Message::Message(m) => m.media,
             _ => return Err(anyhow!("Manifest message is not a valid message")),
        }.ok_or_else(|| anyhow!("Manifest message has no media"))?;

        if let tl::enums::MessageMedia::Document(d) = media {
            let document = grammers_client::media::Document::from_raw_media(d);
            let mut buffer = Vec::new();
            let mut download_stream = client.iter_download(&document);
            while let Some(chunk) = download_stream.next().await? {
                 buffer.extend_from_slice(&chunk);
            }
            
            let manifest: FoldedManifest = serde_json::from_slice(&buffer)?;

            cache.clear_explorer_data_for_account(account_id).await?;
            for folder in manifest.folders {
                let parent_id = if let Some(ref pid) = folder.parent_id {
                    if pid.is_empty() { None } else { Some(pid.clone()) }
                } else {
                    None
                };
                sqlx::query("INSERT OR IGNORE INTO folders (id, name, parent_id, account_id, is_starred, created_at) VALUES (?, ?, ?, ?, ?, ?)")
                    .bind(&folder.id)
                    .bind(&folder.name)
                    .bind(parent_id)
                    .bind(account_id)
                    .bind(folder.is_starred)
                    .bind(folder.created_at)
                    .execute(cache.get_pool()).await?;
            }
            for mut file in manifest.files {
                file.account_id = Some(account_id.to_string());
                cache.save_file(file).await?;
            }

            for (note_id, attachments) in manifest.note_attachments {
                let ids = attachments.join(",");
                let _ = sqlx::query("UPDATE notes SET attachment_ids = ? WHERE id = ?")
                    .bind(ids)
                    .bind(note_id)
                    .execute(cache.get_pool()).await;
            }

            return Ok(());
        }
        
        Err(anyhow!("Manifest media is not a document"))
    }

    pub async fn maintenance_crawl(
        &self,
        account_id: &str,
        session_manager: Arc<crate::session_manager::SessionManager>,
        cache: Arc<crate::cache::MetadataCache>,
    ) -> Result<()> {
        let client = session_manager.get_client_by_id(account_id).await
            .ok_or_else(|| anyhow!("Account not connected"))?;

        let (forward_id, backward_id) = cache.get_sync_state(account_id).await?.unwrap_or((0, 0));
        let input_peer_self = tl::enums::InputPeer::PeerSelf;
        
        let mut forward_iter = client.iter_messages(&input_peer_self);
        let mut discovered_count = 0;
        let mut max_new_id = forward_id;

        log::info!("Starting maintenance crawl for {}. Forward ID: {}, Backward ID: {}", account_id, forward_id, backward_id);

        while let Some(msg) = forward_iter.next().await? {
            if msg.id() <= forward_id { break; }
            if msg.id() > max_new_id { max_new_id = msg.id(); }

            self.process_message_for_index(account_id, &msg, &cache).await?;
            discovered_count += 1;
            if discovered_count >= 50 { break; }
        }
        
        if max_new_id > forward_id {
            cache.update_sync_state(account_id, Some(max_new_id), None).await?;
        }

        let mut backward_iter = if backward_id == 0 {
            client.iter_messages(&input_peer_self)
        } else {
            client.iter_messages(&input_peer_self).offset_id(backward_id)
        };

        let mut audit_count = 0;
        let mut min_checked_id = backward_id;
        
        let linked_ids = cache.get_all_linked_message_ids(account_id).await?;
        let mut seen_ids = HashSet::new();

        while let Some(msg) = backward_iter.next().await? {
            let msg_id = msg.id() as i64;
            min_checked_id = msg.id();
            seen_ids.insert(msg_id);
            
            self.process_message_for_index(account_id, &msg, &cache).await?;
            audit_count += 1;
            if audit_count >= 50 { break; }
        }

        for db_id in linked_ids {
             let start_id = if backward_id == 0 { i32::MAX } else { backward_id };
             if db_id > min_checked_id && db_id <= start_id {
                 if !seen_ids.contains(&(db_id as i64)) {
                     log::info!("Detected external deletion of message {} for account {}, removing from cache", db_id, account_id);
                     cache.delete_by_message_id(account_id, db_id).await?;
                 }
             }
        }

        if min_checked_id < backward_id || backward_id == 0 {
            cache.update_sync_state(account_id, None, Some(min_checked_id)).await?;
        }

        if discovered_count > 0 || audit_count > 0 {
            log::info!("Crawl batch done for {}: processed {} messages", account_id, discovered_count + audit_count);
            let _ = self.push_manifest(account_id, Arc::clone(&session_manager), Arc::clone(&cache)).await;
            
            // Update indexing timestamp in account metadata
            let _ = session_manager.update_account_last_indexed(account_id, chrono::Utc::now().timestamp()).await;
        }

        Ok(())
    }

    async fn process_message_for_index(
        &self,
        account_id: &str,
        msg: &grammers_client::message::Message,
        cache: &Arc<crate::cache::MetadataCache>,
    ) -> Result<()> {
        use grammers_client::media::Media;
        
        let is_manifest = msg.text().contains("#folded_manifest");
        let mut attachment_ids: Vec<String> = Vec::new();

        if let Some(media) = msg.media() {
            if let Media::Document(doc) = media {
                let file_name = doc.name().unwrap_or("Untitled File").to_string();
                if !file_name.starts_with("chunk_") && !file_name.ends_with(".dat") && !is_manifest {
                    let file_id = format!("ext_{}_{}", account_id, msg.id());
                    attachment_ids.push(file_id.clone());
                    let manifest = FileManifest {
                        id: file_id.clone(),
                        name: file_name,
                        total_size: doc.size().unwrap_or(0) as u64,
                        chunk_size: doc.size().unwrap_or(0) as u64,
                        chunks: vec![ChunkMeta {
                                        chunk_id: format!("ext_{}_{}", account_id, msg.id()),
                                        account_id: account_id.to_string(),
                                        part_index: 0,
                                        message_id: msg.id() as i64,
                                        size_bytes: doc.size().unwrap_or(0) as u64,
                                    }],
                        folder_id: None,
                        account_id: Some(account_id.to_string()),
                        storage_hub_id: None,
                        storage_hub_access_hash: None,
                        is_external: true,
                        is_starred: false,
                        created_at: msg.date().timestamp(),
                        is_current_version: true,
                        version_of: None,
                        version_number: 1,
                        deleted_at: None,
                    };
                    let _ = cache.save_file(manifest).await;
                }
            }
        }

        if msg.text().len() > 0 && !is_manifest {
            let note_id = format!("{}_{}", account_id, msg.id());
            let from_self = if msg.forward_header().is_none() { 1i64 } else { 0i64 };
            let att_ids_str = if attachment_ids.is_empty() { None } else { Some(attachment_ids.join(",")) };

            sqlx::query("INSERT OR REPLACE INTO notes (id, account_id, peer_id, message_id, content, created_at, from_self, attachment_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(&note_id)
                .bind(account_id)
                .bind(msg.peer_id().bot_api_dialog_id())
                .bind(msg.id() as i64)
                .bind(msg.text())
                .bind(msg.date().timestamp())
                .bind(from_self)
                .bind(att_ids_str)
                .execute(cache.get_pool()).await?;
        }
        Ok(())
    }
}
