import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  Settings, Folder, RefreshCw, HardDrive, ShieldAlert,
  Save, AlertTriangle, Monitor, Webhook, AppWindow, Database, Zap
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
            alert(`Failed to wipe database: ${(e as Error).message || String(e)}`);
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
      alert(`Failed to clear cache: ${(e as Error).message || String(e)}`);
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
    <div className="flex flex-col gap-10 max-w-4xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-blue-500" />
            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">Global Settings</h2>
          </div>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-8">System configuration and preferences</p>
        </div>
        
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-opacity duration-300 ${saving ? 'opacity-100 text-blue-500' : 'opacity-0 text-zinc-600'}`}>
           <Save size={14} className="animate-pulse" />
           Saving Modifications...
        </div>
      </div>

      <div className="grid gap-8">
        {/* Generaly Category */}
        <section className="flex flex-col gap-4">
           <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
             <Monitor size={12} />
             General Configuration
           </h3>
           <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col w-full sm:max-w-[60%]">
                    <span className="text-sm font-bold text-white mb-1">Downloads Directory</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Select the default folder where files downloaded from Folded Cloud will be saved.</span>
                 </div>
                 <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 justify-between sm:justify-end">
                    <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-3 py-2 rounded-xl flex-1 truncate text-left sm:text-right border border-zinc-800" title={settings.downloadDirectory}>
                       {settings.downloadDirectory || 'OS Default Downloads'}
                    </div>
                    <button 
                      onClick={selectDirectory}
                      className="p-2.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all flex-shrink-0"
                    >
                       <Folder size={16} />
                    </button>
                 </div>
              </div>

           </div>
        </section>

        {/* System Integration */}
        <section className="flex flex-col gap-4">
           <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
             <HardDrive size={12} />
             System Integration
           </h3>
           <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col w-full sm:max-w-[70%]">
                    <span className="text-sm font-bold text-white mb-1">Expose as Local Drive</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Mount your Telegram Cloud as a virtual volume in Finder or File Explorer. Recommended for native file streaming.</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.mountDrive}
                      onChange={(e) => handleSave({ mountDrive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                 </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col w-full sm:max-w-[70%]">
                    <span className="text-sm font-bold text-white mb-1">Default File Opening Mode</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Choose whether to open files in your default system application or in a web browser.</span>
                 </div>
                 <select 
                   value={settings.defaultOpenMode}
                   onChange={(e) => handleSave({ defaultOpenMode: e.target.value as 'system' | 'browser' })}
                   className="bg-zinc-800 text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl border border-zinc-700 outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                 >
                    <option value="system">System App</option>
                    <option value="browser">Web Browser</option>
                 </select>
              </div>

           </div>
        </section>

        {/* Window Management */}
        <section className="flex flex-col gap-4">
           <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
             <AppWindow size={12} />
             Window Management
           </h3>
           <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900/50 pb-6 gap-4">
                 <div className="flex flex-col w-full sm:max-w-[70%]">
                    <span className="text-sm font-bold text-white mb-1">Keep App Running in Background</span>
                    <span className="text-[11px] text-zinc-500 font-medium">When you close the main window, the application will stay active for background tasks. If disabled, closing the window will exit and terminate the app completely.</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.closeToTray}
                      onChange={(e) => handleSave({ closeToTray: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                 </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900/50 pb-6 gap-4">
                 <div className="flex flex-col w-full sm:max-w-[70%]">
                    <span className="text-sm font-bold text-white mb-1">Show System Tray Icon</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Show the Folded Cloud icon in your operating system's status bar. Useful for controlling and reopening the app when it is running in the background.</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.showTrayIcon}
                      onChange={(e) => handleSave({ showTrayIcon: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                 </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col w-full sm:max-w-[70%]">
                    <span className="text-sm font-bold text-white mb-1">Launch on Startup</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Automatically start Folded Cloud when you log into your computer.</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.launchOnStartup}
                      onChange={(e) => handleSave({ launchOnStartup: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                 </label>
              </div>

           </div>
        </section>

        {/* Sync & Indexing */}
        <section className="flex flex-col gap-4">
           <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
             <RefreshCw size={12} />
             Synchronization Engine
           </h3>
           <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col w-full sm:max-w-[70%]">
                    <span className="text-sm font-bold text-white mb-1">Background Maintenance Scanner</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Allows the app to silently crawl 'Saved Messages' to continuously update indexes without manual syncs. Recommended for fast startups.</span>
                 </div>
                 
                 <label className="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.backgroundSync}
                      onChange={(e) => handleSave({ backgroundSync: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                 </label>
              </div>

           </div>
        </section>

        {/* Advanced Systems */}
        <section className="flex flex-col gap-4">
           <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
             <Webhook size={12} />
             Advanced Parameters
           </h3>
           <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900/50 pb-6 gap-4">
                 <div className="flex flex-col w-full sm:max-w-[60%]">
                    <span className="text-sm font-bold text-white mb-1">Chunk Split Size (GB)</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Maximum size of a single file chunk before splitting. Premium users can set this up to 3.9GB. Standard users max is 1.9GB.</span>
                 </div>
                 <div className="w-full sm:w-auto">
                    <select 
                      value={settings.chunkSize}
                      onChange={(e) => handleSave({ chunkSize: e.target.value })}
                      className="w-full sm:w-auto bg-zinc-950 border border-zinc-800 text-sm font-medium text-white px-4 py-2 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
                    >
                       <option value="0.5">500 MB</option>
                       <option value="1.0">1.0 GB</option>
                       <option value="1.5">1.5 GB</option>
                       <option value="1.9">1.9 GB (Standard Max)</option>
                       <option value="3.9">3.9 GB (Premium Max)</option>
                    </select>
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col w-full sm:max-w-[60%]">
                    <span className="text-sm font-bold text-white mb-1">WebDAV Virtual Drive Port</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Local port used to mount Folded Cloud as a system drive (Requires app restart).</span>
                 </div>
                 <div className="w-full sm:w-auto">
                    <input 
                      type="number" 
                      value={settings.webdavPort}
                      onChange={(e) => setSettings({...settings, webdavPort: e.target.value})}
                      onBlur={() => handleSave({ webdavPort: settings.webdavPort })}
                      className="w-full sm:w-24 bg-zinc-950 border border-zinc-800 text-sm font-mono text-center sm:text-left text-white px-3 py-2 rounded-xl outline-none focus:border-blue-500"
                    />
                 </div>
              </div>

           </div>
        </section>

        {/* Local Cache */}
        <section className="flex flex-col gap-4">
           <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
             <Database size={12} />
             Local File Cache
           </h3>
           <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] p-6 space-y-6">

              {/* Cache size limit */}
              <div className="flex flex-col gap-6 border-b border-zinc-900/50 pb-8">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col w-full sm:max-w-[70%]">
                       <span className="text-sm font-bold text-white mb-1">Cache Size Limit</span>
                       <span className="text-[11px] text-zinc-500 font-medium">Temporary local storage for fast file access. Oldest files are deleted when this limit is reached.</span>
                    </div>
                    <div className="text-lg font-black text-blue-500 tabular-nums">
                       {Math.round(parseInt(settings.cacheMaxMb) / 1024)} <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">GB</span>
                    </div>
                 </div>
                 <div className="px-2">
                    <input 
                      type="range"
                      min="0"
                      max="102400" // 100 GB in MB
                      step="1024"  // 1 GB steps
                      value={settings.cacheMaxMb}
                      onChange={(e) => setSettings({ ...settings, cacheMaxMb: e.target.value })}
                      onMouseUp={() => handleSave({ cacheMaxMb: settings.cacheMaxMb })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between mt-2 text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                       <span>Disabled</span>
                       <span>25 GB</span>
                       <span>50 GB</span>
                       <span>75 GB</span>
                       <span>100 GB</span>
                    </div>
                 </div>
              </div>

              {/* Cache stats + clear */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col">
                    <span className="text-sm font-bold text-white mb-1">Downloaded File Cache</span>
                    {cacheStats ? (
                      <span className="text-[11px] text-zinc-500 font-medium">
                        Storing {cacheStats.file_count} recent file{cacheStats.file_count !== 1 ? 's' : ''} · {formatBytes(cacheStats.total_bytes)} used
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-600 font-medium">Loading stats...</span>
                    )}
                 </div>
                 <button
                   onClick={handleClearFileCache}
                   disabled={clearingCache || (cacheStats?.total_bytes ?? 0) === 0}
                   className="w-full sm:w-auto px-5 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black text-[10px] rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-zinc-800/50"
                 >
                    <HardDrive size={12} />
                    {clearingCache ? 'Purging Files...' : 'Clear File Cache'}
                 </button>
              </div>

           </div>
        </section>

        {/* Performance */}
        <section className="flex flex-col gap-4">
           <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
             <Zap size={12} />
             Performance
           </h3>
           <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] p-6 space-y-6">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col w-full sm:max-w-[60%]">
                    <span className="text-sm font-bold text-white mb-1">Parallel Download Workers</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Number of simultaneous chunk downloads. Higher values speed up large file transfers but use more bandwidth.</span>
                 </div>
                 <div className="flex items-center gap-3 self-start sm:self-auto">
                    <select
                      value={settings.parallelWorkers}
                      onChange={(e) => handleSave({ parallelWorkers: e.target.value })}
                      className="bg-zinc-900 border border-zinc-800 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="1">1 (Safe)</option>
                      <option value="3">3 (Default)</option>
                      <option value="6">6 (Fast)</option>
                      <option value="10">10 (Max)</option>
                    </select>
                 </div>
              </div>

           </div>
        </section>

        {/* Danger Zone */}
        <section className="flex flex-col gap-4 mt-8">
           <h3 className="text-[10px] font-black text-red-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
             <ShieldAlert size={12} />
             Danger Zone
           </h3>
           <div className="bg-red-500/5 border border-red-500/20 rounded-[32px] p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col w-full sm:max-w-[70%]">
                    <span className="text-sm font-bold text-red-400 mb-1">Hard Sync Reset (Full Metadata Wipe)</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Deletes the local SQLite database containing file indexes and sync state. Your files in Telegram are safe, but a full re-scan will be required.</span>
                 </div>
                 <button 
                   onClick={clearCache}
                   className="w-full sm:w-auto px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white font-black text-[10px] rounded-xl uppercase tracking-[0.1em] transition-all"
                 >
                    Wipe Database
                 </button>
              </div>

           </div>
        </section>

      </div>
    </div>
  );
};
