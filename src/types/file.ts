export interface FolderInfo {
  id: string;
  name: string;
  parent_id: string | null;
  account_id?: string; // Newly added for the Drive model
  created_at: number;
}

export interface ChunkMeta {
  account_id: string;
  part_index: number;
  message_id: number;
}

export interface FileManifest {
  id: string;
  name: string;
  total_size: number;
  chunk_size: number;
  chunks: ChunkMeta[];
  folder_id: string | null;
  account_id?: string; // Newly added for the Drive model
  is_external: boolean;
  created_at: number;
}

export interface ColumnContent {
  folders: FolderInfo[];
  files: FileManifest[];
}

export type SelectableItem = FolderInfo | FileManifest;

export type ViewCategory = 'FILES' | 'NOTES' | 'PHOTOS' | 'DOCUMENTS' | 'STARRED' | 'SETTINGS' | 'ACCOUNTS';
