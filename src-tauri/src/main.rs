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
use anyhow::Result;
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
    
    let webdav_bridge = Arc::new(WebDavBridge::new(
        Arc::clone(&metadata_cache),
        Arc::clone(&cluster_orchestrator),
        Arc::clone(&session_manager),
        tmp_dir,
    ));

    let cache_for_setup = Arc::clone(&metadata_cache);
    let sync_tracker = Arc::new(SyncTracker::new());

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Arc::clone(&session_manager))
        .manage(Arc::clone(&webdav_bridge))
        .manage(cluster_orchestrator)
        .manage(Arc::clone(&metadata_cache))
        .manage(sync_tracker)
        .on_window_event(|window: &tauri::Window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let cache = window.state::<Arc<MetadataCache>>();
                let close_to_tray = tauri::async_runtime::block_on(async {
                    cache.get_setting("close_to_tray").await.unwrap_or(Some("true".into()))
                }).unwrap_or("true".to_string()) == "true";

                if close_to_tray {
                    // Prevent window from closing, just hide it to the tray
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .setup(move |app: &mut tauri::App| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).unwrap();
            let show_i = MenuItem::with_id(app, "show", "Open Folded Cloud", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&show_i, &quit_i]).unwrap();
            
            let show_tray = tauri::async_runtime::block_on(async {
                cache_for_setup.get_setting("show_tray_icon").await.unwrap_or(Some("true".into()))
            }).unwrap_or("true".to_string()) == "true";

            let tray_icon = tauri::image::Image::from_path(
                app.path().resource_dir().unwrap().join("icons/tray-icon.png")
            ).unwrap_or_else(|_| app.default_window_icon().unwrap().clone());

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
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

            if let Some(tray) = app.tray_by_id("main-tray") {
                tray.set_visible(show_tray).unwrap();
            }

            // Autostart Sync
            let cache_for_autostart = Arc::clone(&metadata_cache);
            tauri::async_runtime::spawn(async move {
                let launch_on_startup = cache_for_autostart.get_setting("launch_on_startup").await
                    .unwrap_or(Some("false".into()))
                    .unwrap_or("false".into()) == "true";
                
                let _ = crate::os_integration::set_autostart(launch_on_startup);
            });

            let webdav_bridge = Arc::clone(&webdav_bridge);
            let session_manager = Arc::clone(&session_manager);
            let cache_for_setup = Arc::clone(&metadata_cache);
            let metadata_cache = Arc::clone(&metadata_cache);

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
                    if let Err(e) = WebDavBridge::start(webdav_bridge, 9876).await {
                        log::error!("WebDAV server error: {}", e);
                    }
                });
                
                // Initiating mount if enabled
                let cache_for_mount = Arc::clone(&metadata_cache);
                tauri::async_runtime::spawn(async move {
                    let mount_enabled = cache_for_mount.get_setting("mount_drive").await
                        .unwrap_or(Some("true".into()))
                        .unwrap_or("true".into()) == "true";
                    
                    if mount_enabled {
                        log::info!("Initiating virtual drive mount for native streaming in 2000ms...");
                        tokio::time::sleep(std::time::Duration::from_millis(2000)).await;
                        let _ = crate::os_integration::mount_drive(9876, "Z:");
                    } else {
                        log::info!("Virtual drive mount disabled in settings, skipping.");
                    }
                });

                // Background Cache Maintenance Task
                let cache_for_maintenance = Arc::clone(&metadata_cache);
                tauri::async_runtime::spawn(async move {
                    log::info!("Background cache maintenance task started.");
                    loop {
                        // Wait 10 minutes between checks
                        tokio::time::sleep(std::time::Duration::from_secs(600)).await;
                        
                        let limit_mb = cache_for_maintenance.get_setting("cache_max_mb").await
                            .unwrap_or(Some("1024".into()))
                            .unwrap_or("1024".into())
                            .parse::<u64>().unwrap_or(1024);
                        
                        let limit_bytes = limit_mb * 1024 * 1024;
                        match cache_for_maintenance.evict_cache_to_limit(limit_bytes).await {
                            Ok(evicted) if !evicted.is_empty() => {
                                log::info!("Background maintenance: evicted {} file(s) to stay under {}MB limit.", evicted.len(), limit_mb);
                            }
                            Ok(_) => {}
                            Err(e) => {
                                log::error!("Background cache maintenance error: {}", e);
                            }
                        }
                    }
                });
            });
            Ok(())
        });
        
    let app = builder
        .invoke_handler(crate::generate_handler!())
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle: &tauri::AppHandle, event: tauri::RunEvent| {
        if let tauri::RunEvent::Reopen { .. } = event {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });
}
