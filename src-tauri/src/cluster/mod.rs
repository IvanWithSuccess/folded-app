use std::sync::Arc;
use tokio::sync::Semaphore;

mod types;
mod ops;
mod sync;
mod hubs;
mod utils;
mod notes;

// Re-export types for external usage
pub use types::*;

pub struct ClusterOrchestrator {
    pub(crate) semaphore: Arc<Semaphore>,
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
        }
    }
}
