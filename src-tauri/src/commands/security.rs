use crate::crypto::{KeyVault, encrypt_string};
use crate::ledger::{FileNode, SnapshotManifest, pack_encrypted_snapshot};
use crate::security::{is_panic_mode, trigger_panic};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::fs;

use std::path::{Path, PathBuf};
use walkdir::WalkDir;

fn expand_path(p_str: &str) -> PathBuf {
    if p_str.starts_with("~/") || p_str == "~" {
        if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
            return PathBuf::from(home).join(p_str.trim_start_matches("~/").trim_start_matches("~"));
        }
    }
    PathBuf::from(p_str)
}

#[derive(Serialize, Deserialize)]
pub struct VaultInfo {
    pub folder_path: String,
    pub folder_exists: bool,
    pub storage_mode: String, // "FOLDER" | "VIRTUAL_DRIVE"
    pub is_drive_mounted: bool,
}

#[tauri::command]
pub async fn trigger_panic_switch(
    app_handle: tauri::AppHandle,
    cache: tauri::State<'_, std::sync::Arc<crate::cache::MetadataCache>>,
    session_manager: tauri::State<'_, std::sync::Arc<crate::session_manager::SessionManager>>,
) -> Result<(), String> {
    let _ = cache.reset_database().await;
    let _ = session_manager.clear_pending_auths().await;
    let accounts = session_manager.get_active_accounts().await;
    for acc in accounts {
        let _ = session_manager.logout_account(&acc.id).await;
    }
    trigger_panic(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn full_logout(
    app_handle: tauri::AppHandle,
    cache: tauri::State<'_, std::sync::Arc<crate::cache::MetadataCache>>,
    session_manager: tauri::State<'_, std::sync::Arc<crate::session_manager::SessionManager>>,
) -> Result<bool, String> {
    log::info!("Executing Full Logout...");

    // 1. Unmount Virtual Drive
    let _ = crate::os_integration::unmount_drive("Z:", None);

    // 2. Reset Database safely without corrupting file descriptor
    let _ = cache.reset_database().await;

    // 3. Wipe local FoldedVault folder
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).unwrap_or_else(|_| "/tmp".into());
    let vault_path = std::path::PathBuf::from(&home).join("FoldedVault");
    if vault_path.exists() {
        let _ = crate::security::secure_wipe::wipe_directory(&vault_path);
    }

    // 4. Logout active accounts & clear session files
    let accounts = session_manager.get_active_accounts().await;
    for acc in accounts {
        let _ = session_manager.logout_account(&acc.id).await;
    }

    // 5. Trigger panic switch to reset frontend to AUTH screen
    let _ = trigger_panic(&app_handle);

    Ok(true)
}


#[tauri::command]
pub fn get_panic_status() -> bool {
    is_panic_mode()
}


#[tauri::command]
pub fn derive_vault_key(password: String, salt_hex: Option<String>) -> Result<Vec<String>, String> {
    let salt = match salt_hex {
        Some(hex_str) => hex::decode(hex_str).map_err(|e| format!("Invalid salt hex: {}", e))?,
        None => KeyVault::generate_salt().to_vec(),
    };

    let vault = KeyVault::derive(&password, &salt).map_err(|e| e.to_string())?;
    let salt_out_hex = hex::encode(&salt);
    let key_hash = hex::encode(&vault.key()[0..8]); // Verification fingerprint

    Ok(vec![salt_out_hex, key_hash])
}

#[tauri::command]
pub async fn get_vault_info(
    _cache: tauri::State<'_, std::sync::Arc<crate::cache::MetadataCache>>,
) -> Result<VaultInfo, String> {
    let is_drive_mounted = Path::new("/Volumes/127.0.0.1").exists()
        || Path::new("/Volumes/FoldedCloud").exists();

    Ok(VaultInfo {
        folder_path: String::new(),
        folder_exists: false,
        storage_mode: "VIRTUAL_DRIVE".into(),
        is_drive_mounted,
    })
}

#[tauri::command]
pub async fn remount_virtual_drive() -> Result<bool, String> {
    crate::os_integration::mount_drive(9876, "Z:", None).map_err(|e| e.to_string())?;
    Ok(true)
}




#[tauri::command]
pub fn create_folder_snapshot(
    folder_path: String,
    device_id: String,
    sequence_num: u64,
    password: String,
    salt_hex: String,
) -> Result<String, String> {
    let salt = hex::decode(salt_hex).map_err(|e| e.to_string())?;
    let vault = KeyVault::derive(&password, &salt).map_err(|e| e.to_string())?;
    let root = Path::new(&folder_path);

    if !root.exists() {
        return Err("Directory does not exist".into());
    }

    let mut file_nodes = Vec::new();
    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if let Ok(rel) = path.strip_prefix(root) {
            let rel_str = rel.to_string_lossy().to_string();
            if rel_str.is_empty() {
                continue;
            }

            let meta = fs::metadata(path).ok();
            let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
            let is_dir = path.is_dir();
            let modified_at = meta
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            // Obfuscate path for E2EE
            let encrypted_path = encrypt_string(vault.key(), &rel_str).unwrap_or(rel_str);

            file_nodes.push(FileNode {
                relative_path: encrypted_path,
                size,
                is_dir,
                modified_at,
                chunks: vec![],
            });
        }
    }

    let manifest = SnapshotManifest::new(device_id, sequence_num, file_nodes);
    let packed = pack_encrypted_snapshot(vault.key(), &manifest).map_err(|e| e.to_string())?;

    Ok(hex::encode(packed))
}

use crate::cache::SnapshotRecord;
use tauri::Emitter;

#[tauri::command]
pub async fn take_snapshot(
    app_handle: tauri::AppHandle,
    session_manager: tauri::State<'_, std::sync::Arc<crate::session_manager::SessionManager>>,
    cache: tauri::State<'_, std::sync::Arc<crate::cache::MetadataCache>>,
) -> Result<Vec<SnapshotRecord>, String> {
    let accounts = session_manager.get_active_accounts().await;
    let primary_acc = accounts.first().map(|a| a.id.clone()).unwrap_or_default();

    let files = cache.get_files_by_account(&primary_acc).await.unwrap_or_default();
    let folders = cache.get_folders_by_account(&primary_acc).await.unwrap_or_default();
    let note_attachments = cache.get_all_note_attachments(&primary_acc).await.unwrap_or_default();

    let seq = cache.get_next_snapshot_seq().await.map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp();
    let device_name = "MacBook-Pro-Vault".to_string();
    let id = format!("snap-{}", now);

    let manifest = crate::cluster::FoldedManifest {
        version: 1,
        folders,
        files: files.clone(),
        note_attachments,
        updated_at: now,
    };
    let manifest_json = serde_json::to_string(&manifest).ok();

    let record = SnapshotRecord {
        id,
        seq,
        device_name,
        file_count: files.len(),
        timestamp: now,
        manifest_data: manifest_json,
    };

    cache.create_snapshot_record(record).await.map_err(|e| e.to_string())?;
    let _ = cache.update_setting("last_snapshot_at", &now.to_string()).await;

    let snapshots = cache.get_snapshots().await.map_err(|e| e.to_string())?;
    let _ = app_handle.emit("snapshot-created", &snapshots);

    Ok(snapshots)
}

#[tauri::command]
pub async fn list_snapshots(
    cache: tauri::State<'_, std::sync::Arc<crate::cache::MetadataCache>>,
) -> Result<Vec<SnapshotRecord>, String> {
    cache.get_snapshots().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_snapshot(
    app_handle: tauri::AppHandle,
    session_manager: tauri::State<'_, std::sync::Arc<crate::session_manager::SessionManager>>,
    cache: tauri::State<'_, std::sync::Arc<crate::cache::MetadataCache>>,
    snapshot_id: String,
) -> Result<Vec<SnapshotRecord>, String> {
    log::info!("Deleting snapshot {} and running garbage collection", snapshot_id);

    let target = cache.get_snapshot_by_id(&snapshot_id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| "Snapshot not found".to_string())?;

    // Delete snapshot record first
    cache.delete_snapshot_record(&snapshot_id).await.map_err(|e| e.to_string())?;

    // Garbage Collection: find message_ids from deleted snapshot that are not in active DB and not in remaining snapshots
    if let Some(ref json) = target.manifest_data {
        if let Ok(target_manifest) = serde_json::from_str::<crate::cluster::FoldedManifest>(json) {
            let active_accounts = session_manager.get_active_accounts().await;
            let primary_acc = active_accounts.first().map(|a| a.id.clone()).unwrap_or_default();

            let active_msg_ids = cache.get_all_linked_message_ids(&primary_acc).await.unwrap_or_default();
            let remaining_snap_msg_ids = cache.get_all_snapshot_message_ids().await.unwrap_or_default();

            let mut orphaned_by_account: std::collections::HashMap<String, Vec<i32>> = std::collections::HashMap::new();

            for file in target_manifest.files {
                let acc_id = file.account_id.unwrap_or_else(|| primary_acc.clone());
                for chunk in file.chunks {
                    let msg_id = chunk.message_id as i32;
                    if !active_msg_ids.contains(&msg_id) && !remaining_snap_msg_ids.contains(&msg_id) {
                        orphaned_by_account.entry(acc_id.clone()).or_default().push(msg_id);
                    }
                }
            }

            for (acc_id, msg_ids) in orphaned_by_account {
                if msg_ids.is_empty() || acc_id.is_empty() { continue; }
                if let Some(client) = session_manager.get_client_by_id(&acc_id).await {
                    log::info!("[GC] Purging {} orphaned chunks from Telegram for account {}", msg_ids.len(), acc_id);
                    let _ = client.invoke(&grammers_tl_types::functions::messages::DeleteMessages {
                        id: msg_ids,
                        revoke: true,
                    }).await;
                }
            }
        }
    }

    let snapshots = cache.get_snapshots().await.map_err(|e| e.to_string())?;
    let _ = app_handle.emit("snapshot-created", &snapshots);

    Ok(snapshots)
}

#[tauri::command]
pub async fn restore_snapshot(
    app_handle: tauri::AppHandle,
    session_manager: tauri::State<'_, std::sync::Arc<crate::session_manager::SessionManager>>,
    orchestrator: tauri::State<'_, std::sync::Arc<crate::cluster::ClusterOrchestrator>>,
    cache: tauri::State<'_, std::sync::Arc<crate::cache::MetadataCache>>,
    snapshot_id: String,
) -> Result<(), String> {
    log::info!("Restoring state from snapshot {}", snapshot_id);

    let snap = cache.get_snapshot_by_id(&snapshot_id).await.map_err(|e| e.to_string())?
        .ok_or_else(|| "Snapshot not found".to_string())?;

    let json = snap.manifest_data.ok_or_else(|| "Snapshot manifest data is empty".to_string())?;
    let manifest: crate::cluster::FoldedManifest = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    let accounts = session_manager.get_active_accounts().await;
    for acc in &accounts {
        cache.clear_explorer_data_for_account(&acc.id).await.map_err(|e| e.to_string())?;

        for folder in &manifest.folders {
            let parent_id = if let Some(ref pid) = folder.parent_id {
                if pid.is_empty() { None } else { Some(pid.clone()) }
            } else {
                None
            };
            sqlx::query("INSERT OR IGNORE INTO folders (id, name, parent_id, account_id, is_starred, created_at) VALUES (?, ?, ?, ?, ?, ?)")
                .bind(&folder.id)
                .bind(&folder.name)
                .bind(parent_id)
                .bind(&acc.id)
                .bind(folder.is_starred)
                .bind(folder.created_at)
                .execute(cache.get_pool()).await.map_err(|e| e.to_string())?;
        }

        for mut file in manifest.files.clone() {
            file.account_id = Some(acc.id.clone());
            cache.save_file(file).await.map_err(|e| e.to_string())?;
        }

        let _ = orchestrator.push_manifest(&acc.id, Arc::clone(&session_manager), Arc::clone(&cache)).await;
    }

    let _ = app_handle.emit("vault-restored", ());
    Ok(())
}


#[tauri::command]
pub async fn get_snapshot_schedule(
    cache: tauri::State<'_, std::sync::Arc<crate::cache::MetadataCache>>,
) -> Result<String, String> {
    let schedule = cache.get_setting("snapshot_schedule").await
        .unwrap_or(None)
        .unwrap_or_else(|| "OFF".into());
    Ok(schedule)
}

#[tauri::command]
pub async fn set_snapshot_schedule(
    schedule: String,
    cache: tauri::State<'_, std::sync::Arc<crate::cache::MetadataCache>>,
) -> Result<bool, String> {
    cache.update_setting("snapshot_schedule", &schedule).await.map_err(|e| e.to_string())?;
    Ok(true)
}

