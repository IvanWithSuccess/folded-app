use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
use walkdir::WalkDir;

/// Securely overwrites a file with zeroes before deleting it from the filesystem.
pub fn secure_delete_file(path: &Path) -> Result<(), anyhow::Error> {
    if !path.exists() {
        return Ok(());
    }

    let metadata = fs::metadata(path)?;
    let len = metadata.len();

    if len > 0 {
        // Open file with write access
        let mut file = OpenOptions::new().write(true).open(path)?;
        
        // Pass 1: Write zeroes
        let zeroes = vec![0u8; 64 * 1024]; // 64KB chunk buffer
        let mut written = 0u64;
        while written < len {
            let to_write = (len - written).min(zeroes.len() as u64) as usize;
            file.write_all(&zeroes[..to_write])?;
            written += to_write as u64;
        }
        file.sync_all()?;
    }

    // Delete file after shredding
    fs::remove_file(path)?;
    Ok(())
}

/// Recursively shreds all files in a directory and removes the folder structure.
pub fn wipe_directory(dir_path: &Path) -> Result<(), anyhow::Error> {
    if !dir_path.exists() {
        return Ok(());
    }

    for entry in WalkDir::new(dir_path).into_iter().filter_map(|e| e.ok()) {
        let p = entry.path();
        if p.is_file() {
            let _ = secure_delete_file(p);
        }
    }

    let _ = fs::remove_dir_all(dir_path);
    Ok(())
}
