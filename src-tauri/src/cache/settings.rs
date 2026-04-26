use anyhow::Result;
use sqlx::Row;
use super::MetadataCache;

impl MetadataCache {
    pub async fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let row = sqlx::query("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool).await?;
        Ok(row.map(|r| r.get(0)))
    }

    pub async fn update_setting(&self, key: &str, value: &str) -> Result<()> {
        sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
            .bind(key)
            .bind(value)
            .execute(&self.pool).await?;
        Ok(())
    }
}
