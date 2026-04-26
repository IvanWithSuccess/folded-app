use anyhow::Result;
use sqlx::Row;
use super::{MetadataCache, MirrorRule};

impl MetadataCache {
    pub async fn get_mirror_rules(&self) -> Result<Vec<MirrorRule>> {
        let rows = sqlx::query("SELECT * FROM mirror_rules")
            .fetch_all(&self.pool).await?;
        
        Ok(rows.into_iter().map(|r| MirrorRule {
            id: r.get("id"),
            account_id: r.get("account_id"),
            local_path: r.get("local_path"),
            remote_folder_name: r.get("remote_folder_name"),
            remote_folder_id: r.get("remote_folder_id"),
            keep_history: r.get::<Option<bool>, _>("keep_history").unwrap_or(true),
            enabled: r.get::<Option<bool>, _>("enabled").unwrap_or(true),
            last_sync_at: r.get("last_sync_at"),
        }).collect())
    }

    pub async fn upsert_mirror_rule(&self, rule: MirrorRule) -> Result<()> {
        sqlx::query("INSERT OR REPLACE INTO mirror_rules (id, account_id, local_path, remote_folder_name, remote_folder_id, keep_history, enabled, last_sync_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&rule.id)
            .bind(&rule.account_id)
            .bind(&rule.local_path)
            .bind(&rule.remote_folder_name)
            .bind(&rule.remote_folder_id)
            .bind(rule.keep_history)
            .bind(rule.enabled)
            .bind(rule.last_sync_at)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_mirror_rule(&self, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM mirror_rules WHERE id = ?")
            .bind(id)
            .execute(&self.pool).await?;
        Ok(())
    }
}
