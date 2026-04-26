use anyhow::Result;
use sqlx::Row;
use crate::cluster::FileManifest;
use super::{MetadataCache, FolderInfo};

impl MetadataCache {
    pub async fn search_files_global(&self, query: &str) -> Result<Vec<FileManifest>> {
        let sql_query = format!("%{}%", query.to_lowercase());
        
        // 1. Search Files
        let file_rows = sqlx::query(
            "SELECT id, name, size, chunk_size, folder_id, account_id, storage_hub_id, is_external, is_starred, created_at, is_current_version, version_of, version_number, deleted_at
             FROM files 
             WHERE LOWER(name) LIKE ? AND (is_current_version = TRUE OR is_current_version IS NULL) AND deleted_at IS NULL
             ORDER BY created_at DESC LIMIT 50"
        )
        .bind(&sql_query)
        .fetch_all(&self.pool).await?;
        
        let mut results = Vec::new();
        for row in file_rows {
            results.push(FileManifest {
                id: row.get("id"),
                name: row.get("name"),
                total_size: row.get::<i64, _>("size") as u64,
                chunk_size: row.get::<i64, _>("chunk_size") as u64,
                chunks: Vec::new(), 
                folder_id: row.get("folder_id"),
                account_id: row.get("account_id"),
                storage_hub_id: row.get("storage_hub_id"),
                storage_hub_access_hash: None,
                is_external: row.get::<i8, _>("is_external") != 0,
                is_starred: row.get::<bool, _>("is_starred"),
                created_at: row.get("created_at"),
                is_current_version: row.get::<Option<bool>, _>("is_current_version").unwrap_or(true),
                version_of: row.get("version_of"),
                version_number: row.get::<Option<i32>, _>("version_number").unwrap_or(1),
                deleted_at: row.get("deleted_at"),
            });
        }

        // 2. Search Folders
        let folder_rows = sqlx::query(
            "SELECT id, name, parent_id, account_id, is_starred, created_at 
             FROM folders 
             WHERE LOWER(name) LIKE ? 
             ORDER BY created_at DESC LIMIT 50"
        )
        .bind(&sql_query)
        .fetch_all(&self.pool).await?;

        for row in folder_rows {
            results.push(FileManifest {
                id: row.get("id"),
                name: row.get("name"),
                total_size: 0, 
                chunk_size: 0,
                chunks: Vec::new(),
                folder_id: row.get("parent_id"), 
                account_id: row.get("account_id"),
                storage_hub_id: None,
                storage_hub_access_hash: None,
                is_external: false,
                is_starred: row.get::<bool, _>("is_starred"),
                created_at: row.get("created_at"),
                is_current_version: true,
                version_of: None,
                version_number: 1,
                deleted_at: None,
            });
        }

        log::info!("Global search for '{}' returned {} items (files+folders)", query, results.len());
        Ok(results)
    }

    pub async fn toggle_starred(&self, item_id: &str, item_type: &str, starred: bool) -> Result<()> {
        let table = match item_type {
            "file" => "files",
            "folder" => "folders",
            _ => return Err(anyhow::anyhow!("Invalid item type")),
        };
        let query = format!("UPDATE {} SET is_starred = ? WHERE id = ?", table);
        sqlx::query(&query)
            .bind(starred)
            .bind(item_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_category_content(&self, account_id: &str, category: &str) -> Result<(Vec<FolderInfo>, Vec<FileManifest>)> {
        let mut folders = Vec::new();
        let mut files = Vec::new();

        match category.to_uppercase().as_str() {
            "STARRED" => {
                // Get starred folders
                let f_rows = sqlx::query("SELECT * FROM folders WHERE account_id = ? AND is_starred = 1")
                    .bind(account_id)
                    .fetch_all(&self.pool).await?;
                folders = f_rows.into_iter().map(|r| {
                    let name: String = r.get("name");
                    let parent_id: Option<String> = r.get("parent_id");
                    FolderInfo {
                        id: r.get("id"),
                        name: name.clone(),
                        parent_id: parent_id.clone(),
                        account_id: r.get("account_id"),
                        is_starred: r.get("is_starred"),
                        is_managed: parent_id.is_none() && name == "Mirrors",
                        created_at: r.get("created_at"),
                    }
                }).collect();

                // Get starred files
                let file_ids: Vec<String> = sqlx::query("SELECT id FROM files WHERE account_id = ? AND is_starred = 1 AND (is_current_version = 1 OR is_current_version IS NULL) AND deleted_at IS NULL")
                    .bind(account_id)
                    .fetch_all(&self.pool).await?.into_iter().map(|r| r.get(0)).collect();
                for id in file_ids {
                    if let Some(f) = self.get_file_by_id(&id).await? {
                        files.push(f);
                    }
                }
            },
            "PHOTOS" | "MEDIA" => {
                let extensions = vec![".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".mp4", ".mov", ".avi", ".mkv", ".webm"];
                let mut placeholders = Vec::new();
                for _ in 0..extensions.len() { placeholders.push("LOWER(name) LIKE ?"); }
                let query = format!("SELECT id FROM files WHERE account_id = ? AND (is_current_version = 1 OR is_current_version IS NULL) AND deleted_at IS NULL AND ({})", placeholders.join(" OR "));
                
                let mut q = sqlx::query(&query).bind(account_id);
                for ext in extensions {
                    q = q.bind(format!("%{}", ext));
                }
                
                let ids: Vec<String> = q.fetch_all(&self.pool).await?.into_iter().map(|r| r.get(0)).collect();
                for id in ids {
                    if let Some(f) = self.get_file_by_id(&id).await? {
                        files.push(f);
                    }
                }
            },
            "DOCUMENTS" => {
                let extensions = vec![".pdf", ".doc", ".docx", ".txt", ".md", ".epub", ".xls", ".xlsx", ".ppt", ".pptx"];
                let mut placeholders = Vec::new();
                for _ in 0..extensions.len() { placeholders.push("LOWER(name) LIKE ?"); }
                let query = format!("SELECT id FROM files WHERE account_id = ? AND (is_current_version = 1 OR is_current_version IS NULL) AND deleted_at IS NULL AND ({})", placeholders.join(" OR "));
                
                let mut q = sqlx::query(&query).bind(account_id);
                for ext in extensions {
                    q = q.bind(format!("%{}", ext));
                }
                
                let ids: Vec<String> = q.fetch_all(&self.pool).await?.into_iter().map(|r| r.get(0)).collect();
                for id in ids {
                    if let Some(f) = self.get_file_by_id(&id).await? {
                        files.push(f);
                    }
                }
            },
            _ => {}
        }

        Ok((folders, files))
    }
}
