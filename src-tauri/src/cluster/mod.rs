use std::sync::Arc;
use tokio::sync::Semaphore;

mod types;
mod ops;
mod sync;
mod hubs;
mod utils;
mod notes;
pub mod mirrors;
pub mod task_manager;

// Re-export types for external usage
pub use types::*;

use std::collections::HashSet;
use tokio::sync::Mutex as TokioMutex;

pub struct ClusterOrchestrator {
    pub(crate) semaphore: Arc<Semaphore>,
    pub(crate) active_ops: Arc<TokioMutex<HashSet<String>>>,
    pub(crate) active_downloads: Arc<TokioMutex<std::collections::HashMap<String, Arc<tokio::sync::Notify>>>>,
}

impl std::fmt::Debug for ClusterOrchestrator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ClusterOrchestrator").finish()
    }
}

impl Default for ClusterOrchestrator {
    fn default() -> Self {
        Self::new()
    }
}

impl ClusterOrchestrator {
    pub fn new() -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(3)),
            active_ops: Arc::new(TokioMutex::new(HashSet::new())),
            active_downloads: Arc::new(TokioMutex::new(std::collections::HashMap::new())),
        }
    }
}
