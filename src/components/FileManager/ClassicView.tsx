import React from 'react';
import { ColumnContent, SelectableItem, FileManifest } from '../../types/file';
import { isFolder, formatBytes } from '../../utils/fileUtils';
import { Folder, File, FileImage, FileVideo, FileText, RefreshCw, MoreVertical } from 'lucide-react';

interface ClassicViewProps {
  data: ColumnContent;
  selectedItems: Set<string>;
  pendingMoveItems: Set<string>;
  dropTarget: string | null;
  columnIdx: number;
  onItemClick: (item: SelectableItem, columnIdx: number, e: React.MouseEvent) => void;
  onItemDoubleClick: (item: SelectableItem, columnIdx: number) => void;
  onContextMenu: (e: React.MouseEvent, item: SelectableItem | null, columnIdx: number) => void;
  onDragStart: (e: React.DragEvent, item: SelectableItem, columnIdx: number) => void;
  onDragOver: (e: React.DragEvent, item: SelectableItem | null, columnIdx: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, item: SelectableItem | null, columnIdx: number) => void;
  openingFileIds?: Record<string, number>;
}

export const ClassicView: React.FC<ClassicViewProps> = ({
  data,
  selectedItems,
  pendingMoveItems,
  dropTarget,
  columnIdx,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  openingFileIds
}) => {
  if (!data) return null;
  const allItems = [...data.folders, ...data.files];

  const getIcon = (item: SelectableItem, isSelected: boolean) => {
    const isFolderItem = isFolder(item);
    if (!isFolderItem && openingFileIds?.[item.id] !== undefined) {
      return <RefreshCw size={40} className="text-blue-500 animate-spin" strokeWidth={1.5} />;
    }
    if (isFolderItem) return <Folder size={40} className={isSelected ? 'text-blue-600' : 'text-blue-500/80'} fill={isSelected ? 'rgba(37, 99, 235, 0.1)' : 'rgba(59, 130, 246, 0.2)'} strokeWidth={1.5} />;
    
    const name = item.name.toLowerCase();
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return <FileImage size={40} className={isSelected ? 'text-blue-600' : 'text-blue-400'} strokeWidth={1.5} />;
    if (name.match(/\.(mp4|webm|mov)$/)) return <FileVideo size={40} className={isSelected ? 'text-purple-600' : 'text-purple-400'} strokeWidth={1.5} />;
    if (name.match(/\.(txt|md|doc|pdf)$/)) return <FileText size={40} className={isSelected ? 'text-zinc-700' : 'text-zinc-400'} strokeWidth={1.5} />;
    
    return <File size={40} className={isSelected ? 'text-zinc-800' : 'text-zinc-500'} strokeWidth={1.5} />;
  };

  return (
    <div 
      className="flex-1 flex flex-col min-h-0 bg-background overflow-y-auto custom-scrollbar"
      onContextMenu={(e) => onContextMenu(e, null, columnIdx)}
      onDragOver={(e) => onDragOver(e, null, columnIdx)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, null, columnIdx)}
    >
      {allItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 opacity-50">
          <Folder size={48} strokeWidth={1} />
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em]">Directory Empty</p>
        </div>
      ) : (
        <div className="p-8 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-x-4 gap-y-8 items-start">
          {allItems.map((item) => {
            const isSelected = selectedItems.has(item.id);
            const isPending = pendingMoveItems.has(item.id);
            const isTarget = dropTarget === item.id;
            const isDownloading = !isFolder(item) && openingFileIds?.[item.id] !== undefined;
            const downloadProgress = !isFolder(item) ? openingFileIds?.[item.id] : undefined;
            
            return (
              <div
                key={item.id}
                draggable={!isDownloading}
                onDragStart={(e) => onDragStart(e, item, columnIdx)}
                onDragOver={(e) => onDragOver(e, item, columnIdx)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, item, columnIdx)}
                onClick={(e) => { 
                  if (isDownloading) return;
                  e.stopPropagation(); 
                  onItemClick(item, columnIdx, e); 
                }}
                onDoubleClick={() => {
                  if (isDownloading) return;
                  onItemDoubleClick(item, columnIdx);
                }}
                onContextMenu={(e) => { 
                  if (isDownloading) return;
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  onContextMenu(e, item, columnIdx); 
                }}
                className={`
                  group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200 relative
                  ${isSelected ? 'bg-white shadow-2xl scale-105 z-10' : 'hover:bg-zinc-800/40'}
                  ${isTarget ? 'bg-blue-500/20 ring-2 ring-blue-500 ring-inset' : ''}
                  ${isPending ? 'opacity-30' : 'opacity-100'}
                  ${isDownloading ? 'bg-blue-500/5 pointer-events-none' : ''}
                `}
              >
                <div className="relative">
                  {getIcon(item, isSelected)}
                  {item.is_managed && (
                    <div className={`absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 ${isSelected ? 'border-white' : 'border-zinc-950'}`}>
                      <RefreshCw size={8} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center text-center w-full min-w-0">
                  <span className={`text-[11px] font-bold leading-tight break-all line-clamp-2 px-1 ${isSelected ? 'text-black' : 'text-zinc-300'} ${isDownloading ? 'text-blue-400' : ''}`}>
                    {item.name}
                  </span>
                  {!isFolder(item) && (
                    <span className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${isDownloading ? 'text-blue-400' : isSelected ? 'text-zinc-500' : 'text-zinc-600'}`}>
                      {isDownloading && downloadProgress !== undefined
                        ? `Loading: ${downloadProgress}%`
                        : formatBytes((item as FileManifest).total_size)}
                    </span>
                  )}
                </div>

                {/* Selection indicator dots for a more premium feel */}
                {isSelected && !isDownloading && (
                  <div className="absolute top-2 right-2 text-zinc-800">
                    <MoreVertical size={14} />
                  </div>
                )}

                {/* Opening/Downloading progress bar */}
                {isDownloading && downloadProgress !== undefined && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-800/40 rounded-b-2xl overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-150" 
                      style={{ width: `${Math.max(5, downloadProgress)}%` }} 
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
