use anyhow::Result;
use sqlx::Row;
use super::MetadataCache;

impl MetadataCache {
    pub async fn get_sync_state(&self, account_id: &str) -> Result<Option<(i32, i32)>> {
        let row = sqlx::query("SELECT last_forward_id, last_backward_id FROM account_sync_state WHERE account_id = ?")
            .bind(account_id)
            .fetch_optional(&self.pool).await?;
        
        if let Some(r) = row {
            let f: i32 = r.get(0);
            let b: i32 = r.get(1);
            Ok(Some((f, b)))
        } else {
            Ok(None)
        }
    }

    pub async fn update_sync_state(&self, account_id: &str, forward_id: Option<i32>, backward_id: Option<i32>) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        
        sqlx::query("INSERT INTO account_sync_state (account_id, last_forward_id, last_backward_id, last_indexed_at) 
                     VALUES (?, ?, ?, ?) 
                     ON CONFLICT(account_id) DO UPDATE SET 
                        last_forward_id = COALESCE(excluded.last_forward_id, last_forward_id),
                        last_backward_id = COALESCE(excluded.last_backward_id, last_backward_id),
                        last_indexed_at = excluded.last_indexed_at")
            .bind(account_id)
            .bind(forward_id)
            .bind(backward_id)
            .bind(now)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_all_linked_message_ids(&self, account_id: &str) -> Result<std::collections::HashSet<i32>> {
        let mut ids = std::collections::HashSet::new();
        
        let chunks: Vec<(i64,)> = sqlx::query_as("SELECT DISTINCT message_id FROM chunks WHERE account_id = ?")
            .bind(account_id)
            .fetch_all(&self.pool).await?;
        for c in chunks { ids.insert(c.0 as i32); }

        let notes: Vec<(i64,)> = sqlx::query_as("SELECT DISTINCT message_id FROM notes WHERE account_id = ?")
            .bind(account_id)
            .fetch_all(&self.pool).await?;
        for n in notes { ids.insert(n.0 as i32); }

        Ok(ids)
    }

    pub async fn delete_by_message_id(&self, account_id: &str, message_id: i32) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        
        // 1. Delete associated notes
        sqlx::query("DELETE FROM notes WHERE account_id = ? AND message_id = ?")
            .bind(account_id)
            .bind(message_id as i64)
            .execute(&mut *tx).await?;

        // 2. Identify and delete files associated with these chunks
        let file_ids: Vec<(String,)> = sqlx::query_as("SELECT DISTINCT file_id FROM chunks WHERE account_id = ? AND message_id = ?")
            .bind(account_id)
            .bind(message_id as i64)
            .fetch_all(&mut *tx).await?;
        
        for (fid,) in file_ids {
            sqlx::query("DELETE FROM chunks WHERE file_id = ?").bind(&fid).execute(&mut *tx).await?;
            sqlx::query("DELETE FROM files WHERE id = ?").bind(&fid).execute(&mut *tx).await?;
        }

        tx.commit().await?;
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn get_last_sync_message_id(&self, account_id: &str) -> Result<i64> {
        let row: Option<(i64,)> = sqlx::query_as(
            "SELECT last_sync_message_id FROM account_sync_state WHERE account_id = ?"
        ).bind(account_id).fetch_optional(&self.pool).await?;
        Ok(row.map(|(id,)| id).unwrap_or(0))
    }

    #[allow(dead_code)]
    pub async fn set_last_sync_message_id(&self, account_id: &str, message_id: i64) -> Result<()> {
        sqlx::query(
            "INSERT INTO account_sync_state (account_id, last_sync_message_id) VALUES (?, ?)
             ON CONFLICT(account_id) DO UPDATE SET last_sync_message_id = excluded.last_sync_message_id"
        )
        .bind(account_id)
        .bind(message_id)
        .execute(&self.pool).await?;
        Ok(())
    }
}
