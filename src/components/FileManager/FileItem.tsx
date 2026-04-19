import React from 'react';
import { Folder, File, FileImage, FileVideo, FileText, ChevronRight } from 'lucide-react';
import { SelectableItem, FolderInfo, FileManifest } from '../../types/file';
import { isFolder, formatBytes } from '../../utils/fileUtils';

interface FileItemProps {
  item: SelectableItem;
  isSelected: boolean;
  isPendingMove: boolean;
  isDragTarget: boolean;
  columnIdx: number;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  item,
  isSelected,
  isPendingMove,
  isDragTarget,
  columnIdx,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const isFolderItem = isFolder(item);
  
  const getIcon = () => {
    if (isFolderItem) return <Folder size={16} className={isSelected ? 'text-white' : 'text-zinc-500'} fill={isSelected ? 'white' : 'transparent'} />;
    
    // File icon based on extension
    const name = item.name.toLowerCase();
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return <FileImage size={16} className={isSelected ? 'text-white' : 'text-blue-400'} />;
    if (name.match(/\.(mp4|webm|mov)$/)) return <FileVideo size={16} className={isSelected ? 'text-white' : 'text-purple-400'} />;
    if (name.match(/\.(txt|md|doc|pdf)$/)) return <FileText size={16} className={isSelected ? 'text-white' : 'text-zinc-400'} />;
    
    return <File size={16} className={isSelected ? 'text-white' : 'text-zinc-500'} />;
  };

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e); }}
      className={`
        group flex items-center gap-3 px-3 py-2 cursor-default select-none transition-all duration-75 relative
        ${isSelected ? 'bg-white shadow-lg z-10' : 'hover:bg-zinc-800/30'}
        ${isDragTarget ? 'bg-blue-500/20 ring-2 ring-blue-500 ring-inset' : ''}
        ${isPendingMove ? 'opacity-40' : 'opacity-100'}
      `}
    >
      <div className="shrink-0">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col">
        <span className={`text-[12px] font-medium truncate ${isSelected ? 'text-black' : 'text-zinc-300'}`}>
          {item.name}
        </span>
        {!isFolderItem && (
          <span className={`text-[9px] font-bold uppercase tracking-tighter ${isSelected ? 'text-zinc-600' : 'text-zinc-600'}`}>
            {formatBytes((item as FileManifest).total_size)}
          </span>
        )}
      </div>

      {isFolderItem && (
        <ChevronRight size={14} className={`${isSelected ? 'text-black' : 'text-zinc-700'} group-hover:text-zinc-400`} />
      )}
      
      {/* Pending status highlight */}
      {isPendingMove && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[8px] font-black uppercase tracking-widest border border-zinc-700">
          In Transit
        </div>
      )}
    </div>
  );
};
