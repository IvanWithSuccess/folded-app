use std::process::Command;
use anyhow::Result;
#[cfg(target_os = "macos")]
use std::fs;

pub fn mount_drive(port: u16, _drive_letter: &str) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        let url = format!("http://localhost:{}", port);
        // Using 'net use' to map a drive letter
        let status = Command::new("net")
            .args(["use", _drive_letter, &url, "/persistent:no"])
            .status()?;
            
        if !status.success() {
            return Err(anyhow!("Failed to mount drive using 'net use'"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        // Adding user-info (FoldedCloud@) often helps Finder label the volume correctly in the sidebar
        let url = format!("http://FoldedCloud@127.0.0.1:{}/FoldedCloud", port);
        let mount_point = "/Volumes/FoldedCloud";
        
        log::info!("macOS: Attempting to unmount any existing volume at {}", mount_point);
        // Ensure mount point doesn't exist or is unmounted first
        let _ = Command::new("diskutil").args(["unmount", "force", mount_point]).status();
        
        if fs::metadata(mount_point).is_ok() {
            log::info!("macOS: Stale mount point directory detected, removing: {}", mount_point);
            let _ = fs::remove_dir_all(mount_point);
        }

        log::info!("macOS: Mounting WebDAV volume to {}: {}", mount_point, url);
        
        // Ensure mount point directory exists
        let _ = fs::create_dir_all(mount_point);

        // Prefere mount_webdav because it respects the mount_point directory name in Finder
        let child_res = Command::new("mount_webdav")
            .args(["-S", &url, mount_point])
            .spawn();
            
        if let Err(e) = child_res {
            log::warn!("macOS: mount_webdav failed to spawn: {}, falling back to Finder", e);
            let _ = Command::new("osascript")
                .args(["-e", &format!("tell application \"Finder\" to mount volume \"{}\"", url)])
                .spawn();
        }
        log::info!("macOS: Virtual drive mount command issued for {}", mount_point);
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

pub fn unmount_drive(_drive_letter: &str) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("net").args(["use", _drive_letter, "/delete"]).spawn();
    }
    
    #[cfg(target_os = "macos")]
    {
        log::info!("macOS: Attempting to unmount via Finder and diskutil");
        // Try Finder eject first (cleanest)
        let _ = Command::new("osascript")
            .args(["-e", "tell application \"Finder\" to if exists disk \"FoldedCloud\" then eject disk \"FoldedCloud\""])
            .spawn();
        
        let _ = Command::new("osascript")
            .args(["-e", "tell application \"Finder\" to if exists disk \"Folded Cloud\" then eject disk \"Folded Cloud\""])
            .spawn();
        
        let _ = Command::new("osascript")
            .args(["-e", "tell application \"Finder\" to if exists disk \"Folded\" then eject disk \"Folded\""])
            .spawn();
        
        // Fallback: force unmount various possible mount points
        let _ = Command::new("diskutil").args(["unmount", "force", "/Volumes/FoldedCloud"]).spawn();
        let _ = Command::new("diskutil").args(["unmount", "force", "/Volumes/Folded Cloud"]).spawn();
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
    
    #[cfg(not(target_os = "macos"))]
    {
        let _ = enabled;
        log::warn!("Autostart management not yet implemented for this OS");
    }

    Ok(())
}
