import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  File, 
  Image as ImageIcon, 
  Video, 
  Music,
  Download,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface FileManifest {
  id: string;
  name: string;
  total_size: number;
  is_external: boolean;
  created_at: number;
}

interface FilePickerModalProps {
  onSelect: (fileId: string) => void;
  onClose: () => void;
  alreadyAttachedIds: string[];
}

export const FilePickerModal: React.FC<FilePickerModalProps> = ({ 
  onSelect, 
  onClose,
  alreadyAttachedIds
}) => {
  const [files, setFiles] = useState<FileManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const allFiles = await invoke<FileManifest[]>('cluster_list_files');
        // Sort by date newest first
        setFiles(allFiles.sort((a, b) => b.created_at - a.created_at));
      } catch (e) {
        console.error('Failed to fetch files for picker:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return <ImageIcon size={16} />;
    if (['mp4', 'mkv', 'mov', 'avi'].includes(ext || '')) return <Video size={16} />;
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) return <Music size={16} />;
    return <File size={16} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-900 rounded-lg shadow-2xl flex flex-col h-[600px] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50">
          <div>
            <h3 className="text-[14px] font-black uppercase tracking-widest text-zinc-100">Attach Resource</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Select from synchronized cloud cluster</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-md text-zinc-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 bg-zinc-900/10 border-b border-zinc-900/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
            <input 
              type="text"
              placeholder="SEARCH DATA..."
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-md py-2 pl-10 pr-4 text-xs text-zinc-200 outline-none focus:border-zinc-700 transition-colors shadow-inner uppercase tracking-wider font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-3">
              <RefreshCw className="animate-spin" size={24} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Scanning cluster...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-800 gap-4 opacity-50">
              <File size={48} strokeWidth={1} />
              <p className="text-[10px] font-black uppercase tracking-widest">No matching data objects</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {filteredFiles.map(file => {
                const isAttached = alreadyAttachedIds.includes(file.id);
                return (
                  <button
                    key={file.id}
                    disabled={isAttached}
                    onClick={() => onSelect(file.id)}
                    className={`flex items-center gap-4 p-3 rounded-md text-left transition-all active:scale-[0.98] border border-transparent
                      ${isAttached ? 'opacity-30 cursor-default bg-zinc-900/20' : 'hover:bg-zinc-900/50 hover:border-zinc-800'}`}
                  >
                    <div className={`p-2.5 rounded-md ${isAttached ? 'bg-zinc-800 text-zinc-600' : 'bg-blue-500/10 text-blue-500'}`}>
                      {getFileIcon(file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-zinc-200 truncate leading-tight mb-1">{file.name}</p>
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.1em]">
                        {formatSize(file.total_size)} • {new Date(file.created_at * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    {isAttached && (
                      <CheckCircle2 size={16} className="text-blue-500/50" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-6 py-2 rounded-md text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
           >
             Close Connection
           </button>
        </div>
      </div>
    </div>
  );
};
