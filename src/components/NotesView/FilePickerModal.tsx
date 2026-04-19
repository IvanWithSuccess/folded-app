import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  File, 
  Image as ImageIcon, 
  Video, 
  Music,
  Download,
  CheckCircle2
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
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl flex flex-col h-[600px] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-100 italic tracking-tight">Attach File</h3>
            <p className="text-xs text-zinc-500 font-medium">Select a file from your cloud storage</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 bg-zinc-900/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
            <input 
              type="text"
              placeholder="Search files..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-200 outline-none focus:border-zinc-700 transition-colors shadow-inner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-medium animate-pulse">
              Scannig your cloud...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-2">
              <File size={40} strokeWidth={1} />
              <p className="text-sm font-medium">No files found</p>
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
                    className={`flex items-center gap-4 p-3 rounded-xl text-left transition-all active:scale-[0.98]
                      ${isAttached ? 'opacity-40 cursor-default' : 'hover:bg-zinc-900'}`}
                  >
                    <div className={`p-2 rounded-lg ${isAttached ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {getFileIcon(file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-200 truncate leading-tight mb-0.5">{file.name}</p>
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                        {formatSize(file.total_size)} • {new Date(file.created_at * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    {isAttached && (
                      <CheckCircle2 size={16} className="text-emerald-500" />
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
             className="px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
           >
             Cancel
           </button>
        </div>
      </div>
    </div>
  );
};
