use std::process::Command;
use anyhow::{Result, anyhow};
#[cfg(target_os = "macos")]
use std::fs;

pub fn mount_drive(port: u16, drive_letter: &str, _custom_path: Option<String>) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        let url = format!("http://localhost:{}", port);
        // Using 'net use' to map a drive letter
        let status = Command::new("net")
            .args(["use", drive_letter, &url, "/persistent:no"])
            .status()?;
            
        if !status.success() {
            return Err(anyhow!("Failed to mount drive using 'net use'"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        let mount_point = format!("{}/FoldedCloud", home);
        
        // Simplified URL for more reliable mounting
        let url = format!("http://127.0.0.1:{}/FoldedCloud", port);
        
        log::info!("macOS: Attempting to unmount any existing volume at {}", mount_point);
        let _ = Command::new("diskutil").args(["unmount", "force", &mount_point]).status();
        
        // Ensure mount point directory exists and is empty
        let _ = fs::create_dir_all(&mount_point);

        log::info!("macOS: Mounting WebDAV volume to {}: {}", mount_point, url);

        // Try mount_webdav synchronously to check for errors
        let mount_status = Command::new("mount_webdav")
            .args(["-S", &url, &mount_point])
            .status();
            
        match mount_status {
            Ok(status) if status.success() => {
                log::info!("macOS: mount_webdav successful for {}", mount_point);
            }
            _ => {
                log::warn!("macOS: mount_webdav failed, falling back to Finder mount");
                // Finder fallback usually mounts to /Volumes/FoldedCloud
                let _ = Command::new("osascript")
                    .args(["-e", &format!("tell application \"Finder\" to mount volume \"{}\"", url)])
                    .spawn();
            }
        }
        log::info!("macOS: Virtual drive mount process initiated for {}", mount_point);
    }

    #[cfg(target_os = "linux")]
    {
        let url = format!("dav://localhost:{}", port);
        // Using gvfs-mount (gio mount) for Linux desktop integration
        let _ = Command::new("gio")
            .args(["mount", &url])
            .spawn();
    }

    Ok(())
}

pub fn unmount_drive(_drive_letter: &str, _custom_path: Option<String>) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("net").args(["use", _drive_letter, "/delete"]).spawn();
    }
    
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        let mount_point = format!("{}/FoldedCloud", home);

        log::info!("macOS: Attempting to unmount via Finder and diskutil at {}", mount_point);
        // Try Finder eject first (cleanest)
        let _ = Command::new("osascript")
            .args(["-e", "tell application \"Finder\" to if exists disk \"FoldedCloud\" then eject disk \"FoldedCloud\""])
            .spawn();
        
        // Fallback: force unmount the specific local folder mount point
        let _ = Command::new("diskutil").args(["unmount", "force", &mount_point]).spawn();
        
        // Also cleanup system /Volumes just in case
        let _ = Command::new("diskutil").args(["unmount", "force", "/Volumes/FoldedCloud"]).spawn();
    }

    Ok(())
}

pub fn set_autostart(enabled: bool) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let exe_path = std::env::current_exe()?;
        let app_path = if exe_path.to_string_lossy().contains(".app/Contents/MacOS/") {
            // If running inside an app bundle, get the path to the .app itself
            let mut path = exe_path.clone();
            path.pop(); // MacOS
            path.pop(); // Contents
            path.pop(); // .app
            path
        } else {
            exe_path
        };

        let app_name = "Folded Cloud";
        let path_str = app_path.to_string_lossy();

        if enabled {
            log::info!("macOS: Enabling autostart for {}", path_str);
            // Add login item (silently handles if already exists)
            let script = format!(
                "tell application \"System Events\" to if not (exists login item \"{}\") then make login item at end with properties {{path:\"{}\", name:\"{}\", hidden:false}}",
                app_name, path_str, app_name
            );
            let _ = Command::new("osascript").args(["-e", &script]).spawn();
        } else {
            log::info!("macOS: Disabling autostart for {}", app_name);
            // Remove login item
            let script = format!(
                "tell application \"System Events\" to if exists login item \"{}\" then delete login item \"{}\"",
                app_name, app_name
            );
            let _ = Command::new("osascript").args(["-e", &script]).spawn();
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe()?;
        let path_str = exe_path.to_string_lossy();
        let app_name = "FoldedCloud";

        if enabled {
            log::info!("Windows: Enabling autostart for {}", path_str);
            let _ = Command::new("reg")
                .args(["add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", app_name, "/t", "REG_SZ", "/d", &path_str, "/f"])
                .status();
        } else {
            log::info!("Windows: Disabling autostart for {}", app_name);
            let _ = Command::new("reg")
                .args(["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", app_name, "/f"])
                .status();
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        let exe_path = std::env::current_exe()?;
        let path_str = exe_path.to_string_lossy();
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        let autostart_dir = std::path::PathBuf::from(home).join(".config/autostart");
        let desktop_file = autostart_dir.join("folded-cloud.desktop");

        if enabled {
            log::info!("Linux: Enabling autostart via .desktop file");
            let _ = std::fs::create_dir_all(&autostart_dir);
            let content = format!(
                "[Desktop Entry]\nType=Application\nName=Folded Cloud\nExec={}\nIcon=folded-cloud\nComment=Telegram Cloud Client\nTerminal=false\n",
                path_str
            );
            if let Ok(mut file) = std::fs::File::create(desktop_file) {
                let _ = file.write_all(content.as_bytes());
            }
        } else {
            log::info!("Linux: Disabling autostart");
            let _ = std::fs::remove_file(desktop_file);
        }
    }

    Ok(())
}
