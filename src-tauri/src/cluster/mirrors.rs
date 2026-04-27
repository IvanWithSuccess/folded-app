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
    watchers: Arc<std::sync::Mutex<HashMap<String, notify::RecommendedWatcher>>>,
    debounce_map: Arc<TokioMutex<HashMap<PathBuf, Instant>>>,
    statuses: Arc<TokioMutex<HashMap<String, String>>>,
    cancellation_tokens: Arc<TokioMutex<HashMap<String, CancellationToken>>>,
    uploading_set: Arc<TokioMutex<std::collections::HashSet<PathBuf>>>,
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
            watchers: Arc::new(std::sync::Mutex::new(HashMap::new())),
            debounce_map: Arc::new(TokioMutex::new(HashMap::new())),
            statuses: Arc::new(TokioMutex::new(HashMap::new())),
            cancellation_tokens: Arc::new(TokioMutex::new(HashMap::new())),
            uploading_set: Arc::new(TokioMutex::new(std::collections::HashSet::new())),
        }
    }

    pub async fn stop_all_for_account(&self, account_id: &str) -> Result<()> {
        let rules = self.cache.get_mirror_rules().await?;
        
        let mut tokens = self.cancellation_tokens.lock().await;
        let mut watchers = self.watchers.lock().unwrap();

        for rule in rules {
            if rule.account_id == account_id {
                if let Some(token) = tokens.remove(&rule.id) {
                    token.cancel();
                }
                watchers.remove(&rule.id);
                log::info!("MIRROR [STOP]: Account {} -> rule {}", account_id, rule.id);
            }
        }
        Ok(())
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
            uploading_set: Arc::clone(&self.uploading_set),
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
        {
            let watchers = self.watchers.lock().unwrap();
            if watchers.contains_key(&rule.id) {
                return Ok(());
            }
        }
        
        let token = CancellationToken::new();
        {
            let mut tokens = self.cancellation_tokens.lock().await;
            tokens.insert(rule.id.clone(), token.clone());
        }

        log::info!("MIRROR [INIT]: {} -> {}", rule.local_path, rule.remote_folder_name);
        
        let orchestrator = Arc::clone(&self.orchestrator);
        let session_manager = Arc::clone(&self.session_manager);
        let cache = Arc::clone(&self.cache);
        let rule_id = rule.id.clone();
        let account_id = rule.account_id.clone();
        let remote_folder_name = rule.remote_folder_name.clone();
        let local_path_root = PathBuf::from(&rule.local_path);
        
        if !local_path_root.exists() {
            log::info!("MIRROR [RECREATE]: Local path missing, recreating: {}", rule.local_path);
            let _ = std::fs::create_dir_all(&local_path_root);
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
                
                if !initial_path.exists() {
                    log::info!("MIRROR [RECOVERY]: Recreating deleted mirror folder: {:?}", initial_path);
                    let _ = std::fs::create_dir_all(&initial_path);
                }

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
                    _ = tokio::time::sleep(tokio::time::Duration::from_secs(300)) => {
                         // Update sync timestamp
                         let _ = sqlx::query("UPDATE mirror_rules SET last_sync_at = ? WHERE id = ?")
                            .bind(chrono::Utc::now().timestamp())
                            .bind(&initial_sync_id)
                            .execute(initial_cache.get_pool()).await;
                    }
                }
            }
        });

        let (tx, mut rx) = tokio::sync::mpsc::channel(100);
        
        {
            let mut watchers = self.watchers.lock().unwrap();
            
            let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
                if let Ok(event) = res {
                    let _ = tx.blocking_send(event);
                }
            })?;

            watcher.watch(&local_path_root, RecursiveMode::Recursive)?;
            watchers.insert(rule_id.clone(), watcher);
        }

        let debounce_map = Arc::clone(&self.debounce_map);
        let manager_clone = self.clone_self();
        let loop_token = token.clone();
        
        let watcher_orch = Arc::clone(&orchestrator);
        let watcher_session = Arc::clone(&session_manager);
        let watcher_cache = Arc::clone(&cache);
        let watcher_rule_id = rule_id.clone();
        let watcher_account_id = account_id.clone();
        let watcher_remote_folder = remote_folder_name.clone();
        let watcher_root = local_path_root.clone();
        let uploading_set = Arc::clone(&self.uploading_set);

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = loop_token.cancelled() => {
                         log::info!("MIRROR [CANCEL]: Task for {} received cancellation", watcher_rule_id);
                         break;
                    }
                    Some(event) = rx.recv() => {
                        match event.kind {
                            EventKind::Modify(_) | EventKind::Create(_) => {
                                for path in event.paths {
                                    if !path.is_file() { continue; }
                                    
                                    // Filter OS junk files (macOS Finder metadata, etc.)
                                    let fname = path.file_name().unwrap_or_default().to_string_lossy();
                                    if fname.starts_with("._") || fname == ".DS_Store" || fname == "Thumbs.db" || fname.starts_with('.') {
                                        continue;
                                    }

                                    // Debounce logic + memory leak prevention
                                    {
                                        let mut map = debounce_map.lock().await;
                                        let now = Instant::now();
                                        // Evict stale entries (older than 60s) to prevent unbounded growth
                                        map.retain(|_, t| now.duration_since(*t) < Duration::from_secs(60));
                                        if let Some(last) = map.get(&path) {
                                            if now.duration_since(*last) < Duration::from_secs(3) {
                                                continue;
                                            }
                                        }
                                        map.insert(path.clone(), now);
                                    }
        
                                    log::info!("MIRROR [EVENT]: File activity detected: {:?}", path.file_name().unwrap_or_default());
                                    
                                    // In-flight guard: skip if already uploading this file
                                    {
                                        let mut uploading = uploading_set.lock().await;
                                        if uploading.contains(&path) {
                                            log::debug!("MIRROR [SKIP]: Already uploading {:?}, skipping duplicate event", path.file_name());
                                            continue;
                                        }
                                        uploading.insert(path.clone());
                                    }
                                    
                                    let rel_path = match path.strip_prefix(&watcher_root) {
                                        Ok(p) => p,
                                        Err(_) => {
                                            let mut uploading = uploading_set.lock().await;
                                            uploading.remove(&path);
                                            continue;
                                        }
                                    };
        
                                     if let Err(e) = sync_file_to_remote(
                                        &path,
                                        rel_path,
                                        &watcher_remote_folder,
                                        &watcher_account_id,
                                        rule.keep_history,
                                        Arc::clone(&watcher_cache),
                                        Arc::clone(&watcher_orch),
                                        Arc::clone(&watcher_session),
                                        loop_token.clone(),
                                    ).await {
                                        log::error!("MIRROR [UPLOAD_ERR]: {}", e);
                                    }
                                    
                                    // Release in-flight guard
                                    {
                                        let mut uploading = uploading_set.lock().await;
                                        uploading.remove(&path);
                                    }
                                    
                                    // Update sync timestamp on activity
                                    let _ = sqlx::query("UPDATE mirror_rules SET last_sync_at = ? WHERE id = ?")
                                        .bind(chrono::Utc::now().timestamp())
                                        .bind(&watcher_rule_id)
                                        .execute(watcher_cache.get_pool()).await;

                                    manager_clone.update_status(&watcher_rule_id, "IDLE").await;
                                }
                            }
                            EventKind::Remove(_) => {
                                for path in event.paths {
                                    // CRITICAL: If the root itself or any parent of the root is deleted,
                                    // we MUST NOT process sub-item removals as "user deletes", 
                                    // otherwise we wipe the DB/Cloud when the user just moves/deletes the parent.
                                    if !watcher_root.exists() {
                                        log::warn!("MIRROR [PROTECT]: Root directory {:?} is missing. Ignoring removal events to prevent data loss.", watcher_root);
                                        
                                        // Attempt instant recovery if it was the root.
                                        // The reconciliation loop (every 5 min) will also recreate it
                                        // and download any missing files from cloud.
                                        if path == watcher_root || watcher_root.parent().map(|p| p == path).unwrap_or(false) {
                                            log::info!("MIRROR [RECOVER]: Instant recreation of {:?}", watcher_root);
                                            let _ = std::fs::create_dir_all(&watcher_root);
                                            // Note: on macOS, FSEvents-based watcher resumes naturally
                                            // after the directory is recreated — no explicit restart needed.
                                        }
                                        
                                        continue;
                                    }

                                    if path == watcher_root {
                                        log::warn!("MIRROR [ERROR]: Root folder deleted: {:?}", path);
                                        manager_clone.update_status(&watcher_rule_id, "ERROR").await;
                                        
                                        // Instant recovery
                                        let _ = std::fs::create_dir_all(&watcher_root);
                                        continue; 
                                    }
                                    
                                    // Soft-delete individual files ONLY if the root still exists
                                    if watcher_root.exists() && (path.is_file() || !path.exists()) {
                                        let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                                        log::info!("MIRROR [REMOVE]: File removed from local mirror: {}", file_name);
                                        
                                        let cache_c = Arc::clone(&watcher_cache);
                                        let rel_path_c = path.strip_prefix(&watcher_root).unwrap_or(&path).to_path_buf();
                                        let remote_folder_name_c = watcher_remote_folder.clone();
                                        let account_id_c = watcher_account_id.clone();
                                        let keep_history = rule.keep_history;
                                        
                                        tokio::spawn(async move {
                                            if let Err(e) = handle_mirror_file_removed(
                                                &rel_path_c,
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
        {
            let mut watchers = self.watchers.lock().unwrap();
            if let Some(watcher) = watchers.remove(id) {
                drop(watcher);
            }
        }
        
        let mut tokens = self.cancellation_tokens.lock().await;
        if let Some(token) = tokens.remove(id) {
            token.cancel();
        }
        
        Ok(())
    }
}

async fn handle_mirror_file_removed(
    rel_path: &std::path::Path,
    remote_base: &str,
    account_id: &str,
    keep_history: bool,
    cache: Arc<MetadataCache>,
) -> Result<()> {
    let item_name = rel_path.file_name().unwrap_or_default().to_string_lossy().to_string();
    
    // 1. Resolve the parent folder ID on remote
    let mut current_parent_id: Option<String> = None;
    
    // Resolve remote_base
    let base_parts: Vec<&str> = remote_base.split('/').filter(|s| !s.is_empty()).collect();
    for part in base_parts {
        let folders = cache.get_folders_in(current_parent_id.clone(), Some(account_id.to_string())).await?;
        if let Some(f) = folders.into_iter().find(|f| f.name == part) {
            current_parent_id = Some(f.id);
        } else {
            return Ok(()); // Remote folder doesn't exist, nothing to delete
        }
    }
    
    // Resolve subfolders in rel_path
    if let Some(parent_rel) = rel_path.parent() {
        for part in parent_rel.components() {
            let part_name = part.as_os_str().to_string_lossy().to_string();
            let folders = cache.get_folders_in(current_parent_id.clone(), Some(account_id.to_string())).await?;
            if let Some(f) = folders.into_iter().find(|f| f.name == part_name) {
                current_parent_id = Some(f.id);
            } else {
                return Ok(()); // Path doesn't exist on remote
            }
        }
    }

    // 2. Check if it was a file in this folder
    let files = cache.get_files_in(current_parent_id.clone(), Some(account_id.to_string())).await?;
    if let Some(file) = files.into_iter().find(|f| f.name == item_name) {
        let folder_id = file.folder_id.clone().unwrap_or_default();
        if keep_history {
            cache.soft_delete_file(&file.id).await?;
            let _ = cache.log_folder_event(
                &folder_id,
                "FILE_DELETED_FROM_MIRROR",
                &file.name,
                Some(&file.id),
                Some(&format!("Deleted from local mirror folder: {}", remote_base)),
            ).await;
            log::info!("MIRROR [SOFT_DELETE]: File {} hidden", item_name);
        } else {
            cache.delete_file(&file.id).await?;
            log::info!("MIRROR [DELETE]: File {} permanently removed", item_name);
        }
        return Ok(());
    }

    // 3. Check if it was a folder in this folder
    let folders = cache.get_folders_in(current_parent_id, Some(account_id.to_string())).await?;
    if let Some(folder) = folders.into_iter().find(|f| f.name == item_name) {
        cache.delete_folder_recursive(&folder.id).await?;
        log::info!("MIRROR [DELETE]: Folder {} and its contents removed", item_name);
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

    // --- PHASE 2: Cloud -> Local (Download missing or outdated files) ---
    log::info!("MIRROR [SYNC]: Checking for cloud files to download into {:?}", root);
    
    let mut current_remote_id: Option<String> = None;
    let base_parts: Vec<&str> = remote_base.split('/').filter(|s| !s.is_empty()).collect();
    for part in base_parts {
        let folders = cache.get_folders_in(current_remote_id.clone(), Some(account_id.to_string())).await?;
        if let Some(f) = folders.into_iter().find(|f| f.name == part) {
            current_remote_id = Some(f.id);
        } else {
            return Ok(root_id);
        }
    }

    if let Some(remote_id) = current_remote_id {
        if let Err(e) = download_cloud_folder_recursive(
            &remote_id,
            root,
            account_id,
            Arc::clone(&cache),
            Arc::clone(&orchestrator),
            Arc::clone(&session_manager),
            token,
        ).await {
            log::error!("MIRROR [SYNC_RECOVER_ERR]: {}", e);
        }
    }

    Ok(root_id)
}

async fn download_cloud_folder_recursive(
    remote_folder_id: &str,
    local_root: &PathBuf,
    account_id: &str,
    cache: Arc<MetadataCache>,
    orchestrator: Arc<ClusterOrchestrator>,
    session_manager: Arc<SessionManager>,
    token: CancellationToken,
) -> Result<()> {
    // 1. Download files in this folder
    let remote_files = cache.get_files_in(Some(remote_folder_id.to_string()), Some(account_id.to_string())).await?;
    for file in remote_files {
        if token.is_cancelled() { return Ok(()); }
        let local_file_path = local_root.join(&file.name);
        
        let needs_download = if !local_file_path.exists() {
            true
        } else {
            match tokio::fs::metadata(&local_file_path).await {
                Ok(m) => m.len() != file.total_size,
                Err(_) => true,
            }
        };

        if needs_download {
            log::info!("MIRROR [RECOVER]: Downloading missing/changed file: {}", file.name);
            if let Err(e) = orchestrator.download_file(
                file,
                local_file_path,
                session_manager.clone(),
                None,
                Some(token.clone()),
            ).await {
                log::error!("MIRROR [DOWNLOAD_ERR]: {}", e);
            }
        }
    }

    // 2. Recurse into subfolders
    let subfolders = cache.get_folders_in(Some(remote_folder_id.to_string()), Some(account_id.to_string())).await?;
    for folder in subfolders {
        if token.is_cancelled() { return Ok(()); }
        let local_subfolder_path = local_root.join(&folder.name);
        if !local_subfolder_path.exists() {
            let _ = std::fs::create_dir_all(&local_subfolder_path);
        }
        
        // Use Box::pin for recursion in async functions
        Box::pin(download_cloud_folder_recursive(
            &folder.id,
            &local_subfolder_path,
            account_id,
            Arc::clone(&cache),
            Arc::clone(&orchestrator),
            Arc::clone(&session_manager),
            token.clone(),
        )).await?;
    }
    
    Ok(())
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
