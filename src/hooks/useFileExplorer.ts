import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { FolderInfo, FileManifest, ColumnContent, SelectableItem } from '../types/file';
import { useAppStore } from '../store/useAppStore';
import { getErrorMessage } from '../utils/errorUtils';

export function useFileExplorer(category?: string) {
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
      if (category && folderId === null) {
        const result = await invoke<[FolderInfo[], FileManifest[]]>('get_category_content', { 
          category,
          accountId: activeAccountId 
        });
        if (!Array.isArray(result)) throw new Error('Invalid response from get_category_content');
        return { folders: result[0] || [], files: result[1] || [] };
      }

      const result = await invoke<[FolderInfo[], FileManifest[]]>('list_folder_content', { 
        folderId,
        accountId: activeAccountId 
      });
      if (!Array.isArray(result)) throw new Error('Invalid response from list_folder_content');
      return { folders: result[0] || [], files: result[1] || [] };
    } catch (e) {
      console.error('Failed to fetch folder content:', getErrorMessage(e));
      return { folders: [], files: [] };
    }
  }, [activeAccountId, category]);

  const initColumns = useCallback(async () => {
    try {
      const rootData = await fetchColumnData(null);
      setColumns([rootData]);
      setPath([null]);
      setSelectedItems(new Set());
    } catch (e) {
      console.error('Failed to initialize columns:', getErrorMessage(e));
    }
  }, [fetchColumnData]);

  const refreshCurrentView = useCallback(async (currentPath: (string | null)[]) => {
    try {
      const newCols = [];
      for (const p of currentPath) {
        newCols.push(await fetchColumnData(p));
      }
      setColumns(newCols);
    } catch (e) {
      console.error('Failed to refresh current view:', getErrorMessage(e));
    }
  }, [fetchColumnData]);

  // Initial load
  useEffect(() => {
    initColumns();
  }, [initColumns, activeAccountId, category]);

  // Auto-refresh when backend reports file tree changes (WebDAV uploads, task completions)
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let isMounted = true;

    listen<{ folder_id: string | null }>('files-changed', () => {
      if (!isMounted) return;
      refreshCurrentView(pathRef.current);
    }).then(fn => {
      if (isMounted) unlisten = fn;
      else fn();
    }).catch(() => {});

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, [refreshCurrentView]);

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
      try {
        // 1. Reconstruct path and columns
        const fullPath: (string | null)[] = [null, ...pathIds];
        const newCols = [];
        for (const p of fullPath) {
          newCols.push(await fetchColumnData(p));
        }
        
        setPath(fullPath);
        setColumns(newCols);
        setSelectedItems(new Set([targetItemId]));
      } catch (e) {
        console.error('Navigation to item failed:', getErrorMessage(e));
      }
    }
  };
}
