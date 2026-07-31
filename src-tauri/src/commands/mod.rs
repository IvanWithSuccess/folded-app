pub mod auth;
pub mod fs;
pub mod notes;
pub mod cluster;
pub mod system;
pub mod settings;
pub mod cache;
pub mod mirrors;
pub mod versions;
pub mod security;
pub mod git;

#[macro_export]
macro_rules! generate_handler {
    () => {
        tauri::generate_handler![
            $crate::commands::security::trigger_panic_switch,
            $crate::commands::security::full_logout,
            $crate::commands::security::get_panic_status,
            $crate::commands::security::derive_vault_key,
            $crate::commands::security::create_folder_snapshot,
            $crate::commands::security::get_vault_info,
            $crate::commands::security::remount_virtual_drive,
            $crate::commands::security::take_snapshot,
            $crate::commands::security::list_snapshots,
            $crate::commands::security::delete_snapshot,
            $crate::commands::security::restore_snapshot,
            $crate::commands::security::get_snapshot_schedule,
            $crate::commands::security::set_snapshot_schedule,




            $crate::commands::auth::auth_request_code,

            $crate::commands::auth::auth_verify_code,
            $crate::commands::auth::auth_verify_password,
            $crate::commands::auth::auth_request_qr,
            $crate::commands::auth::auth_poll_qr,
            $crate::commands::auth::auth_cancel,
            $crate::commands::auth::auth_logout,
            $crate::commands::auth::get_accounts,
            $crate::commands::auth::verify_session_health,
            
            $crate::commands::fs::cluster_upload_file,
            $crate::commands::fs::upload_directory,
            $crate::commands::fs::cluster_list_files,
            $crate::commands::fs::create_folder,
            $crate::commands::fs::list_folder_content,
            $crate::commands::fs::delete_folder,
            $crate::commands::fs::rename_item,
            $crate::commands::fs::move_item,
            $crate::commands::fs::copy_item,
            $crate::commands::fs::global_search,
            $crate::commands::fs::get_item_path,
            $crate::commands::fs::toggle_item_starred,
            $crate::commands::fs::get_category_content,
            $crate::commands::fs::get_item_history,
            $crate::commands::fs::get_recent_activity,
            $crate::commands::fs::get_active_tasks,

            
            $crate::commands::notes::get_notes,
            $crate::commands::notes::update_note,
            $crate::commands::notes::delete_note,
            $crate::commands::notes::create_note,
            $crate::commands::notes::note_attach_file,
            $crate::commands::notes::note_detach_file,
            
            $crate::commands::cluster::cluster_download_file,
            $crate::commands::cluster::cluster_download_to_tmp,
            $crate::commands::cluster::cluster_index_account,
            $crate::commands::cluster::cluster_create_hub,
            $crate::commands::cluster::sync_account,
            $crate::commands::cluster::push_manifest,
            $crate::commands::cluster::pull_manifest,
            $crate::commands::cluster::get_user_channels,
            $crate::commands::cluster::create_storage_hub,
            $crate::commands::cluster::cluster_delete_file,
            $crate::commands::cluster::format_storage,
            
            $crate::commands::system::open_system_file,
            $crate::commands::system::read_preview_file,
            $crate::commands::system::get_file_preview,
            $crate::commands::system::get_chats,
            $crate::commands::system::share_file,
            $crate::commands::system::mount_drive,
            $crate::commands::system::unmount_drive,
            $crate::commands::system::download_items_to_path,
            $crate::commands::system::create_alias,
            $crate::commands::system::get_home_dir,
            $crate::commands::system::get_system_report,

            
            $crate::commands::settings::get_setting,
            $crate::commands::settings::update_setting,
            $crate::commands::settings::purge_local_cache,

            $crate::commands::cache::get_cache_stats,
            $crate::commands::cache::clear_file_cache,
            $crate::commands::cache::evict_cache,


            $crate::commands::versions::get_file_versions,
            $crate::commands::versions::restore_file_version,
            $crate::commands::versions::download_file_version,
            $crate::commands::versions::get_folder_history,
            $crate::commands::versions::restore_deleted_item,
            $crate::commands::versions::delete_file_with_all_versions,

            $crate::commands::git::list_repositories,
            $crate::commands::git::create_repository,
            $crate::commands::git::delete_repository,
            $crate::commands::git::get_repository_status,
            $crate::commands::git::get_file_diff,
            $crate::commands::git::commit_changes,
            $crate::commands::git::push_commits,
            $crate::commands::git::pull_commits,
            $crate::commands::git::clone_repository,
            $crate::commands::git::get_repository_history,
            $crate::commands::git::discover_telegram_repositories,
            $crate::commands::git::read_folded_config,
            $crate::commands::git::delete_remote_repository,
            $crate::commands::git::update_repository_settings,
            $crate::commands::git::get_commit_file_diff,
            $crate::commands::git::checkout_repository_commit,
            $crate::commands::git::list_branches,
            $crate::commands::git::create_branch,
            $crate::commands::git::delete_branch,
            $crate::commands::git::switch_branch,
            $crate::commands::git::get_branch_history,
            $crate::commands::git::merge_branch,
            $crate::commands::git::check_account_manifests,
            $crate::commands::git::get_repo_account_status,
            $crate::commands::git::relink_repository,
            $crate::commands::git::read_ignored_patterns,
            $crate::commands::git::save_ignored_patterns,
            $crate::commands::git::check_remote_updates,
            $crate::commands::git::read_merge_state,
            $crate::commands::git::resolve_conflict,
            $crate::commands::git::abort_merge
        ]
    };
}
