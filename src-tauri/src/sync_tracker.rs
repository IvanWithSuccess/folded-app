use std::sync::Arc;
use std::collections::HashMap;
use tokio_util::sync::CancellationToken;
use tokio::sync::Mutex as TokioMutex;

pub struct SyncTracker {
    pub active_crawlers: Arc<TokioMutex<HashMap<String, CancellationToken>>>,
}

impl SyncTracker {
    pub fn new() -> Self {
        Self {
            active_crawlers: Arc::new(TokioMutex::new(HashMap::new())),
        }
    }

    pub async fn stop_crawler(&self, account_id: &str) {
        let mut active = self.active_crawlers.lock().await;
        if let Some(token) = active.remove(account_id) {
            token.cancel();
            log::info!("Signal sent to stop crawler for account {}", account_id);
        }
    }

    pub async fn stop_all(&self) {
        let mut active = self.active_crawlers.lock().await;
        for (account_id, token) in active.drain() {
            token.cancel();
            log::info!("Global Stop: Crawler for {} signaled to stop", account_id);
        }
    }
}
