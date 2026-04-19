use std::process::Command;
use anyhow::{Result, anyhow};
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
        let url = format!("http://localhost:{}", port);
        let mount_point = "/Volumes/Folded";
        
        log::info!("macOS: Attempting to unmount any existing volume at {}", mount_point);
        // Ensure mount point doesn't exist or is unmounted first
        let _ = Command::new("diskutil").args(["unmount", "force", mount_point]).status();
        
        if fs::metadata(mount_point).is_ok() {
            log::info!("macOS: Stale mount point directory detected, removing: {}", mount_point);
            let _ = fs::remove_dir_all(mount_point);
        }

        log::info!("macOS: Mounting WebDAV volume: {}", url);
        // Use osascript to mount volume via Finder (more robust/user-friendly)
        let status = Command::new("osascript")
            .args(["-e", &format!("tell application \"Finder\" to mount volume \"{}\"", url)])
            .status()?;
            
        if !status.success() {
            log::warn!("macOS: Finder mount failed, falling back to mount_webdav");
            let _ = fs::create_dir_all(mount_point);
            let status = Command::new("mount_webdav")
                .args(["-S", &url, mount_point])
                .status()?;
                
            if !status.success() {
                log::error!("macOS: Both Finder and mount_webdav failed");
                return Err(anyhow!("Failed to mount drive on macOS"));
            }
        }
        log::info!("macOS: Virtual drive mounted successfully at {}", mount_point);
    }

    #[cfg(target_os = "linux")]
    {
        let url = format!("dav://localhost:{}", port);
        // Using gvfs-mount (gio mount) for Linux desktop integration
        let status = Command::new("gio")
            .args(["mount", &url])
            .status()?;
            
        if !status.success() {
            return Err(anyhow!("Failed to mount drive using 'gio mount'"));
        }
    }

    Ok(())
}

pub fn unmount_drive(_drive_letter: &str) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        Command::new("net").args(["use", drive_letter, "/delete"]).status()?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("diskutil").args(["unmount", "/Volumes/Folded"]).status()?;
    }

    Ok(())
}
