use anyhow::Result;

use super::MetadataCache;

impl MetadataCache {
    pub async fn purge_all_metadata(&self) -> Result<()> {
        let mut conn = self.pool.acquire().await?;

        // Disable FKs temporarily for the bulk delete
        sqlx::query("PRAGMA foreign_keys = OFF").execute(&mut *conn).await?;
        
        sqlx::query("DELETE FROM chunks").execute(&mut *conn).await?;
        sqlx::query("DELETE FROM files").execute(&mut *conn).await?;
        sqlx::query("DELETE FROM folders").execute(&mut *conn).await?;
        sqlx::query("DELETE FROM notes").execute(&mut *conn).await?;
        sqlx::query("DELETE FROM activity_log").execute(&mut *conn).await?;
        sqlx::query("DELETE FROM folder_history").execute(&mut *conn).await?;
        sqlx::query("DELETE FROM account_sync_state").execute(&mut *conn).await?;
        
        // Reset mirror rules so they can be re-initialized
        sqlx::query("UPDATE mirror_rules SET remote_folder_id = NULL").execute(&mut *conn).await?;
        
        // Re-enable FKs
        sqlx::query("PRAGMA foreign_keys = ON").execute(&mut *conn).await?;
        
        // Re-create basic structure
        let _ = self.create_folder("Mirrors".to_string(), None, None).await;
        
        Ok(())
    }

    pub async fn clear_explorer_data_for_account(&self, account_id: &str) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        
        // 1. Delete chunks for non-external files owned by this account
        sqlx::query("DELETE FROM chunks WHERE file_id IN (SELECT id FROM files WHERE account_id = ? AND is_external = 0)")
            .bind(account_id).execute(&mut *tx).await?;
            
        // 2. Delete non-external files owned by this account
        sqlx::query("DELETE FROM files WHERE account_id = ? AND is_external = 0")
            .bind(account_id).execute(&mut *tx).await?;
            
        // 3. Delete folders owned by this account
        sqlx::query("DELETE FROM folders WHERE account_id = ?")
            .bind(account_id).execute(&mut *tx).await?;
            
        tx.commit().await?;
        Ok(())
    }

    pub async fn purge_account_data(&self, account_id: &str) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        
        sqlx::query("DELETE FROM notes WHERE account_id = ?")
            .bind(account_id)
            .execute(&mut *tx).await?;
            
        sqlx::query("DELETE FROM chunks WHERE account_id = ?")
            .bind(account_id)
            .execute(&mut *tx).await?;
            
        sqlx::query("DELETE FROM files WHERE account_id = ?")
            .bind(account_id)
            .execute(&mut *tx).await?;
            
        sqlx::query("DELETE FROM folders WHERE account_id = ?")
            .bind(account_id)
            .execute(&mut *tx).await?;
            
        sqlx::query("DELETE FROM account_sync_state WHERE account_id = ?")
            .bind(account_id)
            .execute(&mut *tx).await?;

        // Orphaned files cleanup (files that lost all chunks)
        sqlx::query("DELETE FROM files WHERE id NOT IN (SELECT DISTINCT file_id FROM chunks)")
            .execute(&mut *tx).await?;
            
        // If no chunks left across any accounts, clear remaining folders to completely sanitize DB
        let remaining: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM chunks")
            .fetch_one(&mut *tx)
            .await
            .unwrap_or((1,));
            
        if remaining.0 == 0 {
            sqlx::query("DELETE FROM folders").execute(&mut *tx).await?;
            sqlx::query("DELETE FROM files").execute(&mut *tx).await?; // Just in case
        }
        
        tx.commit().await?;
        Ok(())
    }

    pub async fn reconcile_with_active_accounts(&self, active_ids: &[String]) -> Result<Vec<String>> {
        use sqlx::Row as _;
        
        let chunk_accounts: Vec<String> = sqlx::query("SELECT DISTINCT account_id FROM chunks")
            .fetch_all(&self.pool).await?
            .into_iter().map(|r| r.get(0)).collect();
        
        let note_accounts: Vec<String> = sqlx::query("SELECT DISTINCT account_id FROM notes")
            .fetch_all(&self.pool).await?
            .into_iter().map(|r| r.get(0)).collect();

        let mut orphaned: Vec<String> = Vec::new();
        for aid in chunk_accounts.iter().chain(note_accounts.iter()) {
            if !active_ids.contains(aid) && !orphaned.contains(aid) {
                orphaned.push(aid.clone());
            }
        }

        if orphaned.is_empty() {
            return Ok(orphaned);
        }

        log::info!("Reconciliation: found {} orphaned account(s) in DB: {:?}", orphaned.len(), orphaned);

        for aid in &orphaned {
            self.purge_account_data(aid).await?;
        }

        log::info!("Reconciliation: purge complete");
        Ok(orphaned)
    }

    pub async fn get_cache_stats(&self) -> Result<(u64, u64)> {
        let row: (i64, i64) = sqlx::query_as(
            "SELECT COUNT(*), COALESCE(SUM(size_bytes), 0) FROM file_cache"
        ).fetch_one(&self.pool).await?;
        Ok((row.0 as u64, row.1 as u64))
    }

    pub async fn clear_file_cache(&self) -> Result<()> {
        let rows: Vec<(String,)> = sqlx::query_as("SELECT path_on_disk FROM file_cache")
            .fetch_all(&self.pool).await?;
        for (path,) in rows {
            let _ = std::fs::remove_file(&path);
        }
        sqlx::query("DELETE FROM file_cache").execute(&self.pool).await?;
        Ok(())
    }
}
