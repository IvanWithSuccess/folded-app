pub mod auth;
pub mod fs;
pub mod notes;
pub mod cluster;
pub mod system;
pub mod settings;
pub mod cache;
pub mod mirrors;
pub mod versions;

#[macro_export]
macro_rules! generate_handler {
    () => {
        tauri::generate_handler![
            $crate::commands::auth::auth_request_code,
            $crate::commands::auth::auth_verify_code,
            $crate::commands::auth::auth_verify_password,
            $crate::commands::auth::auth_request_qr,
            $crate::commands::auth::auth_poll_qr,
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
            
            $crate::commands::settings::get_setting,
            $crate::commands::settings::update_setting,
            $crate::commands::settings::purge_local_cache,

            $crate::commands::cache::get_cache_stats,
            $crate::commands::cache::clear_file_cache,
            $crate::commands::cache::evict_cache,

            $crate::commands::mirrors::get_mirror_rules,
            $crate::commands::mirrors::add_mirror_rule,
            $crate::commands::mirrors::remove_mirror_rule,
            $crate::commands::mirrors::toggle_mirror_rule,

            $crate::commands::versions::get_file_versions,
            $crate::commands::versions::restore_file_version,
            $crate::commands::versions::download_file_version,
            $crate::commands::versions::get_folder_history,
            $crate::commands::versions::restore_deleted_item,
            $crate::commands::versions::delete_file_with_all_versions
        ]
    };
}
