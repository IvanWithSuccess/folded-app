import React from 'react';
import { RefreshCw, Search, X, Folder, ChevronRight, Upload, FolderUp, FolderPlus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface FileTopbarProps {
  path: (string | null)[];
  columns: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  onNavigateToBreadcrumb: (idx: number) => void;
  onCreateFolder: () => void;
  onUploadFile: () => void;
  onUploadFolder: () => void;
}

export const FileTopbar: React.FC<FileTopbarProps> = ({
  path,
  columns,
  searchQuery,
  setSearchQuery,
  onSync,
  isSyncing,
  onNavigateToBreadcrumb,
  onCreateFolder,
  onUploadFile,
  onUploadFolder
}) => {
  const { activeAccountId, accounts } = useAppStore();
  const currentAccount = accounts.find(a => a.id === activeAccountId);

  // Simple breadcrumb labels
  const getBreadcrumbLabel = (folderId: string | null, idx: number) => {
    if (folderId === null) return currentAccount ? ((currentAccount as any).name || (currentAccount as any).username || (currentAccount as any).first_name || 'My Files') : 'My Files';
    
    // Find folder name in previous columns if available
    for (let i = 0; i < columns.length; i++) {
      const folder = columns[i].folders.find((f: any) => f.id === folderId);
      if (folder) return folder.name;
    }
    return folderId;
  };

  return (
    <div className="h-12 flex items-center justify-between px-5 border-b border-zinc-800 shrink-0" style={{ backgroundColor: '#0a0a0c' }}>
      <div className="flex items-center gap-4 flex-1">
        <button 
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-all text-zinc-500 hover:text-white border border-transparent hover:border-zinc-700/50" 
          onClick={onSync}
          disabled={isSyncing}
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          <span className="text-[10px] font-bold uppercase tracking-tight">{isSyncing ? 'Syncing' : 'Sync'}</span>
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          {path.map((folderId, idx) => (
            <React.Fragment key={folderId || 'root'}>
              {idx > 0 && <ChevronRight size={12} className="text-zinc-700 shrink-0" />}
              <div 
                onClick={() => onNavigateToBreadcrumb(idx)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-800 cursor-pointer transition-colors shrink-0 group"
              >
                {folderId === null ? <Folder size={12} className="text-blue-500" /> : <Folder size={12} className="text-zinc-500 group-hover:text-zinc-300" />}
                <span className={`text-[11px] font-bold uppercase tracking-widest truncate max-w-[120px] transition-colors
                  ${folderId === null ? 'text-zinc-300' : 'text-zinc-500 group-hover:text-white'}`}>
                  {getBreadcrumbLabel(folderId, idx)}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Actions */}
        <div className="flex items-center gap-1 mr-2 px-3 border-r border-zinc-800">
          <button onClick={onUploadFile} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors tooltip-target" title="Upload File">
            <Upload size={14} />
          </button>
          <button onClick={onUploadFolder} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors tooltip-target" title="Upload Directory">
            <FolderUp size={14} />
          </button>
          <button onClick={onCreateFolder} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors tooltip-target" title="New Folder">
            <FolderPlus size={14} />
          </button>
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-7 pr-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] text-white outline-none focus:border-zinc-600 w-48 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
