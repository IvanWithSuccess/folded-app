use anyhow::Result;
use super::{MetadataCache, PendingTask};

impl MetadataCache {
    pub async fn get_pending_tasks(&self) -> Result<Vec<PendingTask>> {
        let cutoff = chrono::Utc::now().timestamp() - 2; // Keep for 2 seconds
        let _ = sqlx::query("DELETE FROM pending_tasks WHERE status = 'COMPLETED' AND updated_at < ?")
            .bind(cutoff)
            .execute(&self.pool).await;

        let tasks = sqlx::query_as::<_, PendingTask>(
            "SELECT id, task_type, payload, status, retries, error, created_at, updated_at, processed_files, total_files FROM pending_tasks WHERE status IN ('RUNNING', 'PENDING') OR (status = 'COMPLETED' AND updated_at >= ?) ORDER BY created_at ASC"
        )
        .bind(cutoff)
        .fetch_all(&self.pool)
        .await?;
        Ok(tasks)
    }

    pub async fn enqueue_task(&self, task_type: &str, payload: &str) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let total_files = if task_type == "UPLOAD_FILE" { 1 } else { 0 };
        
        sqlx::query(
            "INSERT INTO pending_tasks (id, task_type, payload, status, created_at, updated_at, processed_files, total_files) 
             VALUES (?, ?, ?, 'PENDING', ?, ?, 0, ?)"
        )
        .bind(&id)
        .bind(task_type)
        .bind(payload)
        .bind(now)
        .bind(now)
        .bind(total_files)
        .execute(&self.pool)
        .await?;
        
        Ok(id)
    }

    pub async fn update_task_status(&self, id: &str, status: &str, error: Option<&str>) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        if status == "FAILED" {
            let _ = sqlx::query("DELETE FROM pending_tasks WHERE id = ?").bind(id).execute(&self.pool).await;
            return Ok(());
        }

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

    pub async fn update_task_progress(&self, id: &str, processed: i32, total: i32) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        sqlx::query(
            "UPDATE pending_tasks SET processed_files = ?, total_files = ?, updated_at = ? WHERE id = ?"
        )
        .bind(processed)
        .bind(total)
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

