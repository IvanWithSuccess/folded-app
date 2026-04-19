use std::process::Command;
use std::fs;

fn main() {
    let port = 9876;
    let url = format!("http://127.0.0.1:{}", port);
    let mount_point = "/Volumes/Folded";
    
    println!("Testing mount of {} to {}", url, mount_point);
    
    // Cleanup
    let _ = Command::new("diskutil").args(["unmount", "force", mount_point]).status();
    if fs::metadata(mount_point).is_ok() {
        let _ = fs::remove_dir_all(mount_point);
    }
    
    // Try mount_webdav directly for testing
    let _ = fs::create_dir_all(mount_point);
    let status = Command::new("mount_webdav")
        .args(["-S", &url, mount_point])
        .status();
        
    match status {
        Ok(s) => if s.success() { println!("SUCCESS"); } else { println!("FAILED with status: {:?}", s); }
        Err(e) => println!("ERROR: {}", e),
    }
}
