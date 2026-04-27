use std::sync::Arc;
use anyhow::Result;
use tokio::time::{Duration, sleep};
use serde::{Serialize, Deserialize};
use tauri::Emitter;
use crate::cache::{MetadataCache, PendingTask};
use crate::cluster::ClusterOrchestrator;
use crate::session_manager::SessionManager;

#[derive(Debug, Serialize, Deserialize)]
struct UploadFilePayload {
    pub file_path: String,
    pub file_name: String,
    pub account_id: String,
    pub folder_id: Option<String>,
}

use std::collections::HashSet;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
struct UploadFolderPayload {
    pub directory_path: String,
    pub target_parent_id: Option<String>,
    pub account_id: String,
}

pub struct TaskManager {
    app: tauri::AppHandle,
    cache: Arc<MetadataCache>,
    orchestrator: Arc<ClusterOrchestrator>,
    session_manager: Arc<SessionManager>,
    running_tasks: Arc<Mutex<HashSet<String>>>,
}

impl TaskManager {
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
            running_tasks: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    pub async fn start(self: Arc<Self>) {
        log::info!("Task Manager started.");
        loop {
            if let Err(e) = self.process_pending_tasks().await {
                log::error!("Task Manager loop error: {}", e);
            }
            sleep(Duration::from_secs(5)).await;
        }
    }

    async fn process_pending_tasks(&self) -> Result<()> {
        let tasks = self.cache.get_pending_tasks().await?;
        let mut running = self.running_tasks.lock().await;

        for task in tasks {
            if running.contains(&task.id) {
                continue;
            }

            running.insert(task.id.clone());
            let manager = self.clone_self();
            tokio::spawn(async move {
                let task_id = task.id.clone();
                if let Err(e) = manager.execute_task(task).await {
                    log::error!("Task execution failed: {}", e);
                }
                let mut running = manager.running_tasks.lock().await;
                running.remove(&task_id);
            });
        }
        Ok(())
    }

    async fn execute_task(&self, task: PendingTask) -> Result<()> {
        log::info!("Executing task {}: {}", task.id, task.task_type);
        
        self.cache.update_task_status(&task.id, "RUNNING", None).await?;
        let _ = self.app.emit("task-status-change", serde_json::json!({ "id": task.id, "status": "RUNNING" }));

        let result = match task.task_type.as_str() {
            "UPLOAD_FILE" => self.handle_upload_file(&task).await,
            "UPLOAD_FOLDER" => self.handle_upload_folder(&task).await,
            _ => Err(anyhow::anyhow!("Unknown task type: {}", task.task_type)),
        };

        match result {
            Ok(_) => {
                log::info!("Task {} completed successfully", task.id);
                self.cache.complete_task(&task.id).await?;
                let _ = self.app.emit("task-status-change", serde_json::json!({ "id": task.id, "status": "COMPLETED" }));
            }
            Err(e) => {
                log::error!("Task {} failed: {}", task.id, e);
                let err_msg = e.to_string();
                self.cache.increment_task_retries(&task.id, &err_msg).await?;
                let _ = self.app.emit("task-status-change", serde_json::json!({ "id": task.id, "status": "FAILED", "error": err_msg }));
            }
        }

        Ok(())
    }

    async fn handle_upload_file(&self, task: &PendingTask) -> Result<()> {
        let payload: UploadFilePayload = serde_json::from_str(&task.payload)?;
        
        let manifest = self.orchestrator.upload_file(
            payload.file_path.clone().into(),
            Arc::clone(&self.session_manager),
            Arc::clone(&self.cache),
            payload.file_name.clone(),
            None,
            payload.folder_id.clone(),
            payload.account_id.clone(),
            Some(task.id.clone()),
            None
        ).await?;

        self.cache.save_file(manifest.clone()).await?;
        let _ = self.cache.log_activity(
            &manifest.id,
            &manifest.name,
            "FILE",
            "UPLOAD",
            Some(format!("Uploaded from {}", payload.file_path))
        ).await;
        
        Ok(())
    }

    async fn handle_upload_folder(&self, task: &PendingTask) -> Result<()> {
        let payload: UploadFolderPayload = serde_json::from_str(&task.payload)?;
        let root_path = std::path::PathBuf::from(&payload.directory_path);
        
        if !root_path.is_dir() {
            return Err(anyhow::anyhow!("Path is not a directory: {}", payload.directory_path));
        }

        use std::collections::HashMap;
        let mut folder_mapping: HashMap<std::path::PathBuf, String> = HashMap::new();
        
        let root_folder_name = root_path.file_name().unwrap_or_default().to_string_lossy().into_owned();
        let root_folder_id = self.cache.create_folder(
            root_folder_name, 
            payload.target_parent_id.clone(), 
            Some(payload.account_id.clone())
        ).await?;
        folder_mapping.insert(root_path.clone(), root_folder_id);

        let mut it = walkdir::WalkDir::new(&root_path).into_iter();
        it.next(); 

        for entry in it {
            let entry = entry?;
            let path = entry.path().to_path_buf();
            let parent = path.parent().unwrap_or(&root_path);
            let remote_parent_id = folder_mapping.get(parent).cloned().unwrap_or_default();

            if entry.file_type().is_dir() {
                let name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
                let new_fid = self.cache.create_folder(
                    name, 
                    Some(remote_parent_id), 
                    Some(payload.account_id.clone())
                ).await?;
                folder_mapping.insert(path, new_fid);
            } else {
                let file_name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
                let manifest = self.orchestrator.upload_file(
                    path, 
                    Arc::clone(&self.session_manager), 
                    Arc::clone(&self.cache),
                    file_name, 
                    None, 
                    Some(remote_parent_id), 
                    payload.account_id.clone(),
                    None,
                    None
                ).await?;
                
                self.cache.save_file(manifest).await?;
            }
        }

        Ok(())
    }

    fn clone_self(&self) -> Arc<Self> {
        Arc::new(Self {
            app: self.app.clone(),
            cache: Arc::clone(&self.cache),
            orchestrator: Arc::clone(&self.orchestrator),
            session_manager: Arc::clone(&self.session_manager),
            running_tasks: Arc::clone(&self.running_tasks),
        })
    }
}
