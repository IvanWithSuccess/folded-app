import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  Settings, Folder, RefreshCw, HardDrive, ShieldAlert,
  Save, AlertTriangle, Monitor, Webhook, AppWindow, Database, Zap,
  ChevronRight
} from 'lucide-react';

interface AppSettings {
  downloadDirectory: string;
  backgroundSync: boolean;
  chunkSize: string;
  webdavPort: string;
  closeToTray: boolean;
  showTrayIcon: boolean;
  launchOnStartup: boolean;
  mountDrive: boolean;
  defaultOpenMode: 'system' | 'browser';
  cacheMaxMb: string;     // Max file cache size in MB
  parallelWorkers: string; // Parallel download threads
}

const DEFAULT_SETTINGS: AppSettings = {
  downloadDirectory: '',
  backgroundSync: true,
  chunkSize: '1.9', // GB
  webdavPort: '9876',
  closeToTray: true,
  showTrayIcon: true,
  launchOnStartup: false,
  mountDrive: true,
  defaultOpenMode: 'system',
  cacheMaxMb: '1024', // 1 GB default
  parallelWorkers: '3',
};

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ file_count: number; total_bytes: number } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    loadSettings();
    loadCacheStats();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const getSet = async (key: string, def: string) => {
        const val = await invoke<string | null>('get_setting', { key });
        return val !== null ? val : def;
      };

      const dlDir = await getSet('download_dir', '');
      const bgSync = await getSet('background_sync', 'true');
      const cSize = await getSet('chunk_size_gb', '1.9');
      const wPort = await getSet('webdav_port', '9876');
      const ctTray = await getSet('close_to_tray', 'true');
      const stIcon = await getSet('show_tray_icon', 'true');
      const startOnBoot = await getSet('launch_on_startup', 'false');
      const shouldMount = await getSet('mount_drive', 'true');
      const openMode = await getSet('default_open_mode', 'system') as 'system' | 'browser';
      const cMaxMb = await getSet('cache_max_mb', '1024');
      const pWorkers = await getSet('parallel_workers', '3');


      setSettings({
        downloadDirectory: dlDir,
        backgroundSync: bgSync === 'true',
        chunkSize: cSize,
        webdavPort: wPort,
        closeToTray: ctTray === 'true',
        showTrayIcon: stIcon === 'true',
        launchOnStartup: startOnBoot === 'true',
        mountDrive: shouldMount === 'true',
        defaultOpenMode: openMode,
        cacheMaxMb: cMaxMb,
        parallelWorkers: pWorkers,
      });
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    setSaving(true);
    
    try {
      await invoke('update_setting', { key: 'download_dir', value: updated.downloadDirectory });
      await invoke('update_setting', { key: 'background_sync', value: updated.backgroundSync ? 'true' : 'false' });
      await invoke('update_setting', { key: 'chunk_size_gb', value: updated.chunkSize });
      await invoke('update_setting', { key: 'webdav_port', value: updated.webdavPort });
      await invoke('update_setting', { key: 'close_to_tray', value: updated.closeToTray ? 'true' : 'false' });
      await invoke('update_setting', { key: 'show_tray_icon', value: updated.showTrayIcon ? 'true' : 'false' });
      await invoke('update_setting', { key: 'launch_on_startup', value: updated.launchOnStartup ? 'true' : 'false' });
      await invoke('update_setting', { key: 'mount_drive', value: updated.mountDrive ? 'true' : 'false' });
      await invoke('update_setting', { key: 'default_open_mode', value: updated.defaultOpenMode });
      await invoke('update_setting', { key: 'cache_max_mb', value: updated.cacheMaxMb });
      await invoke('update_setting', { key: 'parallel_workers', value: updated.parallelWorkers });
      
      // If mount preference changed, update the OS mount immediately
      if (newSettings.mountDrive !== undefined) {
         if (newSettings.mountDrive) {
            await invoke('mount_drive');
         } else {
            await invoke('unmount_drive');
         }
      }

      // Apply cache eviction immediately if limit decreased
      await invoke('evict_cache', { limitMb: parseInt(updated.cacheMaxMb) || 1024 });
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setTimeout(() => setSaving(false), 500); // Visual feedback
    }
  };

  const selectDirectory = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: 'Select Download Directory'
      });
      if (selectedPath && !Array.isArray(selectedPath)) {
        handleSave({ downloadDirectory: selectedPath });
      }
    } catch (e) {
      console.error('Failed to open directory picker:', e);
    }
  };

  const clearCache = async () => {
    if (window.confirm('Are you sure you want to Wipe the local database? This will require a full re-sync from Telegram.')) {
        try {
            await invoke('purge_local_cache');
            alert('Database wiped successfully. Please restart the application to begin a fresh sync.');
            window.location.reload();
        } catch (e) {
            console.error('Failed to wipe database:', e);
            alert(`Failed to wipe database: ${e}`);
        }
    }
  };

  const loadCacheStats = async () => {
    try {
      const stats = await invoke<{ file_count: number; total_bytes: number }>('get_cache_stats');
      setCacheStats(stats);
    } catch (e) {
      console.error('Failed to load cache stats:', e);
    }
  };

  const handleClearFileCache = async () => {
    if (!window.confirm('Clear the local file cache? Files will be re-downloaded on next access.')) return;
    setClearingCache(true);
    try {
      await invoke('clear_file_cache');
      await loadCacheStats();
    } catch (e) {
      alert(`Failed to clear cache: ${e}`);
    } finally {
      setClearingCache(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
     return (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 space-y-4">
           <RefreshCw size={32} className="animate-spin" />
           <span className="text-[10px] font-black uppercase tracking-widest">Loading Preferences...</span>
        </div>
     );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden animate-in fade-in duration-300">
      {/* Topbar matching industrial style */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-zinc-800 shrink-0" style={{ backgroundColor: '#0a0a0c' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-zinc-300">
            <Settings size={14} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Settings</span>
          </div>
        </div>

        <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] transition-opacity duration-300 ${saving ? 'opacity-100 text-blue-500' : 'opacity-0 text-zinc-600'}`}>
           <Save size={12} className="animate-pulse" />
           Syncing Changes
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* General Category */}
        <section className="space-y-3">
           <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] flex items-center gap-2 ml-1">
             <Monitor size={12} />
             Workstation Setup
           </h3>
           <div className="bg-zinc-900/20 border border-zinc-800 rounded-lg p-5 space-y-6">
              
              <div className="flex items-center justify-between gap-8">
                 <div className="flex flex-col flex-1">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Downloads Directory</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Primary storage node for retrieved assets.</span>
                 </div>
                 <div className="flex items-center gap-2 flex-1 justify-end max-w-[60%]">
                    <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800 truncate" title={settings.downloadDirectory}>
                       {settings.downloadDirectory || 'Default Downloads'}
                    </div>
                    <button 
                      onClick={selectDirectory}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-all border border-zinc-700"
                    >
                       <Folder size={14} />
                    </button>
                 </div>
              </div>

              <div className="flex items-center justify-between gap-8 pt-4 border-t border-zinc-800/50">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Default Opening Mode</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Handler for cloud assets.</span>
                 </div>
                 <select 
                   value={settings.defaultOpenMode}
                   onChange={(e) => handleSave({ defaultOpenMode: e.target.value as 'system' | 'browser' })}
                   className="bg-zinc-950 text-zinc-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded border border-zinc-800 outline-none focus:border-zinc-600 cursor-pointer"
                 >
                    <option value="system">Native Host</option>
                    <option value="browser">Web Viewer</option>
                 </select>
              </div>
           </div>
        </section>

        {/* System Integration */}
        <section className="space-y-3">
           <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] flex items-center gap-2 ml-1">
             <HardDrive size={12} />
             OS Integration
           </h3>
           <div className="bg-zinc-900/20 border border-zinc-800 rounded-lg p-5 space-y-6">
              
              <div className="flex items-center justify-between gap-8">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Expose Virtual Volume</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Mount cloud storage as a native macOS drive.</span>
                 </div>
                 <button 
                    onClick={() => handleSave({ mountDrive: !settings.mountDrive })}
                    className={`w-9 h-5 rounded-full p-1 transition-colors ${settings.mountDrive ? 'bg-blue-500' : 'bg-zinc-800'}`}
                 >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${settings.mountDrive ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div className="flex items-center justify-between gap-8 pt-4 border-t border-zinc-800/50">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Launch on Startup</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Automatically start application when you log in.</span>
                 </div>
                 <button 
                    onClick={() => handleSave({ launchOnStartup: !settings.launchOnStartup })}
                    className={`w-9 h-5 rounded-full p-1 transition-colors ${settings.launchOnStartup ? 'bg-blue-500' : 'bg-zinc-800'}`}
                 >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${settings.launchOnStartup ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div className="flex items-center justify-between gap-8 pt-4 border-t border-zinc-800/50">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Show Tray Icon</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Display application icon in the system menu bar.</span>
                 </div>
                 <button 
                    onClick={() => handleSave({ showTrayIcon: !settings.showTrayIcon })}
                    className={`w-9 h-5 rounded-full p-1 transition-colors ${settings.showTrayIcon ? 'bg-blue-500' : 'bg-zinc-800'}`}
                 >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${settings.showTrayIcon ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div className="flex items-center justify-between gap-8 pt-4 border-t border-zinc-800/50">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Run in Background</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Closing the window hides it instead of quitting.</span>
                 </div>
                 <button 
                    onClick={() => handleSave({ closeToTray: !settings.closeToTray })}
                    className={`w-9 h-5 rounded-full p-1 transition-colors ${settings.closeToTray ? 'bg-blue-500' : 'bg-zinc-800'}`}
                 >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${settings.closeToTray ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div className="flex items-center justify-between gap-8 pt-4 border-t border-zinc-800/50">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Native Alias Shortcut</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Desktop link to virtual volume.</span>
                 </div>
                 <button 
                    onClick={async () => {
                      try {
                        const dest = await open({ directory: true, multiple: false, title: 'Alias Destination' });
                        if (dest && !Array.isArray(dest)) {
                          const home = await invoke<string>('get_home_dir');
                          await invoke('create_alias', { sourcePath: `${home}/FoldedCloud`, destinationFolder: dest });
                          alert('Alias established.');
                        }
                      } catch (e) { console.error(e); }
                    }}
                    className="px-4 py-1.5 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all"
                  >
                     Establish Alias
                  </button>
              </div>
           </div>
        </section>

        {/* Core Engine */}
        <section className="space-y-3">
           <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] flex items-center gap-2 ml-1">
             <RefreshCw size={12} />
             Sync Engine
           </h3>
           <div className="bg-zinc-900/20 border border-zinc-800 rounded-lg p-5 space-y-6">
              <div className="flex items-center justify-between gap-8">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Autonomous Indexing</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Background metadata crawl for live updates.</span>
                 </div>
                 <button 
                    onClick={() => handleSave({ backgroundSync: !settings.backgroundSync })}
                    className={`w-9 h-5 rounded-full p-1 transition-colors ${settings.backgroundSync ? 'bg-blue-500' : 'bg-zinc-800'}`}
                 >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${settings.backgroundSync ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div className="flex items-center justify-between gap-8 pt-4 border-t border-zinc-800/50">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Parallel Workers</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Concurrent download threads.</span>
                 </div>
                 <select
                    value={settings.parallelWorkers}
                    onChange={(e) => handleSave({ parallelWorkers: e.target.value })}
                    className="bg-zinc-950 text-zinc-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded border border-zinc-800 outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    <option value="1">Minimal (1)</option>
                    <option value="3">Standard (3)</option>
                    <option value="6">Enhanced (6)</option>
                    <option value="10">Max Burst (10)</option>
                  </select>
              </div>

              <div className="flex items-center justify-between gap-8 pt-4 border-t border-zinc-800/50">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Maximum Chunk Size</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">File slicing limit (Telegrams max is 2.0GB).</span>
                 </div>
                 <select
                    value={settings.chunkSize}
                    onChange={(e) => handleSave({ chunkSize: e.target.value })}
                    className="bg-zinc-950 text-zinc-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded border border-zinc-800 outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    <option value="0.5">500 MB (Safe)</option>
                    <option value="1.0">1.0 GB</option>
                    <option value="1.5">1.5 GB</option>
                    <option value="1.9">1.9 GB (Max)</option>
                  </select>
              </div>

           </div>
        </section>

        {/* Data Persistence */}
        <section className="space-y-3">
           <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] flex items-center gap-2 ml-1">
             <Database size={12} />
             Local Cache Control
           </h3>
           <div className="bg-zinc-900/20 border border-zinc-800 rounded-lg p-5 space-y-6">
              <div className="space-y-4">
                 <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                       <span className="text-[11px] font-bold text-white uppercase tracking-tight">Cache Retention Limit</span>
                       <span className="text-[10px] text-zinc-500 font-medium mt-0.5">Maximum local footprint for cached assets.</span>
                    </div>
                    <span className="text-sm font-black text-blue-500">
                       {Math.round(parseInt(settings.cacheMaxMb) / 1024)} <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">GB</span>
                    </span>
                 </div>
                 <input 
                    type="range" min="0" max="102400" step="1024"
                    value={settings.cacheMaxMb}
                    onChange={(e) => setSettings({ ...settings, cacheMaxMb: e.target.value })}
                    onMouseUp={() => handleSave({ cacheMaxMb: settings.cacheMaxMb })}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                 />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-tight">Asset Cache</span>
                    <span className="text-[10px] text-zinc-500 font-medium mt-0.5">
                       {cacheStats ? `${formatBytes(cacheStats.total_bytes)} stored across ${cacheStats.file_count} units` : 'Calculating stats...'}
                    </span>
                 </div>
                 <button
                    onClick={handleClearFileCache}
                    disabled={clearingCache || (cacheStats?.total_bytes ?? 0) === 0}
                    className="px-4 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded border border-zinc-800 transition-all"
                 >
                    Purge Assets
                 </button>
              </div>
           </div>
        </section>

        {/* System Critical */}
        <section className="space-y-3 pt-4">
           <h3 className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.25em] flex items-center gap-2 ml-1">
             <ShieldAlert size={12} />
             Maintenance Zone
           </h3>
           <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-5 flex items-center justify-between">
              <div className="flex flex-col">
                 <span className="text-[11px] font-bold text-red-400 uppercase tracking-tight">Full Database Reset</span>
                 <span className="text-[10px] text-zinc-600 font-medium mt-0.5">Destructive action: Wipes all local metadata indexes.</span>
              </div>
              <button 
                onClick={clearCache}
                className="px-4 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded transition-all"
              >
                 Wipe System
              </button>
           </div>
        </section>
      </div>
    </div>
  );
};
