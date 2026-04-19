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

interface FileManagerProps {
  category?: string;
}

export const FileManager: React.FC<FileManagerProps> = ({ category }) => {
  const { activeAccountId, isSyncing, setIsSyncing } = useAppStore();
  const explorer = useFileExplorer();
  const [searchQuery, setSearchQuery] = useState('');
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

  // Auto-refresh when background sync finishes
  useEffect(() => {
    if (prevSyncing.current && !isSyncing) {
      explorer.refreshCurrentView(explorer.path);
    }
    prevSyncing.current = isSyncing;
  }, [isSyncing]);

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

  const handleItemDoubleClick = async (item: SelectableItem) => {
    if (isFolder(item)) return; // folders open on single click
    
    // Smooth opening logic:
    // If it's a media file or large (+10MB), stream it via WebDAV for "instant" play/view.
    // Otherwise, do a silent download to tmp.
    
    const isStreamable = item.name.toLowerCase().match(/\.(mp4|mkv|mp3|wav|mov|pdf)$/i) || item.total_size > 10 * 1024 * 1024;

    try {
      // Reverted to reliable native opening via tmp download
      const tmpPath = await invoke<string>('cluster_download_to_tmp', { fileId: item.id });
      await invoke('open_system_file', { path: tmpPath });
    } catch (e) {
      console.error('Open failed:', e);
      alert('Failed to open file: ' + e);
    }
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

      <div className="flex-1 flex overflow-x-auto overflow-y-hidden custom-scrollbar bg-zinc-950">
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
          onClose={() => setMenu(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
};
