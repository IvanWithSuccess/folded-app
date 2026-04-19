import React from 'react';
import { 
  FolderPlus, Edit3, Trash2, Download, Copy, Scissors, ClipboardPaste, X 
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
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  x,
  y,
  item,
  onClose,
  onAction,
  pendingMove
}) => {
  const isFolderItem = item ? isFolder(item) : false;

  const actions = [
    { id: 'newFolder', label: 'New Folder', icon: <FolderPlus size={14} />, hidden: item !== null },
    { id: 'rename', label: 'Rename', icon: <Edit3 size={14} />, hidden: !item },
    { id: 'copy', label: 'Copy', icon: <Copy size={14} />, hidden: !item },
    { id: 'move', label: 'Cut (Move)', icon: <Scissors size={14} />, hidden: !item },
    { id: 'paste', label: 'Paste Here', icon: <ClipboardPaste size={14} />, hidden: !pendingMove || item !== null },
    { id: 'pasteInto', label: 'Paste Into', icon: <ClipboardPaste size={14} />, hidden: !pendingMove || !isFolderItem },
    { id: 'cancelMove', label: 'Clear Clipboard', icon: <X size={14} />, hidden: !pendingMove },
    { id: 'download', label: 'Quick Download', icon: <Download size={14} />, hidden: !item || isFolderItem },
    { id: 'downloadTo', label: 'Download To...', icon: <Download size={14} />, hidden: !item },
    { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, hidden: !item, variant: 'danger' },
  ].filter(a => !a.hidden);

  return (
    <div 
      className="fixed z-[100] w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
      onMouseLeave={onClose}
    >
      {actions.map((action, idx) => (
        <React.Fragment key={action.id}>
           {action.id === 'download' && idx > 0 && <div className="h-px bg-zinc-800 my-1 mx-2" />}
           <button
            onClick={() => { onAction(action.id); onClose(); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors
              ${action.variant === 'danger' ? 'text-red-500 hover:bg-red-500/10' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
           >
            {action.icon}
            {action.label}
           </button>
        </React.Fragment>
      ))}
    </div>
  );
};
