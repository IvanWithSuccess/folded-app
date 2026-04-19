import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  Settings, Folder, RefreshCw, HardDrive, ShieldAlert,
  Save, AlertTriangle, Monitor, Webhook, AppWindow
} from 'lucide-react';

interface AppSettings {
  downloadDirectory: string;
  backgroundSync: boolean;
  chunkSize: string;
  webdavPort: string;
  closeToTray: boolean;
  showTrayIcon: boolean;
  launchOnStartup: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  downloadDirectory: '',
  backgroundSync: true,
  chunkSize: '1.9', // GB
  webdavPort: '9876',
  closeToTray: true,
  showTrayIcon: true,
  launchOnStartup: false
};

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
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

      setSettings({
        downloadDirectory: dlDir,
        backgroundSync: bgSync === 'true',
        chunkSize: cSize,
        webdavPort: wPort,
        closeToTray: ctTray === 'true',
        showTrayIcon: stIcon === 'true',
        launchOnStartup: startOnBoot === 'true'
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
            // Optionally reload the window
            window.location.reload();
        } catch (e) {
            console.error('Failed to wipe database:', e);
            alert(`Failed to wipe database: ${e}`);
        }
    }
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

        {/* Window Management */}
        <section className="flex flex-col gap-4">
           <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
             <AppWindow size={12} />
             Window Management
           </h3>
           <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900/50 pb-6 gap-4">
                 <div className="flex flex-col w-full sm:max-w-[70%]">
                    <span className="text-sm font-bold text-white mb-1">Close to Tray</span>
                    <span className="text-[11px] text-zinc-500 font-medium">When you close the main window, the application will continue running in the system tray. Use the tray menu to completely quit.</span>
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
                    <span className="text-[11px] text-zinc-500 font-medium">Show the Folded Cloud icon in your operating system's status bar or tray area. Required for "Close to Tray".</span>
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

        {/* Danger Zone */}
        <section className="flex flex-col gap-4 mt-8">
           <h3 className="text-[10px] font-black text-red-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
             <ShieldAlert size={12} />
             Danger Zone
           </h3>
           <div className="bg-red-500/5 border border-red-500/20 rounded-[32px] p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex flex-col w-full sm:max-w-[70%]">
                    <span className="text-sm font-bold text-red-400 mb-1">Purge Local Metadata Cache</span>
                    <span className="text-[11px] text-zinc-500 font-medium">Clears all local databases. Warning: Your cloud files will remain safe in Telegram, but the app will need to perform a complete deep scan upon restart.</span>
                 </div>
                 <button 
                   onClick={clearCache}
                   className="w-full sm:w-auto px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white font-bold text-xs rounded-xl uppercase tracking-widest transition-all"
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
