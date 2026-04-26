use anyhow::Result;
use sqlx::Row;
use super::{MetadataCache, NoteInfo};

impl MetadataCache {
    pub async fn get_notes(&self) -> Result<Vec<NoteInfo>> {
        let rows = sqlx::query("SELECT * FROM notes ORDER BY created_at DESC").fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| NoteInfo {
            id: r.get("id"),
            account_id: r.get("account_id"),
            peer_id: r.get::<Option<i64>, _>("peer_id").unwrap_or(0),
            message_id: r.get("message_id"),
            content: r.get("content"),
            created_at: r.get("created_at"),
            from_self: r.get::<Option<i64>, _>("from_self").unwrap_or(1) == 1,
            sender_name: r.get::<Option<String>, _>("sender_name"),
            attachment_ids: r.get::<Option<String>, _>("attachment_ids"),
        }).collect())
    }

    pub async fn save_note(&self, id: &str, account_id: &str, peer_id: i64, message_id: i64, content: &str, from_self: bool, sender_name: Option<String>, attachment_ids: Option<String>) -> Result<()> {
        let created_at = chrono::Utc::now().timestamp();
        sqlx::query("INSERT OR REPLACE INTO notes (id, account_id, peer_id, message_id, content, created_at, from_self, sender_name, attachment_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(id)
            .bind(account_id)
            .bind(peer_id)
            .bind(message_id)
            .bind(content)
            .bind(created_at)
            .bind(if from_self { 1i64 } else { 0i64 })
            .bind(sender_name)
            .bind(attachment_ids)
            .execute(&self.pool).await?;
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn delete_notes_by_account(&self, account_id: &str) -> Result<()> {
        sqlx::query("DELETE FROM notes WHERE account_id = ?")
            .bind(account_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_all_note_attachments(&self, account_id: &str) -> Result<std::collections::HashMap<String, Vec<String>>> {
        use std::collections::HashMap;

        let rows = sqlx::query("SELECT id, attachment_ids FROM notes WHERE account_id = ?")
            .bind(account_id)
            .fetch_all(&self.pool).await?;
            
        let mut results = HashMap::new();
        for r in rows {
            let note_id: String = r.get(0);
            let att_str: Option<String> = r.get(1);
            if let Some(s) = att_str {
                let ids: Vec<String> = s.split(',').filter(|i| !i.is_empty()).map(String::from).collect();
                if !ids.is_empty() {
                    results.insert(note_id, ids);
                }
            }
        }
        Ok(results)
    }
}
