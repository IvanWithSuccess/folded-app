import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store/useAppStore';
import { useFileExplorer } from '../../hooks/useFileExplorer';
import { useFileActions } from '../../hooks/useFileActions';
import { isFolder } from '../../utils/fileUtils';
import { SelectableItem, FileManifest } from '../../types/file';

// Sub-components
import { FileTopbar } from './FileTopbar';
import { FileColumn } from './FileColumn';
import { FileInspector } from './FileInspector';
import { FileModals } from './FileModals';
import { FileContextMenu } from './FileContextMenu';
import { ErrorBoundary } from '../ErrorBoundary';

import { SearchResults } from './SearchResults';

interface FileManagerProps {
  category?: string;
}

export const FileManager: React.FC<FileManagerProps> = ({ category }) => {
  const { activeAccountId, setActiveAccount, accounts, isSyncing, setIsSyncing } = useAppStore();
  const explorer = useFileExplorer();
  const [defaultOpenMode, setDefaultOpenMode] = useState<'system' | 'browser'>('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileManifest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inspectItem, setInspectItem] = useState<SelectableItem | null>(null);
  const prevSyncing = useRef(false);
  
  // Modal states
  const [activeModal, setActiveModal] = useState<'newFolder' | 'rename' | 'delete' | 'conflict' | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [targetItem, setTargetItem] = useState<SelectableItem | null>(null);

  // Context Menu state
  const [menu, setMenu] = useState<{ x: number, y: number, item: SelectableItem | null, colIdx: number } | null>(null);

  // Sorted columns ref for shift-select
  const lastClickedItem = useRef<{ id: string; colIdx: number } | null>(null);

  const actions = useFileActions({
    activeDriveId: activeAccountId,
    refresh: explorer.refreshCurrentView,
    path: explorer.path,
    setIsLoading: setIsSyncing
  });

  // Global Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await invoke<FileManifest[]>('global_search', { query: searchQuery });
        setSearchResults(results);
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleReveal = async (item: FileManifest) => {
    try {
      // 1. Get the path IDs from backend
      const pathIds = await invoke<string[]>('get_item_path', { itemId: item.id });
      
      // 2. Clear Search
      setSearchQuery('');
      
      // 3. Switch Account in Store (Sidebar will update)
      if (item.account_id && item.account_id !== activeAccountId) {
        setActiveAccount(item.account_id!);
      }
      
      // 4. Navigate Explorer
      await explorer.navigateToItem(item.account_id || '', pathIds, item.id);
      
      // 5. Inspect the revealed item
      setInspectItem(item as SelectableItem);
    } catch (e) {
      console.error('Reveal failed:', e);
      alert('Failed to reveal file location');
    }
  };

  // Auto-refresh when background sync finishes
  useEffect(() => {
    if (prevSyncing.current && !isSyncing) {
      explorer.refreshCurrentView(explorer.path);
    }
    prevSyncing.current = isSyncing;
  }, [isSyncing]);
  
  useEffect(() => {
    const loadDefaultMode = async () => {
      const mode = await invoke<string | null>('get_setting', { key: 'default_open_mode' });
      if (mode === 'browser') setDefaultOpenMode('browser');
      else setDefaultOpenMode('system');
    };
    loadDefaultMode();
  }, []);

  // --- Handlers ---

  const handleItemClick = (item: SelectableItem, colIdx: number, e?: React.MouseEvent) => {
    // Cmd/Ctrl = toggle individual item
    if (e?.metaKey || e?.ctrlKey) {
      const next = new Set(explorer.selectedItems);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      explorer.setSelectedItems(next);
      lastClickedItem.current = { id: item.id, colIdx };
      return;
    }

    // Shift = range select within same column
    if (e?.shiftKey && lastClickedItem.current?.colIdx === colIdx) {
      const col = explorer.columns[colIdx];
      const allItems = [...col.folders, ...col.files];
      const lastIdx = allItems.findIndex(i => i.id === lastClickedItem.current!.id);
      const currIdx = allItems.findIndex(i => i.id === item.id);
      if (lastIdx !== -1 && currIdx !== -1) {
        const [start, end] = [Math.min(lastIdx, currIdx), Math.max(lastIdx, currIdx)];
        const rangeIds = allItems.slice(start, end + 1).map(i => i.id);
        explorer.setSelectedItems(new Set([...explorer.selectedItems, ...rangeIds]));
        return;
      }
    }

    // Normal single click
    explorer.setSelectedItems(new Set([item.id]));
    lastClickedItem.current = { id: item.id, colIdx };
    setInspectItem(item);
    
    if (isFolder(item)) {
      const newPath = [...explorer.path.slice(0, colIdx + 1), item.id];
      explorer.setPath(newPath);
      explorer.refreshCurrentView(newPath);
    } else {
      explorer.setPath(explorer.path.slice(0, colIdx + 1));
    }
  };
  
  const constructWebDavUrl = (item: SelectableItem, colIdx: number) => {
    const activeAccount = accounts.find(a => a.id === activeAccountId);
    if (!activeAccount) return null;

    const accountName = activeAccount.username || activeAccount.id;
    let urlPath = [encodeURIComponent(accountName)];

    for (let i = 1; i <= colIdx; i++) {
      const folderId = explorer.path[i];
      const folder = explorer.columns[i - 1].folders.find(f => f.id === folderId);
      if (folder) {
        urlPath.push(encodeURIComponent(folder.name));
      }
    }

    urlPath.push(encodeURIComponent(item.name));
    return `http://localhost:9876/${urlPath.join('/')}`;
  };

  const handleOpenFile = async (item: SelectableItem, colIdx: number, modeOverride?: 'system' | 'browser') => {
    if (isFolder(item)) return;
    
    const mode = modeOverride || defaultOpenMode;
    
    if (mode === 'browser') {
      const url = constructWebDavUrl(item, colIdx);
      if (url) {
        // Open browser URL via backend open_system_file which normally uses shell::open
        try {
          await invoke('open_system_file', { path: url });
        } catch (e) {
          console.error('Failed to open browser URL:', e);
          alert('Failed to open file in browser: ' + e);
        }
      }
    } else {
      // System opening
      try {
        const tmpPath = await invoke<string>('cluster_download_to_tmp', { fileId: item.id });
        await invoke('open_system_file', { path: tmpPath });
      } catch (e) {
        console.error('Open failed:', e);
        alert('Failed to open file: ' + e);
      }
    }
  };

  const handleItemDoubleClick = async (item: SelectableItem, colIdx: number) => {
    handleOpenFile(item, colIdx);
  };


  const handleContextMenu = (e: React.MouseEvent, item: SelectableItem | null, colIdx: number) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, item, colIdx });
    if (item) {
      // Don't override multi-selection if item is already part of it
      if (!explorer.selectedItems.has(item.id)) {
        explorer.setSelectedItems(new Set([item.id]));
      }
    }
  };

  const handleAction = (actionId: string) => {
    const item = menu?.item;
    setTargetItem(item || null);

    switch (actionId) {
      case 'open_browser':
        if (item) handleOpenFile(item, menu!.colIdx, 'browser');
        break;
      case 'open_system':
        if (item) handleOpenFile(item, menu!.colIdx, 'system');
        break;
      case 'newFolder':
        setModalInput('');
        setActiveModal('newFolder');
        break;
      case 'rename':
        if (item) {
          setModalInput(item.name);
          setActiveModal('rename');
        }
        break;
      case 'delete':
        if (item) setActiveModal('delete');
        break;
      case 'copy':
      case 'move':
        if (item) {
          const items = explorer.selectedItems.size > 1
            ? [...explorer.columns.flatMap(c => [...c.folders, ...c.files])].filter(i => explorer.selectedItems.has(i.id))
            : [item];
          explorer.setClipboard({ items, mode: actionId });
        }
        break;
      case 'paste':
      case 'pasteInto':
        if (explorer.clipboard) {
          const targetId = actionId === 'pasteInto' && item && isFolder(item) ? item.id : explorer.path[menu?.colIdx || 0];
          actions.handlePasteItems(explorer.clipboard.items, targetId, explorer.clipboard.mode);
          if (explorer.clipboard.mode === 'move') {
            explorer.setClipboard(null);
          }
        }
        break;
      case 'cancelMove':
        explorer.setClipboard(null);
        break;
      case 'download':
        if (item) actions.handleDownload(item);
        break;
      case 'downloadTo':
        if (item) {
           const items = explorer.selectedItems.size > 1
             ? [...explorer.columns.flatMap(c => [...c.folders, ...c.files])].filter(i => explorer.selectedItems.has(i.id))
             : [item];
           actions.handleDownloadToSpecificPath(items);
        }
        break;
    }
  };

  const handleConfirmModal = () => {
    if (activeModal === 'newFolder') {
      const parentId = explorer.path[menu ? menu.colIdx : explorer.path.length - 1];
      actions.handleCreateFolder(modalInput, parentId);
    } else if (activeModal === 'rename' && targetItem) {
      actions.handleRename(targetItem, modalInput);
    } else if (activeModal === 'delete' && targetItem) {
      actions.handleDelete(targetItem);
      if (inspectItem?.id === targetItem.id) setInspectItem(null);
    }
    setActiveModal(null);
  };

  const handleUploadFileDesktop = (isDir: boolean) => {
    const parentId = explorer.path[explorer.path.length - 1];
    actions.handleUploadFile(parentId, isDir);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full" onClick={() => setMenu(null)}>
      <FileTopbar 
        path={explorer.path}
        columns={explorer.columns}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSync={actions.handleSync}
        isSyncing={isSyncing}
        onNavigateToBreadcrumb={(idx) => {
          const newPath = explorer.path.slice(0, idx + 1);
          explorer.setPath(newPath);
          explorer.refreshCurrentView(newPath);
        }}
        onCreateFolder={() => { setTargetItem(null); setActiveModal('newFolder'); }}
        onUploadFile={() => handleUploadFileDesktop(false)}
        onUploadFolder={() => handleUploadFileDesktop(true)}
      />

      <div className="flex-1 flex overflow-hidden bg-zinc-950">
        {searchQuery.trim() ? (
          <SearchResults 
            results={searchResults} 
            isLoading={isSearching} 
            onReveal={handleReveal} 
          />
        ) : (
          <div className="flex-1 flex overflow-x-auto overflow-y-hidden custom-scrollbar">
            {explorer.columns.map((col, idx) => (
              <FileColumn 
                key={`${idx}-${explorer.path[idx]}`}
                columnIdx={idx}
                data={col}
                selectedItems={explorer.selectedItems}
                path={explorer.path}
                pendingMoveItems={new Set(explorer.clipboard?.mode === 'move' ? explorer.clipboard.items.map(i => i.id) : [])}
                dropTarget={explorer.dropTarget}
                onItemClick={(item, colIdx, e) => handleItemClick(item, colIdx, e)}
                onItemDoubleClick={handleItemDoubleClick}
                onContextMenu={handleContextMenu}
                onDragStart={(e, item) => explorer.setDragItem({ item, columnIdx: idx })}
                onDragOver={(e, item) => explorer.setDropTarget(item?.id || explorer.path[idx])}
                onDragLeave={() => explorer.setDropTarget(null)}
                onDrop={() => {}} // Internal D&D can be added here
              />
            ))}
          </div>
        )}

        {inspectItem && (
          <ErrorBoundary name="FileInspector">
            <FileInspector 
              item={inspectItem}
              onClose={() => setInspectItem(null)}
              onDownload={actions.handleDownload}
              onDelete={actions.handleDelete}
            />
          </ErrorBoundary>
        )}
      </div>

      <FileModals 
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        inputValue={modalInput}
        setInputValue={setModalInput}
        onConfirm={handleConfirmModal}
      />

      {menu && (
        <FileContextMenu 
          x={menu.x}
          y={menu.y}
          item={menu.item}
          pendingMove={explorer.clipboard}
          defaultOpenMode={defaultOpenMode}
          onClose={() => setMenu(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
};
