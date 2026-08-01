use anyhow::Result;
use sqlx::Row;
use super::{MetadataCache, GitRepository, GitCommit, GitBranch};

impl MetadataCache {
    pub async fn get_repositories(&self) -> Result<Vec<GitRepository>> {
        let rows = sqlx::query("SELECT * FROM git_repositories ORDER BY created_at DESC")
            .fetch_all(&self.pool).await?;

        Ok(rows.into_iter().map(|r| GitRepository {
            id: r.get("id"),
            name: r.get("name"),
            local_path: r.get("local_path"),
            telegram_chat_id: r.get("telegram_chat_id"),
            current_head: r.get("current_head"),
            remote_head: r.get("remote_head"),
            current_branch: r.try_get("current_branch").unwrap_or_else(|_| "main".to_string()),
            created_at: r.get("created_at"),
        }).collect())
    }

    pub async fn get_repository(&self, id: &str) -> Result<Option<GitRepository>> {
        let row = sqlx::query("SELECT * FROM git_repositories WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool).await?;

        Ok(row.map(|r| GitRepository {
            id: r.get("id"),
            name: r.get("name"),
            local_path: r.get("local_path"),
            telegram_chat_id: r.get("telegram_chat_id"),
            current_head: r.get("current_head"),
            remote_head: r.get("remote_head"),
            current_branch: r.try_get("current_branch").unwrap_or_else(|_| "main".to_string()),
            created_at: r.get("created_at"),
        }))
    }

    pub async fn create_repository(&self, repo: GitRepository) -> Result<()> {
        sqlx::query("INSERT INTO git_repositories (id, name, local_path, telegram_chat_id, current_head, remote_head, current_branch, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&repo.id)
            .bind(&repo.name)
            .bind(&repo.local_path)
            .bind(&repo.telegram_chat_id)
            .bind(&repo.current_head)
            .bind(&repo.remote_head)
            .bind(&repo.current_branch)
            .bind(repo.created_at)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_repository(&self, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM git_commits WHERE repository_id = ?")
            .bind(id).execute(&self.pool).await?;
        sqlx::query("DELETE FROM git_branches WHERE repository_id = ?")
            .bind(id).execute(&self.pool).await?;
        sqlx::query("DELETE FROM git_repositories WHERE id = ?")
            .bind(id).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn update_repository_heads(&self, repo_id: &str, current_head: Option<&str>, remote_head: Option<&str>) -> Result<()> {
        sqlx::query("UPDATE git_repositories SET current_head = COALESCE(?, current_head), remote_head = COALESCE(?, remote_head) WHERE id = ?")
            .bind(current_head).bind(remote_head).bind(repo_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_commits(&self, repo_id: &str) -> Result<Vec<GitCommit>> {
        let rows = sqlx::query("SELECT * FROM git_commits WHERE repository_id = ? ORDER BY timestamp DESC")
            .bind(repo_id)
            .fetch_all(&self.pool).await?;

        Ok(rows.into_iter().map(|r| GitCommit {
            id: r.get("id"),
            repository_id: r.get("repository_id"),
            parent_id: r.get("parent_id"),
            message_summary: r.get("message_summary"),
            message_description: r.get("message_description"),
            author: r.get("author"),
            timestamp: r.get("timestamp"),
            manifest_data: r.get("manifest_data"),
            is_pushed: r.get("is_pushed"),
            branch_name: r.try_get("branch_name").unwrap_or_else(|_| "main".to_string()),
        }).collect())
    }

    pub async fn get_commits_for_branch(&self, repo_id: &str, branch_name: &str) -> Result<Vec<GitCommit>> {
        let rows = sqlx::query("SELECT * FROM git_commits WHERE repository_id = ? AND branch_name = ? ORDER BY timestamp DESC")
            .bind(repo_id)
            .bind(branch_name)
            .fetch_all(&self.pool).await?;

        Ok(rows.into_iter().map(|r| GitCommit {
            id: r.get("id"),
            repository_id: r.get("repository_id"),
            parent_id: r.get("parent_id"),
            message_summary: r.get("message_summary"),
            message_description: r.get("message_description"),
            author: r.get("author"),
            timestamp: r.get("timestamp"),
            manifest_data: r.get("manifest_data"),
            is_pushed: r.get("is_pushed"),
            branch_name: r.try_get("branch_name").unwrap_or_else(|_| "main".to_string()),
        }).collect())
    }

    pub async fn get_commit(&self, commit_id: &str) -> Result<Option<GitCommit>> {
        let row = sqlx::query("SELECT * FROM git_commits WHERE id = ?")
            .bind(commit_id)
            .fetch_optional(&self.pool).await?;

        Ok(row.map(|r| GitCommit {
            id: r.get("id"),
            repository_id: r.get("repository_id"),
            parent_id: r.get("parent_id"),
            message_summary: r.get("message_summary"),
            message_description: r.get("message_description"),
            author: r.get("author"),
            timestamp: r.get("timestamp"),
            manifest_data: r.get("manifest_data"),
            is_pushed: r.get("is_pushed"),
            branch_name: r.try_get("branch_name").unwrap_or_else(|_| "main".to_string()),
        }))
    }

    pub async fn create_commit(&self, commit: GitCommit) -> Result<()> {
        sqlx::query("INSERT INTO git_commits (id, repository_id, parent_id, message_summary, message_description, author, timestamp, manifest_data, is_pushed, branch_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&commit.id)
            .bind(&commit.repository_id)
            .bind(&commit.parent_id)
            .bind(&commit.message_summary)
            .bind(&commit.message_description)
            .bind(&commit.author)
            .bind(commit.timestamp)
            .bind(&commit.manifest_data)
            .bind(commit.is_pushed)
            .bind(&commit.branch_name)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn mark_commit_pushed(&self, commit_id: &str) -> Result<()> {
        sqlx::query("UPDATE git_commits SET is_pushed = 1 WHERE id = ?")
            .bind(commit_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    // ──── Branch Methods ────

    pub async fn get_branches(&self, repo_id: &str) -> Result<Vec<GitBranch>> {
        let rows = sqlx::query("SELECT * FROM git_branches WHERE repository_id = ? ORDER BY created_at ASC")
            .bind(repo_id)
            .fetch_all(&self.pool).await?;

        Ok(rows.into_iter().map(|r| GitBranch {
            id: r.get("id"),
            repository_id: r.get("repository_id"),
            name: r.get("name"),
            head_commit_id: r.get("head_commit_id"),
            created_at: r.get("created_at"),
        }).collect())
    }

    pub async fn get_branch(&self, repo_id: &str, name: &str) -> Result<Option<GitBranch>> {
        let row = sqlx::query("SELECT * FROM git_branches WHERE repository_id = ? AND name = ?")
            .bind(repo_id).bind(name)
            .fetch_optional(&self.pool).await?;

        Ok(row.map(|r| GitBranch {
            id: r.get("id"),
            repository_id: r.get("repository_id"),
            name: r.get("name"),
            head_commit_id: r.get("head_commit_id"),
            created_at: r.get("created_at"),
        }))
    }

    pub async fn create_branch(&self, branch: GitBranch) -> Result<()> {
        sqlx::query("INSERT INTO git_branches (id, repository_id, name, head_commit_id, created_at) VALUES (?, ?, ?, ?, ?)")
            .bind(&branch.id)
            .bind(&branch.repository_id)
            .bind(&branch.name)
            .bind(&branch.head_commit_id)
            .bind(branch.created_at)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn delete_branch(&self, repo_id: &str, name: &str) -> Result<()> {
        sqlx::query("DELETE FROM git_branches WHERE repository_id = ? AND name = ?")
            .bind(repo_id).bind(name)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn update_branch_head(&self, repo_id: &str, branch_name: &str, head_commit_id: Option<&str>) -> Result<()> {
        sqlx::query("UPDATE git_branches SET head_commit_id = ? WHERE repository_id = ? AND name = ?")
            .bind(head_commit_id).bind(repo_id).bind(branch_name)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn set_active_branch(&self, repo_id: &str, branch_name: &str) -> Result<()> {
        sqlx::query("UPDATE git_repositories SET current_branch = ? WHERE id = ?")
            .bind(branch_name).bind(repo_id)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn create_pull_request(&self, pr: super::PullRequestRecord) -> Result<()> {
        sqlx::query("INSERT INTO git_pull_requests (id, repository_id, title, description, source_branch, target_branch, author, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&pr.id)
            .bind(&pr.repository_id)
            .bind(&pr.title)
            .bind(&pr.description)
            .bind(&pr.source_branch)
            .bind(&pr.target_branch)
            .bind(&pr.author)
            .bind(&pr.status)
            .bind(pr.created_at)
            .execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_pull_requests(&self, repo_id: &str) -> Result<Vec<super::PullRequestRecord>> {
        let rows = sqlx::query("SELECT * FROM git_pull_requests WHERE repository_id = ? ORDER BY created_at DESC")
            .bind(repo_id)
            .fetch_all(&self.pool).await?;

        Ok(rows.into_iter().map(|r| super::PullRequestRecord {
            id: r.get("id"),
            repository_id: r.get("repository_id"),
            title: r.get("title"),
            description: r.get("description"),
            source_branch: r.get("source_branch"),
            target_branch: r.get("target_branch"),
            author: r.get("author"),
            status: r.get("status"),
            created_at: r.get("created_at"),
        }).collect())
    }

    pub async fn update_pull_request_status(&self, pr_id: &str, status: &str) -> Result<()> {
        sqlx::query("UPDATE git_pull_requests SET status = ? WHERE id = ?")
            .bind(status).bind(pr_id)
            .execute(&self.pool).await?;
        Ok(())
    }
}

