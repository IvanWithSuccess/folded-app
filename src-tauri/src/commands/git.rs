use tauri::{State, Emitter};
use std::sync::Arc;
use std::path::{Path, PathBuf};
use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};
use walkdir::WalkDir;
use crate::cache::{MetadataCache, GitRepository, GitCommit, GitBranch};
use crate::session_manager::SessionManager;
use crate::cluster::{ClusterOrchestrator, FileManifest, ChunkMeta};
use grammers_tl_types as tl;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FoldedGitConfig {
    pub name: String,
    pub telegram_chat_id: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileChange {
    pub relative_path: String,
    pub status: String, // "added" | "modified" | "deleted"
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RepoFileEntry {
    pub relative_path: String,
    pub size: u64,
    pub sha256: String,
    pub chunks: Vec<ChunkMeta>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitManifest {
    pub files: Vec<RepoFileEntry>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MergeConflict {
    pub relative_path: String,
    pub target_sha256: Option<String>,
    pub source_sha256: Option<String>,
    pub base_sha256: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MergeState {
    pub source_branch: String,
    pub target_branch: String,
    pub source_commit: String,
    pub target_commit: String,
    pub conflicts: Vec<MergeConflict>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DiffLine {
    pub line_type: String, // "added" | "deleted" | "unchanged"
    pub content: String,
    pub old_line_num: Option<usize>,
    pub new_line_num: Option<usize>,
}

fn get_app_data_dir() -> PathBuf {
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .expect("Could not find home directory");
    let app_dir = PathBuf::from(home_dir).join(".folded");
    let _ = std::fs::create_dir_all(&app_dir);
    app_dir
}

fn get_objects_dir() -> PathBuf {
    let dir = get_app_data_dir().join("objects");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn compute_sha256(path: &Path) -> std::io::Result<String> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher)?;
    Ok(format!("{:x}", hasher.finalize()))
}

fn load_ignore_patterns(root_path: &Path) -> Vec<String> {
    let mut patterns = vec![
        "node_modules/".to_string(),
        "target/".to_string(),
        "dist/".to_string(),
        "build/".to_string(),
        ".DS_Store".to_string(),
        ".git/".to_string(),
        ".folded.json".to_string(),
        ".folded_merge_state.json".to_string(),
    ];

    let ignore_file = root_path.join(".foldedignore");
    if ignore_file.exists() {
        if let Ok(content) = std::fs::read_to_string(ignore_file) {
            for line in content.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() && !trimmed.starts_with('#') {
                    patterns.push(trimmed.to_string());
                }
            }
        }
    }
    patterns
}

fn is_path_ignored(relative_path: &str, patterns: &[String]) -> bool {
    let rel_path_normalized = relative_path.replace('\\', "/");
    for pattern in patterns {
        let pattern_normalized = pattern.replace('\\', "/");
        if pattern_normalized.ends_with('/') {
            let dir_pattern = &pattern_normalized[..pattern_normalized.len() - 1];
            if rel_path_normalized == dir_pattern 
                || rel_path_normalized.starts_with(&format!("{}/", dir_pattern)) 
                || rel_path_normalized.contains(&format!("/{}/", dir_pattern)) 
            {
                return true;
            }
        } else if pattern_normalized.starts_with('*') {
            let ext = &pattern_normalized[1..];
            if rel_path_normalized.ends_with(ext) {
                return true;
            }
        } else {
            if rel_path_normalized == pattern_normalized 
                || rel_path_normalized.starts_with(&format!("{}/", pattern_normalized))
                || rel_path_normalized.contains(&format!("/{}/", pattern_normalized)) 
            {
                return true;
            }
        }
    }
    false
}

async fn fetch_all_remote_commits(
    client: &grammers_client::Client,
    repo_id: &str,
) -> Result<Vec<GitCommit>, String> {
    let mut remote_commits = Vec::new();
    let queries = vec!["FOLDED".to_string(), "GITGRAM".to_string()];

    for query in queries {
        let mut offset_id = 0;
        loop {
            let search_request = tl::functions::messages::Search {
                peer: tl::enums::InputPeer::PeerSelf,
                q: query.clone(),
                filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
                min_date: 0, max_date: 0, 
                offset_id, 
                add_offset: 0, 
                limit: 100, 
                max_id: 0, min_id: 0, hash: 0,
                from_id: None, saved_peer_id: None, saved_reaction: None, top_msg_id: None,
            };
            
            let search_result = client.invoke(&search_request).await.map_err(|e| e.to_string())?;
            let messages = match search_result {
                tl::enums::messages::Messages::Messages(m) => m.messages,
                tl::enums::messages::Messages::Slice(m) => m.messages,
                _ => Vec::new(),
            };

            if messages.is_empty() {
                break;
            }

            let mut last_id = 0;
            for msg_enum in &messages {
                if let tl::enums::Message::Message(msg) = msg_enum {
                    last_id = msg.id;
                    let text = &msg.message;
                    if text.starts_with("[FOLDED_COMMIT]") || text.starts_with("[GITGRAM_COMMIT]") {
                        let prefix_len = if text.starts_with("[FOLDED_COMMIT]") {
                            "[FOLDED_COMMIT]\n".len()
                        } else {
                            "[GITGRAM_COMMIT]\n".len()
                        };
                        let json_part = &text[prefix_len..];
                        if let Ok(c) = serde_json::from_str::<GitCommit>(json_part) {
                            if c.repository_id == repo_id {
                                remote_commits.push(c);
                            }
                        }
                    } else if text.starts_with("[FOLDED_COMMIT_DOC]") || text.starts_with("[GITGRAM_COMMIT_DOC]") {
                        if let Some(media) = msg.media.clone() {
                            if let tl::enums::MessageMedia::Document(d) = media {
                                let document = grammers_client::media::Document::from_raw_media(d);
                                let mut buffer = Vec::new();
                                let mut download_stream = client.iter_download(&document);
                                while let Some(chunk) = download_stream.next().await.map_err(|e| e.to_string())? {
                                    buffer.extend_from_slice(&chunk);
                                }
                                if let Ok(c) = serde_json::from_slice::<GitCommit>(&buffer) {
                                    if c.repository_id == repo_id {
                                        remote_commits.push(c);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if messages.len() < 100 || last_id == 0 {
                break;
            }
            offset_id = last_id;
        }
    }

    remote_commits.sort_by_key(|c| c.timestamp);
    Ok(remote_commits)
}

async fn fetch_all_discover_commits(
    client: &grammers_client::Client,
) -> Result<Vec<GitCommit>, String> {
    let mut remote_commits = Vec::new();
    let queries = vec!["FOLDED".to_string(), "GITGRAM".to_string()];

    for query in queries {
        let mut offset_id = 0;
        loop {
            let search_request = tl::functions::messages::Search {
                peer: tl::enums::InputPeer::PeerSelf,
                q: query.clone(),
                filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
                min_date: 0, max_date: 0, 
                offset_id, 
                add_offset: 0, 
                limit: 100, 
                max_id: 0, min_id: 0, hash: 0,
                from_id: None, saved_peer_id: None, saved_reaction: None, top_msg_id: None,
            };
            
            let search_result = client.invoke(&search_request).await.map_err(|e| e.to_string())?;
            let messages = match search_result {
                tl::enums::messages::Messages::Messages(m) => m.messages,
                tl::enums::messages::Messages::Slice(m) => m.messages,
                _ => Vec::new(),
            };

            if messages.is_empty() {
                break;
            }

            let mut last_id = 0;
            for msg_enum in &messages {
                if let tl::enums::Message::Message(msg) = msg_enum {
                    last_id = msg.id;
                    let text = &msg.message;
                    if text.starts_with("[FOLDED_COMMIT]") || text.starts_with("[GITGRAM_COMMIT]") {
                        let prefix_len = if text.starts_with("[FOLDED_COMMIT]") {
                            "[FOLDED_COMMIT]\n".len()
                        } else {
                            "[GITGRAM_COMMIT]\n".len()
                        };
                        let json_part = &text[prefix_len..];
                        if let Ok(c) = serde_json::from_str::<GitCommit>(json_part) {
                            remote_commits.push(c);
                        }
                    } else if text.starts_with("[FOLDED_COMMIT_DOC]") || text.starts_with("[GITGRAM_COMMIT_DOC]") {
                        if let Some(media) = msg.media.clone() {
                            if let tl::enums::MessageMedia::Document(d) = media {
                                let document = grammers_client::media::Document::from_raw_media(d);
                                let mut buffer = Vec::new();
                                let mut download_stream = client.iter_download(&document);
                                while let Some(chunk) = download_stream.next().await.map_err(|e| e.to_string())? {
                                    buffer.extend_from_slice(&chunk);
                                }
                                if let Ok(c) = serde_json::from_slice::<GitCommit>(&buffer) {
                                    remote_commits.push(c);
                                }
                            }
                        }
                    }
                }
            }

            if messages.len() < 100 || last_id == 0 {
                break;
            }
            offset_id = last_id;
        }
    }

    remote_commits.sort_by_key(|c| c.timestamp);
    Ok(remote_commits)
}

#[tauri::command]
pub async fn read_ignored_patterns(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
) -> Result<Vec<String>, String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let ignore_file = Path::new(&repo.local_path).join(".foldedignore");
    let mut patterns = Vec::new();
    if ignore_file.exists() {
        if let Ok(content) = std::fs::read_to_string(ignore_file) {
            for line in content.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() && !trimmed.starts_with('#') {
                    patterns.push(trimmed.to_string());
                }
            }
        }
    }
    Ok(patterns)
}

#[tauri::command]
pub async fn save_ignored_patterns(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
    patterns: Vec<String>,
) -> Result<(), String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let ignore_file = Path::new(&repo.local_path).join(".foldedignore");
    let mut file_content = String::new();
    file_content.push_str("# Folded ignore file - generated automatically\n\n");
    for pattern in patterns {
        file_content.push_str(&format!("{}\n", pattern));
    }

    std::fs::write(ignore_file, file_content)
        .map_err(|e| format!("Failed to save .foldedignore: {}", e))?;

    Ok(())
}

fn emit_sync_progress(app: &tauri::AppHandle, progress: u8, message: &str) {
    let _ = app.emit("sync-progress", serde_json::json!({
        "progress": progress,
        "message": message
    }));
}

// ---------------- TAURI COMMANDS ----------------

#[tauri::command]
pub async fn list_repositories(
    cache: State<'_, Arc<MetadataCache>>,
) -> Result<Vec<GitRepository>, String> {
    cache.get_repositories().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_repository(
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    name: String,
    path: String,
    account_id: String,
) -> Result<(), String> {
    // Enforce name uniqueness locally
    if cache.get_repository(&name).await.map_err(|e| e.to_string())?.is_some() {
        return Err("A repository with this name already exists locally".to_string());
    }

    let now = chrono::Utc::now().timestamp();
    let repo = GitRepository {
        id: name.clone(),
        name: name.clone(),
        local_path: path.clone(),
        telegram_chat_id: account_id.clone(),
        current_head: None,
        remote_head: None,
        current_branch: "main".to_string(),
        created_at: now,
    };
    cache.create_repository(repo).await.map_err(|e| e.to_string())?;

    // Seed default 'main' branch
    let branch = GitBranch {
        id: format!("{}-main", name),
        repository_id: name.clone(),
        name: "main".to_string(),
        head_commit_id: None,
        created_at: now,
    };
    cache.create_branch(branch).await.map_err(|e| e.to_string())?;

    // Write .folded.json config file in the project root
    let config = FoldedGitConfig {
        name: name.clone(),
        telegram_chat_id: account_id.clone(),
    };
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    let _ = std::fs::create_dir_all(Path::new(&path));
    std::fs::write(Path::new(&path).join(".folded.json"), config_json)
        .map_err(|e| format!("Failed to write .folded.json: {}", e))?;

    // Update system manifest in Telegram (best-effort, non-fatal)
    if let Some(client) = session.get_client_by_id(&account_id).await {
        let _ = update_system_manifest(&client, cache.inner(), &account_id).await;
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_repository(
    cache: State<'_, Arc<MetadataCache>>,
    id: String,
) -> Result<(), String> {
    cache.delete_repository(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_repository_status(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
) -> Result<Vec<FileChange>, String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let root_path = Path::new(&repo.local_path);
    if !root_path.exists() {
        return Err("Local repository directory does not exist".to_string());
    }

    // 1. Scan working directory
    let ignore_patterns = load_ignore_patterns(root_path);
    let mut disk_files = std::collections::HashMap::new();
    for entry in WalkDir::new(root_path)
        .into_iter()
        .filter_entry({
            let ignore_patterns = ignore_patterns.clone();
            let root_path = root_path.to_path_buf();
            move |e| {
                if let Ok(rel) = e.path().strip_prefix(&root_path) {
                    let rel_path = rel.to_string_lossy().to_string();
                    if rel_path.is_empty() {
                        return true;
                    }
                    !is_path_ignored(&rel_path, &ignore_patterns)
                } else {
                    true
                }
            }
        })
        .filter_map(|e| e.ok()) 
    {
        if entry.file_type().is_file() {
            if let Ok(rel) = entry.path().strip_prefix(root_path) {
                let rel_path = rel.to_string_lossy().to_string();
                if let Ok(hash) = compute_sha256(entry.path()) {
                    disk_files.insert(rel_path, hash);
                }
            }
        }
    }

    // 2. Read HEAD manifest files
    let mut head_files = std::collections::HashMap::new();
    if let Some(ref head_id) = repo.current_head {
        if let Ok(Some(commit)) = cache.get_commit(head_id).await {
            if let Ok(manifest) = serde_json::from_str::<GitManifest>(&commit.manifest_data) {
                for file in manifest.files {
                    head_files.insert(file.relative_path, file.sha256);
                }
            }
        }
    }

    // 3. Compute changes
    let mut changes = Vec::new();

    // Check for added & modified files
    for (rel_path, disk_hash) in &disk_files {
        match head_files.get(rel_path) {
            None => {
                changes.push(FileChange {
                    relative_path: rel_path.clone(),
                    status: "added".to_string(),
                });
            }
            Some(head_hash) => {
                if disk_hash != head_hash {
                    changes.push(FileChange {
                        relative_path: rel_path.clone(),
                        status: "modified".to_string(),
                    });
                }
            }
        }
    }

    // Check for deleted files
    for rel_path in head_files.keys() {
        if !disk_files.contains_key(rel_path) {
            changes.push(FileChange {
                relative_path: rel_path.clone(),
                status: "deleted".to_string(),
            });
        }
    }

    // Sort changes alphabetically
    changes.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    Ok(changes)
}

#[tauri::command]
pub async fn get_file_diff(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
    file_path: String,
) -> Result<Vec<DiffLine>, String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let root_path = Path::new(&repo.local_path);
    let disk_file_path = root_path.join(&file_path);

    // Read current content (from disk)
    let new_content = if disk_file_path.exists() {
        std::fs::read_to_string(&disk_file_path).unwrap_or_default()
    } else {
        String::new()
    };

    // Find hash in HEAD manifest
    let mut old_hash = None;
    if let Some(ref head_id) = repo.current_head {
        if let Ok(Some(commit)) = cache.get_commit(head_id).await {
            if let Ok(manifest) = serde_json::from_str::<GitManifest>(&commit.manifest_data) {
                if let Some(file_entry) = manifest.files.iter().find(|f| f.relative_path == file_path) {
                    old_hash = Some(file_entry.sha256.clone());
                }
            }
        }
    }

    // Read old content (from objects store)
    let old_content = if let Some(ref hash) = old_hash {
        let object_path = get_objects_dir().join(hash);
        std::fs::read_to_string(&object_path).unwrap_or_default()
    } else {
        String::new()
    };

    Ok(compute_diff(&old_content, &new_content))
}

#[tauri::command]
pub async fn commit_changes(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
    message_summary: String,
    message_description: Option<String>,
    author: String,
    files_to_commit: Vec<String>,
) -> Result<String, String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let root_path = Path::new(&repo.local_path);
    let objects_dir = get_objects_dir();

    // 1. Fetch current HEAD manifest to merge unchanged files
    let mut manifest_files = std::collections::HashMap::new();
    if let Some(ref head_id) = repo.current_head {
        if let Ok(Some(commit)) = cache.get_commit(head_id).await {
            if let Ok(manifest) = serde_json::from_str::<GitManifest>(&commit.manifest_data) {
                for file in manifest.files {
                    manifest_files.insert(file.relative_path.clone(), file);
                }
            }
        }
    }

    // 2. Process committed files
    for rel_path in &files_to_commit {
        let disk_path = root_path.join(rel_path);
        if disk_path.exists() {
            // Added or modified: copy to objects directory
            let size = std::fs::metadata(&disk_path).map(|m| m.len()).unwrap_or(0);
            let sha256 = compute_sha256(&disk_path).map_err(|e| e.to_string())?;
            let object_path = objects_dir.join(&sha256);
            if !object_path.exists() {
                std::fs::copy(&disk_path, &object_path).map_err(|e| e.to_string())?;
            }

            // Reuse chunks if this exact file version was previously uploaded
            let mut chunks = Vec::new();
            // Look up in our cache database if this SHA256 has been uploaded before
            // We can query chunks where file_id matches or we can look up in commits
            let previous_pushed_commits = cache.get_commits(&repo_id).await.unwrap_or_default();
            'outer: for p_commit in previous_pushed_commits {
                if let Ok(manifest) = serde_json::from_str::<GitManifest>(&p_commit.manifest_data) {
                    for f in manifest.files {
                        if f.sha256 == sha256 && !f.chunks.is_empty() {
                            chunks = f.chunks;
                            break 'outer;
                        }
                    }
                }
            }

            manifest_files.insert(rel_path.clone(), RepoFileEntry {
                relative_path: rel_path.clone(),
                size,
                sha256,
                chunks,
            });
        } else {
            // Deleted: remove from manifest
            manifest_files.remove(rel_path);
        }
    }

    // 3. Save new commit
    let new_commit_id = uuid::Uuid::new_v4().to_string();
    let new_manifest = GitManifest {
        files: manifest_files.into_values().collect(),
    };
    let new_manifest_data = serde_json::to_string(&new_manifest).map_err(|e| e.to_string())?;

    let commit = GitCommit {
        id: new_commit_id.clone(),
        repository_id: repo_id.clone(),
        parent_id: repo.current_head.clone(),
        message_summary,
        message_description,
        author,
        timestamp: chrono::Utc::now().timestamp(),
        manifest_data: new_manifest_data,
        is_pushed: false,
        branch_name: repo.current_branch.clone(),
    };

    cache.create_commit(commit).await.map_err(|e| e.to_string())?;

    // 4. Update repository HEAD and the active branch's HEAD
    cache.update_repository_heads(&repo_id, Some(&new_commit_id), None).await
        .map_err(|e| e.to_string())?;
    cache.update_branch_head(&repo_id, &repo.current_branch, Some(&new_commit_id)).await
        .map_err(|e| e.to_string())?;

    Ok(new_commit_id)
}

#[tauri::command]
pub async fn push_commits(
    app: tauri::AppHandle,
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    cluster: State<'_, Arc<ClusterOrchestrator>>,
    repo_id: String,
) -> Result<(), String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    // Get unpushed commits in chronological order (oldest first)
    let mut commits = cache.get_commits(&repo_id).await.map_err(|e| e.to_string())?;
    commits.sort_by_key(|c| c.timestamp);
    let unpushed_commits: Vec<GitCommit> = commits.into_iter().filter(|c| !c.is_pushed).collect();

    if unpushed_commits.is_empty() {
        emit_sync_progress(&app, 100, "Already up to date");
        return Ok(());
    }

    let client = session.get_client_by_id(&repo.telegram_chat_id).await
        .ok_or_else(|| "Telegram client not connected".to_string())?;

    let input_peer_self = tl::enums::InputPeer::PeerSelf;
    let objects_dir = get_objects_dir();

    // 1. Calculate total size of files to upload
    let mut total_files_to_push = 0;
    for commit in &unpushed_commits {
        if let Ok(manifest) = serde_json::from_str::<GitManifest>(&commit.manifest_data) {
            for file_entry in &manifest.files {
                if file_entry.chunks.is_empty() && file_entry.size > 0 {
                    total_files_to_push += 1;
                }
            }
        }
    }
    let mut files_pushed = 0;

    let total_commits = unpushed_commits.len();
    for (commit_idx, mut commit) in unpushed_commits.into_iter().enumerate() {
        let mut manifest = serde_json::from_str::<GitManifest>(&commit.manifest_data)
            .map_err(|e| e.to_string())?;

        // 2. Upload missing chunks for all files in this commit
        let mut manifest_updated = false;
        for file_entry in &mut manifest.files {
            if file_entry.chunks.is_empty() && file_entry.size > 0 {
                let file_path = objects_dir.join(&file_entry.sha256);
                if !file_path.exists() {
                    return Err(format!("Object missing in local cache for file: {}", file_entry.relative_path));
                }

                let current_progress = ((files_pushed * 100) / total_files_to_push.max(1)) as u8;
                emit_sync_progress(&app, current_progress, &format!("Pushing file: {}", file_entry.relative_path));

                // Upload file chunks
                let uploaded_file_manifest = cluster.upload_file(
                    file_path,
                    Arc::clone(&session),
                    Arc::clone(&cache),
                    format!("object-{}", file_entry.sha256),
                    Some(app.clone()),
                    None,
                    repo.telegram_chat_id.clone(),
                    None,
                    None,
                ).await.map_err(|e| e.to_string())?;

                file_entry.chunks = uploaded_file_manifest.chunks;
                manifest_updated = true;
                files_pushed += 1;
            }
        }

        emit_sync_progress(
            &app, 
            (((commit_idx * 100) / total_commits.max(1)) + 5).min(95) as u8, 
            &format!("Publishing commit: {}", commit.message_summary)
        );

        // 3. Save manifest changes to commit if files were uploaded
        if manifest_updated {
            commit.manifest_data = serde_json::to_string(&manifest).map_err(|e| e.to_string())?;
            // Update in DB
            sqlx::query("UPDATE git_commits SET manifest_data = ? WHERE id = ?")
                .bind(&commit.manifest_data)
                .bind(&commit.id)
                .execute(cache.get_pool()).await
                .map_err(|e| e.to_string())?;
        }

        // 4. Serialize and post commit message to Telegram Saved Messages
        let commit_json = serde_json::to_string(&commit).map_err(|e| e.to_string())?;
        let commit_text = format!("[FOLDED_COMMIT]\n{}", commit_json);

        if commit_text.len() <= 4000 {
            client.send_message(&input_peer_self, commit_text).await
                .map_err(|e| e.to_string())?;
        } else {
            // If it exceeds the Telegram message length, upload as document
            let tmp_path = std::env::temp_dir().join(format!("commit-{}.json", commit.id));
            std::fs::write(&tmp_path, commit_json.as_bytes()).map_err(|e| e.to_string())?;
            
            let uploaded_file = client.upload_file(&tmp_path).await.map_err(|e| e.to_string())?;
            let caption = format!("[FOLDED_COMMIT_DOC] repo_id={} commit_id={}", repo_id, commit.id);
            client.send_message(
                &input_peer_self, 
                grammers_client::message::InputMessage::new()
                    .text(caption)
                    .document(uploaded_file)
            ).await.map_err(|e| e.to_string())?;
            let _ = std::fs::remove_file(&tmp_path);
        }

        // 5. Mark local commit as pushed
        cache.mark_commit_pushed(&commit.id).await.map_err(|e| e.to_string())?;
        cache.update_repository_heads(&repo_id, None, Some(&commit.id)).await.map_err(|e| e.to_string())?;
    }

    emit_sync_progress(&app, 100, "Push completed successfully");
    Ok(())
}

#[tauri::command]
pub async fn pull_commits(
    app: tauri::AppHandle,
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    cluster: State<'_, Arc<ClusterOrchestrator>>,
    repo_id: String,
) -> Result<(), String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let client = session.get_client_by_id(&repo.telegram_chat_id).await
        .ok_or_else(|| "Telegram client not connected".to_string())?;

    emit_sync_progress(&app, 10, "Fetching commits from Telegram...");

    // 1. Query all remote commits using the paginated helper
    let remote_commits = fetch_all_remote_commits(&client, &repo_id).await?;

    emit_sync_progress(&app, 40, "Processing commits...");

    // 2. Save any new remote commits to local DB
    let mut new_remote_head = None;
    for mut remote_commit in remote_commits {
        new_remote_head = Some(remote_commit.id.clone());
        let local_exists = cache.get_commit(&remote_commit.id).await.map_err(|e| e.to_string())?.is_some();
        if !local_exists {
            remote_commit.is_pushed = true; // Mark as pushed since it came from remote
            cache.create_commit(remote_commit).await.map_err(|e| e.to_string())?;
        }
    }

    if let Some(remote_head_id) = new_remote_head {
        // Fast-forward local branch head and repo current head to match remote HEAD
        let _ = cache.update_branch_head(&repo_id, &repo.current_branch, Some(&remote_head_id)).await;
        cache.update_repository_heads(&repo_id, Some(&remote_head_id), Some(&remote_head_id)).await
            .map_err(|e| e.to_string())?;

        emit_sync_progress(&app, 60, "Downloading changed files...");

        // 3. Fast-forward checkout (apply changes from remote HEAD to local disk)
        checkout_commit(
            app.clone(),
            Arc::clone(&cache),
            Arc::clone(&session),
            Arc::clone(&cluster),
            &repo_id,
            &remote_head_id,
        ).await?;
    }

    emit_sync_progress(&app, 100, "Pull completed successfully");
    Ok(())
}

#[tauri::command]
pub async fn clone_repository(
    app: tauri::AppHandle,
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    cluster: State<'_, Arc<ClusterOrchestrator>>,
    local_path: String,
    telegram_chat_id: String, // mapped from account ID
    repository_id: String,    // target repository ID (the unique repository name)
) -> Result<(), String> {
    let client = session.get_client_by_id(&telegram_chat_id).await
        .ok_or_else(|| "Telegram client not connected".to_string())?;

    // Verify if repository has any commits in Telegram
    let search_request = tl::functions::messages::Search {
        peer: tl::enums::InputPeer::PeerSelf,
        q: "[FOLDED_COMMIT]".to_string(),
        filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
        min_date: 0, max_date: 0, offset_id: 0, add_offset: 0, limit: 100, max_id: 0, min_id: 0, hash: 0,
        from_id: None, saved_peer_id: None, saved_reaction: None, top_msg_id: None,
    };
    
    let search_result = client.invoke(&search_request).await.map_err(|e| e.to_string())?;
    let messages = match search_result {
        tl::enums::messages::Messages::Messages(m) => m.messages,
        tl::enums::messages::Messages::Slice(m) => m.messages,
        _ => Vec::new(),
    };

    let mut repo_found = false;
    for msg_enum in messages {
        if let tl::enums::Message::Message(msg) = msg_enum {
            let text = msg.message;
            if text.starts_with("[FOLDED_COMMIT]") {
                let json_part = &text["[FOLDED_COMMIT]\n".len()..];
                if let Ok(c) = serde_json::from_str::<GitCommit>(json_part) {
                    if c.repository_id == repository_id {
                        repo_found = true;
                        break;
                    }
                }
            } else if text.starts_with("[FOLDED_COMMIT_DOC]") {
                if let Some(repo_id_chunk) = text.split("repo_id=").nth(1) {
                    if let Some(r_id) = repo_id_chunk.split_whitespace().next() {
                        if r_id == repository_id {
                            repo_found = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    if !repo_found {
        return Err(format!("Repository '{}' not found in this Telegram account. Make sure it has been pushed from the original source.", repository_id));
    }

    // 1. Create a local repo shell in the cache
    let repo_id = repository_id.clone();
    
    // Construct the actual project directory path
    let base_path = Path::new(&local_path);
    let target_path = if base_path.file_name().map(|n| n.to_string_lossy().to_string()) == Some(repo_id.clone()) {
        base_path.to_path_buf()
    } else {
        base_path.join(&repo_id)
    };

    // Ensure the folder is created on the local disk
    if !target_path.exists() {
        std::fs::create_dir_all(&target_path)
            .map_err(|e| format!("Failed to create project folder: {}", e))?;
    }

    let target_path_str = target_path.to_string_lossy().to_string();

    // Check if repo already exists locally
    let exists = cache.get_repository(&repo_id).await.map_err(|e| e.to_string())?.is_some();
    if !exists {
        let now = chrono::Utc::now().timestamp();
        let repo = GitRepository {
            id: repo_id.clone(),
            name: repo_id.clone(),
            local_path: target_path_str,
            telegram_chat_id: telegram_chat_id.clone(),
            current_head: None,
            remote_head: None,
            current_branch: "main".to_string(),
            created_at: now,
        };
        cache.create_repository(repo).await.map_err(|e| e.to_string())?;

        // Seed default 'main' branch
        let branch = GitBranch {
            id: format!("{}-main", repo_id),
            repository_id: repo_id.clone(),
            name: "main".to_string(),
            head_commit_id: None,
            created_at: now,
        };
        cache.create_branch(branch).await.map_err(|e| e.to_string())?;

        // Write .folded.json config file in the project root
        let config = FoldedGitConfig {
            name: repo_id.clone(),
            telegram_chat_id: telegram_chat_id.clone(),
        };
        let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
        std::fs::write(target_path.join(".folded.json"), config_json)
            .map_err(|e| format!("Failed to write .folded.json: {}", e))?;
    }

    // 2. Fetch/Pull commits to checkout files
    pull_commits(
        app.clone(),
        cache,
        session,
        cluster,
        repo_id,
    ).await?;

    Ok(())
}

#[tauri::command]
pub async fn get_repository_history(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
) -> Result<Vec<GitCommit>, String> {
    cache.get_commits(&repo_id).await.map_err(|e| e.to_string())
}

// ---------------- HELPER FUNCTIONS ----------------

async fn checkout_commit(
    app: tauri::AppHandle,
    cache: Arc<MetadataCache>,
    session: Arc<SessionManager>,
    cluster: Arc<ClusterOrchestrator>,
    repo_id: &str,
    commit_id: &str,
) -> Result<(), String> {
    let repo = cache.get_repository(repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let commit = cache.get_commit(commit_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Commit not found".to_string())?;

    let root_path = Path::new(&repo.local_path);
    let objects_dir = get_objects_dir();
    let manifest = serde_json::from_str::<GitManifest>(&commit.manifest_data)
        .map_err(|e| e.to_string())?;

    // Pre-calculate which files actually need to be downloaded
    let mut files_to_download = Vec::new();
    for file_entry in &manifest.files {
        let object_file_path = objects_dir.join(&file_entry.sha256);
        let object_ready = if object_file_path.exists() {
            compute_sha256(&object_file_path).unwrap_or_default() == file_entry.sha256
        } else {
            false
        };
        if !object_ready {
            files_to_download.push(file_entry.clone());
        }
    }

    let total_downloads = files_to_download.len();
    let mut downloaded_count = 0;

    // 1. Identify which files need to be updated or downloaded
    for file_entry in &manifest.files {
        let dest_file_path = root_path.join(&file_entry.relative_path);
        let object_file_path = objects_dir.join(&file_entry.sha256);

        // Ensure parent directory exists
        if let Some(parent) = dest_file_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        // Check if correct file exists in objects store
        let object_ready = if object_file_path.exists() {
            compute_sha256(&object_file_path).unwrap_or_default() == file_entry.sha256
        } else {
            false
        };

        if !object_ready {
            // Download from Telegram
            if !file_entry.chunks.is_empty() {
                let current_progress = ((downloaded_count * 100) / total_downloads.max(1)) as u8;
                emit_sync_progress(&app, current_progress, &format!("Downloading: {}", file_entry.relative_path));

                // Emulate a FileManifest for cluster download
                let temp_manifest = FileManifest {
                    id: uuid::Uuid::new_v4().to_string(),
                    name: file_entry.relative_path.clone(),
                    total_size: file_entry.size,
                    chunk_size: 0,
                    chunks: file_entry.chunks.clone(),
                    folder_id: None,
                    account_id: Some(repo.telegram_chat_id.clone()),
                    storage_hub_id: None,
                    storage_hub_access_hash: None,
                    is_external: false,
                    is_starred: false,
                    created_at: chrono::Utc::now().timestamp(),
                    is_current_version: true,
                    version_of: None,
                    version_number: 1,
                    deleted_at: None,
                };

                cluster.download_file(
                    temp_manifest,
                    object_file_path.clone(),
                    Arc::clone(&session),
                    Some(app.clone()),
                    None,
                ).await.map_err(|e| e.to_string())?;
                downloaded_count += 1;
            } else if file_entry.size > 0 {
                return Err(format!("File {} has 0 chunks on remote but size is >0", file_entry.relative_path));
            } else {
                // Empty file: create empty file in objects store
                std::fs::write(&object_file_path, "").map_err(|e| e.to_string())?;
            }
        }

        // Copy from objects store to working directory if size/hash differs
        let current_hash = if dest_file_path.exists() {
            compute_sha256(&dest_file_path).ok()
        } else {
            None
        };

        if current_hash.as_ref() != Some(&file_entry.sha256) {
            std::fs::copy(&object_file_path, &dest_file_path).map_err(|e| e.to_string())?;
        }
    }

    // 2. Identify which files need to be deleted (they are in current local head manifest but NOT in checkout manifest)
    let mut files_to_delete = Vec::new();
    if let Some(ref current_head_id) = repo.current_head {
        if let Ok(Some(current_commit)) = cache.get_commit(current_head_id).await {
            if let Ok(current_manifest) = serde_json::from_str::<GitManifest>(&current_commit.manifest_data) {
                for f in current_manifest.files {
                    if !manifest.files.iter().any(|new_f| new_f.relative_path == f.relative_path) {
                        files_to_delete.push(f.relative_path);
                    }
                }
            }
        }
    }

    for rel_path in files_to_delete {
        let file_to_delete = root_path.join(rel_path);
        if file_to_delete.exists() {
            let _ = std::fs::remove_file(file_to_delete);
        }
    }

    // 3. Update database current_head
    cache.update_repository_heads(repo_id, Some(commit_id), None).await
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn compute_diff(old_text: &str, new_text: &str) -> Vec<DiffLine> {
    let old_lines: Vec<&str> = old_text.lines().collect();
    let new_lines: Vec<&str> = new_text.lines().collect();
    
    let m = old_lines.len();
    let n = new_lines.len();
    
    // DP table for LCS
    let mut dp = vec![vec![0; n + 1]; m + 1];
    
    for i in 1..=m {
        for j in 1..=n {
            if old_lines[i - 1] == new_lines[j - 1] {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = std::cmp::max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    let mut diff = Vec::new();
    let mut i = m;
    let mut j = n;
    
    while i > 0 || j > 0 {
        if i > 0 && j > 0 && old_lines[i - 1] == new_lines[j - 1] {
            diff.push(DiffLine {
                line_type: "unchanged".to_string(),
                content: old_lines[i - 1].to_string(),
                old_line_num: Some(i),
                new_line_num: Some(j),
            });
            i -= 1;
            j -= 1;
        } else if j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j]) {
            diff.push(DiffLine {
                line_type: "added".to_string(),
                content: new_lines[j - 1].to_string(),
                old_line_num: None,
                new_line_num: Some(j),
            });
            j -= 1;
        } else if i > 0 && (j == 0 || dp[i][j - 1] < dp[i - 1][j]) {
            diff.push(DiffLine {
                line_type: "deleted".to_string(),
                content: old_lines[i - 1].to_string(),
                old_line_num: Some(i),
                new_line_num: None,
            });
            i -= 1;
        }
    }
    
    diff.reverse();
    diff
}

#[tauri::command]
pub async fn discover_telegram_repositories(
    session: State<'_, Arc<SessionManager>>,
    telegram_chat_id: String,
) -> Result<Vec<String>, String> {
    let client = session.get_client_by_id(&telegram_chat_id).await
        .ok_or_else(|| "Telegram client not connected".to_string())?;

    let remote_commits = fetch_all_discover_commits(&client).await?;

    let mut repo_names = std::collections::HashSet::new();
    for c in remote_commits {
        repo_names.insert(c.repository_id);
    }

    let mut result: Vec<String> = repo_names.into_iter().collect();
    result.sort();
    Ok(result)
}

#[tauri::command]
pub async fn read_folded_config(path: String) -> Result<Option<FoldedGitConfig>, String> {
    let config_file = Path::new(&path).join(".folded.json");
    if config_file.exists() {
        let content = std::fs::read_to_string(config_file).map_err(|e| e.to_string())?;
        let config: FoldedGitConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(Some(config))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn delete_remote_repository(
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    repo_id: String,
) -> Result<(), String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let client = session.get_client_by_id(&repo.telegram_chat_id).await
        .ok_or_else(|| "Telegram client not connected".to_string())?;

    // 1. Query commit messages from Telegram in paging loops for both FOLDED and GITGRAM query tags
    let mut message_ids = Vec::new();
    let queries = vec!["FOLDED".to_string(), "GITGRAM".to_string()];

    for query in queries {
        let mut offset_id = 0;
        loop {
            let search_request = tl::functions::messages::Search {
                peer: tl::enums::InputPeer::PeerSelf,
                q: query.clone(),
                filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
                min_date: 0, max_date: 0, 
                offset_id, 
                add_offset: 0, 
                limit: 100, 
                max_id: 0, min_id: 0, hash: 0,
                from_id: None, saved_peer_id: None, saved_reaction: None, top_msg_id: None,
            };
            
            let search_result = client.invoke(&search_request).await.map_err(|e| e.to_string())?;
            let messages = match search_result {
                tl::enums::messages::Messages::Messages(m) => m.messages,
                tl::enums::messages::Messages::Slice(m) => m.messages,
                _ => Vec::new(),
            };

            if messages.is_empty() {
                break;
            }

            let mut last_id = 0;
            for msg_enum in &messages {
                if let tl::enums::Message::Message(msg) = msg_enum {
                    last_id = msg.id;
                    let text = &msg.message;
                    let mut matches_repo = false;
                    
                    if text.starts_with("[FOLDED_COMMIT]") || text.starts_with("[GITGRAM_COMMIT]") {
                        let prefix_len = if text.starts_with("[FOLDED_COMMIT]") {
                            "[FOLDED_COMMIT]\n".len()
                        } else {
                            "[GITGRAM_COMMIT]\n".len()
                        };
                        let json_part = &text[prefix_len..];
                        if let Ok(c) = serde_json::from_str::<GitCommit>(json_part) {
                            if c.repository_id == repo_id {
                                matches_repo = true;
                            }
                        }
                    } else if text.starts_with("[FOLDED_COMMIT_DOC]") || text.starts_with("[GITGRAM_COMMIT_DOC]") {
                        if let Some(repo_id_chunk) = text.split("repo_id=").nth(1) {
                            if let Some(r_id) = repo_id_chunk.split_whitespace().next() {
                                if r_id == repo_id {
                                    matches_repo = true;
                                }
                            }
                        }
                    }

                    if matches_repo {
                        message_ids.push(msg.id);
                    }
                }
            }

            if messages.len() < 100 || last_id == 0 {
                break;
            }
            offset_id = last_id;
        }
    }

    // 2. Parse commits from local cache to find all uploaded chunk message IDs to delete them too
    let commits = cache.get_commits(&repo_id).await.map_err(|e| e.to_string())?;
    for commit in commits {
        if let Ok(manifest) = serde_json::from_str::<GitManifest>(&commit.manifest_data) {
            for file in manifest.files {
                for chunk in file.chunks {
                    message_ids.push(chunk.message_id as i32);
                }
            }
        }
    }

    if !message_ids.is_empty() {
        message_ids.sort();
        message_ids.dedup();
        
        // Delete messages in batches of 50 to avoid API errors / limits
        for batch in message_ids.chunks(50) {
            let delete_request = tl::functions::messages::DeleteMessages {
                revoke: true,
                id: batch.to_vec(),
            };
            if let Err(e) = client.invoke(&delete_request).await {
                log::warn!("Failed to delete message batch: {}", e);
            }
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }
    }

    // 3. Delete repository from local SQLite cache database before updating manifest!
    cache.delete_repository(&repo_id).await.map_err(|e| e.to_string())?;

    // 4. Update system manifest in Telegram to remove this repo (best-effort)
    let _ = update_system_manifest(&client, cache.inner(), &repo.telegram_chat_id).await;

    Ok(())
}

#[tauri::command]
pub async fn update_repository_settings(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
    new_path: String,
    new_account_id: String,
) -> Result<(), String> {
    sqlx::query("UPDATE git_repositories SET local_path = ?, telegram_chat_id = ? WHERE id = ?")
        .bind(&new_path)
        .bind(&new_account_id)
        .bind(&repo_id)
        .execute(cache.get_pool()).await
        .map_err(|e| e.to_string())?;

    // Write/update the .folded.json config inside the new local project directory
    let config = FoldedGitConfig {
        name: repo_id.clone(),
        telegram_chat_id: new_account_id.clone(),
    };
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    let _ = std::fs::create_dir_all(Path::new(&new_path));
    let _ = std::fs::write(Path::new(&new_path).join(".folded.json"), config_json);

    Ok(())
}

#[tauri::command]
pub async fn get_commit_file_diff(
    cache: State<'_, Arc<MetadataCache>>,
    _repo_id: String,
    file_path: String,
    commit_id: String,
    parent_commit_id: Option<String>,
) -> Result<Vec<DiffLine>, String> {
    // 1. Get old content (from parent commit)
    let mut old_content = String::new();
    if let Some(ref parent_id) = parent_commit_id {
        if !parent_id.is_empty() {
            if let Ok(Some(commit)) = cache.get_commit(parent_id).await {
                if let Ok(manifest) = serde_json::from_str::<GitManifest>(&commit.manifest_data) {
                    if let Some(file_entry) = manifest.files.iter().find(|f| f.relative_path == file_path) {
                        let object_path = get_objects_dir().join(&file_entry.sha256);
                        if object_path.exists() {
                            old_content = std::fs::read_to_string(&object_path).unwrap_or_default();
                        }
                    }
                }
            }
        }
    }

    // 2. Get new content (from selected commit)
    let mut new_content = String::new();
    if let Ok(Some(commit)) = cache.get_commit(&commit_id).await {
        if let Ok(manifest) = serde_json::from_str::<GitManifest>(&commit.manifest_data) {
            if let Some(file_entry) = manifest.files.iter().find(|f| f.relative_path == file_path) {
                let object_path = get_objects_dir().join(&file_entry.sha256);
                if object_path.exists() {
                    new_content = std::fs::read_to_string(&object_path).unwrap_or_default();
                }
            }
        }
    }

    Ok(compute_diff(&old_content, &new_content))
}

#[tauri::command]
pub async fn checkout_repository_commit(
    app: tauri::AppHandle,
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    cluster: State<'_, Arc<ClusterOrchestrator>>,
    repo_id: String,
    commit_id: String,
) -> Result<(), String> {
    // 1. Run checkout
    checkout_commit(
        app,
        cache.inner().clone(),
        session.inner().clone(),
        cluster.inner().clone(),
        &repo_id,
        &commit_id,
    ).await?;

    // 2. Update current_head pointer in SQL DB
    sqlx::query("UPDATE git_repositories SET current_head = ? WHERE id = ?")
        .bind(&commit_id)
        .bind(&repo_id)
        .execute(cache.get_pool()).await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn list_branches(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
) -> Result<Vec<GitBranch>, String> {
    cache.get_branches(&repo_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_branch(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
    name: String,
    from_commit_id: Option<String>,
) -> Result<(), String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    // Check branch name uniqueness
    let existing = cache.get_branch(&repo_id, &name).await.map_err(|e| e.to_string())?;
    if existing.is_some() {
        return Err("A branch with this name already exists".to_string());
    }

    let head = from_commit_id.or(repo.current_head);

    let branch = GitBranch {
        id: uuid::Uuid::new_v4().to_string(),
        repository_id: repo_id.clone(),
        name,
        head_commit_id: head,
        created_at: chrono::Utc::now().timestamp(),
    };

    cache.create_branch(branch).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_branch(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
    name: String,
) -> Result<(), String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    if name == "main" {
        return Err("Cannot delete the default 'main' branch".to_string());
    }
    if repo.current_branch == name {
        return Err("Cannot delete the currently active branch".to_string());
    }

    cache.delete_branch(&repo_id, &name).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn switch_branch(
    app: tauri::AppHandle,
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    cluster: State<'_, Arc<ClusterOrchestrator>>,
    repo_id: String,
    name: String,
) -> Result<(), String> {
    let _repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let branch = cache.get_branch(&repo_id, &name).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Branch not found".to_string())?;

    // 1. If branch has a HEAD commit, checkout those files to local directory
    if let Some(ref commit_id) = branch.head_commit_id {
        checkout_commit(
            app,
            cache.inner().clone(),
            session.inner().clone(),
            cluster.inner().clone(),
            &repo_id,
            commit_id,
        ).await?;
        cache.update_repository_heads(&repo_id, Some(commit_id), None).await
            .map_err(|e| e.to_string())?;
    } else {
        // Newly created empty branch has no head commit
        cache.update_repository_heads(&repo_id, None, None).await
            .map_err(|e| e.to_string())?;
        // Set head pointer to empty in database
        sqlx::query("UPDATE git_repositories SET current_head = NULL WHERE id = ?")
            .bind(&repo_id)
            .execute(cache.get_pool()).await
            .map_err(|e| e.to_string())?;
    }

    // 2. Set active branch in database
    cache.set_active_branch(&repo_id, &name).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_branch_history(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
    branch_name: String,
) -> Result<Vec<GitCommit>, String> {
    let branch = cache.get_branch(&repo_id, &branch_name).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Branch not found".to_string())?;

    let mut commits = Vec::new();
    let mut current_id = branch.head_commit_id;

    // Load all commits for this repo and build map to walk parent_id chain
    let all_commits = cache.get_commits(&repo_id).await.map_err(|e| e.to_string())?;
    let commits_map: std::collections::HashMap<String, GitCommit> = all_commits
        .into_iter()
        .map(|c| (c.id.clone(), c))
        .collect();

    while let Some(ref id) = current_id {
        if let Some(commit) = commits_map.get(id) {
            commits.push(commit.clone());
            current_id = commit.parent_id.clone();
        } else {
            break;
        }
    }

    Ok(commits)
}

fn find_lca(
    src_head: &str,
    tgt_head: &str,
    commits_map: &std::collections::HashMap<String, GitCommit>,
) -> Option<String> {
    let mut src_ancestors = std::collections::HashSet::new();
    let mut curr = Some(src_head.to_string());
    while let Some(ref id) = curr {
        src_ancestors.insert(id.clone());
        curr = commits_map.get(id).and_then(|c| c.parent_id.clone());
    }

    let mut curr = Some(tgt_head.to_string());
    while let Some(ref id) = curr {
        if src_ancestors.contains(id) {
            return Some(id.clone());
        }
        curr = commits_map.get(id).and_then(|c| c.parent_id.clone());
    }
    None
}

async fn ensure_object_file(
    app: &tauri::AppHandle,
    _cache: &Arc<MetadataCache>,
    session: &Arc<SessionManager>,
    cluster: &Arc<ClusterOrchestrator>,
    repo: &GitRepository,
    file_entry: &RepoFileEntry,
) -> Result<PathBuf, String> {
    let objects_dir = get_objects_dir();
    let object_file_path = objects_dir.join(&file_entry.sha256);
    
    let object_ready = if object_file_path.exists() {
        compute_sha256(&object_file_path).unwrap_or_default() == file_entry.sha256
    } else {
        false
    };

    if !object_ready {
        if !file_entry.chunks.is_empty() {
            let temp_manifest = FileManifest {
                id: uuid::Uuid::new_v4().to_string(),
                name: file_entry.relative_path.clone(),
                total_size: file_entry.size,
                chunk_size: 0,
                chunks: file_entry.chunks.clone(),
                folder_id: None,
                account_id: Some(repo.telegram_chat_id.clone()),
                storage_hub_id: None,
                storage_hub_access_hash: None,
                is_external: false,
                is_starred: false,
                created_at: chrono::Utc::now().timestamp(),
                is_current_version: true,
                version_of: None,
                version_number: 1,
                deleted_at: None,
            };

            cluster.download_file(
                temp_manifest,
                object_file_path.clone(),
                Arc::clone(&session),
                Some(app.clone()),
                None,
            ).await.map_err(|e| e.to_string())?;
        } else {
            let _ = std::fs::File::create(&object_file_path);
        }
    }
    Ok(object_file_path)
}

fn write_conflict_markers(
    dest_path: &Path,
    target_object_path: Option<&Path>,
    source_object_path: Option<&Path>,
) -> Result<(), String> {
    let target_content = match target_object_path {
        Some(p) => std::fs::read_to_string(p).unwrap_or_default(),
        None => String::new(),
    };

    let source_content = match source_object_path {
        Some(p) => std::fs::read_to_string(p).unwrap_or_default(),
        None => String::new(),
    };

    let mut conflict_text = String::new();
    conflict_text.push_str("<<<<<<< CURRENT CHANGES (HEAD)\n");
    conflict_text.push_str(&target_content);
    if !conflict_text.ends_with('\n') {
        conflict_text.push('\n');
    }
    conflict_text.push_str("=======\n");
    conflict_text.push_str(&source_content);
    if !conflict_text.ends_with('\n') {
        conflict_text.push('\n');
    }
    conflict_text.push_str(">>>>>>> INCOMING CHANGES\n");

    if let Some(parent) = dest_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(dest_path, conflict_text).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn merge_branch(
    app: tauri::AppHandle,
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    cluster: State<'_, Arc<ClusterOrchestrator>>,
    repo_id: String,
    source_branch: String,
    target_branch: String,
) -> Result<(), String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let src = cache.get_branch(&repo_id, &source_branch).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Source branch not found".to_string())?;

    let tgt = cache.get_branch(&repo_id, &target_branch).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Target branch not found".to_string())?;

    let src_head = match src.head_commit_id {
        Some(ref id) => id.clone(),
        None => return Ok(()),
    };

    let tgt_head = tgt.head_commit_id;

    if tgt_head.as_ref() == Some(&src_head) {
        return Ok(());
    }

    let all_commits = cache.get_commits(&repo_id).await.map_err(|e| e.to_string())?;
    let commits_map: std::collections::HashMap<String, GitCommit> = all_commits
        .into_iter()
        .map(|c| (c.id.clone(), c))
        .collect();

    let mut is_fast_forward = false;
    if let Some(ref th) = tgt_head {
        let mut curr = Some(src_head.clone());
        while let Some(ref id) = curr {
            if id == th {
                is_fast_forward = true;
                break;
            }
            curr = commits_map.get(id).and_then(|c| c.parent_id.clone());
        }
    } else {
        is_fast_forward = true;
    }

    if is_fast_forward {
        cache.update_branch_head(&repo_id, &target_branch, Some(&src_head)).await
            .map_err(|e| e.to_string())?;

        if repo.current_branch == target_branch {
            checkout_commit(
                app.clone(),
                cache.inner().clone(),
                session.inner().clone(),
                cluster.inner().clone(),
                &repo_id,
                &src_head,
            ).await?;

            cache.update_repository_heads(&repo_id, Some(&src_head), None).await
                .map_err(|e| e.to_string())?;
        }
    } else {
        let src_commit = commits_map.get(&src_head)
            .ok_or_else(|| "Source HEAD commit not found".to_string())?;
            
        let tgt_commit = commits_map.get(tgt_head.as_ref().unwrap())
            .ok_or_else(|| "Target HEAD commit not found".to_string())?;

        let lca_id = find_lca(&src_head, tgt_head.as_ref().unwrap(), &commits_map);

        let mut base_files = std::collections::HashMap::new();
        if let Some(ref lca) = lca_id {
            if let Ok(Some(commit)) = cache.get_commit(lca).await {
                if let Ok(manifest) = serde_json::from_str::<GitManifest>(&commit.manifest_data) {
                    for f in manifest.files {
                        base_files.insert(f.relative_path.clone(), f);
                    }
                }
            }
        }

        let mut src_files = std::collections::HashMap::new();
        if let Ok(manifest) = serde_json::from_str::<GitManifest>(&src_commit.manifest_data) {
            for f in manifest.files {
                src_files.insert(f.relative_path.clone(), f);
            }
        }

        let mut tgt_files = std::collections::HashMap::new();
        if let Ok(manifest) = serde_json::from_str::<GitManifest>(&tgt_commit.manifest_data) {
            for f in manifest.files {
                tgt_files.insert(f.relative_path.clone(), f);
            }
        }

        let mut all_filepaths = std::collections::HashSet::new();
        for k in base_files.keys() { all_filepaths.insert(k.clone()); }
        for k in src_files.keys() { all_filepaths.insert(k.clone()); }
        for k in tgt_files.keys() { all_filepaths.insert(k.clone()); }

        let mut merged_files = Vec::new();
        let mut conflicts = Vec::new();
        let root_path = Path::new(&repo.local_path);

        for path in all_filepaths {
            let base_opt = base_files.get(&path);
            let src_opt = src_files.get(&path);
            let tgt_opt = tgt_files.get(&path);

            match (base_opt, src_opt, tgt_opt) {
                (None, Some(src_entry), None) => {
                    ensure_object_file(&app, &cache.inner(), &session.inner(), &cluster.inner(), &repo, src_entry).await?;
                    let dest = root_path.join(&path);
                    if let Some(parent) = dest.parent() {
                        let _ = std::fs::create_dir_all(parent);
                    }
                    let _ = std::fs::copy(get_objects_dir().join(&src_entry.sha256), &dest);
                    merged_files.push(src_entry.clone());
                }
                (None, None, Some(tgt_entry)) => {
                    merged_files.push(tgt_entry.clone());
                }
                (None, Some(src_entry), Some(tgt_entry)) => {
                    if src_entry.sha256 == tgt_entry.sha256 {
                        merged_files.push(tgt_entry.clone());
                    } else {
                        conflicts.push(MergeConflict {
                            relative_path: path.clone(),
                            target_sha256: Some(tgt_entry.sha256.clone()),
                            source_sha256: Some(src_entry.sha256.clone()),
                            base_sha256: None,
                        });
                    }
                }
                (Some(_), None, None) => {
                    let dest = root_path.join(&path);
                    if dest.exists() {
                        let _ = std::fs::remove_file(dest);
                    }
                }
                (Some(base_entry), None, Some(tgt_entry)) => {
                    if tgt_entry.sha256 == base_entry.sha256 {
                        let dest = root_path.join(&path);
                        if dest.exists() {
                            let _ = std::fs::remove_file(dest);
                        }
                    } else {
                        conflicts.push(MergeConflict {
                            relative_path: path.clone(),
                            target_sha256: Some(tgt_entry.sha256.clone()),
                            source_sha256: None,
                            base_sha256: Some(base_entry.sha256.clone()),
                        });
                    }
                }
                (Some(base_entry), Some(src_entry), None) => {
                    if src_entry.sha256 == base_entry.sha256 {
                        let dest = root_path.join(&path);
                        if dest.exists() {
                            let _ = std::fs::remove_file(dest);
                        }
                    } else {
                        conflicts.push(MergeConflict {
                            relative_path: path.clone(),
                            target_sha256: None,
                            source_sha256: Some(src_entry.sha256.clone()),
                            base_sha256: Some(base_entry.sha256.clone()),
                        });
                    }
                }
                (Some(base_entry), Some(src_entry), Some(tgt_entry)) => {
                    if src_entry.sha256 == tgt_entry.sha256 {
                        merged_files.push(tgt_entry.clone());
                    } else if tgt_entry.sha256 == base_entry.sha256 {
                        ensure_object_file(&app, &cache.inner(), &session.inner(), &cluster.inner(), &repo, src_entry).await?;
                        let dest = root_path.join(&path);
                        if let Some(parent) = dest.parent() {
                            let _ = std::fs::create_dir_all(parent);
                        }
                        let _ = std::fs::copy(get_objects_dir().join(&src_entry.sha256), &dest);
                        merged_files.push(src_entry.clone());
                    } else if src_entry.sha256 == base_entry.sha256 {
                        merged_files.push(tgt_entry.clone());
                    } else {
                        conflicts.push(MergeConflict {
                            relative_path: path.clone(),
                            target_sha256: Some(tgt_entry.sha256.clone()),
                            source_sha256: Some(src_entry.sha256.clone()),
                            base_sha256: Some(base_entry.sha256.clone()),
                        });
                    }
                }
                _ => {}
            }
        }

        if !conflicts.is_empty() {
            for conflict in &conflicts {
                if let Some(src_entry) = src_files.get(&conflict.relative_path) {
                    let _ = ensure_object_file(&app, &cache.inner(), &session.inner(), &cluster.inner(), &repo, src_entry).await;
                }
                if let Some(tgt_entry) = tgt_files.get(&conflict.relative_path) {
                    let _ = ensure_object_file(&app, &cache.inner(), &session.inner(), &cluster.inner(), &repo, tgt_entry).await;
                }

                let dest = root_path.join(&conflict.relative_path);
                let target_obj = conflict.target_sha256.as_ref().map(|s| get_objects_dir().join(s));
                let source_obj = conflict.source_sha256.as_ref().map(|s| get_objects_dir().join(s));
                
                let _ = write_conflict_markers(&dest, target_obj.as_deref(), source_obj.as_deref());
            }

            let merge_state = MergeState {
                source_branch: source_branch.clone(),
                target_branch: target_branch.clone(),
                source_commit: src_head.clone(),
                target_commit: tgt_head.clone().unwrap(),
                conflicts,
            };

            let merge_state_path = root_path.join(".folded_merge_state.json");
            let _ = std::fs::write(merge_state_path, serde_json::to_string_pretty(&merge_state).unwrap());

            return Err("MERGE_CONFLICTS".to_string());
        }

        let new_commit_id = uuid::Uuid::new_v4().to_string();
        let new_manifest = GitManifest { files: merged_files };
        let new_manifest_data = serde_json::to_string(&new_manifest).map_err(|e| e.to_string())?;

        let commit = GitCommit {
            id: new_commit_id.clone(),
            repository_id: repo_id.clone(),
            parent_id: tgt_head.clone(),
            message_summary: format!("Merge branch '{}' into '{}'", source_branch, target_branch),
            message_description: Some(format!("Merged head commit: {}", src_head)),
            author: "Folded Merge".to_string(),
            timestamp: chrono::Utc::now().timestamp(),
            manifest_data: new_manifest_data,
            is_pushed: false,
            branch_name: target_branch.clone(),
        };

        cache.create_commit(commit).await.map_err(|e| e.to_string())?;
        cache.update_branch_head(&repo_id, &target_branch, Some(&new_commit_id)).await
            .map_err(|e| e.to_string())?;

        if repo.current_branch == target_branch {
            checkout_commit(
                app.clone(),
                cache.inner().clone(),
                session.inner().clone(),
                cluster.inner().clone(),
                &repo_id,
                &new_commit_id,
            ).await?;

            cache.update_repository_heads(&repo_id, Some(&new_commit_id), None).await
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// ---- MANIFEST & ACCOUNT RESILIENCE ----

/// Internal helper: write or update [FOLDED_SYSTEM_MANIFEST] in the given account's Saved Messages.
/// This message acts as the Telegram-side index of all repositories in this account.
async fn update_system_manifest(
    client: &grammers_client::Client,
    cache: &Arc<MetadataCache>,
    telegram_chat_id: &str,
) -> anyhow::Result<()> {
    let input_peer_self = tl::enums::InputPeer::PeerSelf;

    // Collect all repos belonging to this account
    let all_repos = cache.get_repositories().await?;
    let account_repos: Vec<serde_json::Value> = all_repos.iter()
        .filter(|r| r.telegram_chat_id == telegram_chat_id)
        .map(|r| serde_json::json!({
            "name": r.name,
            "created_at": r.created_at
        }))
        .collect();

    let manifest_payload = serde_json::json!({
        "version": 1,
        "repos": account_repos
    });

    let manifest_text = format!(
        "[FOLDED_SYSTEM_MANIFEST]\n{}",
        serde_json::to_string(&manifest_payload)?
    );

    // Search for an existing manifest message to update/replace it
    let search_request = tl::functions::messages::Search {
        peer: input_peer_self.clone(),
        q: "SYSTEM_MANIFEST".to_string(),
        filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
        min_date: 0, max_date: 0, offset_id: 0, add_offset: 0, limit: 5, max_id: 0, min_id: 0, hash: 0,
        from_id: None, saved_peer_id: None, saved_reaction: None, top_msg_id: None,
    };

    let search_result = client.invoke(&search_request).await?;
    let messages = match search_result {
        tl::enums::messages::Messages::Messages(m) => m.messages,
        tl::enums::messages::Messages::Slice(m) => m.messages,
        _ => Vec::new(),
    };

    // Find existing manifest message ID
    let existing_msg_id = messages.into_iter().find_map(|m| {
        if let tl::enums::Message::Message(msg) = m {
            if msg.message.starts_with("[FOLDED_SYSTEM_MANIFEST]") || msg.message.starts_with("[GITGRAM_SYSTEM_MANIFEST]") {
                return Some(msg.id);
            }
        }
        None
    });

    if let Some(msg_id) = existing_msg_id {
        // Edit existing manifest message in-place
        let edit_request = tl::functions::messages::EditMessage {
            peer: input_peer_self,
            no_webpage: true,
            invert_media: false,
            id: msg_id,
            message: Some(manifest_text),
            media: None,
            reply_markup: None,
            entities: None,
            schedule_date: None,
            quick_reply_shortcut_id: None,
            schedule_repeat_period: None,
        };
        let _ = client.invoke(&edit_request).await;
    } else {
        // Send new manifest message to Saved Messages
        client.send_message(&input_peer_self, manifest_text).await?;
    }

    Ok(())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ManifestRepoEntry {
    pub name: String,
    pub created_at: i64,
    pub already_exists_locally: bool,
}

/// Scan a Telegram account's Saved Messages for [FOLDED_SYSTEM_MANIFEST].
/// Returns a list of repositories found in that account's manifest,
/// annotated with whether they already exist in the local SQLite cache.
#[tauri::command]
pub async fn check_account_manifests(
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    telegram_chat_id: String,
) -> Result<Vec<ManifestRepoEntry>, String> {
    let client = session.get_client_by_id(&telegram_chat_id).await
        .ok_or_else(|| "Telegram client not connected".to_string())?;

    let search_request = tl::functions::messages::Search {
        peer: tl::enums::InputPeer::PeerSelf,
        q: "SYSTEM_MANIFEST".to_string(),
        filter: tl::enums::MessagesFilter::InputMessagesFilterEmpty,
        min_date: 0, max_date: 0, offset_id: 0, add_offset: 0, limit: 5, max_id: 0, min_id: 0, hash: 0,
        from_id: None, saved_peer_id: None, saved_reaction: None, top_msg_id: None,
    };

    let search_result = client.invoke(&search_request).await.map_err(|e| e.to_string())?;
    let messages = match search_result {
        tl::enums::messages::Messages::Messages(m) => m.messages,
        tl::enums::messages::Messages::Slice(m) => m.messages,
        _ => Vec::new(),
    };

    // Find and parse the manifest
    for msg_enum in messages {
        if let tl::enums::Message::Message(msg) = msg_enum {
            if msg.message.starts_with("[FOLDED_SYSTEM_MANIFEST]") || msg.message.starts_with("[GITGRAM_SYSTEM_MANIFEST]") {
                let prefix_len = if msg.message.starts_with("[FOLDED_SYSTEM_MANIFEST]") {
                    "[FOLDED_SYSTEM_MANIFEST]\n".len()
                } else {
                    "[GITGRAM_SYSTEM_MANIFEST]\n".len()
                };
                let json_part = &msg.message[prefix_len..];
                if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(json_part) {
                    if let Some(repos_arr) = manifest["repos"].as_array() {
                        let local_repos = cache.get_repositories().await.map_err(|e| e.to_string())?;
                        let local_names: std::collections::HashSet<String> =
                            local_repos.iter().map(|r| r.name.clone()).collect();

                        let entries: Vec<ManifestRepoEntry> = repos_arr.iter().filter_map(|r| {
                            let name = r["name"].as_str()?.to_string();
                            let created_at = r["created_at"].as_i64().unwrap_or(0);
                            let already_exists_locally = local_names.contains(&name);
                            Some(ManifestRepoEntry { name, created_at, already_exists_locally })
                        }).collect();

                        return Ok(entries);
                    }
                }
            }
        }
    }

    Ok(vec![]) // No manifest found — new account with no repos
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RepoAccountStatus {
    pub repo_id: String,
    pub connected: bool,
}

/// For each repository in the local cache, check whether its linked
/// Telegram account is currently connected in the session manager.
#[tauri::command]
pub async fn get_repo_account_status(
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
) -> Result<Vec<RepoAccountStatus>, String> {
    let repos = cache.get_repositories().await.map_err(|e| e.to_string())?;
    let mut statuses = Vec::new();

    for repo in repos {
        let connected = session.get_client_by_id(&repo.telegram_chat_id).await.is_some();
        statuses.push(RepoAccountStatus {
            repo_id: repo.id,
            connected,
        });
    }

    Ok(statuses)
}

/// Relink a repository to a different Telegram account.
/// Updates `telegram_chat_id` in SQLite and rewrites `.gitgram.json`.
/// Does NOT transfer data — the new account must already have the repository data
/// (i.e. the user's own data is in the new account's Saved Messages).
#[tauri::command]
pub async fn relink_repository(
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    repo_id: String,
    new_account_id: String,
) -> Result<(), String> {
    // Verify the new account is actually connected
    let _ = session.get_client_by_id(&new_account_id).await
        .ok_or_else(|| "New account is not connected".to_string())?;

    // Get the repo to find its local path
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    // Update SQLite
    sqlx::query("UPDATE git_repositories SET telegram_chat_id = ? WHERE id = ?")
        .bind(&new_account_id)
        .bind(&repo_id)
        .execute(cache.get_pool()).await
        .map_err(|e| e.to_string())?;

    // Rewrite .folded.json in the local project directory
    let config = FoldedGitConfig {
        name: repo_id.clone(),
        telegram_chat_id: new_account_id.clone(),
    };
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    let folded_config_path = Path::new(&repo.local_path).join(".folded.json");
    if folded_config_path.parent().map_or(false, |p| p.exists()) {
        let _ = std::fs::write(&folded_config_path, config_json);
    }

    Ok(())
}

#[tauri::command]
pub async fn check_remote_updates(
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    repo_id: String,
) -> Result<u32, String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let client = match session.get_client_by_id(&repo.telegram_chat_id).await {
        Some(c) => c,
        None => return Ok(0),
    };

    // 1. Search Telegram for remote commits using the paginated helper
    let remote_commits = fetch_all_remote_commits(&client, &repo_id).await?;

    if remote_commits.is_empty() {
        return Ok(0);
    }
    let remote_head = &remote_commits[remote_commits.len() - 1];

    if Some(remote_head.id.clone()) == repo.current_head {
        return Ok(0);
    }

    let remote_map: std::collections::HashMap<String, &GitCommit> = remote_commits.iter()
        .map(|c| (c.id.clone(), c))
        .collect();

    let mut local_ancestors = std::collections::HashSet::new();
    if let Some(ref local_head_id) = repo.current_head {
        let mut curr = Some(local_head_id.clone());
        let all_local_commits = cache.get_commits(&repo_id).await.unwrap_or_default();
        let local_map: std::collections::HashMap<String, GitCommit> = all_local_commits.into_iter()
            .map(|c| (c.id.clone(), c))
            .collect();
            
        while let Some(ref id) = curr {
            local_ancestors.insert(id.clone());
            curr = local_map.get(id).and_then(|c| c.parent_id.clone());
        }
    }

    let mut behind_count = 0;
    let mut curr_remote = Some(remote_head.id.clone());
    let mut visited = std::collections::HashSet::new();

    while let Some(ref id) = curr_remote {
        if local_ancestors.contains(id) {
            break;
        }
        if visited.contains(id) {
            break;
        }
        visited.insert(id.clone());
        behind_count += 1;
        curr_remote = remote_map.get(id).and_then(|c| c.parent_id.clone());
    }

    Ok(behind_count)
}

#[tauri::command]
pub async fn read_merge_state(
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
) -> Result<Option<MergeState>, String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let state_file = Path::new(&repo.local_path).join(".folded_merge_state.json");
    if state_file.exists() {
        let content = std::fs::read_to_string(&state_file)
            .map_err(|e| format!("Failed to read merge state: {}", e))?;
        let state = serde_json::from_str::<MergeState>(&content)
            .map_err(|e| format!("Failed to parse merge state: {}", e))?;
        Ok(Some(state))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn resolve_conflict(
    _app: tauri::AppHandle,
    cache: State<'_, Arc<MetadataCache>>,
    repo_id: String,
    relative_path: String,
    choice: String,
) -> Result<(), String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let root_path = Path::new(&repo.local_path);
    let state_file = root_path.join(".folded_merge_state.json");
    if !state_file.exists() {
        return Err("No active merge state found".to_string());
    }

    let content = std::fs::read_to_string(&state_file).map_err(|e| e.to_string())?;
    let mut state = serde_json::from_str::<MergeState>(&content).map_err(|e| e.to_string())?;

    let conflict_index = state.conflicts.iter().position(|c| c.relative_path == relative_path)
        .ok_or_else(|| "Conflict for file not found in active merge state".to_string())?;

    let conflict = &state.conflicts[conflict_index];
    let dest_path = root_path.join(&relative_path);

    let chosen_sha = if choice == "current" {
        &conflict.target_sha256
    } else {
        &conflict.source_sha256
    };

    if let Some(sha) = chosen_sha {
        let src_path = get_objects_dir().join(sha);
        if let Some(parent) = dest_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        std::fs::copy(&src_path, &dest_path)
            .map_err(|e| format!("Failed to restore resolved file: {}", e))?;
    } else {
        if dest_path.exists() {
            std::fs::remove_file(&dest_path).map_err(|e| e.to_string())?;
        }
    }

    state.conflicts.remove(conflict_index);

    if state.conflicts.is_empty() {
        let _ = std::fs::remove_file(&state_file);

        let all_commits = cache.get_commits(&repo_id).await.map_err(|e| e.to_string())?;
        let commits_map: std::collections::HashMap<String, GitCommit> = all_commits
            .into_iter()
            .map(|c| (c.id.clone(), c))
            .collect();

        let src_commit = commits_map.get(&state.source_commit)
            .ok_or_else(|| "Source HEAD commit not found".to_string())?;
        let tgt_commit = commits_map.get(&state.target_commit)
            .ok_or_else(|| "Target HEAD commit not found".to_string())?;

        let mut base_files = std::collections::HashMap::new();
        if let Ok(manifest) = serde_json::from_str::<GitManifest>(&src_commit.manifest_data) {
            for f in manifest.files {
                base_files.insert(f.relative_path.clone(), f);
            }
        }
        
        let mut target_files = std::collections::HashMap::new();
        if let Ok(manifest) = serde_json::from_str::<GitManifest>(&tgt_commit.manifest_data) {
            for f in manifest.files {
                target_files.insert(f.relative_path.clone(), f);
            }
        }

        let mut final_manifest_files = Vec::new();
        let ignore_patterns = load_ignore_patterns(root_path);
        
        for entry in WalkDir::new(root_path)
            .into_iter()
            .filter_entry({
                let ignore_patterns = ignore_patterns.clone();
                let root_path = root_path.to_path_buf();
                move |e| {
                    if let Ok(rel) = e.path().strip_prefix(&root_path) {
                        let rel_path = rel.to_string_lossy().to_string();
                        if rel_path.is_empty() { return true; }
                        !is_path_ignored(&rel_path, &ignore_patterns)
                    } else {
                        true
                    }
                }
            })
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                if let Ok(rel) = entry.path().strip_prefix(root_path) {
                    let rel_path = rel.to_string_lossy().to_string();
                    if let Ok(sha) = compute_sha256(entry.path()) {
                        let size = std::fs::metadata(entry.path()).map(|m| m.len()).unwrap_or(0);
                        
                        let mut chunks = Vec::new();
                        if let Some(f) = target_files.get(&rel_path) {
                            if f.sha256 == sha {
                                chunks = f.chunks.clone();
                            }
                        }
                        if chunks.is_empty() {
                            if let Some(f) = base_files.get(&rel_path) {
                                if f.sha256 == sha {
                                    chunks = f.chunks.clone();
                                }
                            }
                        }

                        final_manifest_files.push(RepoFileEntry {
                            relative_path: rel_path,
                            sha256: sha,
                            size,
                            chunks,
                        });
                    }
                }
            }
        }

        let new_commit_id = uuid::Uuid::new_v4().to_string();
        let new_manifest = GitManifest { files: final_manifest_files };
        let new_manifest_data = serde_json::to_string(&new_manifest).map_err(|e| e.to_string())?;

        let commit = GitCommit {
            id: new_commit_id.clone(),
            repository_id: repo_id.clone(),
            parent_id: Some(state.target_commit.clone()),
            message_summary: format!("Merge branch '{}' into '{}'", state.source_branch, state.target_branch),
            message_description: Some(format!("Merged head commit: {}", state.source_commit)),
            author: "Folded Merge".to_string(),
            timestamp: chrono::Utc::now().timestamp(),
            manifest_data: new_manifest_data,
            is_pushed: false,
            branch_name: state.target_branch.clone(),
        };

        cache.create_commit(commit).await.map_err(|e| e.to_string())?;
        cache.update_branch_head(&repo_id, &state.target_branch, Some(&new_commit_id)).await
            .map_err(|e| e.to_string())?;

        cache.update_repository_heads(&repo_id, Some(&new_commit_id), None).await
            .map_err(|e| e.to_string())?;
    } else {
        let new_content = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
        std::fs::write(&state_file, new_content).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn abort_merge(
    app: tauri::AppHandle,
    cache: State<'_, Arc<MetadataCache>>,
    session: State<'_, Arc<SessionManager>>,
    cluster: State<'_, Arc<ClusterOrchestrator>>,
    repo_id: String,
) -> Result<(), String> {
    let repo = cache.get_repository(&repo_id).await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let root_path = Path::new(&repo.local_path);
    let state_file = root_path.join(".folded_merge_state.json");
    if !state_file.exists() {
        return Err("No active merge state found".to_string());
    }

    let _ = std::fs::remove_file(state_file);

    if let Some(ref head_id) = repo.current_head {
        checkout_commit(
            app.clone(),
            cache.inner().clone(),
            session.inner().clone(),
            cluster.inner().clone(),
            &repo_id,
            head_id,
        ).await?;
    }

    Ok(())
}
