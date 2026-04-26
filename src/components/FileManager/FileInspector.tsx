import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileManifest, SelectableItem, FolderHistoryEvent } from '../../types/file';
import { formatBytes, isFile } from '../../utils/fileUtils';
import { 
  File, Calendar, Shield, Share2, Download, 
  Trash2, X, FileText, ImageIcon, Video, 
  Music, Archive, FileQuestion, Star, Clock,
  History, Info, ExternalLink, RefreshCw,
  RotateCcw, Undo2, AlertCircle
} from 'lucide-react';
import { ShareModal } from './ShareModal';

interface FileInspectorProps {
  item: SelectableItem | null;
  onClose: () => void;
  onDownload: (item: SelectableItem) => void;
  onDelete: (item: SelectableItem) => void;
  onRefresh?: () => void;
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
  onDelete,
  onRefresh
}) => {
  const [showShare, setShowShare] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [fileVersions, setFileVersions] = useState<FileManifest[]>([]);
  const [folderHistory, setFolderHistory] = useState<FolderHistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (item && activeTab === 'history') {
      loadHistory();
    }
  }, [item?.id, activeTab]);

  const loadHistory = async () => {
    if (!item) return;
    setLoading(true);
    try {
      if (isFile(item)) {
        const versions = await invoke<FileManifest[]>('get_file_versions', { fileId: item.id });
        setFileVersions(versions);
      } else {
        const logs = await invoke<FolderHistoryEvent[]>('get_folder_history', { folderId: item.id });
        setFolderHistory(logs);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    setActionLoading(versionId);
    try {
      await invoke('restore_file_version', { versionFileId: versionId });
      await loadHistory();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Failed to restore version:', e);
      alert(`Restore failed: ${e}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadVersion = async (versionId: string) => {
    setActionLoading(versionId);
    try {
      const path = await invoke<string>('download_file_version', { versionFileId: versionId });
      alert(`File downloaded to: ${path}`);
    } catch (e) {
      console.error('Failed to download version:', e);
      alert(`Download failed: ${e}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreDeleted = async (fileId: string) => {
    setActionLoading(fileId);
    try {
      await invoke('restore_deleted_item', { fileId });
      await loadHistory();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Failed to restore item:', e);
      alert(`Restore failed: ${e}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (!item) return null;

  const isFileItem = isFile(item);
  const category = getFileCategory(item.name);
  const CategoryIcon = category.icon;

  return (
    <div className="w-[320px] h-full border-l border-zinc-800 flex flex-col bg-[#09090b] relative animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-[#0a0a0c]">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('info')}
            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${activeTab === 'info' ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Details
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${activeTab === 'history' ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            History
          </button>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'info' ? (
          <div className="p-6">
            <div className={`aspect-square rounded-xl mb-6 flex flex-col items-center justify-center overflow-hidden border ${category.border} bg-zinc-950/50 shadow-2xl relative group`}>
              <CategoryIcon size={120} className={`absolute opacity-[0.02] -bottom-4 -right-4 rotate-12 transition-transform duration-500 group-hover:scale-110 ${category.text}`} strokeWidth={1} />
              
              <div className="relative flex flex-col items-center gap-4">
                <div className={`p-4 rounded-xl bg-[#09090b] border ${category.border} shadow-xl`}>
                  <CategoryIcon size={32} className={category.text} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col items-center">
                  <span className={`text-4xl font-black tracking-tighter ${category.text}`}>
                    {category.label}
                  </span>
                  <div className={`h-1 w-8 rounded-full bg-current opacity-20 mt-1 ${category.text}`}></div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-white mb-1 truncate" title={item.name}>{item.name}</h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Shield size={10} className="text-blue-500/60" />
                  {isFileItem ? 'File' : 'Folder'}
                </p>
                {item.is_starred && (
                  <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 w-fit">
                    <Star size={10} className="text-blue-500 fill-blue-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Starred</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 py-6 border-y border-zinc-800/50">
                {isFileItem && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Size</span>
                    <p className="text-xs font-bold text-zinc-300 tracking-tight">{formatBytes(item.total_size)}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Created At</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                    <Calendar size={12} className="text-zinc-500" />
                    {new Date(item.created_at * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">ID</span>
                  <p className="text-[10px] font-mono text-zinc-600 break-all leading-relaxed bg-zinc-950 p-2 rounded border border-zinc-900">{item.id}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
              <History size={12} />
              {isFileItem ? 'Version History' : 'Folder Activity'}
            </h3>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                 <RefreshCw size={24} className="text-zinc-800 animate-spin" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Scrubbing logs...</span>
              </div>
            ) : isFileItem ? (
              // FILE VERSIONS
              <div className="space-y-4">
                {fileVersions.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-zinc-800 gap-4 opacity-50">
                    <Clock size={40} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-widest">No versions found</p>
                  </div>
                ) : (
                  fileVersions.map((v, idx) => (
                    <div key={v.id} className={`p-3 rounded-lg border ${v.is_current_version ? 'bg-blue-500/5 border-blue-500/20' : 'bg-zinc-900/30 border-zinc-800/50'} flex flex-col gap-2`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black ${v.is_current_version ? 'text-blue-500' : 'text-zinc-500'}`}>
                            VER {v.version_number || (fileVersions.length - idx)}
                          </span>
                          {v.is_current_version && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-500 text-white">Current</span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-zinc-600">
                          {new Date(v.created_at * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-zinc-400 font-mono truncate">{v.id}</p>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-bold text-zinc-500">{formatBytes(v.total_size)}</span>
                        <div className="flex gap-2">
                          {!v.is_current_version && (
                            <button 
                              disabled={!!actionLoading}
                              onClick={() => handleRestoreVersion(v.id)}
                              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
                              title="Restore this version"
                            >
                              {actionLoading === v.id ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                            </button>
                          )}
                          <button 
                            disabled={!!actionLoading}
                            onClick={() => handleDownloadVersion(v.id)}
                            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
                            title="Download this version"
                          >
                            {actionLoading === v.id ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // FOLDER HISTORY
              <div className="space-y-4">
                {folderHistory.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-zinc-800 gap-4 opacity-50">
                    <Clock size={40} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-widest">No activity recorded</p>
                  </div>
                ) : (
                  folderHistory.map(entry => (
                    <div key={entry.id} className="relative pl-6 border-l border-zinc-800 pb-4 last:pb-0">
                      <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-zinc-800 border border-zinc-900" />
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                           <span className={`text-[9px] font-black uppercase tracking-widest ${
                             entry.event_type.includes('DELETED') ? 'text-red-500' : 
                             entry.event_type.includes('RESTORED') ? 'text-green-500' : 'text-blue-500'
                           }`}>{entry.event_type}</span>
                           <span className="text-[9px] font-bold text-zinc-600">{new Date(entry.occurred_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] font-bold text-zinc-300 leading-tight">
                          {entry.target_name}
                        </p>
                        {entry.details && <p className="text-[9px] text-zinc-500 italic">{entry.details}</p>}
                        
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-zinc-600">{new Date(entry.occurred_at * 1000).toLocaleDateString()}</span>
                          
                          {entry.event_type === 'FILE_DELETED_FROM_MIRROR' && entry.target_id && (
                            <button 
                              disabled={!!actionLoading}
                              onClick={() => handleRestoreDeleted(entry.target_id!)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              {actionLoading === entry.target_id ? <RefreshCw size={8} className="animate-spin" /> : <Undo2 size={8} />}
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="p-6 border-t border-zinc-800 flex flex-col gap-2 bg-[#0a0a0c]">
        <div className="flex gap-2">
          <button 
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-lg active:scale-95"
            onClick={() => onDownload(item)}
          >
            <Download size={14} />
            Download
          </button>
          <button 
            className="p-2.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700 transition-all active:scale-95"
            onClick={() => setShowShare(true)}
          >
            <Share2 size={16} />
          </button>
        </div>
        <button 
          className="flex items-center justify-center gap-2 py-2.5 rounded-md bg-zinc-900/50 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-950/30 hover:text-red-500 transition-all active:scale-95"
          onClick={() => onDelete(item)}
        >
          <Trash2 size={14} />
          {isFileItem ? 'Delete with versions' : 'Delete'}
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
