use anyhow::Result;
use sqlx::Row;
use super::{MetadataCache, FolderHistoryEvent, ActivityEntry};

impl MetadataCache {
    pub async fn log_folder_event(
        &self,
        folder_id: &str,
        event_type: &str,
        target_name: &str,
        target_id: Option<&str>,
        details: Option<&str>,
    ) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            "INSERT INTO folder_history (id, folder_id, event_type, target_name, target_id, details, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id)
        .bind(folder_id)
        .bind(event_type)
        .bind(target_name)
        .bind(target_id)
        .bind(details)
        .bind(now)
        .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_folder_history(&self, folder_id: &str) -> Result<Vec<FolderHistoryEvent>> {
        let rows = sqlx::query(
            "SELECT id, folder_id, event_type, target_name, target_id, details, occurred_at FROM folder_history WHERE folder_id = ? ORDER BY occurred_at ASC"
        )
        .bind(folder_id)
        .fetch_all(&self.pool).await?;

        Ok(rows.into_iter().map(|r| FolderHistoryEvent {
            id: r.get("id"),
            folder_id: r.get("folder_id"),
            event_type: r.get("event_type"),
            target_name: r.get("target_name"),
            target_id: r.get("target_id"),
            details: r.get("details"),
            occurred_at: r.get("occurred_at"),
        }).collect())
    }

    pub async fn log_activity(&self, item_id: &str, item_name: &str, item_type: &str, action_type: &str, details: Option<String>) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();
        let ts = chrono::Utc::now().timestamp();
        sqlx::query(
            "INSERT INTO activity_log (id, item_id, item_name, item_type, action_type, details, timestamp) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id)
        .bind(item_id)
        .bind(item_name)
        .bind(item_type)
        .bind(action_type)
        .bind(details)
        .bind(ts)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_item_history(&self, item_id: &str) -> Result<Vec<ActivityEntry>> {
        let rows = sqlx::query("SELECT * FROM activity_log WHERE item_id = ? ORDER BY timestamp DESC")
            .bind(item_id)
            .fetch_all(&self.pool)
            .await?;
        
        let mut entries = Vec::new();
        for row in rows {
            entries.push(ActivityEntry {
                id: row.get("id"),
                item_id: row.get("item_id"),
                item_name: row.get("item_name"),
                item_type: row.get("item_type"),
                action_type: row.get("action_type"),
                details: row.get("details"),
                timestamp: row.get("timestamp"),
            });
        }
        Ok(entries)
    }
}
