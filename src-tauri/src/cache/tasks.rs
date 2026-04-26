use anyhow::Result;
use super::{MetadataCache, PendingTask};

impl MetadataCache {
    pub async fn get_pending_tasks(&self) -> Result<Vec<PendingTask>> {
        let tasks = sqlx::query_as::<_, PendingTask>(
            "SELECT id, task_type, payload, status, retries, error, created_at, updated_at FROM pending_tasks WHERE status IN ('PENDING', 'RUNNING', 'FAILED') ORDER BY created_at ASC"
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(tasks)
    }

    pub async fn enqueue_task(&self, task_type: &str, payload: &str) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        
        sqlx::query(
            "INSERT INTO pending_tasks (id, task_type, payload, status, created_at, updated_at) 
             VALUES (?, ?, ?, 'PENDING', ?, ?)"
        )
        .bind(&id)
        .bind(task_type)
        .bind(payload)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;
        
        Ok(id)
    }

    pub async fn update_task_status(&self, id: &str, status: &str, error: Option<&str>) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            "UPDATE pending_tasks SET status = ?, error = ?, updated_at = ? WHERE id = ?"
        )
        .bind(status)
        .bind(error)
        .bind(now)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn increment_task_retries(&self, id: &str, error: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            "UPDATE pending_tasks SET retries = retries + 1, error = ?, status = 'FAILED', updated_at = ? WHERE id = ?"
        )
        .bind(error)
        .bind(now)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn complete_task(&self, id: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            "UPDATE pending_tasks SET status = 'COMPLETED', updated_at = ? WHERE id = ?"
        )
        .bind(now)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn delete_task(&self, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM pending_tasks WHERE id = ?")
            .bind(id)
            .execute(&self.pool).await?;
        Ok(())
    }
}
