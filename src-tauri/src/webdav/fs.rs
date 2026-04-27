use dav_server::fs::{
    DavFileSystem, DavFile, DavMetaData, DavDirEntry, FsFuture, ReadDirMeta, 
    OpenOptions, FsResult, FsError,
};
use dav_server::davpath::DavPath;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use std::io::SeekFrom;
use futures_util::FutureExt;
use bytes::{Bytes, Buf};
use crate::cache::{MetadataCache, FolderInfo};
use crate::session_manager::{SessionManager, TelegramAccount};
use crate::cluster::{ClusterOrchestrator, FileManifest};

#[derive(Clone)]
pub struct ClusterFs {
    pub cache: Arc<MetadataCache>,
    pub orchestrator: Arc<ClusterOrchestrator>,
    pub session_manager: Arc<SessionManager>,
    pub tmp_dir: std::path::PathBuf,
}

#[derive(Debug, Clone)]
enum VirtualEntry {
    Root,
    AccountRoot(TelegramAccount),
    Folder(FolderInfo),
    File(FileManifest),
}

impl ClusterFs {
    fn get_account_display_name(acc: &TelegramAccount) -> String {
        if let Some(username) = &acc.username {
            username.clone()
        } else {
            acc.id.clone()
        }
    }

    async fn resolve_path(&self, path: &DavPath) -> FsResult<VirtualEntry> {
        let url_str = path.as_url_string();
        // Decode URL to handle spaces and special characters
        let decoded_path = urlencoding::decode(&url_str).map(|s| s.into_owned()).unwrap_or(url_str.clone());
        log::debug!("WebDAV: Resolving path: {} (decoded: {})", url_str, decoded_path);
        
        let mut segments: Vec<String> = decoded_path.split('/').filter(|s| !s.is_empty()).map(|s| s.to_string()).collect();
        
        // Trick for macOS Finder naming: 
        // If we mount http://127.0.0.1:9876/FoldedCloud, Finder will name the drive "FoldedCloud".
        // We need to ignore this first segment if it matches our desired display name.
        if segments.get(0).map(|s| s.as_str()) == Some("FoldedCloud") {
            segments.remove(0);
        }
        
        // ... (rest of the logic stays same but using decoded segments)
        if segments.is_empty() {
            return Ok(VirtualEntry::Root);
        }

        let accounts = self.session_manager.get_active_accounts().await;
        let account_display_name = segments[0].clone();
        
        let target_account = accounts.iter().find(|acc| {
            Self::get_account_display_name(acc) == account_display_name
        }).ok_or(FsError::NotFound)?;

        if segments.len() == 1 {
            return Ok(VirtualEntry::AccountRoot(target_account.clone()));
        }

        let mut current_folder_id: Option<String> = None;
        let account_id = &target_account.id;

        for (i, segment) in segments.iter().enumerate().skip(1) {
            let is_last = i == segments.len() - 1;

            let folders = self.cache.get_folders_in(current_folder_id.clone(), Some(account_id.clone())).await
                .map_err(|_| FsError::GeneralFailure)?;
            
            if let Some(folder) = folders.into_iter().find(|f| &f.name == segment) {
                if is_last {
                    return Ok(VirtualEntry::Folder(folder));
                }
                current_folder_id = Some(folder.id);
                continue;
            }

            if is_last {
                let files = self.cache.get_files_in(current_folder_id.clone(), Some(account_id.clone())).await
                    .map_err(|_| FsError::GeneralFailure)?;
                
                if let Some(file) = files.into_iter().find(|f| &f.name == segment) {
                    return Ok(VirtualEntry::File(file));
                }
            }

            return Err(FsError::NotFound);
        }

        Err(FsError::NotFound)
    }
}

impl DavFileSystem for ClusterFs {
    fn open<'a>(&'a self, path: &'a DavPath, options: OpenOptions) -> FsFuture<'a, Box<dyn DavFile>> {
        async move {
            let entry = self.resolve_path(path).await?;

            match entry {
                VirtualEntry::File(manifest) => {
                    if options.write {
                        // Support for overwriting files could be added here, but for now we follow the existing UploadDavFile logic which is mostly for new creations
                        return Err(FsError::Forbidden);
                    }
                    
                    let file = ClusterDavFile {
                        manifest,
                        current_pos: 0,
                        orchestrator: Arc::clone(&self.orchestrator),
                        session_manager: Arc::clone(&self.session_manager),
                        active_chunk_index: None,
                        active_chunk_data: None,
                    };
                    Ok(Box::new(file) as Box<dyn DavFile>)
                }
                VirtualEntry::Root | VirtualEntry::AccountRoot(_) | VirtualEntry::Folder(_) => {
                    // For creating NEW files in a directory
                    if options.create || options.create_new {
                        let name = path.file_name().ok_or(FsError::GeneralFailure)?;
                        let account_id = match &entry {
                            VirtualEntry::AccountRoot(acc) => acc.id.clone(),
                            VirtualEntry::Folder(f) => f.account_id.clone().unwrap_or_default(),
                            _ => return Err(FsError::Forbidden), // Cannot create file at root
                        };
                        
                        let folder_id = match entry {
                            VirtualEntry::Folder(f) => Some(f.id),
                            _ => None,
                        };

                        let temp_path = self.tmp_dir.join(name);
                        let std_file = tokio::fs::OpenOptions::new()
                            .write(true)
                            .create(true)
                            .truncate(true)
                            .open(&temp_path).await
                            .map_err(|_| FsError::GeneralFailure)?;

                        let upload_file = UploadDavFile {
                            name: name.to_string(),
                            temp_path,
                            file: std_file,
                            orchestrator: Arc::clone(&self.orchestrator),
                            session_manager: Arc::clone(&self.session_manager),
                            cache: Arc::clone(&self.cache),
                            account_id,
                            folder_id,
                        };
                        return Ok(Box::new(upload_file) as Box<dyn DavFile>);
                    }
                    Err(FsError::Forbidden)
                }
            }
        }.boxed()
    }

    fn read_dir<'a>(
        &'a self,
        path: &'a DavPath,
        _meta: ReadDirMeta,
    ) -> FsFuture<'a, dav_server::fs::FsStream<Box<dyn DavDirEntry>>> {
        async move {
            let entry = self.resolve_path(path).await?;
            let mut entries: Vec<Box<dyn DavDirEntry>> = Vec::new();

            match entry {
                VirtualEntry::Root => {
                    let accounts = self.session_manager.get_active_accounts().await;
                    for acc in accounts {
                        entries.push(Box::new(AccountDavDirEntry { 
                            name: Self::get_account_display_name(&acc) 
                        }));
                    }
                }
                VirtualEntry::AccountRoot(acc) => {
                    let folders = self.cache.get_folders_in(None, Some(acc.id.clone())).await
                        .map_err(|_| FsError::GeneralFailure)?;
                    let files = self.cache.get_files_in(None, Some(acc.id.clone())).await
                        .map_err(|_| FsError::GeneralFailure)?;
                    
                    for f in folders { entries.push(Box::new(FolderDavDirEntry { folder: f })); }
                    for f in files { entries.push(Box::new(FileDavDirEntry { manifest: f })); }
                }
                VirtualEntry::Folder(folder) => {
                    let account_id = folder.account_id.clone();
                    let folders = self.cache.get_folders_in(Some(folder.id.clone()), account_id.clone()).await
                        .map_err(|_| FsError::GeneralFailure)?;
                    let files = self.cache.get_files_in(Some(folder.id), account_id).await
                        .map_err(|_| FsError::GeneralFailure)?;
                    
                    for f in folders { entries.push(Box::new(FolderDavDirEntry { folder: f })); }
                    for f in files { entries.push(Box::new(FileDavDirEntry { manifest: f })); }
                }
                VirtualEntry::File(_) => return Err(FsError::Forbidden),
            }

            let stream = futures_util::stream::iter(entries);
            Ok(Box::pin(stream) as dav_server::fs::FsStream<Box<dyn DavDirEntry>>)
        }.boxed()
    }

    fn metadata<'a>(&'a self, path: &'a DavPath) -> FsFuture<'a, Box<dyn DavMetaData>> {
        async move {
            let entry = self.resolve_path(path).await?;
            match entry {
                VirtualEntry::Root => {
                    Ok(Box::new(ClusterMetaData { manifest: None, is_dir: true, created_at: 0 }) as Box<dyn DavMetaData>)
                }
                VirtualEntry::AccountRoot(_) => {
                    Ok(Box::new(ClusterMetaData { manifest: None, is_dir: true, created_at: 0 }) as Box<dyn DavMetaData>)
                }
                VirtualEntry::Folder(f) => {
                    Ok(Box::new(ClusterMetaData { manifest: None, is_dir: true, created_at: f.created_at }) as Box<dyn DavMetaData>)
                }
                VirtualEntry::File(m) => {
                    Ok(Box::new(ClusterMetaData { manifest: Some(m.clone()), is_dir: false, created_at: m.created_at }) as Box<dyn DavMetaData>)
                }
            }
        }.boxed()
    }

    fn create_dir<'a>(&'a self, path: &'a DavPath) -> FsFuture<'a, ()> {
        async move {
            if path.as_url_string() == "/" { return Err(FsError::Forbidden); }
            let parent_path = path.parent();
            let name = path.file_name().ok_or(FsError::GeneralFailure)?;
            
            let parent_entry = self.resolve_path(&parent_path).await?;
            let (account_id, folder_id) = match parent_entry {
                VirtualEntry::AccountRoot(acc) => (Some(acc.id), None),
                VirtualEntry::Folder(f) => (f.account_id, Some(f.id)),
                _ => return Err(FsError::Forbidden), // Cannot create directory here
            };
            
            self.cache.create_folder(name.to_string(), folder_id, account_id)
                .await.map_err(|_| FsError::GeneralFailure)?;
            
            Ok(())
        }.boxed()
    }
    
    fn remove_dir<'a>(&'a self, path: &'a DavPath) -> FsFuture<'a, ()> {
        async move {
            let entry = self.resolve_path(path).await?;
            if let VirtualEntry::Folder(folder) = entry {
                // 1. Get all file manifests that need to be deleted from Telegram
                // delete_folder_recursive returns file IDs
                let file_ids = self.cache.delete_folder_recursive(&folder.id)
                    .await.map_err(|_| FsError::GeneralFailure)?;
                
                // 2. Clean up Telegram for each file
                for fid in file_ids {
                    if let Ok(Some(manifest)) = self.cache.get_file_by_id(&fid).await {
                        let _ = self.orchestrator.delete_file(manifest, Arc::clone(&self.session_manager)).await;
                    }
                }
                
                Ok(())
            } else {
                Err(FsError::Forbidden)
            }
        }.boxed()
    }
    
    fn remove_file<'a>(&'a self, path: &'a DavPath) -> FsFuture<'a, ()> {
        async move {
            let entry = self.resolve_path(path).await?;
            if let VirtualEntry::File(manifest) = entry {
                // 1. Delete from Telegram
                self.orchestrator.delete_file(manifest.clone(), Arc::clone(&self.session_manager))
                    .await.map_err(|_| FsError::GeneralFailure)?;
                
                // 2. Delete from local cache
                self.cache.delete_file(&manifest.id)
                    .await.map_err(|_| FsError::GeneralFailure)?;
                
                Ok(())
            } else {
                Err(FsError::Forbidden)
            }
        }.boxed()
    }
    
    fn rename<'a>(&'a self, from: &'a DavPath, to: &'a DavPath) -> FsFuture<'a, ()> {
        async move {
            let from_entry = self.resolve_path(from).await?;
            let to_parent_path = to.parent();
            let to_name = to.file_name().ok_or(FsError::GeneralFailure)?;
            
            let to_parent_entry = self.resolve_path(&to_parent_path).await?;
            let to_folder_id = match to_parent_entry {
                VirtualEntry::AccountRoot(_) => None,
                VirtualEntry::Folder(f) => Some(f.id),
                _ => return Err(FsError::Forbidden),
            };

            match from_entry {
                VirtualEntry::File(manifest) => {
                    // Check if it's a move or just a rename
                    let from_folder_id = manifest.folder_id.clone();
                    if from_folder_id != to_folder_id {
                        self.cache.move_file(&manifest.id, to_folder_id)
                            .await.map_err(|_| FsError::GeneralFailure)?;
                    }
                    if manifest.name != to_name {
                        self.cache.rename_file(&manifest.id, to_name)
                            .await.map_err(|_| FsError::GeneralFailure)?;
                    }
                }
                VirtualEntry::Folder(folder) => {
                    // Check if it's a move or just a rename
                    let from_parent_id = folder.parent_id.clone();
                    if from_parent_id != to_folder_id {
                        self.cache.move_folder(&folder.id, to_folder_id)
                            .await.map_err(|_| FsError::GeneralFailure)?;
                    }
                    if folder.name != to_name {
                        self.cache.rename_folder(&folder.id, to_name)
                            .await.map_err(|_| FsError::GeneralFailure)?;
                    }
                }
                _ => return Err(FsError::Forbidden),
            }

            Ok(())
        }.boxed()
    }
}

// --- Directory Entry Implementations ---

pub struct AccountDavDirEntry {
    name: String,
}

impl DavDirEntry for AccountDavDirEntry {
    fn name(&self) -> Vec<u8> { self.name.as_bytes().to_vec() }
    fn metadata(&self) -> FsFuture<'_, Box<dyn DavMetaData>> {
        async move {
            Ok(Box::new(ClusterMetaData { manifest: None, is_dir: true, created_at: 0 }) as Box<dyn DavMetaData>)
        }.boxed()
    }
}

pub struct FolderDavDirEntry {
    folder: FolderInfo,
}

impl DavDirEntry for FolderDavDirEntry {
    fn name(&self) -> Vec<u8> { self.folder.name.as_bytes().to_vec() }
    fn metadata(&self) -> FsFuture<'_, Box<dyn DavMetaData>> {
        let created_at = self.folder.created_at;
        async move {
            Ok(Box::new(ClusterMetaData { manifest: None, is_dir: true, created_at }) as Box<dyn DavMetaData>)
        }.boxed()
    }
}

pub struct FileDavDirEntry {
    manifest: FileManifest,
}

impl DavDirEntry for FileDavDirEntry {
    fn name(&self) -> Vec<u8> { self.manifest.name.as_bytes().to_vec() }
    fn metadata(&self) -> FsFuture<'_, Box<dyn DavMetaData>> {
        let m = self.manifest.clone();
        async move {
            Ok(Box::new(ClusterMetaData { manifest: Some(m.clone()), is_dir: false, created_at: m.created_at }) as Box<dyn DavMetaData>)
        }.boxed()
    }
}

// --- Metadata Implementation ---

#[derive(Clone, Debug)]
pub struct ClusterMetaData {
    pub manifest: Option<FileManifest>,
    pub is_dir: bool,
    pub created_at: i64,
}

impl DavMetaData for ClusterMetaData {
    fn len(&self) -> u64 { self.manifest.as_ref().map(|m| m.total_size).unwrap_or(0) }
    fn modified(&self) -> FsResult<SystemTime> {
        Ok(UNIX_EPOCH + std::time::Duration::from_secs(self.created_at as u64))
    }
    fn is_dir(&self) -> bool { self.is_dir }
    fn created(&self) -> FsResult<SystemTime> { self.modified() }
}

// --- File Operations (Simplified for brevity, linking to existing ClusterDavFile) ---

#[derive(Debug)]
pub struct ClusterDavFile {
    pub manifest: FileManifest,
    pub current_pos: u64,
    pub orchestrator: Arc<crate::cluster::ClusterOrchestrator>,
    pub session_manager: Arc<SessionManager>,
    pub active_chunk_index: Option<usize>,
    pub active_chunk_data: Option<Vec<u8>>,
}

impl DavFile for ClusterDavFile {
    fn metadata(&mut self) -> FsFuture<'_, Box<dyn DavMetaData>> {
        let m = self.manifest.clone();
        async move {
            Ok(Box::new(ClusterMetaData { manifest: Some(m.clone()), is_dir: false, created_at: m.created_at }) as Box<dyn DavMetaData>)
        }.boxed()
    }

    fn read_bytes(&mut self, count: usize) -> FsFuture<'_, Bytes> {
        async move {
             if self.current_pos >= self.manifest.total_size { return Ok(Bytes::new()); }
             let remaining = (self.manifest.total_size - self.current_pos) as usize;
             let read_count = std::cmp::min(count, remaining);
             let start_chunk = (self.current_pos / self.manifest.chunk_size) as usize;
             let end_chunk = ((self.current_pos + read_count as u64 - 1) / self.manifest.chunk_size) as usize;
             let mut buffer = Vec::with_capacity(read_count);
             let mut virtual_pos = self.current_pos;
             for chunk_idx in start_chunk..=end_chunk {
                 if chunk_idx >= self.manifest.chunks.len() { break; }
                 if self.active_chunk_index != Some(chunk_idx) {
                     let chunk_meta = &self.manifest.chunks[chunk_idx];
                     let chunk_data = self.orchestrator.fetch_single_chunk(chunk_meta, Arc::clone(&self.session_manager)).await
                         .map_err(|_| FsError::GeneralFailure)?;
                     self.active_chunk_index = Some(chunk_idx);
                     self.active_chunk_data = Some(chunk_data);
                 }
                 let chunk_base_offset = chunk_idx as u64 * self.manifest.chunk_size;
                 let offset_in_chunk = (virtual_pos - chunk_base_offset) as usize;
                 let loaded_chunk = self.active_chunk_data.as_ref().unwrap();
                 let bytes_left_in_chunk = loaded_chunk.len().saturating_sub(offset_in_chunk);
                 let bytes_to_copy = std::cmp::min(bytes_left_in_chunk, read_count - buffer.len());
                 buffer.extend_from_slice(&loaded_chunk[offset_in_chunk..offset_in_chunk + bytes_to_copy]);
                 virtual_pos += bytes_to_copy as u64;
                 if buffer.len() >= read_count { break; }
             }
             self.current_pos += buffer.len() as u64;
             Ok(Bytes::copy_from_slice(&buffer))
        }.boxed()
    }

    fn seek(&mut self, pos: SeekFrom) -> FsFuture<'_, u64> {
        async move {
            let new_pos = match pos {
                SeekFrom::Start(s) => s,
                SeekFrom::Current(c) => (self.current_pos as i64 + c).max(0) as u64,
                SeekFrom::End(e) => (self.manifest.total_size as i64 + e).max(0) as u64,
            };
            self.current_pos = new_pos;
            Ok(new_pos)
        }.boxed()
    }

    fn write_buf(&mut self, _buf: Box<dyn Buf + Send>) -> FsFuture<'_, ()> { async move { Err(FsError::Forbidden) }.boxed() }
    fn write_bytes(&mut self, _buf: Bytes) -> FsFuture<'_, ()> { async move { Err(FsError::Forbidden) }.boxed() }
    fn flush(&mut self) -> FsFuture<'_, ()> { async move { Ok(()) }.boxed() }
}

#[derive(Debug)]
pub struct UploadDavFile {
    pub name: String,
    pub temp_path: std::path::PathBuf,
    pub file: tokio::fs::File,
    pub orchestrator: Arc<crate::cluster::ClusterOrchestrator>,
    pub session_manager: Arc<SessionManager>,
    pub cache: Arc<MetadataCache>,
    pub account_id: String,
    pub folder_id: Option<String>,
}

impl DavFile for UploadDavFile {
    fn metadata(&mut self) -> FsFuture<'_, Box<dyn DavMetaData>> { async move { Err(FsError::NotImplemented) }.boxed() }
    fn write_buf(&mut self, mut buf: Box<dyn bytes::Buf + Send>) -> FsFuture<'_, ()> {
        async move {
            use tokio::io::AsyncWriteExt;
            while buf.has_remaining() {
                let chunk = buf.chunk();
                self.file.write_all(chunk).await.map_err(|_| FsError::GeneralFailure)?;
                buf.advance(chunk.len());
            }
            Ok(())
        }.boxed()
    }
    fn write_bytes(&mut self, buf: bytes::Bytes) -> FsFuture<'_, ()> {
        async move { 
            use tokio::io::AsyncWriteExt;
            self.file.write_all(&buf).await.map_err(|_| FsError::GeneralFailure)?;
            Ok(()) 
        }.boxed()
    }
    fn read_bytes(&mut self, _count: usize) -> FsFuture<'_, Bytes> { async move { Err(FsError::NotImplemented) }.boxed() }
    fn seek(&mut self, _pos: SeekFrom) -> FsFuture<'_, u64> { async move { Err(FsError::NotImplemented) }.boxed() }
    fn flush(&mut self) -> FsFuture<'_, ()> {
        let orchestrator = Arc::clone(&self.orchestrator);
        let session_manager = Arc::clone(&self.session_manager);
        let cache = Arc::clone(&self.cache);
        let temp_path = self.temp_path.clone();
        let name = self.name.clone();
        let aid = self.account_id.clone();
        let fid = self.folder_id.clone();
        
        async move {
            use tokio::io::AsyncWriteExt;
            self.file.flush().await.map_err(|_| FsError::GeneralFailure)?;
            tokio::spawn(async move {
                let manifest_res = orchestrator.upload_file(temp_path.clone(), session_manager, Arc::clone(&cache), name, None, fid, aid, None, None).await;
                if let Ok(manifest) = manifest_res { let _ = cache.save_file(manifest).await; }
                let _ = tokio::fs::remove_file(temp_path).await;
            });
            Ok(())
        }.boxed()
    }
}
