import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { confirm, message, open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../store/useAppStore';
import { THEMES } from '../theme/themes';
import { 
  Settings, Folder, RefreshCw, HardDrive, ShieldAlert,
  Save, AlertTriangle, Monitor, Webhook, AppWindow, Database, Zap,
  ChevronRight, Trash2, Eraser, Palette, Check, LogOut
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
  parallelWorkers: string;
  theme: string;
}


const DEFAULT_SETTINGS: AppSettings = {
  downloadDirectory: '',
  backgroundSync: true,
  chunkSize: '1.9',
  webdavPort: '9876',
  closeToTray: true,
  showTrayIcon: true,
  launchOnStartup: false,
  mountDrive: false,
  defaultOpenMode: 'system',
  parallelWorkers: '3',
  theme: 'deep_dark',
};



export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { accounts, theme, setTheme } = useAppStore();


  const handleFullLogout = async () => {
    const confirmed = await confirm('Disconnect Telegram session and wipe local vault directory?');
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      await invoke('full_logout');
    } catch (e) {
      console.error('Logout error:', e);
      await message('Logout failed: ' + ((e as Error).message || String(e)), { title: 'Logout Error', kind: 'error' });
    } finally {
      setLoggingOut(false);
    }
  };


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
      const shouldMount = await getSet('mount_drive', 'false');
      const openMode = await getSet('default_open_mode', 'system') as 'system' | 'browser';
      const pWorkers = await getSet('parallel_workers', '3');
      const currentTheme = await getSet('theme', 'deep_dark');

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
        parallelWorkers: pWorkers,
        theme: currentTheme,
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
      const saveSet = (key: string, val: string) => invoke('update_setting', { key, value: val });

      if (newSettings.downloadDirectory !== undefined) await saveSet('download_dir', updated.downloadDirectory);
      if (newSettings.backgroundSync !== undefined) await saveSet('background_sync', updated.backgroundSync.toString());
      if (newSettings.chunkSize !== undefined) await saveSet('chunk_size_gb', updated.chunkSize);
      if (newSettings.webdavPort !== undefined) await saveSet('webdav_port', updated.webdavPort);
      if (newSettings.closeToTray !== undefined) await saveSet('close_to_tray', updated.closeToTray.toString());
      if (newSettings.showTrayIcon !== undefined) await saveSet('show_tray_icon', updated.showTrayIcon.toString());
      if (newSettings.launchOnStartup !== undefined) await saveSet('launch_on_startup', updated.launchOnStartup.toString());
      if (newSettings.mountDrive !== undefined) await saveSet('mount_drive', updated.mountDrive.toString());
      if (newSettings.defaultOpenMode !== undefined) await saveSet('default_open_mode', updated.defaultOpenMode);
      if (newSettings.parallelWorkers !== undefined) await saveSet('parallel_workers', updated.parallelWorkers);



      if (newSettings.theme !== undefined) {
        await saveSet('theme', updated.theme);
        setTheme(updated.theme);
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const selectDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Downloads Directory',
      });
      if (selected && typeof selected === 'string') {
        handleSave({ downloadDirectory: selected });
      }
    } catch (e) {
      console.error('Failed to select directory:', e);
    }
  };


  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-[#1d1d1f] overflow-hidden select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif]">


      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">


        {/* System & Cache */}
        <section className="space-y-2">
           <span className="text-[11px] font-semibold text-[#86868b] px-1 block">CACHE & STORAGE PERFORMANCE</span>
           <div className="bg-white rounded-xl border border-black/[0.04] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5 divide-y divide-black/[0.04]">
              {/* Max Chunk Upload Size */}
              <div className="flex items-center justify-between gap-4">
                 <div>
                    <span className="text-[13px] font-semibold text-[#1d1d1f] block leading-tight">Max Chunk Upload Size</span>
                    <span className="text-[11px] text-[#86868b]">Maximum size for Telegram payload chunking.</span>
                 </div>
                 <select 
                   value={settings.chunkSize}
                   onChange={(e) => handleSave({ chunkSize: e.target.value })}
                   className="bg-[#f5f5f7] text-[#1d1d1f] text-xs font-semibold px-3 py-1.5 rounded-lg border border-black/[0.04] outline-none cursor-pointer"
                 >
                    <option value="1.9">1.9 GB (Default - Maximum Speed)</option>
                    <option value="0.5">500 MB</option>
                    <option value="0.1">100 MB</option>
                    <option value="0.05">50 MB</option>
                 </select>
              </div>


           </div>
        </section>



        {/* Preferences */}
        <section className="space-y-2">
           <span className="text-[11px] font-semibold text-[#86868b] px-1 block">PREFERENCES & STARTUP</span>
           <div className="bg-white rounded-xl border border-black/[0.04] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5 divide-y divide-black/[0.04]">
              <div className="flex items-center justify-between">
                 <div>
                    <span className="text-[13px] font-semibold text-[#1d1d1f] block leading-tight">Autostart on Login</span>
                    <span className="text-[11px] text-[#86868b]">Launch quietly when macOS boots.</span>
                 </div>
                 <input 
                   type="checkbox"
                   checked={settings.launchOnStartup}
                   onChange={(e) => handleSave({ launchOnStartup: e.target.checked })}
                   className="w-4 h-4 rounded border-gray-300 text-[#007aff] focus:ring-0 cursor-pointer"
                 />
              </div>

              <div className="flex items-center justify-between pt-3">
                 <div>
                    <span className="text-[13px] font-semibold text-[#1d1d1f] block leading-tight">Show Menu Bar Icon</span>
                    <span className="text-[11px] text-[#86868b]">Display icon in macOS top menu bar.</span>
                 </div>
                 <input 
                   type="checkbox"
                   checked={settings.showTrayIcon}
                   onChange={(e) => handleSave({ showTrayIcon: e.target.checked })}
                   className="w-4 h-4 rounded border-gray-300 text-[#007aff] focus:ring-0 cursor-pointer"
                 />
              </div>
           </div>
        </section>

        {/* Session & Security */}
        <section className="space-y-2">
           <span className="text-[11px] font-semibold text-[#86868b] px-1 block">SESSION & SECURITY</span>
           <div className="bg-white rounded-xl border border-black/[0.04] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-4">
                 <div>
                    <span className="text-[13px] font-semibold text-[#1d1d1f] block leading-tight">Disconnect Session</span>
                    <span className="text-[11px] text-[#86868b]">Unmounts drive, clears local vault, and logs out.</span>
                 </div>
                 <button 
                   onClick={handleFullLogout}
                   disabled={loggingOut}
                   className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f7] hover:bg-[#ff3b30]/10 text-[#ff3b30] font-semibold text-xs rounded-lg border border-black/[0.04] transition-all cursor-pointer border-0 disabled:opacity-50 shrink-0"
                 >
                   <LogOut size={13} />
                   Log Out
                 </button>
              </div>
           </div>
        </section>

      </div>
    </div>
  );
};

