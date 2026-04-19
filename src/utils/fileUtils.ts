import { SelectableItem, FolderInfo, FileManifest } from '../types/file';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function isFolder(item: SelectableItem): item is FolderInfo {
  return 'parent_id' in item;
}

export function isFile(item: SelectableItem): item is FileManifest {
  return 'chunks' in item;
}

