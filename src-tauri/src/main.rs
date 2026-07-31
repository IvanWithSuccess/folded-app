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
pub mod crypto;
pub mod security;
pub mod ledger;


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

struct FileAndStdoutLogger {
    file_path: std::path::PathBuf,
    level: log::LevelFilter,
}

impl log::Log for FileAndStdoutLogger {
    fn enabled(&self, metadata: &log::Metadata) -> bool {
        metadata.level() <= self.level
    }

    fn log(&self, record: &log::Record) {
        if self.enabled(record.metadata()) {
            let msg = format!(
                "[{}] {} - {}\n",
                chrono::Local::now().format("%Y-%m-%dT%H:%M:%S"),
                record.level(),
                record.args()
            );
            print!("{}", msg);
            if let Ok(mut file) = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&self.file_path)
            {
                use std::io::Write;
                let _ = file.write_all(msg.as_bytes());
            }
        }
    }

    fn flush(&self) {}
}

const API_ID: i32 = 26947469; 
const API_HASH: &str = "731a222f9dd8b290db925a6a382159dd";

fn main() {
    let home_dir = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).expect("Could not find home directory");
    let app_data_dir = std::path::PathBuf::from(home_dir).join(".folded");
    let _ = std::fs::create_dir_all(&app_data_dir);

    let log_file_path = app_data_dir.join("app.log");
    if log_file_path.exists() {
        if let Ok(metadata) = std::fs::metadata(&log_file_path) {
            if metadata.len() > 10 * 1024 * 1024 {
                let _ = std::fs::remove_file(&log_file_path);
            }
        }
    }

    let logger = FileAndStdoutLogger {
        file_path: log_file_path,
        level: log::LevelFilter::Info,
    };
    log::set_boxed_logger(Box::new(logger))
        .map(|()| log::set_max_level(log::LevelFilter::Info))
        .expect("Failed to initialize custom logger");
    
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
            // Force Light theme for the main window to match user preference
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_theme(Some(tauri::Theme::Light));
            }

            let webdav_bridge = Arc::new(WebDavBridge::new(
                Arc::clone(&metadata_cache),
                Arc::clone(&cluster_orchestrator),
                Arc::clone(&session_manager),
                tmp_dir,
                Some(app.handle().clone()),
            ));


            let mirror_manager = Arc::new(MirrorManager::new(
                app.handle().clone(),
                Arc::clone(&metadata_cache),
                Arc::clone(&cluster_orchestrator),
                Arc::clone(&session_manager),
            ));
            app.manage(Arc::clone(&mirror_manager));

            // Automatically start all active mirror rules on startup
            let mm_clone = Arc::clone(&mirror_manager);
            tauri::async_runtime::spawn(async move {
                if let Err(e) = mm_clone.start_all().await {
                    log::error!("Failed to start active mirror rules: {}", e);
                }
            });

            
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

            // Automated Snapshot Scheduler
            let cache_for_snapshots = Arc::clone(&metadata_cache);
            let app_handle_for_snapshots = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(60)).await;

                    let schedule = cache_for_snapshots.get_setting("snapshot_schedule").await
                        .unwrap_or(None)
                        .unwrap_or_else(|| "OFF".into());

                    if schedule == "OFF" {
                        continue;
                    }

                    let interval_secs: i64 = match schedule.as_str() {
                        "HOURLY" => 3600,
                        "DAILY" => 86400,
                        "WEEKLY" => 604800,
                        "MONTHLY" => 2592000,
                        _ => continue,
                    };

                    let last_at_str = cache_for_snapshots.get_setting("last_snapshot_at").await
                        .unwrap_or(None)
                        .unwrap_or_else(|| "0".into());

                    let last_at: i64 = last_at_str.parse().unwrap_or(0);
                    let now = chrono::Utc::now().timestamp();

                    if now - last_at >= interval_secs {
                        log::info!("AUTO SNAPSHOT [TRIGGERED]: Creating automated snapshot (schedule: {})", schedule);
                        if let Ok(files) = cache_for_snapshots.get_files().await {
                            if let Ok(seq) = cache_for_snapshots.get_next_snapshot_seq().await {
                                let folders = cache_for_snapshots.get_folders_by_account("").await.unwrap_or_default();
                                let note_attachments = cache_for_snapshots.get_all_note_attachments("").await.unwrap_or_default();
                                let manifest = crate::cluster::FoldedManifest {
                                    version: 1,
                                    folders,
                                    files: files.clone(),
                                    note_attachments,
                                    updated_at: now,
                                };
                                let manifest_json = serde_json::to_string(&manifest).ok();

                                let record = crate::cache::SnapshotRecord {
                                    id: format!("snap-{}", now),
                                    seq,
                                    device_name: "MacBook-Pro-Vault (Scheduled)".into(),
                                    file_count: files.len(),
                                    timestamp: now,
                                    manifest_data: manifest_json,
                                };

                                if let Ok(_) = cache_for_snapshots.create_snapshot_record(record).await {
                                    let _ = cache_for_snapshots.update_setting("last_snapshot_at", &now.to_string()).await;
                                    if let Ok(snaps) = cache_for_snapshots.get_snapshots().await {
                                        use tauri::Emitter;
                                        let _ = app_handle_for_snapshots.emit("snapshot-created", &snaps);
                                    }
                                }
                            }
                        }
                    }
                }
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
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
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

            // E2E test execution check
            let args: Vec<String> = std::env::args().collect();
            if args.contains(&"--run-tests".to_string()) {
                let app_handle_clone = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    println!("Launching Folded E2E Integration Test Suite...");
                    match crate::commands::git::run_git_e2e_tests(app_handle_clone).await {
                        Ok(_) => {
                            println!("E2E TESTS PASSED!");
                            std::process::exit(0);
                        }
                        Err(e) => {
                            eprintln!("E2E TESTS FAILED: {}", e);
                            std::process::exit(1);
                        }
                    }
                });
            }

            // Start WebDAV server and perform auto-mounting if enabled
            let webdav_clone = Arc::clone(&webdav_bridge);
            let cache_for_mount = Arc::clone(&metadata_cache);
            tauri::async_runtime::spawn(async move {
                // Start WebDAV bridge
                let server_clone = Arc::clone(&webdav_clone);
                tauri::async_runtime::spawn(async move {
                    let _ = WebDavBridge::start(server_clone, 9876).await;
                });

                // Let the server start up
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;

                // Check mount setting and perform mount if enabled
                let should_mount = cache_for_mount.get_setting("mount_drive").await
                    .unwrap_or(Some("false".into()))
                    .unwrap_or_else(|| "false".into()) == "true";

                if should_mount {
                    log::info!("Auto-mount: mount_drive setting is true, mounting drive...");
                    let _ = crate::os_integration::mount_drive(9876, "Z:", None);
                }
            });


            Ok(())
        })
        .invoke_handler(crate::generate_handler!())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::Reopen { .. } => {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        });
}

