import React from 'react';
import { 
  FolderPlus, Edit3, Trash2, Download, Copy, Scissors, ClipboardPaste, X, ExternalLink, Monitor, Star
} from 'lucide-react';
import { SelectableItem } from '../../types/file';
import { isFolder } from '../../utils/fileUtils';

interface FileContextMenuProps {
  x: number;
  y: number;
  item: SelectableItem | null;
  onClose: () => void;
  onAction: (action: string) => void;
  pendingMove: { items: SelectableItem[]; mode: 'copy' | 'move' } | null;
  defaultOpenMode: 'system' | 'browser';
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  x,
  y,
  item,
  onClose,
  onAction,
  pendingMove,
  defaultOpenMode
}) => {
  const isFolderItem = item ? isFolder(item) : false;

  const actions = [
    { id: 'open', label: 'Open', icon: defaultOpenMode === 'browser' ? <ExternalLink size={14} /> : <Monitor size={14} />, hidden: !item || isFolderItem },
    { id: 'open_browser', label: 'Open in Browser', icon: <ExternalLink size={14} />, hidden: !item || isFolderItem || defaultOpenMode === 'browser' },
    { id: 'open_system', label: 'Open in System App', icon: <Monitor size={14} />, hidden: !item || isFolderItem || defaultOpenMode === 'system' },
    { id: 'newFolder', label: 'New Folder', icon: <FolderPlus size={14} />, hidden: item !== null },
    { id: 'uploadFile', label: 'Upload Files', icon: <Download size={14} className="rotate-180" />, hidden: item !== null },
    { id: 'uploadFolder', label: 'Upload Folder', icon: <FolderPlus size={14} className="opacity-70" />, hidden: item !== null },
    { id: 'rename', label: 'Rename', icon: <Edit3 size={14} />, hidden: !item, disabled: item?.is_managed },
    { id: 'star', label: item?.is_starred ? 'Unstar' : 'Star', icon: <Star size={14} className={item?.is_starred ? 'fill-blue-500 text-blue-500' : ''} />, hidden: !item },
    { id: 'copy', label: 'Copy', icon: <Copy size={14} />, hidden: !item },
    { id: 'move', label: 'Cut (Move)', icon: <Scissors size={14} />, hidden: !item, disabled: item?.is_managed },
    { id: 'paste', label: 'Paste Here', icon: <ClipboardPaste size={14} />, hidden: !pendingMove || item !== null },
    { id: 'pasteInto', label: 'Paste Into', icon: <ClipboardPaste size={14} />, hidden: !pendingMove || !isFolderItem },
    { id: 'cancelMove', label: 'Clear Clipboard', icon: <X size={14} />, hidden: !pendingMove },
    { id: 'download', label: 'Download', icon: <Download size={14} />, hidden: !item || isFolderItem },
    { id: 'downloadTo', label: 'Download To...', icon: <Download size={14} />, hidden: !item },
    { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, hidden: !item, variant: 'danger', disabled: item?.is_managed },
  ].filter(a => !a.hidden);

  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x, y });

  React.useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = x;
      let newY = y;
      
      if (y + rect.height > window.innerHeight) {
        newY = Math.max(10, window.innerHeight - rect.height - 10);
      }
      if (x + rect.width > window.innerWidth) {
        newX = Math.max(10, window.innerWidth - rect.width - 10);
      }
      
      setPos({ x: newX, y: newY });
    }
  }, [x, y]);

  return (
    <>
      {/* Invisible backdrop to catch clicks outside the menu */}
      <div className="fixed inset-0 z-[90]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div 
        ref={menuRef}
        className="fixed z-[100] w-52 bg-[#0c0c0e] border border-zinc-800/80 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        style={{ top: pos.y, left: pos.x }}
      >
        {actions.map((action, idx) => (
          <React.Fragment key={action.id}>
             {(action.id === 'newFolder' || action.id === 'download') && idx > 0 && <div className="h-px bg-zinc-800/50 my-1 mx-2" />}
             <button
              disabled={action.disabled}
              onClick={(e) => { e.stopPropagation(); if (!action.disabled) { onAction(action.id); onClose(); } }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] transition-colors
                ${action.disabled ? 'opacity-30 cursor-not-allowed' : 
                  action.variant === 'danger' ? 'text-red-500 hover:bg-red-500/10' : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-white'}`}
             >
              <span className={action.disabled ? 'text-zinc-600' : action.variant === 'danger' ? 'text-red-500' : 'text-blue-500/60'}>
                {action.icon}
              </span>
              {action.label}
             </button>
          </React.Fragment>
        ))}
      </div>
    </>
  );
};
