use std::process::Command;
#[allow(unused_imports)]
use anyhow::{Result, anyhow};
#[allow(unused_imports)]
#[cfg(target_os = "macos")]
use std::fs;


#[allow(unused_variables)]
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
        let url = format!("http://127.0.0.1:{}", port);

        log::info!("macOS: Mounting WebDAV volume to Finder: {}", url);

        // Eject any stale 127.0.0.1 disks first to prevent macOS from creating /Volumes/127.0.0.1-1
        let _ = Command::new("osascript")
            .args(["-e", "tell application \"Finder\" to repeat with d in (get disks)\n if name of d starts with \"127.0.0.1\" then eject d\n end repeat"])
            .output();

        // Native Finder mount volume command (mounts cleanly to /Volumes/127.0.0.1)
        let script = format!("tell application \"Finder\" to mount volume \"{}\"", url);
        let _ = Command::new("osascript").args(["-e", &script]).spawn();

        log::info!("macOS: Virtual drive mount process initiated.");
    }


    #[cfg(target_os = "linux")]
    {
        let url = format!("dav://localhost:{}", port);
        let _ = Command::new("gio").args(["mount", &url]).spawn();
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
        log::info!("macOS: Unmounting WebDAV volumes via Finder and diskutil");
        let _ = Command::new("osascript")
            .args(["-e", "tell application \"Finder\" to if exists disk \"127.0.0.1\" then eject disk \"127.0.0.1\""])
            .spawn();
        let _ = Command::new("osascript")
            .args(["-e", "tell application \"Finder\" to if exists disk \"FoldedCloud\" then eject disk \"FoldedCloud\""])
            .spawn();

        let _ = Command::new("diskutil").args(["unmount", "force", "/Volumes/127.0.0.1"]).spawn();
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
