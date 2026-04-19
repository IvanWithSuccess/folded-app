#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod session_manager;
mod cluster;
mod cache;
mod webdav;
mod os_integration;
mod commands;

use crate::session_manager::SessionManager;
use crate::cluster::ClusterOrchestrator;
use crate::cache::MetadataCache;
use crate::webdav::WebDavBridge;
use std::sync::Arc;
use std::collections::HashSet;
use tokio::sync::Mutex as TokioMutex;
use tauri::tray::TrayIconBuilder;
use tauri::menu::{Menu, MenuItem};
use tauri::Manager;

pub struct SyncTracker {
    pub active_crawlers: Arc<TokioMutex<HashSet<String>>>,
}

impl SyncTracker {
    pub fn new() -> Self {
        Self {
            active_crawlers: Arc::new(TokioMutex::new(HashSet::new())),
        }
    }
}

const API_ID: i32 = 26947469; 
const API_HASH: &str = "731a222f9dd8b290db925a6a382159dd";

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    
    let home_dir = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).expect("Could not find home directory");
    let app_data_dir = std::path::PathBuf::from(home_dir).join(".folded");
    let _ = std::fs::create_dir_all(&app_data_dir);
    
    let sessions_dir = app_data_dir.join("sessions");
    let _ = std::fs::create_dir_all(&sessions_dir);

    let tmp_dir = app_data_dir.join("tmp");
    let _ = std::fs::create_dir_all(&tmp_dir);

    let session_manager = Arc::new(SessionManager::new(
        sessions_dir.clone(),
        API_ID,
        API_HASH.to_string(),
    ));

    let db_path = app_data_dir.join("metadata_db.sqlite").to_string_lossy().to_string();
    let metadata_cache = Arc::new(tokio::runtime::Runtime::new()
        .expect("Failed to create tokio runtime for cache init")
        .block_on(async move {
            MetadataCache::new(&db_path).await.expect("Failed to initialize metadata DB")
        }));

    let cluster_orchestrator = Arc::new(ClusterOrchestrator::new());
    
    let webdav_bridge = WebDavBridge::new(
        Arc::clone(&metadata_cache),
        Arc::clone(&cluster_orchestrator),
        Arc::clone(&session_manager),
        tmp_dir,
    );

    let cache_for_setup = Arc::clone(&metadata_cache);
    let sync_tracker = Arc::new(SyncTracker::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Arc::clone(&session_manager))
        .manage(cluster_orchestrator)
        .manage(metadata_cache)
        .manage(sync_tracker)
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent window from closing, just hide it to the tray
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .setup(move |app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).unwrap();
            let show_i = MenuItem::with_id(app, "show", "Open Folded Cloud", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&show_i, &quit_i]).unwrap();
            
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "quit" => {
                            std::process::exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)
                .unwrap();

            let session_manager = Arc::clone(&session_manager);
            tauri::async_runtime::spawn(async move {
                if let Err(e) = session_manager.load_sessions().await {
                    eprintln!("Failed to load saved sessions: {}", e);
                }

                let active_ids: Vec<String> = session_manager.get_active_accounts().await
                    .iter().map(|a| a.id.clone()).collect();
                log::info!("Active accounts for DB reconciliation: {:?}", active_ids);
                match cache_for_setup.reconcile_with_active_accounts(&active_ids).await {
                    Ok(orphaned) if !orphaned.is_empty() => {
                        log::info!("Reconciliation purged data for {} orphaned account(s)", orphaned.len());
                    }
                    Ok(_) => {
                        log::info!("Reconciliation: database is clean, no orphaned data");
                    }
                    Err(e) => {
                        log::error!("Reconciliation failed: {}", e);
                    }
                }
                
                let _ = tauri::async_runtime::spawn(async move {
                    if let Err(e) = webdav_bridge.start(9876).await {
                        log::error!("WebDAV server error: {}", e);
                    }
                });
                
                log::info!("Initiating virtual drive mount for native streaming in 500ms...");
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    let _ = crate::os_integration::mount_drive(9876, "Z:");
                });
            });
            Ok(())
        })
        .invoke_handler(crate::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
