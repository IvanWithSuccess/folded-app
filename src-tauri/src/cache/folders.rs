use anyhow::Result;
use sqlx::Row;
use super::{MetadataCache, FolderInfo};

impl MetadataCache {
    pub async fn create_folder(&self, name: String, parent_id: Option<String>, account_id: Option<String>) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().timestamp();

        sqlx::query("INSERT INTO folders (id, name, parent_id, account_id, is_starred, created_at) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(&id)
            .bind(name)
            .bind(parent_id)
            .bind(account_id)
            .bind(false)
            .bind(created_at)
            .execute(&self.pool).await?;

        Ok(id)
    }

    pub async fn get_folders_in(&self, parent_id: Option<String>, account_id: Option<String>) -> Result<Vec<FolderInfo>> {
        let query = match (&parent_id, &account_id) {
            (None, None) => "SELECT * FROM folders WHERE parent_id IS NULL",
            (None, Some(_)) => "SELECT * FROM folders WHERE parent_id IS NULL AND account_id = ?",
            (Some(_), _) => "SELECT * FROM folders WHERE parent_id = ?",
        };

        let mut q = sqlx::query(query);
        if let Some(pid) = &parent_id {
            q = q.bind(pid);
        } else if let Some(aid) = &account_id {
            q = q.bind(aid);
        }

        let rows = q.fetch_all(&self.pool).await?;
        
        // Get all managed folder IDs for this account/parent context
        let managed_ids: Vec<String> = sqlx::query("SELECT remote_folder_id FROM mirror_rules WHERE remote_folder_id IS NOT NULL")
            .fetch_all(&self.pool).await?
            .into_iter().map(|r| r.get(0)).collect();

        let folders = rows.into_iter().map(|r| {
            let id: String = r.get("id");
            let name: String = r.get("name");
            let parent_id: Option<String> = r.get("parent_id");
            let is_managed = managed_ids.contains(&id) || (parent_id.is_none() && name == "Mirrors");
            FolderInfo {
                id,
                name,
                parent_id,
                account_id: r.get("account_id"),
                is_starred: r.get("is_starred"),
                is_managed,
                created_at: r.get("created_at"),
            }
        }).collect();

        Ok(folders)
    }

    pub async fn delete_folder_recursive(&self, folder_id: &str) -> Result<Vec<String>> {
        // Collect all descendant folder IDs (BFS)
        let mut all_folder_ids = vec![folder_id.to_string()];
        let mut queue = vec![folder_id.to_string()];

        while let Some(current_id) = queue.pop() {
            let children = self.get_folders_in(Some(current_id), None).await?;
            for child in children {
                all_folder_ids.push(child.id.clone());
                queue.push(child.id);
            }
        }

        // Collect ALL file IDs (all versions) inside these folders
        let mut all_version_ids = Vec::new();
        for fid in &all_folder_ids {
            let rows = sqlx::query("SELECT id FROM files WHERE folder_id = ?")
                .bind(fid)
                .fetch_all(&self.pool).await?;
            for row in rows {
                let id: String = row.get(0);
                all_version_ids.push(id);
            }
        }

        let mut tx = self.pool.begin().await?;

        // 1. Clear related metadata that might block deletion
        for fid in &all_folder_ids {
            // Clear folder history
            sqlx::query("DELETE FROM folder_history WHERE folder_id = ?")
                .bind(fid).execute(&mut *tx).await?;
            
            // Clear mirror rules referencing this folder
            sqlx::query("DELETE FROM mirror_rules WHERE remote_folder_id = ?")
                .bind(fid).execute(&mut *tx).await?;
        }

        // 2. Delete chunks for ALL file versions in these folders
        for fid in &all_folder_ids {
            sqlx::query("DELETE FROM chunks WHERE file_id IN (SELECT id FROM files WHERE folder_id = ?)")
                .bind(fid).execute(&mut *tx).await?;
        }

        // 3. Delete files in these folders (all versions)
        for fid in &all_folder_ids {
            sqlx::query("DELETE FROM files WHERE folder_id = ?")
                .bind(fid).execute(&mut *tx).await?;
        }

        // 4. Delete folders (children first, then parents)
        for fid in all_folder_ids.iter().rev() {
            sqlx::query("DELETE FROM folders WHERE id = ?")
                .bind(fid).execute(&mut *tx).await?;
        }

        tx.commit().await?;
        Ok(all_version_ids)
    }

    pub async fn rename_folder(&self, folder_id: &str, new_name: &str) -> Result<()> {
        sqlx::query("UPDATE folders SET name = ? WHERE id = ?")
            .bind(new_name)
            .bind(folder_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn move_folder(&self, folder_id: &str, new_parent_id: Option<String>) -> Result<()> {
        sqlx::query("UPDATE folders SET parent_id = ? WHERE id = ?")
            .bind(&new_parent_id)
            .bind(folder_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn copy_folder(&self, folder_id: &str, new_parent_id: Option<String>, new_name_opt: Option<String>) -> Result<String> {
        let folder = sqlx::query_as::<_, FolderInfo>("SELECT * FROM folders WHERE id = ?")
            .bind(folder_id)
            .fetch_one(&self.pool).await?;

        let new_id = uuid::Uuid::new_v4().to_string();
        let new_name = match new_name_opt {
            Some(n) => n,
            None => self.generate_available_name(new_parent_id.clone(), &folder.name, true).await?,
        };

        sqlx::query("INSERT INTO folders (id, name, parent_id, account_id, created_at) VALUES (?, ?, ?, ?, ?)")
            .bind(&new_id)
            .bind(&new_name)
            .bind(&new_parent_id)
            .bind(&folder.account_id)
            .bind(chrono::Utc::now().timestamp())
            .execute(&self.pool).await?;

        // Recursively copy subfolders
        let subfolders = self.get_folders_in(Some(folder_id.to_string()), None).await?;
        for sf in subfolders {
            Box::pin(self.copy_folder(&sf.id, Some(new_id.clone()), Some(sf.name))).await?;
        }

        // Copy files in this folder
        let files = self.get_files_in(Some(folder_id.to_string()), None).await?;
        for f in files {
            self.copy_file(&f.id, Some(new_id.clone()), Some(f.name)).await?;
        }

        Ok(new_id)
    }

    pub async fn generate_available_name(&self, folder_id: Option<String>, base_name: &str, is_folder: bool) -> Result<String> {
        let mut final_name = base_name.to_string();
        let mut counter = 1;

        loop {
            let exists = if is_folder {
                sqlx::query("SELECT 1 FROM folders WHERE parent_id IS ? AND name = ?")
                    .bind(&folder_id)
                    .bind(&final_name)
                    .fetch_optional(&self.pool).await?.is_some()
            } else {
                sqlx::query("SELECT 1 FROM files WHERE folder_id IS ? AND name = ?")
                    .bind(&folder_id)
                    .bind(&final_name)
                    .fetch_optional(&self.pool).await?.is_some()
            };

            if !exists { break; }

            counter += 1;
            if counter == 2 {
                final_name = format!("{} - Copy", base_name);
            } else {
                final_name = format!("{} - Copy ({})", base_name, counter - 1);
            }
        }
        Ok(final_name)
    }

    pub async fn get_folder_path_ids(&self, folder_id: &str) -> Result<Vec<String>> {
        let mut current_id = folder_id.to_string();
        let mut path = vec![current_id.clone()];
        
        loop {
            let parent: Option<Option<String>> = sqlx::query_scalar("SELECT parent_id FROM folders WHERE id = ?")
                .bind(&current_id)
                .fetch_optional(&self.pool).await?;
            
            match parent {
                Some(Some(pid)) if !pid.is_empty() => {
                    path.push(pid.clone());
                    current_id = pid;
                }
                _ => break, // Reached root or no more parents
            }
        }
        
        // Reverse to get from Root to Leaf
        path.reverse();
        Ok(path)
    }

    #[allow(dead_code)]
    pub async fn get_all_folders(&self) -> Result<Vec<FolderInfo>> {
        let rows = sqlx::query("SELECT * FROM folders").fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| {
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
        }).collect())
    }

    pub async fn get_folders_by_account(&self, account_id: &str) -> Result<Vec<FolderInfo>> {
        let rows = sqlx::query("SELECT * FROM folders WHERE account_id = ?")
            .bind(account_id)
            .fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| {
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
        }).collect())
    }

    pub async fn get_folders_by_ids(&self, ids: Vec<String>) -> Result<Vec<FolderInfo>> {
        if ids.is_empty() { return Ok(vec![]); }
        let mut placeholders = Vec::new();
        for _ in 0..ids.len() { placeholders.push("?"); }
        let query = format!("SELECT * FROM folders WHERE id IN ({})", placeholders.join(","));
        
        let mut q = sqlx::query(&query);
        for id in &ids { q = q.bind(id); }
        
        let rows = q.fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| {
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
        }).collect())
    }
}
