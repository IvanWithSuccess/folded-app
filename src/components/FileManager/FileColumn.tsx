import React from 'react';
import { ColumnContent, SelectableItem } from '../../types/file';
import { FileItem } from './FileItem';
import { isFolder } from '../../utils/fileUtils';

interface FileColumnProps {
  columnIdx: number;
  data: ColumnContent;
  selectedItems: Set<string>;
  path: (string | null)[];
  pendingMoveItems: Set<string>;
  dropTarget: string | null;
  onItemClick: (item: SelectableItem, columnIdx: number, e: React.MouseEvent) => void;
  onItemDoubleClick: (item: SelectableItem) => void;
  onContextMenu: (e: React.MouseEvent, item: SelectableItem | null, columnIdx: number) => void;
  onDragStart: (e: React.DragEvent, item: SelectableItem, columnIdx: number) => void;
  onDragOver: (e: React.DragEvent, item: SelectableItem | null, columnIdx: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, item: SelectableItem | null, columnIdx: number) => void;
}

export const FileColumn: React.FC<FileColumnProps> = ({
  columnIdx,
  data,
  selectedItems,
  path,
  pendingMoveItems,
  dropTarget,
  onItemClick,
  onItemDoubleClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const currentPathId = path[columnIdx];

  return (
    <div 
      className={`flex-none w-[260px] border-r border-zinc-800 flex flex-col h-full bg-zinc-950/20 relative
        ${dropTarget === (currentPathId || 'root') ? 'bg-blue-500/5' : ''}`}
      onDragOver={(e) => onDragOver(e, null, columnIdx)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, null, columnIdx)}
      onContextMenu={(e) => onContextMenu(e, null, columnIdx)}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-2">
          {data.folders.length === 0 && data.files.length === 0 && (
            <p className="px-5 py-3 text-[10px] italic text-zinc-700 text-center mt-2">Empty folder</p>
          )}

          {data.folders.map(folder => (
            <FileItem 
              key={folder.id}
              item={folder}
              columnIdx={columnIdx}
              isSelected={selectedItems.has(folder.id)}
              isPendingMove={pendingMoveItems.has(folder.id)}
              isDragTarget={dropTarget === folder.id}
              onClick={(e) => onItemClick(folder, columnIdx, e)}
              onDoubleClick={() => onItemDoubleClick(folder)}
              onContextMenu={(e) => onContextMenu(e, folder, columnIdx)}
              onDragStart={(e) => onDragStart(e, folder, columnIdx)}
              onDragOver={(e) => onDragOver(e, folder, columnIdx)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, folder, columnIdx)}
            />
          ))}

          {data.files.map(file => (
            <FileItem 
              key={file.id}
              item={file}
              columnIdx={columnIdx}
              isSelected={selectedItems.has(file.id)}
              isPendingMove={pendingMoveItems.has(file.id)}
              isDragTarget={false}
              onClick={(e) => onItemClick(file, columnIdx, e)}
              onDoubleClick={() => onItemDoubleClick(file)}
              onContextMenu={(e) => onContextMenu(e, file, columnIdx)}
              onDragStart={(e) => onDragStart(e, file, columnIdx)}
              onDragOver={(e) => onDragOver(e, file, columnIdx)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, file, columnIdx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
