use anyhow::Result;
use sqlx::Row;
use crate::cluster::FileManifest;
use super::MetadataCache;

impl MetadataCache {
    pub async fn save_file(&self, file: FileManifest) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        
        sqlx::query("INSERT INTO files (id, name, size, chunk_size, folder_id, account_id, storage_hub_id, storage_hub_access_hash, is_external, is_starred, created_at, is_current_version, version_of, version_number, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&file.id)
            .bind(&file.name)
            .bind(file.total_size as i64)
            .bind(file.chunk_size as i64)
            .bind(&file.folder_id)
            .bind(&file.account_id)
            .bind(file.storage_hub_id)
            .bind(file.storage_hub_access_hash)
            .bind(file.is_external)
            .bind(false)
            .bind(file.created_at)
            .bind(file.is_current_version)
            .bind(&file.version_of)
            .bind(file.version_number)
            .bind(file.deleted_at)
            .execute(&mut *tx).await?;

        for chunk in &file.chunks {
            sqlx::query("INSERT OR REPLACE INTO chunks (file_id, chunk_id, account_id, message_id, part_index, size_bytes) VALUES (?, ?, ?, ?, ?, ?)")
                .bind(&file.id)
                .bind(&chunk.chunk_id)
                .bind(&chunk.account_id)
                .bind(chunk.message_id)
                .bind(chunk.part_index as i64)
                .bind(chunk.size_bytes as i64)
                .execute(&mut *tx).await?;
        }
        
        tx.commit().await?;
        Ok(())
    }

    pub async fn get_total_used_bytes(&self, account_id: &str) -> Result<u64> {
        let row: (i64,) = sqlx::query_as("SELECT COALESCE(SUM(size), 0) FROM files WHERE account_id = ?")
            .bind(account_id)
            .fetch_one(&self.pool).await?;
        Ok(row.0 as u64)
    }

    pub async fn get_files(&self) -> Result<Vec<FileManifest>> {
        let files_rows = sqlx::query("SELECT * FROM files").fetch_all(&self.pool).await?;
        let mut files = Vec::new();

        for row in files_rows {
            let file_id: String = row.get("id");
            if let Some(f) = self.get_file_by_id(&file_id).await? {
                files.push(f);
            }
        }

        Ok(files)
    }

    #[allow(dead_code)]
    pub async fn get_file_by_name(&self, name: &str) -> Result<Option<FileManifest>> {
        // 1. Try exact match first
        let mut row_opt = sqlx::query("SELECT * FROM files WHERE name = ? AND (is_current_version = 1 OR is_current_version IS NULL) AND deleted_at IS NULL")
            .bind(name)
            .fetch_optional(&self.pool).await?;
            
        // 2. Fallback: Case-insensitive match
        if row_opt.is_none() {
            row_opt = sqlx::query("SELECT * FROM files WHERE name = ? COLLATE NOCASE AND (is_current_version = 1 OR is_current_version IS NULL) AND deleted_at IS NULL")
                .bind(name)
                .fetch_optional(&self.pool).await?;
        }

        // 3. Fallback: Pattern matching
        if row_opt.is_none() {
            row_opt = sqlx::query("SELECT * FROM files WHERE name LIKE ? AND (is_current_version = 1 OR is_current_version IS NULL) AND deleted_at IS NULL")
                .bind(name)
                .fetch_optional(&self.pool).await?;
        }

        let row = match row_opt {
            Some(r) => r,
            None => return Ok(None),
        };

        let file_id: String = row.get("id");
        self.get_file_by_id(&file_id).await
    }

    pub async fn get_file_by_id(&self, id: &str) -> Result<Option<FileManifest>> {
        let row_opt = sqlx::query("SELECT * FROM files WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool).await?;
            
        let row = match row_opt {
            Some(r) => r,
            None => return Ok(None),
        };

        let file_id: String = row.get("id");
        let name: String = row.get("name");
        let total_size: i64 = row.get("size");
        let chunk_size: i64 = row.get("chunk_size");
        let created_at: i64 = row.get("created_at");

        let chunk_rows = sqlx::query("SELECT * FROM chunks WHERE file_id = ? ORDER BY part_index ASC")
            .bind(&file_id)
            .fetch_all(&self.pool).await?;

        let mut chunks = Vec::new();
        for c_row in chunk_rows {
            let account_id: String = c_row.get("account_id");
            let message_id: i64 = c_row.get("message_id");
            let part_index: i64 = c_row.get("part_index");

            chunks.push(crate::cluster::ChunkMeta {
                chunk_id: c_row.try_get("chunk_id").unwrap_or_default(),
                account_id,
                message_id,
                part_index: part_index as usize,
                size_bytes: c_row.try_get::<i64, _>("size_bytes").unwrap_or(0) as u64,
            });
        }

        Ok(Some(FileManifest {
            id: file_id,
            name,
            total_size: total_size as u64,
            chunk_size: chunk_size as u64,
            folder_id: row.get("folder_id"),
            account_id: row.get("account_id"),
            storage_hub_id: row.get("storage_hub_id"),
            storage_hub_access_hash: row.get("storage_hub_access_hash"),
            is_external: row.get("is_external"),
            is_starred: row.get("is_starred"),
            created_at,
            chunks,
            is_current_version: row.get::<Option<bool>, _>("is_current_version").unwrap_or(true),
            version_of: row.get("version_of"),
            version_number: row.get::<Option<i32>, _>("version_number").unwrap_or(1),
            deleted_at: row.get("deleted_at"),
        }))
    }

    pub async fn delete_file(&self, file_id: &str) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("DELETE FROM chunks WHERE file_id = ?").bind(file_id).execute(&mut *tx).await?;
        sqlx::query("DELETE FROM files WHERE id = ?").bind(file_id).execute(&mut *tx).await?;
        tx.commit().await?;
        Ok(())
    }

    pub async fn get_files_in(&self, folder_id: Option<String>, account_id: Option<String>) -> Result<Vec<FileManifest>> {
        let query = match (&folder_id, &account_id) {
            (None, None) => "SELECT id FROM files WHERE folder_id IS NULL AND (is_current_version = 1 OR is_current_version IS NULL) AND deleted_at IS NULL",
            (None, Some(_)) => "SELECT id FROM files WHERE folder_id IS NULL AND account_id = ? AND (is_current_version = 1 OR is_current_version IS NULL) AND deleted_at IS NULL",
            (Some(_), _) => "SELECT id FROM files WHERE folder_id = ? AND (is_current_version = 1 OR is_current_version IS NULL) AND deleted_at IS NULL",
        };

        let mut q = sqlx::query(query);
        if let Some(fid) = &folder_id {
            q = q.bind(fid);
        } else if let Some(aid) = &account_id {
            q = q.bind(aid);
        }

        let ids: Vec<String> = q.fetch_all(&self.pool).await?.into_iter().map(|r| r.get(0)).collect();
        let mut files = Vec::new();
        for id in ids {
            if let Some(f) = self.get_file_by_id(&id).await? {
                files.push(f);
            }
        }
        Ok(files)
    }

    pub async fn get_file_versions(&self, file_id: &str) -> Result<Vec<FileManifest>> {
        let root_row = sqlx::query("SELECT id, version_of FROM files WHERE id = ?")
            .bind(file_id)
            .fetch_optional(&self.pool).await?;
            
        let root_id = if let Some(r) = root_row {
            let vof: Option<String> = r.get("version_of");
            vof.unwrap_or_else(|| r.get("id"))
        } else {
            return Ok(Vec::new());
        };

        let rows = sqlx::query("SELECT id FROM files WHERE id = ? OR version_of = ? ORDER BY version_number DESC")
            .bind(&root_id).bind(&root_id).fetch_all(&self.pool).await?;

        let mut versions = Vec::new();
        for row in rows {
            let id: String = row.get(0);
            if let Some(f) = self.get_file_by_id(&id).await? {
                versions.push(f);
            }
        }
        Ok(versions)
    }

    pub async fn get_all_file_versions_for_delete(&self, file_id: &str) -> Result<Vec<FileManifest>> {
        let row = sqlx::query("SELECT version_of FROM files WHERE id = ?")
            .bind(file_id).fetch_optional(&self.pool).await?;
        
        let root_id = if let Some(r) = row {
            let vof: Option<String> = r.get(0);
            vof.unwrap_or_else(|| file_id.to_string())
        } else {
            file_id.to_string()
        };

        let rows = sqlx::query("SELECT id FROM files WHERE id = ? OR version_of = ?")
            .bind(&root_id).bind(&root_id).fetch_all(&self.pool).await?;

        let mut all_versions = Vec::new();
        for row in rows {
            let id: String = row.get(0);
            if let Some(f) = self.get_file_by_id(&id).await? {
                all_versions.push(f);
            }
        }
        Ok(all_versions)
    }

    pub async fn set_new_current_version(&self, old_id: &str, new_manifest: FileManifest) -> Result<()> {
        let old_ver: Option<i64> = sqlx::query_scalar("SELECT version_number FROM files WHERE id = ?")
            .bind(old_id).fetch_optional(&self.pool).await?;
        let next_ver = old_ver.unwrap_or(1) + 1;

        let mut tx = self.pool.begin().await?;

        sqlx::query("UPDATE files SET is_current_version = FALSE WHERE id = ?")
            .bind(old_id).execute(&mut *tx).await?;

        sqlx::query("INSERT INTO files (id, name, size, chunk_size, folder_id, account_id, storage_hub_id, storage_hub_access_hash, is_external, is_starred, created_at, is_current_version, version_of, version_number, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)")
            .bind(&new_manifest.id).bind(&new_manifest.name).bind(new_manifest.total_size as i64).bind(new_manifest.chunk_size as i64).bind(&new_manifest.folder_id).bind(&new_manifest.account_id).bind(new_manifest.storage_hub_id).bind(new_manifest.storage_hub_access_hash).bind(new_manifest.is_external).bind(new_manifest.is_starred).bind(new_manifest.created_at).bind(old_id).bind(next_ver).execute(&mut *tx).await?;

        for chunk in &new_manifest.chunks {
            sqlx::query("INSERT OR REPLACE INTO chunks (file_id, chunk_id, account_id, message_id, part_index, size_bytes) VALUES (?, ?, ?, ?, ?, ?)")
                .bind(&new_manifest.id).bind(&chunk.chunk_id).bind(&chunk.account_id).bind(chunk.message_id).bind(chunk.part_index as i64).bind(chunk.size_bytes as i64).execute(&mut *tx).await?;
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn soft_delete_file(&self, file_id: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        sqlx::query("UPDATE files SET deleted_at = ? WHERE id = ?")
            .bind(now).bind(file_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn restore_soft_deleted_file(&self, file_id: &str) -> Result<()> {
        sqlx::query("UPDATE files SET deleted_at = NULL WHERE id = ?")
            .bind(file_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn rename_file(&self, file_id: &str, new_name: &str) -> Result<()> {
        sqlx::query("UPDATE files SET name = ? WHERE id = ?")
            .bind(new_name).bind(file_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn move_file(&self, file_id: &str, new_folder_id: Option<String>) -> Result<()> {
        sqlx::query("UPDATE files SET folder_id = ? WHERE id = ?")
            .bind(&new_folder_id).bind(file_id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn copy_file(&self, file_id: &str, new_folder_id: Option<String>, new_name_opt: Option<String>) -> Result<String> {
        let file = self.get_file_by_id(file_id).await?.ok_or_else(|| anyhow::anyhow!("File not found"))?;
        let new_id = uuid::Uuid::new_v4().to_string();
        let new_name = match new_name_opt {
            Some(n) => n,
            None => self.generate_available_name(new_folder_id.clone(), &file.name, false).await?,
        };

        let mut tx = self.pool.begin().await?;
        sqlx::query("INSERT INTO files (id, name, size, chunk_size, folder_id, account_id, storage_hub_id, is_external, created_at, is_current_version, version_of, version_number, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, 1, NULL)")
            .bind(&new_id).bind(&new_name).bind(file.total_size as i64).bind(file.chunk_size as i64).bind(&new_folder_id).bind(&file.account_id).bind(file.storage_hub_id).bind(file.is_external).bind(chrono::Utc::now().timestamp()).execute(&mut *tx).await?;

        for chunk in &file.chunks {
            sqlx::query("INSERT INTO chunks (file_id, account_id, message_id, part_index) VALUES (?, ?, ?, ?)")
                .bind(&new_id).bind(&chunk.account_id).bind(chunk.message_id).bind(chunk.part_index as i64).execute(&mut *tx).await?;
        }

        tx.commit().await?;
        Ok(new_id)
    }

    #[allow(dead_code)]
    pub async fn get_all_files(&self) -> Result<Vec<FileManifest>> {
        let ids: Vec<String> = sqlx::query("SELECT id FROM files").fetch_all(&self.pool).await?
            .into_iter().map(|r| r.get(0)).collect();
        let mut files = Vec::new();
        for id in ids {
            if let Some(f) = self.get_file_by_id(&id).await? {
                files.push(f);
            }
        }
        Ok(files)
    }

    pub async fn get_files_by_account(&self, account_id: &str) -> Result<Vec<FileManifest>> {
        let ids: Vec<String> = sqlx::query("SELECT id FROM files WHERE account_id = ?")
            .bind(account_id).fetch_all(&self.pool).await?
            .into_iter().map(|r| r.get(0)).collect();
        let mut files = Vec::new();
        for id in ids {
            if let Some(f) = self.get_file_by_id(&id).await? {
                files.push(f);
            }
        }
        Ok(files)
    }

    #[allow(dead_code)]
    pub async fn get_cached_file(&self, file_id: &str) -> Option<String> {
        let row = sqlx::query("SELECT path_on_disk FROM file_cache WHERE file_id = ?")
            .bind(file_id).fetch_optional(&self.pool).await.ok().flatten()?;
        let path: String = row.get("path_on_disk");
        if std::path::Path::new(&path).exists() {
            let now = chrono::Utc::now().timestamp();
            let _ = sqlx::query("UPDATE file_cache SET last_accessed_at = ? WHERE file_id = ?")
                .bind(now).bind(file_id).execute(&self.pool).await;
            Some(path)
        } else {
            let _ = sqlx::query("DELETE FROM file_cache WHERE file_id = ?")
                .bind(file_id).execute(&self.pool).await;
            None
        }
    }

    pub async fn record_cached_file(&self, file_id: &str, path: &str, size_bytes: u64) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        sqlx::query("INSERT OR REPLACE INTO file_cache (file_id, path_on_disk, size_bytes, last_accessed_at) VALUES (?, ?, ?, ?)")
            .bind(file_id).bind(path).bind(size_bytes as i64).bind(now).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn evict_cache_to_limit(&self, limit_bytes: u64) -> Result<Vec<String>> {
        let total: (i64,) = sqlx::query_as("SELECT COALESCE(SUM(size_bytes), 0) FROM file_cache").fetch_one(&self.pool).await?;
        let mut current_size = total.0 as u64;
        let mut evicted = Vec::new();
        while current_size > limit_bytes {
            let row: Option<(String, String, i64)> = sqlx::query_as("SELECT file_id, path_on_disk, size_bytes FROM file_cache ORDER BY last_accessed_at ASC LIMIT 1").fetch_optional(&self.pool).await?;
            match row {
                None => break,
                Some((fid, path, size)) => {
                    let _ = std::fs::remove_file(&path);
                    sqlx::query("DELETE FROM file_cache WHERE file_id = ?").bind(&fid).execute(&self.pool).await?;
                    evicted.push(path);
                    current_size = current_size.saturating_sub(size as u64);
                }
            }
        }
        Ok(evicted)
    }

    /// Get a soft-deleted file by id (for restore purposes).
    pub async fn get_soft_deleted_file(&self, file_id: &str) -> Result<Option<FileManifest>> {
        // Same as get_file_by_id but doesn't filter deleted_at
        self.get_file_by_id(file_id).await
    }
}
