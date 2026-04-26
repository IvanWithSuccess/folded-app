export interface FolderInfo {
  id: string;
  name: string;
  parent_id: string | null;
  account_id?: string;
  is_starred: boolean;
  is_managed?: boolean;
  created_at: number;
}

export interface ChunkMeta {
  chunk_id: string;
  account_id: string;
  part_index: number;
  message_id: number;
  size_bytes: number;
}

export interface FileManifest {
  id: string;
  name: string;
  total_size: number;
  chunk_size: number;
  chunks: ChunkMeta[];
  folder_id: string | null;
  account_id?: string;
  is_external: boolean;
  is_starred: boolean;
  is_managed?: boolean;
  created_at: number;
  is_current_version?: boolean;
  version_of?: string | null;
  version_number?: number;
  deleted_at?: number | null;
}

export interface FolderHistoryEvent {
  id: string;
  folder_id: string;
  event_type: string;
  target_name: string;
  target_id?: string | null;
  details?: string | null;
  occurred_at: number;
}

export interface ColumnContent {
  folders: FolderInfo[];
  files: FileManifest[];
}

export type SelectableItem = FolderInfo | FileManifest;

export type ViewCategory = 'FILES' | 'NOTES' | 'PHOTOS' | 'DOCUMENTS' | 'STARRED' | 'SETTINGS' | 'ACCOUNTS' | 'MIRRORS';

export interface PersistentTask {
  id: string;
  task_type: string;
  payload: string;
  status: 'PENDING' | 'RUNNING' | 'FAILED' | 'COMPLETED';
  retries: number;
  error?: string;
  created_at: number;
  updated_at: number;
}
