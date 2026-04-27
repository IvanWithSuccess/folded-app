use tokio_util::sync::CancellationToken;
use std::path::PathBuf;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex as TokioMutex;
use notify::{Watcher, RecursiveMode, Event, EventKind};
use anyhow::Result;
use crate::cache::{MetadataCache, MirrorRule};
use crate::cluster::ClusterOrchestrator;
use crate::session_manager::SessionManager;
use tokio::time::{Duration, Instant};

pub struct MirrorManager {
    app: tauri::AppHandle,
    cache: Arc<MetadataCache>,
    orchestrator: Arc<ClusterOrchestrator>,
    session_manager: Arc<SessionManager>,
    watchers: Arc<TokioMutex<HashMap<String, notify::RecommendedWatcher>>>,
    debounce_map: Arc<TokioMutex<HashMap<PathBuf, Instant>>>,
    statuses: Arc<TokioMutex<HashMap<String, String>>>,
    cancellation_tokens: Arc<TokioMutex<HashMap<String, CancellationToken>>>,
}

impl MirrorManager {
    pub fn new(
        app: tauri::AppHandle,
        cache: Arc<MetadataCache>,
        orchestrator: Arc<ClusterOrchestrator>,
        session_manager: Arc<SessionManager>,
    ) -> Self {
        Self {
            app,
            cache,
            orchestrator,
            session_manager,
            watchers: Arc::new(TokioMutex::new(HashMap::new())),
            debounce_map: Arc::new(TokioMutex::new(HashMap::new())),
            statuses: Arc::new(TokioMutex::new(HashMap::new())),
            cancellation_tokens: Arc::new(TokioMutex::new(HashMap::new())),
        }
    }

    pub async fn start_all(&self) -> Result<()> {
        let rules = self.cache.get_mirror_rules().await?;
        for rule in rules {
            if rule.enabled {
                let manager = self.clone_self();
                tokio::spawn(async move {
                    if let Err(e) = manager.start_watching(rule).await {
                        log::error!("Mirror Engine Error: {}", e);
                    }
                });
            }
        }
        Ok(())
    }

    fn clone_self(&self) -> Self {
        Self {
            app: self.app.clone(),
            cache: Arc::clone(&self.cache),
            orchestrator: Arc::clone(&self.orchestrator),
            session_manager: Arc::clone(&self.session_manager),
            watchers: Arc::clone(&self.watchers),
            debounce_map: Arc::clone(&self.debounce_map),
            statuses: Arc::clone(&self.statuses),
            cancellation_tokens: Arc::clone(&self.cancellation_tokens),
        }
    }

    async fn update_status(&self, rule_id: &str, status: &str) {
        let mut statuses = self.statuses.lock().await;
        statuses.insert(rule_id.to_string(), status.to_string());
        
        use tauri::Emitter;
        let _ = self.app.emit("mirror-status-update", serde_json::json!({
            "id": rule_id,
            "status": status
        }));
    }

    pub async fn start_watching(&self, rule: MirrorRule) -> Result<()> {
        let mut watchers = self.watchers.lock().await;
        if watchers.contains_key(&rule.id) {
            return Ok(());
        }
        
        let token = CancellationToken::new();
        let mut tokens = self.cancellation_tokens.lock().await;
        tokens.insert(rule.id.clone(), token.clone());

        log::info!("MIRROR [INIT]: {} -> {}", rule.local_path, rule.remote_folder_name);
        
        let orchestrator = Arc::clone(&self.orchestrator);
        let session_manager = Arc::clone(&self.session_manager);
        let cache = Arc::clone(&self.cache);
        let rule_id = rule.id.clone();
        let account_id = rule.account_id.clone();
        let remote_folder_name = rule.remote_folder_name.clone();
        let local_path_root = PathBuf::from(&rule.local_path);
        
        if !local_path_root.exists() {
            log::warn!("MIRROR [SKIP]: Path not found: {}", rule.local_path);
            return Ok(());
        }

        // Resolve root folder ID one-time
        let mut resolved_rule = rule.clone();
        if resolved_rule.remote_folder_id.is_none() {
             let mut current_id: Option<String> = None;
             let base_parts: Vec<&str> = remote_folder_name.split('/').filter(|s| !s.is_empty()).collect();
             for part in base_parts {
                 let folders = cache.get_folders_in(current_id.clone(), Some(account_id.to_string())).await?;
                 if let Some(f) = folders.into_iter().find(|f| f.name == part) {
                     current_id = Some(f.id);
                 } else {
                     let new_id = cache.create_folder(part.to_string(), current_id.clone(), Some(account_id.to_string())).await?;
                     current_id = Some(new_id);
                 }
             }
             resolved_rule.remote_folder_id = current_id;
             let _ = cache.upsert_mirror_rule(resolved_rule.clone()).await;
        }

        // Perform initial sync for existing files
        let initial_cache = Arc::clone(&cache);
        let initial_orch = Arc::clone(&orchestrator);
        let initial_session = Arc::clone(&session_manager);
        let initial_path = local_path_root.clone();
        let initial_account = account_id.clone();
        let initial_remote = remote_folder_name.clone();
        let manager_clone = self.clone_self();

        let initial_sync_id = rule_id.clone();
        let initial_token = token.clone();
        tokio::spawn(async move {
            loop {
                if initial_token.is_cancelled() { break; }
                
                manager_clone.update_status(&initial_sync_id, "INDEXING").await;
                log::info!("MIRROR [RECONCILE]: Scanning {}...", initial_path.display());
                
                if let Err(e) = perform_initial_sync(
                    &initial_path,
                    &initial_remote,
                    &initial_account,
                    Arc::clone(&initial_cache),
                    Arc::clone(&initial_orch),
                    Arc::clone(&initial_session),
                    initial_token.clone(),
                ).await {
                    log::error!("MIRROR [RECONCILE_ERR]: {}", e);
                }
                
                manager_clone.update_status(&initial_sync_id, "IDLE").await;
                
                // Wait 5 minutes before next full reconciliation scan
                tokio::select! {
                    _ = initial_token.cancelled() => break,
                    _ = tokio::time::sleep(tokio::time::Duration::from_secs(300)) => {}
                }
            }
        });

        let (tx, mut rx) = tokio::sync::mpsc::channel(100);
        let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                let _ = tx.blocking_send(event);
            }
        })?;

        watcher.watch(&local_path_root, RecursiveMode::Recursive)?;
        watchers.insert(rule_id.clone(), watcher);

        let debounce_map = Arc::clone(&self.debounce_map);
        let manager_clone = self.clone_self();
        let loop_token = token.clone();
        
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = loop_token.cancelled() => {
                         log::info!("MIRROR [CANCEL]: Task for {} received cancellation", rule_id);
                         break;
                    }
                    Some(event) = rx.recv() => {
                        match event.kind {
                            EventKind::Modify(_) | EventKind::Create(_) => {
                                for path in event.paths {
                                    if path.is_file() {
                                        // Debounce logic
                                        {
                                            let mut map = debounce_map.lock().await;
                                            let now = Instant::now();
                                            if let Some(last) = map.get(&path) {
                                                if now.duration_since(*last) < Duration::from_secs(3) {
                                                    continue;
                                                }
                                            }
                                            map.insert(path.clone(), now);
                                        }
        
                                        log::info!("MIRROR [EVENT]: File activity detected: {:?}", path.file_name().unwrap_or_default());
                                        
                                        let rel_path = match path.strip_prefix(&local_path_root) {
                                            Ok(p) => p,
                                            Err(_) => continue,
                                        };
        
                                         if let Err(e) = sync_file_to_remote(
                                            &path,
                                            rel_path,
                                            &remote_folder_name,
                                            &account_id,
                                            rule.keep_history,
                                            Arc::clone(&cache),
                                            Arc::clone(&orchestrator),
                                            Arc::clone(&session_manager),
                                            loop_token.clone(),
                                        ).await {
                                            log::error!("MIRROR [UPLOAD_ERR]: {}", e);
                                        }
                                        manager_clone.update_status(&rule_id, "IDLE").await;
                                    }
                                }
                            }
                            EventKind::Remove(_) => {
                                for path in event.paths {
                                    if path == local_path_root {
                                        log::warn!("MIRROR [ERROR]: Root folder deleted: {:?}", path);
                                        manager_clone.update_status(&rule_id, "ERROR").await;
                                        loop_token.cancel(); // Cancel this specific mirror task
                                        return; 
                                    }
                                    // Soft-delete individual files removed from the mirrored folder
                                    if path.is_file() || !path.exists() {
                                        let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                                        log::info!("MIRROR [REMOVE]: File removed from local mirror: {}", file_name);
                                        
                                        let cache_c = Arc::clone(&cache);
                                        let file_name_c = file_name.clone();
                                        let account_id_c = account_id.clone();
                                        let remote_folder_name_c = remote_folder_name.clone();
                                        let keep_history = rule.keep_history;
                                        
                                        tokio::spawn(async move {
                                            if let Err(e) = handle_mirror_file_removed(
                                                &file_name_c,
                                                &remote_folder_name_c,
                                                &account_id_c,
                                                keep_history,
                                                cache_c,
                                            ).await {
                                                log::error!("MIRROR [REMOVE_ERR]: {}", e);
                                            }
                                        });
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
            log::info!("MIRROR [STOP]: Watcher {} terminated", rule_id);
        });

        Ok(())
    }

    pub async fn stop_watching(&self, id: &str) -> Result<()> {
        let mut watchers = self.watchers.lock().await;
        if let Some(watcher) = watchers.remove(id) {
            drop(watcher);
        }
        
        let mut tokens = self.cancellation_tokens.lock().await;
        if let Some(token) = tokens.remove(id) {
            token.cancel();
        }
        
        Ok(())
    }
}

async fn handle_mirror_file_removed(
    file_name: &str,
    remote_base: &str,
    account_id: &str,
    keep_history: bool,
    cache: Arc<MetadataCache>,
) -> Result<()> {
    // Find the file in the remote folder
    let files = cache.get_files_in(None, Some(account_id.to_string())).await?;
    if let Some(file) = files.into_iter().find(|f| f.name == file_name) {
        // Determine folder_id for history logging
        let folder_id = file.folder_id.clone().unwrap_or_default();
        
        if keep_history {
            // Soft delete: keep data in Telegram but hide from FileManager
            cache.soft_delete_file(&file.id).await?;
            let _ = cache.log_folder_event(
                &folder_id,
                "FILE_DELETED_FROM_MIRROR",
                &file.name,
                Some(&file.id),
                Some(&format!("Deleted from local mirror folder: {}", remote_base)),
            ).await;
            log::info!("MIRROR [SOFT_DELETE]: {} hidden (data preserved in Telegram)", file_name);
        } else {
            // Hard delete: remove from DB only (orchestrator delete is handled separately)
            cache.delete_file(&file.id).await?;
            let _ = cache.log_folder_event(
                &folder_id,
                "FILE_REMOVED",
                &file.name,
                None,
                Some("Permanently deleted (keep_history=false)"),
            ).await;
            log::info!("MIRROR [HARD_DELETE]: {} removed", file_name);
        }
    }
    Ok(())
}

async fn perform_initial_sync(
    root: &PathBuf,
    remote_base: &str,
    account_id: &str,
    cache: Arc<MetadataCache>,
    orchestrator: Arc<ClusterOrchestrator>,
    session_manager: Arc<SessionManager>,
    token: CancellationToken,
) -> Result<String> {
    let mut root_id = String::new();
    use walkdir::WalkDir;

    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if token.is_cancelled() {
            return Err(anyhow::anyhow!("Initial sync cancelled"));
        }
        
        if entry.file_type().is_file() {
            let path = entry.path().to_path_buf();
            let rel_path = match path.strip_prefix(root) {
                Ok(p) => p,
                Err(_) => continue,
            };
            
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let metadata = match tokio::fs::metadata(&path).await {
                Ok(m) => m,
                Err(_) => continue,
            };
            let size = metadata.len();
            
            let existing = cache.get_files_in(None, Some(account_id.to_string())).await?;
            if existing.iter().any(|f| f.name == name && f.total_size == size) {
                continue;
            }

            log::info!("MIRROR [SYNC]: Ingesting backlog file: {:?}", name);
            match sync_file_to_remote(
                &path,
                rel_path,
                remote_base,
                account_id,
                true, // keep_history for initial sync
                Arc::clone(&cache),
                Arc::clone(&orchestrator),
                Arc::clone(&session_manager),
                token.clone(),
            ).await {
                Ok(id) => { root_id = id; },
                Err(e) => {
                    log::error!("MIRROR [SYNC_FILE_ERR] {}: {}", name, e);
                    // We continue to other files even if one fails (internet might be back soon)
                }
            }
        }
    }
    Ok(root_id)
}

async fn sync_file_to_remote(
    full_path: &PathBuf,
    rel_path: &std::path::Path,
    remote_base: &str,
    account_id: &str,
    keep_history: bool,
    cache: Arc<MetadataCache>,
    orchestrator: Arc<ClusterOrchestrator>,
    session_manager: Arc<SessionManager>,
    token: CancellationToken,
) -> Result<String> {
    if token.is_cancelled() {
        return Err(anyhow::anyhow!("Sync cancelled"));
    }
    let file_name = full_path.file_name().unwrap_or_default().to_string_lossy().to_string();
    
    // Resolve folder ID for the file
    let mut current_parent_id: Option<String> = None;
    let mut root_id = String::new();
    
    // 1. Handle remote_base
    let base_parts: Vec<&str> = remote_base.split('/').filter(|s| !s.is_empty()).collect();
    for part in base_parts {
        let folders = cache.get_folders_in(current_parent_id.clone(), Some(account_id.to_string())).await?;
        if let Some(f) = folders.into_iter().find(|f| f.name == part) {
            current_parent_id = Some(f.id);
        } else {
            let new_id = cache.create_folder(part.to_string(), current_parent_id.clone(), Some(account_id.to_string())).await?;
            current_parent_id = Some(new_id);
        }
    }
    
    if let Some(rid) = &current_parent_id {
        root_id = rid.clone();
    }
    
    // 2. Handle subfolders from rel_path
    if let Some(parent_rel) = rel_path.parent() {
        for part in parent_rel.components() {
            let part_name = part.as_os_str().to_string_lossy().to_string();
            let folders = cache.get_folders_in(current_parent_id.clone(), Some(account_id.to_string())).await?;
            if let Some(f) = folders.into_iter().find(|f| f.name == part_name) {
                current_parent_id = Some(f.id);
            } else {
                let new_id = cache.create_folder(part_name, current_parent_id.clone(), Some(account_id.to_string())).await?;
                current_parent_id = Some(new_id);
            }
        }
    }

    // 3. Check if a file with the same name already exists in this folder
    let existing_files = cache.get_files_in(current_parent_id.clone(), Some(account_id.to_string())).await?;
    let existing_file = existing_files.into_iter().find(|f| f.name == file_name);

    log::info!("MIRROR [UPLOAD]: Committing {:?} to remote ID {:?}", file_name, current_parent_id);
    
    let manifest = orchestrator.upload_file(
        full_path.clone(),
        session_manager,
        Arc::clone(&cache),
        file_name.clone(),
        None,
        current_parent_id.clone(),
        account_id.to_string(),
        None,
        Some(token),
    ).await?;

    let folder_id = current_parent_id.clone().unwrap_or_default();

    if let Some(old_file) = existing_file {
        if keep_history {
            // Version update: archive old, make new current
            cache.set_new_current_version(&old_file.id, manifest.clone()).await?;
            let _ = cache.log_folder_event(
                &folder_id,
                "FILE_UPDATED",
                &file_name,
                Some(&manifest.id),
                Some(&format!("Updated via mirror from {}", full_path.display())),
            ).await;
            log::info!("MIRROR [VERSION]: {} → new version created", file_name);
        } else {
            // No history: delete old, save new
            cache.delete_file(&old_file.id).await?;
            cache.save_file(manifest.clone()).await?;
            let _ = cache.log_folder_event(
                &folder_id,
                "FILE_UPDATED",
                &file_name,
                Some(&manifest.id),
                None,
            ).await;
        }
    } else {
        // New file
        cache.save_file(manifest.clone()).await?;
        let _ = cache.log_folder_event(
            &folder_id,
            "FILE_ADDED",
            &file_name,
            Some(&manifest.id),
            None,
        ).await;
    }

    let _ = cache.log_activity(
        &manifest.id,
        &manifest.name,
        "FILE",
        "MIRROR_SYNC",
        Some(format!("Mirrored from {}", full_path.display()))
    ).await;
    log::info!("MIRROR [OK]: Persistence successful for {:?}", full_path.file_name());
    
    Ok(root_id)
}
