use std::path::PathBuf;
use std::sync::Arc;
use anyhow::{Result, anyhow};
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use grammers_client::message::InputMessage;
use grammers_tl_types as tl;
use tauri::Emitter;

use super::{ClusterOrchestrator, FileManifest, ChunkMeta, ProgressPayload};

impl ClusterOrchestrator {
    pub async fn upload_file(
        &self,
        file_path: PathBuf,
        session_manager: Arc<crate::session_manager::SessionManager>,
        file_name: String,
        app_handle: Option<tauri::AppHandle>,
        folder_id: Option<String>,
        account_id: String,
    ) -> Result<FileManifest> {
        let account_ids = vec![account_id.clone()];
        let plan = self.plan_chunks(file_path.clone(), &account_ids)?;

        let metadata = tokio::fs::metadata(&file_path).await?;
        let total_size = metadata.len();
        
        let upload_id = uuid::Uuid::new_v4().to_string();
        let mut upload_tasks: Vec<tokio::task::JoinHandle<Result<Option<ChunkMeta>, anyhow::Error>>> = Vec::new();
        
        let total_uploaded = Arc::new(tokio::sync::Mutex::new(0u64));

        for (part_index, account_id, chunk_size) in plan {
            let file_path = file_path.clone();
            let session_manager = Arc::clone(&session_manager);
            let account_id = account_id.clone();
            let semaphore = Arc::clone(&self.semaphore);
            let app_handle = app_handle.clone();
            let upload_id = upload_id.clone();
            let file_name = file_name.clone();
            let total_uploaded = Arc::clone(&total_uploaded);

            let task = tokio::spawn(async move {
                let _permit = semaphore.acquire().await.map_err(|e| anyhow!("Semaphore Error: {}", e))?;
                
                let start_offset = part_index as u64 * chunk_size;
                let actual_size = std::cmp::min(chunk_size, total_size.saturating_sub(start_offset));
                if actual_size == 0 {
                    return Ok(None);
                }

                let chunk_uuid = uuid::Uuid::new_v4().to_string();
                log::info!("Starting upload of chunk {} [{}] ({} bytes) to account {}", part_index, chunk_uuid, actual_size, account_id);

                let mut retries = 3;
                let mut last_err = None;
                
                while retries > 0 {
                    let mut file = tokio::fs::File::open(&file_path).await?;
                    file.seek(tokio::io::SeekFrom::Start(start_offset)).await?;
                    let mut stream = file.take(actual_size);

                    let client = session_manager.get_client_by_id(&account_id).await
                        .ok_or_else(|| anyhow!("Client disconnected during upload orchestration"))?;

                    match client.upload_stream(
                        &mut stream,
                        actual_size as usize,
                        format!("FOLDED-{}-{}-{}.dat", upload_id, chunk_uuid, part_index)
                    ).await {
                        Ok(uploaded_file) => {
                            let input_peer_self = tl::types::InputPeerSelf {};
                            // UUID baked into filename for resilient chunk identification
                            let chunk_filename = format!("FOLDED-{}-{}-{}.dat", upload_id, chunk_uuid, part_index);
                            drop(chunk_filename); // already used above in upload_stream
                            match client.send_message(
                                &input_peer_self,
                                InputMessage::new().document(uploaded_file)
                            ).await {
                                Ok(message) => {
                                    log::info!("Successfully uploaded chunk {} [{}] to account {}", part_index, chunk_uuid, account_id);
                                    
                                    let mut total = total_uploaded.lock().await;
                                    *total += actual_size;
                                    
                                    if let Some(handle) = app_handle {
                                        let _ = handle.emit("upload-progress", ProgressPayload {
                                            file_id: upload_id.clone(),
                                            file_name: file_name.clone(),
                                            status: "uploading".to_string(),
                                            processed_bytes: *total,
                                            total_bytes: total_size,
                                        });
                                    }

                                    return Ok(Some(ChunkMeta {
                                        chunk_id: chunk_uuid,
                                        account_id,
                                        part_index,
                                        message_id: message.id() as i64,
                                        size_bytes: actual_size,
                                    }));
                                }
                                Err(e) => {
                                    log::error!("Failed to save chunk {} to Saved Messages: {}", part_index, e);
                                    last_err = Some(anyhow!("Failed to save chunk: {}", e));
                                }
                            }
                        }
                        Err(e) => {
                            log::error!("Upload attempt failed for chunk {}: {}. Retries left: {}", part_index, e, retries - 1);
                            last_err = Some(anyhow!("Upload failed: {}", e));
                        }
                    }
                    retries -= 1;
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                }
                
                Err(last_err.unwrap_or_else(|| anyhow!("Unknown upload error")))
            });
            upload_tasks.push(task);
        }

        let mut chunks = Vec::new();
        for task in upload_tasks {
            let result = task.await??;
            if let Some(chunk_meta) = result {
                chunks.push(chunk_meta);
            }
        }
        
        chunks.sort_by_key(|c| c.part_index);

        let manifest = FileManifest {
            id: uuid::Uuid::new_v4().to_string(),
            name: file_name,
            total_size,
            chunk_size: Self::determine_chunk_size(total_size),
            chunks,
            folder_id,
            account_id: Some(account_id),
            storage_hub_id: None,
            storage_hub_access_hash: None,
            is_external: false,
            created_at: chrono::Utc::now().timestamp(),
        };

        Ok(manifest)
    }

    pub async fn download_file(
        &self,
        manifest: FileManifest,
        dest_path: PathBuf,
        session_manager: Arc<crate::session_manager::SessionManager>,
        app_handle: Option<tauri::AppHandle>,
    ) -> Result<()> {
        use tokio::io::AsyncWriteExt;
        use grammers_client::media::Media;

        let total_chunks = manifest.chunks.len();
        let mut tasks: Vec<tokio::task::JoinHandle<Result<(usize, Vec<u8>), anyhow::Error>>> =
            Vec::with_capacity(total_chunks);

        for chunk_meta in manifest.chunks.iter() {
            let account_id = chunk_meta.account_id.clone();
            let message_id = chunk_meta.message_id;
            let part_index = chunk_meta.part_index;
            let session_manager = Arc::clone(&session_manager);

            let task = tokio::spawn(async move {
                let client = session_manager
                    .get_client_by_id(&account_id)
                    .await
                    .ok_or_else(|| anyhow!("Client for account {} not connected", account_id))?;

                let messages = client
                    .invoke(&tl::functions::messages::GetMessages {
                        id: vec![tl::enums::InputMessage::Id(tl::types::InputMessageId {
                            id: message_id as i32,
                        })],
                    })
                    .await
                    .map_err(|e| anyhow!("Failed to fetch message {}: {}", message_id, e))?;

                let msg_vec = match messages {
                    tl::enums::messages::Messages::Messages(m) => m.messages,
                    tl::enums::messages::Messages::Slice(m) => m.messages,
                    tl::enums::messages::Messages::ChannelMessages(m) => m.messages,
                    tl::enums::messages::Messages::NotModified(_) => {
                        return Err(anyhow!("Messages not modified"));
                    }
                };

                let message = msg_vec
                    .into_iter()
                    .find_map(|m| {
                        if let tl::enums::Message::Message(msg) = m {
                            Some(msg)
                        } else {
                            None
                        }
                    })
                    .ok_or_else(|| anyhow!("Message {} not found", message_id))?;

                let raw_media = message
                    .media
                    .ok_or_else(|| anyhow!("Message {} has no media", message_id))?;

                let media = Media::from_raw(raw_media)
                    .ok_or_else(|| anyhow!("Message {} media could not be parsed", message_id))?;

                let mut download_iter = match media {
                    Media::Document(d) => client.iter_download(&d),
                    Media::Sticker(s) => client.iter_download(&s.document),
                    _ => return Err(anyhow!("Message {} media is not a downloadable document", message_id)),
                };
                let mut chunk_data: Vec<u8> = Vec::new();
                while let Some(data) = download_iter
                    .next()
                    .await
                    .map_err(|e| anyhow!("Download error: {}", e))?
                {
                    chunk_data.extend(data);
                }

                Ok((part_index, chunk_data))
            });

            tasks.push(task);
        }

        let mut chunk_results: Vec<Option<Vec<u8>>> = vec![None; total_chunks];
        let mut downloaded_chunks = 0;
        
        for task in tasks {
            let (part_index, data) = task.await??;
            chunk_results[part_index] = Some(data);
            
            downloaded_chunks += 1;
            if let Some(ref handle) = app_handle {
                let _ = handle.emit("download-progress", ProgressPayload {
                    file_id: manifest.id.clone(),
                    file_name: manifest.name.clone(),
                    status: "downloading".to_string(),
                    processed_bytes: downloaded_chunks as u64,
                    total_bytes: total_chunks as u64,
                });
            }
        }

        let mut file = tokio::fs::File::create(&dest_path).await?;
        for (i, chunk_opt) in chunk_results.into_iter().enumerate() {
            let data = chunk_opt
                .ok_or_else(|| anyhow!("Missing chunk {} after download", i))?;
            file.write_all(&data).await?;
        }

        Ok(())
    }

    pub async fn fetch_single_chunk(
        &self,
        chunk_meta: &ChunkMeta,
        session_manager: Arc<crate::session_manager::SessionManager>,
    ) -> Result<Vec<u8>> {
        use grammers_client::media::Media;

        let client = session_manager
            .get_client_by_id(&chunk_meta.account_id)
            .await
            .ok_or_else(|| anyhow!("Client for account {} not connected", chunk_meta.account_id))?;

        let messages = client
            .invoke(&tl::functions::messages::GetMessages {
                id: vec![tl::enums::InputMessage::Id(tl::types::InputMessageId {
                    id: chunk_meta.message_id as i32,
                })],
            })
            .await
            .map_err(|e| anyhow!("Failed to fetch chunk message: {}", e))?;

        let msg_vec = match messages {
            tl::enums::messages::Messages::Messages(m) => m.messages,
            tl::enums::messages::Messages::Slice(m) => m.messages,
            tl::enums::messages::Messages::ChannelMessages(m) => m.messages,
            tl::enums::messages::Messages::NotModified(_) => return Err(anyhow!("Not modified")),
        };

        let message = msg_vec
            .into_iter()
            .find_map(|m| if let tl::enums::Message::Message(msg) = m { Some(msg) } else { None })
            .ok_or_else(|| anyhow!("Chunk message not found"))?;

        let raw_media = message
            .media
            .ok_or_else(|| anyhow!("Chunk message has no media"))?;

        let media = Media::from_raw(raw_media)
            .ok_or_else(|| anyhow!("Chunk media could not be parsed"))?;

        let mut download_iter = match media {
            Media::Document(d) => client.iter_download(&d),
            Media::Sticker(s) => client.iter_download(&s.document),
            _ => return Err(anyhow!("Chunk media is not a document")),
        };

        let mut data = Vec::new();
        while let Some(chunk) = download_iter.next().await? {
            data.extend(chunk);
        }

        Ok(data)
    }

    pub async fn delete_file(
        &self,
        manifest: FileManifest,
        session_manager: Arc<crate::session_manager::SessionManager>,
    ) -> Result<()> {
        use std::collections::HashMap;
        
        let mut chunks_by_account: HashMap<String, Vec<i32>> = HashMap::new();
        for chunk in manifest.chunks {
            chunks_by_account.entry(chunk.account_id).or_default().push(chunk.message_id as i32);
        }

        for (account_id, message_ids) in chunks_by_account {
            if let Some(client) = session_manager.get_client_by_id(&account_id).await {
                log::info!("Deleting {} chunks from account {}", message_ids.len(), account_id);
                let _ = client.invoke(&tl::functions::messages::DeleteMessages {
                    id: message_ids,
                    revoke: true,
                }).await;
            }
        }

        Ok(())
    }
}
