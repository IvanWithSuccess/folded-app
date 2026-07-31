use anyhow::Result;
use std::sync::Arc;
use tauri::AppHandle;
use crate::cache::{MetadataCache, MirrorRule};
use crate::cluster::ClusterOrchestrator;
use crate::session_manager::SessionManager;

/// MirrorManager is kept as a stub so that existing Tauri State injection
/// in auth.rs, settings.rs, and security.rs continues to compile without changes.
/// Folder mirroring has been removed — only the WebDAV Virtual Drive mode is supported.
pub struct MirrorManager {
    _app: AppHandle,
    _cache: Arc<MetadataCache>,
    _orchestrator: Arc<ClusterOrchestrator>,
    _session_manager: Arc<SessionManager>,
}

impl MirrorManager {
    pub fn new(
        app: AppHandle,
        cache: Arc<MetadataCache>,
        orchestrator: Arc<ClusterOrchestrator>,
        session_manager: Arc<SessionManager>,
    ) -> Self {
        Self {
            _app: app,
            _cache: cache,
            _orchestrator: orchestrator,
            _session_manager: session_manager,
        }
    }

    pub async fn start_all(&self) -> Result<()> {
        Ok(())
    }

    pub async fn ensure_vault_mirror(&self, _account_id: &str, _vault_path: &str) -> Result<()> {
        Ok(())
    }

    pub async fn stop_all_for_account(&self, _account_id: &str) -> Result<()> {
        Ok(())
    }

    pub async fn stop_watching(&self, _id: &str) -> Result<()> {
        Ok(())
    }

    pub async fn start_watching(&self, _rule: MirrorRule) -> Result<()> {
        Ok(())
    }

    pub async fn trigger_manual_sync(&self) -> Result<()> {
        Ok(())
    }
}
