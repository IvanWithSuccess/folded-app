import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderInfo, FileManifest, ColumnContent, SelectableItem } from '../types/file';
import { useAppStore } from '../store/useAppStore';

export function useFileExplorer() {
  const { activeAccountId } = useAppStore();
  const [columns, setColumns] = useState<ColumnContent[]>([]);
  const [path, setPath] = useState<(string | null)[]>([null]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const [dragItem, setDragItem] = useState<{ item: SelectableItem; columnIdx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<{ items: SelectableItem[]; mode: 'copy' | 'move' } | null>(null);

  const dragItemRef = useRef(dragItem);
  const dropTargetRef = useRef(dropTarget);
  const pathRef = useRef(path);

  useEffect(() => { dragItemRef.current = dragItem; }, [dragItem]);
  useEffect(() => { dropTargetRef.current = dropTarget; }, [dropTarget]);
  useEffect(() => { pathRef.current = path; }, [path]);

  const fetchColumnData = useCallback(async (folderId: string | null) => {
    try {
      const result = await invoke<[FolderInfo[], FileManifest[]]>('list_folder_content', { 
        folderId,
        accountId: activeAccountId 
      });
      return { folders: result[0], files: result[1] };
    } catch (e) {
      console.error('Failed to fetch folder content:', e);
      return { folders: [], files: [] };
    }
  }, [activeAccountId]);

  const initColumns = useCallback(async () => {
    const rootData = await fetchColumnData(null);
    setColumns([rootData]);
    setPath([null]);
    setSelectedItems(new Set());
  }, [fetchColumnData]);

  const refreshCurrentView = useCallback(async (currentPath: (string | null)[]) => {
    const newCols = [];
    for (const p of currentPath) {
      newCols.push(await fetchColumnData(p));
    }
    setColumns(newCols);
  }, [fetchColumnData]);

  // Initial load
  useEffect(() => {
    initColumns();
  }, [initColumns, activeAccountId]);

  return {
    columns, setColumns,
    path, setPath,
    selectedItems, setSelectedItems,
    dragItem, setDragItem,
    dropTarget, setDropTarget,
    clipboard, setClipboard,
    dragItemRef, dropTargetRef, pathRef,
    refreshCurrentView, initColumns, fetchColumnData,
    navigateToItem: async (accountId: string, pathIds: string[], targetItemId: string) => {
      // 1. Switch account if necessary (handled by store subscription usually, 
      // but we need to ensure the columns refresh for the RIGHT account)
      // The store's activeAccountId is a dependency of fetchColumnData
      
      // 2. Reconstruct path and columns
      const fullPath: (string | null)[] = [null, ...pathIds];
      const newCols = [];
      for (const p of fullPath) {
        newCols.push(await fetchColumnData(p));
      }
      
      setPath(fullPath);
      setColumns(newCols);
      setSelectedItems(new Set([targetItemId]));
    }
  };
}
