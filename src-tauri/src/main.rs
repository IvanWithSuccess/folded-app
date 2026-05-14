#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

pub mod session_manager;
pub mod cluster;
pub mod cache;
pub mod webdav;
pub mod os_integration;
pub mod commands;

use session_manager::SessionManager;
use cluster::ClusterOrchestrator;
use cache::MetadataCache;
use webdav::WebDavBridge;
use cluster::mirrors::MirrorManager;
use std::sync::Arc;
use std::collections::HashMap;
use tokio_util::sync::CancellationToken;
use tokio::sync::Mutex as TokioMutex;
use tauri::tray::TrayIconBuilder;
use tauri::menu::{Menu, MenuItem};
use tauri::Manager;

pub struct SyncTracker {
    pub active_crawlers: Arc<TokioMutex<HashMap<String, CancellationToken>>>,
}

impl SyncTracker {
    pub fn new() -> Self {
        Self {
            active_crawlers: Arc::new(TokioMutex::new(HashMap::new())),
        }
    }

    pub async fn stop_crawler(&self, account_id: &str) {
        let mut active = self.active_crawlers.lock().await;
        if let Some(token) = active.remove(account_id) {
            token.cancel();
            log::info!("Signal sent to stop crawler for account {}", account_id);
        }
    }

    pub async fn stop_all(&self) {
        let mut active = self.active_crawlers.lock().await;
        for (account_id, token) in active.drain() {
            token.cancel();
            log::info!("Global Stop: Crawler for {} signaled to stop", account_id);
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

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--minimized"])))
        .manage(Arc::clone(&session_manager))
        .manage(Arc::clone(&cluster_orchestrator))
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
                    let window_clone = window.clone();
                    tauri::async_runtime::spawn(async move {
                        if window_clone.is_fullscreen().unwrap_or(false) {
                            let _ = window_clone.set_fullscreen(false);
                            // Give macOS a moment to animate out of fullscreen
                            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
                        }
                        let _ = window_clone.hide();
                    });
                    api.prevent_close();
                }
            }
        })
        .setup(move |app: &mut tauri::App| {
            // Force Dark theme for the main window to prevent white title bar in production
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_theme(Some(tauri::Theme::Dark));
            }

            let mirror_manager = Arc::new(MirrorManager::new(
                app.handle().clone(),
                Arc::clone(&metadata_cache),
                Arc::clone(&cluster_orchestrator),
                Arc::clone(&session_manager),
            ));
            app.manage(Arc::clone(&mirror_manager));
            
            let task_manager = Arc::new(crate::cluster::task_manager::TaskManager::new(
                app.handle().clone(),
                Arc::clone(&metadata_cache),
                Arc::clone(&cluster_orchestrator),
                Arc::clone(&session_manager),
            ));
            app.manage(Arc::clone(&task_manager));

            let task_manager_clone = Arc::clone(&task_manager);
            tauri::async_runtime::spawn(async move {
                task_manager_clone.start().await;
            });

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
                            app.exit(0);
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
                .build(app)?;
            
            if let Some(tray) = app.tray_by_id("main-tray") {
                let _ = tray.set_visible(show_tray);
            }

            // Restore sessions synchronously before app starts to avoid UI race conditions
            let sm_setup = Arc::clone(&session_manager);
            let _ = tauri::async_runtime::block_on(async move {
                match sm_setup.load_sessions().await {
                    Ok(dead_ids) => {
                        if !dead_ids.is_empty() {
                            log::warn!("Removed {} expired/corrupt sessions", dead_ids.len());
                        }
                    }
                    Err(e) => log::error!("Critical failure during session restoration: {}", e),
                }
            });

            // Start WebDAV server
            let webdav_clone = Arc::clone(&webdav_bridge);
            tauri::async_runtime::spawn(async move {
                let _ = WebDavBridge::start(webdav_clone, 9876).await;
            });

            Ok(())
        })
        .invoke_handler(crate::generate_handler!())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
