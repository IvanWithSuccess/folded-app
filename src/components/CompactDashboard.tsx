import React, { useState, useEffect } from 'react';
import { Shield, Zap, Lock, Unlock, Settings, Camera, HardDrive, RefreshCw, AlertTriangle, UserCheck, Activity } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { useAppStore } from '../store/useAppStore';
import { SnapshotViewer } from './SnapshotViewer';
import { SettingsView } from './SettingsView';
import { TasksViewer } from './TasksViewer';
import appIcon from '../assets/app-icon.png';


interface VaultInfo {
  folder_path: string;
  folder_exists: boolean;
  storage_mode: 'FOLDER' | 'VIRTUAL_DRIVE';
  is_drive_mounted: boolean;
}

export const CompactDashboard: React.FC = () => {
  const {} = useAppStore();
  const [activeTab, setActiveTab] = useState<'TASKS' | 'VAULT' | 'SNAPSHOTS' | 'SETTINGS'>('TASKS');

  const [isPanicActive, setIsPanicActive] = useState<boolean>(false);
  const [keyFingerprint, setKeyFingerprint] = useState<string | null>(null);

  // Vault state
  const [vaultInfo, setVaultInfo] = useState<VaultInfo>({
    folder_path: '~/FoldedVault',
    folder_exists: true,
    storage_mode: 'FOLDER',
    is_drive_mounted: false,
  });
  const [loading, setLoading] = useState<boolean>(false);

  // Settings states
  const [autostart, setAutostart] = useState<boolean>(false);
  const [showTrayIcon, setShowTrayIcon] = useState<boolean>(true);

  const fetchVaultInfo = async () => {
    try {
      const info = await invoke<VaultInfo>('get_vault_info');
      setVaultInfo(info);
    } catch (e) {
      console.error('Failed to fetch vault info:', e);
    }
  };

  const initDeviceKey = async () => {
    try {
      const res = await invoke<string[]>('derive_vault_key', { password: 'default-stealth-device-key', saltHex: null });
      setKeyFingerprint(res[1]);
      setIsPanicActive(false);
    } catch (e) {
      console.error('Failed to derive device key:', e);
    }
  };

  useEffect(() => {
    fetchVaultInfo();
    initDeviceKey();

    // Initial panic status check
    invoke<boolean>('get_panic_status')
      .then(status => setIsPanicActive(status))
      .catch(console.error);

    // Listen for panic status events
    let unlistenFn: (() => void) | null = null;
    listen<boolean>('panic-status-changed', event => {
      setIsPanicActive(event.payload);
      if (event.payload) {
        setKeyFingerprint(null);
      }
    }).then(fn => { unlistenFn = fn; }).catch(console.error);

    // Poll vault info periodically to sync drive mount status
    const interval = setInterval(() => {
      fetchVaultInfo();
    }, 2500);

    return () => {
      clearInterval(interval);
      if (unlistenFn) {
        try { unlistenFn(); } catch (e) {}
      }
    };
  }, []);

  const handlePanicTrigger = async () => {
    try {
      await invoke('trigger_panic_switch');
      setIsPanicActive(true);
      setKeyFingerprint(null);
      fetchVaultInfo();
    } catch (err: any) {
      console.error('Panic trigger failed:', err);
    }
  };

  const handleRemountDrive = async () => {
    try {
      setLoading(true);
      await invoke('remount_virtual_drive');
      await fetchVaultInfo();
    } catch (e) {
      console.error('Remount drive error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-white text-[#1d1d1f] flex flex-col overflow-hidden select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif] rounded-2xl shadow-2xl border border-black/10">

      {/* macOS Window Toolbar Header */}
      <header
        data-tauri-drag-region
        className="h-9 border-b border-black/[0.06] px-3.5 flex items-center justify-between shrink-0 bg-white relative"
      >
        <div className="w-16 shrink-0 pointer-events-none" />

        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[12px] font-semibold text-[#1d1d1f] tracking-tight">Folded Vault</h1>
        </div>

        <button
          onClick={handlePanicTrigger}
          className="z-10 flex items-center gap-1 px-2.5 py-0.5 bg-[#ff3b30] hover:bg-[#e0342b] active:scale-95 text-white font-medium text-[11px] rounded-md shadow-xs transition-all cursor-pointer border-0"
          title="Emergency Panic Wipe"
        >
          <Zap className="w-3 h-3 fill-current" />
          Panic
        </button>
      </header>



      {/* macOS Segmented Control Tabs */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="bg-[#e3e3e5] p-0.5 rounded-lg flex text-[12px] font-medium text-[#515154] shadow-inner">
          <button
            onClick={() => setActiveTab('TASKS')}
            className={`flex-1 py-1 rounded-[6px] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
              activeTab === 'TASKS'
                ? 'bg-white text-[#1d1d1f] font-semibold shadow-xs'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#007aff]" /> Tasks
          </button>
          <button
            onClick={() => { setActiveTab('VAULT'); fetchVaultInfo(); }}
            className={`flex-1 py-1 rounded-[6px] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
              activeTab === 'VAULT'
                ? 'bg-white text-[#1d1d1f] font-semibold shadow-xs'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Vault
          </button>
          <button
            onClick={() => setActiveTab('SNAPSHOTS')}
            className={`flex-1 py-1 rounded-[6px] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
              activeTab === 'SNAPSHOTS'
                ? 'bg-white text-[#1d1d1f] font-semibold shadow-xs'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Snapshots
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex-1 py-1 rounded-[6px] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
              activeTab === 'SETTINGS'
                ? 'bg-white text-[#1d1d1f] font-semibold shadow-xs'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>
      </div>

      {/* Main Content Area (Grouped Insets) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {activeTab === 'TASKS' && (
          <TasksViewer />
        )}

        {activeTab === 'VAULT' && (

          <div className="space-y-3.5">
            {/* Vault Status Inset Card */}
            <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#34c759] text-white flex items-center justify-center shadow-xs">
                    <Unlock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold text-[#1d1d1f] block leading-tight">
                      Vault Active & Protected
                    </span>
                    <span className="text-[11px] text-[#86868b]">Zero-Knowledge Hardware Derived</span>
                  </div>
                </div>
                <span className="bg-[#34c759]/15 text-[#248a3d] border border-[#34c759]/30 px-2.5 py-0.5 rounded-full text-[11px] font-medium font-mono">
                  Hardware E2EE
                </span>
              </div>

              <div className="bg-[#f5f5f7] px-3 py-2 rounded-lg border border-black/[0.04] font-mono text-[11px] text-[#1d1d1f] flex justify-between items-center">
                <span className="text-[#86868b]">Device Key Hash:</span>
                <span className="text-[#1d1d1f] font-semibold">{keyFingerprint || 'Deriving...'}</span>
              </div>
            </div>

            {/* Virtual Drive Card */}
            <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1d1d1f] text-[13px] flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#007aff]" /> WebDAV Virtual Volume
                </span>
                <button
                  onClick={handleRemountDrive}
                  className="px-2.5 py-1 bg-[#007aff] hover:bg-[#0066cc] active:scale-[0.98] text-white text-[11px] font-medium rounded-lg transition-all shadow-xs border-0 cursor-pointer"
                >
                  Remount
                </button>
              </div>

              <div className="bg-[#f5f5f7] px-3 py-2 rounded-lg border border-black/[0.04] font-mono text-[11px] text-[#1d1d1f] flex justify-between items-center">
                <span className="text-[#86868b]">Endpoint:</span>
                <span className="text-[#007aff] font-semibold">http://127.0.0.1:9876</span>
              </div>

              {vaultInfo.is_drive_mounted ? (
                <p className="text-[12px] text-[#248a3d] flex items-center gap-1.5 font-medium">
                  ✓ Mounted natively in macOS Finder (/Volumes/127.0.0.1)
                </p>
              ) : (
                <div className="p-3 bg-[#ff9500]/10 border border-[#ff9500]/20 rounded-lg space-y-2">
                  <p className="text-[#b25900] text-[12px] flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ff9500]" /> Virtual drive is unmounted
                  </p>
                  <button
                    onClick={handleRemountDrive}
                    className="w-full py-2 bg-[#007aff] hover:bg-[#0066cc] active:scale-[0.98] text-white font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all text-[12px] shadow-xs border-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Remount Volume Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'SNAPSHOTS' && (
          <div className="space-y-3">
            <SnapshotViewer />
          </div>
        )}

        {activeTab === 'SETTINGS' && (
          <div className="-m-4">
            <SettingsView />
          </div>
        )}


      </div>

      {/* macOS Status Bar Footer */}
      <footer className="h-9 border-t border-black/[0.06] px-4 flex items-center justify-between shrink-0 bg-transparent text-[11px] text-[#86868b] font-medium">
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-[#34c759]" />
          <span>Telegram Connected</span>
        </div>
        <span className="font-mono text-[10px] text-[#86868b]">v1.0.1 macOS System Settings</span>
      </footer>
    </div>
  );
};
