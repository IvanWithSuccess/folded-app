import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { SelectableItem, FileManifest, FolderInfo } from '../types/file';
import { isFolder } from '../utils/fileUtils';

interface UseFileActionsProps {
  activeDriveId: string | null;
  refresh: (path: (string | null)[]) => Promise<void>;
  path: (string | null)[];
  setIsLoading: (loading: boolean) => void;
}

export function useFileActions({ activeDriveId, refresh, path, setIsLoading }: UseFileActionsProps) {
  
  const handleSync = useCallback(async () => {
    if (!activeDriveId) return;
    setIsLoading(true);
    try {
      // 1. Push current local state to cloud first (to avoid losing local unsynced changes)
      await invoke('push_manifest', { accountId: activeDriveId });
      // 2. Re-index messages (find new external files/notes)
      await invoke('sync_account', { accountId: activeDriveId });
      // 3. Pull the latest master manifest
      await invoke('pull_manifest', { accountId: activeDriveId });
      await refresh(path);
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeDriveId, path, refresh, setIsLoading]);

  const handleCreateFolder = useCallback(async (name: string, parentId: string | null) => {
    try {
      await invoke('create_folder', { 
        name, 
        parentId,
        accountId: activeDriveId 
      });
      await invoke('push_manifest', { accountId: activeDriveId });
      await refresh(path);
    } catch (e) {
      alert('Failed to create folder: ' + e);
    }
  }, [activeDriveId, path, refresh]);

  const handleRename = useCallback(async (item: SelectableItem, newName: string) => {
    try {
      await invoke('rename_item', { 
        itemId: item.id, 
        newName,
        itemType: isFolder(item) ? 'folder' : 'file'
      });
      await invoke('push_manifest', { accountId: activeDriveId });
      await refresh(path);
    } catch (e) {
      alert('Rename failed: ' + e);
    }
  }, [path, refresh]);

  const handleDelete = useCallback(async (items: SelectableItem[]) => {
    setIsLoading(true);
    try {
      for (const item of items) {
        if (isFolder(item)) {
          await invoke('delete_folder', { folderId: item.id });
        } else {
          await invoke('cluster_delete_file', { fileId: item.id });
        }
      }
      await invoke('push_manifest', { accountId: activeDriveId });
      await refresh(path);
    } catch (e) {
      alert('Delete failed: ' + e);
    } finally {
      setIsLoading(false);
    }
  }, [activeDriveId, path, refresh, setIsLoading]);

  const handleDownload = useCallback(async (item: SelectableItem) => {
    if (isFolder(item)) return;
    try {
      const dest = await open({ 
        directory: true,
        title: 'Choose download location'
      });
      if (!dest) return;
      const destPath = typeof dest === 'string' 
        ? `${dest}/${item.name}` 
        : `${(dest as any).path}/${item.name}`;
      await invoke('cluster_download_file', { 
        fileId: item.id, 
        destPath
      });
    } catch (e) {
      alert('Download failed: ' + e);
    }
  }, []);

  const handlePasteItems = useCallback(async (items: SelectableItem[], targetFolderId: string | null, mode: 'move' | 'copy') => {
    setIsLoading(true);
    try {
      for (const item of items) {
        if (mode === 'move') {
          await invoke('move_item', { 
            itemId: item.id,
            newParentId: targetFolderId,
            itemType: isFolder(item) ? 'folder' : 'file'
          });
        } else {
          await invoke('copy_item', { 
            itemId: item.id,
            newParentId: targetFolderId,
            itemType: isFolder(item) ? 'folder' : 'file'
          });
        }
      }
      await invoke('push_manifest', { accountId: activeDriveId });
      await refresh(path);
    } catch (e) {
      alert(`${mode === 'move' ? 'Move' : 'Copy'} failed: ` + e);
    } finally {
      setIsLoading(false);
    }
  }, [activeDriveId, path, refresh, setIsLoading]);

  const handleDownloadToSpecificPath = useCallback(async (items: SelectableItem[]) => {
    try {
      const dest = await open({ 
        directory: true,
        title: 'Choose Destination Folder'
      });
      if (!dest) return;
      const targetPath = typeof dest === 'string' ? dest : (dest as any).path;

      setIsLoading(true);
      await invoke('download_items_to_path', {
        itemIds: items.map(i => i.id),
        itemTypes: items.map(i => isFolder(i) ? 'folder' : 'file'),
        targetPath
      });
    } catch (e) {
      alert('Download failed: ' + e);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  const handleUploadFile = useCallback(async (parentId: string | null, isDirectory: boolean) => {
    if (!activeDriveId) return;
    try {
      const selected = await open({
        multiple: !isDirectory,
        directory: isDirectory,
        title: isDirectory ? 'Select folder to upload' : 'Select files to upload'
      });
      if (!selected) return;

      const paths = Array.isArray(selected) ? selected : [selected];
      setIsLoading(true);

      for (const filePath of paths) {
        const p = typeof filePath === 'string' ? filePath : (filePath as any).path;
        if (isDirectory) {
          await invoke('upload_directory', {
            directoryPath: p,
            targetParentId: parentId,
            accountId: activeDriveId
          });
        } else {
          await invoke('cluster_upload_file', {
            filePath: p,
            folderId: parentId,
            accountId: activeDriveId
          });
        }
      }
      await invoke('push_manifest', { accountId: activeDriveId });
      await refresh(path);
    } catch (e) {
      alert('Upload failed: ' + e);
    } finally {
      setIsLoading(false);
    }
  }, [activeDriveId, path, refresh, setIsLoading]);

  const handleToggleStarred = useCallback(async (item: SelectableItem) => {
    try {
      await invoke('toggle_item_starred', {
        id: item.id,
        itemType: isFolder(item) ? 'folder' : 'file',
        starred: !item.is_starred
      });
      await invoke('push_manifest', { accountId: activeDriveId });
      await refresh(path);
    } catch (e) {
      alert('Failed to toggle starred: ' + e);
    }
  }, [activeDriveId, path, refresh]);

  const handleDeleteWithVersions = useCallback(async (file: FileManifest) => {
    setIsLoading(true);
    try {
      await invoke('delete_file_with_all_versions', { fileId: file.id });
      await invoke('push_manifest', { accountId: activeDriveId });
      await refresh(path);
    } catch (e) {
      alert('Delete with versions failed: ' + e);
    } finally {
      setIsLoading(false);
    }
  }, [activeDriveId, path, refresh, setIsLoading]);

  return {
    handleSync,
    handleCreateFolder,
    handleRename,
    handleDelete,
    handleDeleteWithVersions,
    handleDownload,
    handlePasteItems,
    handleDownloadToSpecificPath,
    handleUploadFile,
    handleToggleStarred
  };
}
