import React, { useState } from 'react';
import { FileManifest, SelectableItem } from '../../types/file';
import { formatBytes, isFile } from '../../utils/fileUtils';
import { File, Calendar, Shield, Share2, Download, Trash2, X, FileText, ImageIcon, Video, Music, Archive, FileQuestion } from 'lucide-react';
import { ShareModal } from './ShareModal';

interface FileInspectorProps {
  item: SelectableItem | null;
  onClose: () => void;
  onDownload: (item: SelectableItem) => void;
  onDelete: (item: SelectableItem) => void;
}

const getFileCategory = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: Archive, label: ext.toUpperCase(), color: 'from-orange-500/20 to-orange-500/5', text: 'text-orange-500', border: 'border-orange-500/20' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return { icon: ImageIcon, label: ext.toUpperCase(), color: 'from-cyan-500/20 to-cyan-500/5', text: 'text-cyan-500', border: 'border-cyan-500/20' };
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return { icon: Video, label: ext.toUpperCase(), color: 'from-purple-500/20 to-purple-500/5', text: 'text-purple-500', border: 'border-purple-500/20' };
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'epub'].includes(ext)) return { icon: FileText, label: ext.toUpperCase(), color: 'from-rose-500/20 to-rose-500/5', text: 'text-rose-500', border: 'border-rose-500/20' };
  if (['mp3', 'wav', 'flac', 'm4a'].includes(ext)) return { icon: Music, label: ext.toUpperCase(), color: 'from-lime-500/20 to-lime-500/5', text: 'text-lime-500', border: 'border-lime-500/20' };
  
  return { icon: File, label: ext.toUpperCase() || 'FILE', color: 'from-zinc-500/20 to-zinc-500/5', text: 'text-zinc-500', border: 'border-zinc-500/20' };
};

export const FileInspector: React.FC<FileInspectorProps> = ({
  item,
  onClose,
  onDownload,
  onDelete
}) => {
  const [showShare, setShowShare] = useState(false);

  if (!item) return null;

  const isFileItem = isFile(item);
  const category = getFileCategory(item.name);
  const CategoryIcon = category.icon;

  return (
    <div className="w-[320px] h-full border-l border-zinc-800 flex flex-col bg-zinc-950/40 relative animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-900 bg-zinc-950/20">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Inspector</span>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Preview Replacement - Format Badge */}
        <div className={`aspect-square rounded-2xl mb-6 flex flex-col items-center justify-center overflow-hidden border ${category.border} bg-gradient-to-br ${category.color} shadow-2xl relative group`}>
          {/* Decorative background icon */}
          <CategoryIcon size={120} className={`absolute opacity-[0.03] -bottom-4 -right-4 rotate-12 transition-transform duration-500 group-hover:scale-110 ${category.text}`} strokeWidth={1} />
          
          <div className="relative flex flex-col items-center gap-4">
            <div className={`p-4 rounded-2xl bg-zinc-900/50 backdrop-blur-sm border ${category.border} shadow-xl`}>
              <CategoryIcon size={32} className={category.text} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col items-center">
              <span className={`text-4xl font-black tracking-tighter ${category.text}`}>
                {category.label}
              </span>
              <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${category.color} opacity-50 mt-1`}></div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white mb-1 truncate" title={item.name}>{item.name}</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Shield size={10} className="text-zinc-500" />
              {isFileItem ? 'Encoded Payload' : 'Virtual Namespace'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 py-6 border-y border-zinc-900">
            {isFileItem && (
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Cluster Payload</span>
                <p className="text-xs font-medium text-zinc-300">{formatBytes(item.total_size)}</p>
              </div>
            )}
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Timestamp</span>
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                <Calendar size={12} className="text-zinc-500" />
                {new Date(item.created_at * 1000).toLocaleDateString()}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Storage ID</span>
              <p className="text-[10px] font-mono text-zinc-500 break-all">{item.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-6 border-t border-zinc-900 flex flex-col gap-2 bg-zinc-950/60">
        <div className="flex gap-2">
          <button 
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-lg active:scale-95"
            onClick={() => onDownload(item)}
          >
            <Download size={14} />
            Download
          </button>
          <button 
            className="p-2.5 rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700 transition-all active:scale-95"
            onClick={() => setShowShare(true)}
          >
            <Share2 size={16} />
          </button>
        </div>
        <button 
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900/50 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-950/30 hover:text-red-500 transition-all active:scale-95"
          onClick={() => onDelete(item)}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      {showShare && isFile(item) && (
        <ShareModal 
          file={item} 
          onClose={() => setShowShare(false)} 
        />
      )}
    </div>
  );
};
