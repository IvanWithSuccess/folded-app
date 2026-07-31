import React, { useState } from 'react';
import { Activity, Camera, Settings, Cloud } from 'lucide-react';
import { SnapshotViewer } from './SnapshotViewer';
import { SettingsView } from './SettingsView';
import { TasksViewer } from './TasksViewer';

export const CompactDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TASKS' | 'SNAPSHOTS' | 'SETTINGS'>('TASKS');

  return (
    <div className="w-full h-full bg-white text-[#1d1d1f] flex flex-col overflow-hidden select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif] rounded-2xl shadow-2xl border border-black/10">

      {/* macOS Window Toolbar Header */}
      <header
        data-tauri-drag-region
        className="h-10 border-b border-black/[0.06] px-4 flex items-center justify-between shrink-0 bg-[#f5f5f7] relative select-none"
      >
        <div className="w-16 shrink-0 pointer-events-none" />

        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[13px] font-semibold text-[#1d1d1f] tracking-tight">Folded Vault</h1>
        </div>

        <div className="flex items-center gap-1.5 z-10 text-[11px] font-medium text-[#34c759] bg-[#34c759]/10 border border-[#34c759]/20 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
          <span>Active</span>
        </div>
      </header>

      {/* macOS Segmented Control Tabs */}
      <div className="px-4 pt-3 pb-1 shrink-0 bg-white">
        <div className="bg-[#e3e3e5] p-0.5 rounded-lg flex text-[12px] font-medium text-[#515154] shadow-inner">
          <button
            onClick={() => setActiveTab('TASKS')}
            className={`flex-1 py-1.5 rounded-[6px] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
              activeTab === 'TASKS'
                ? 'bg-white text-[#1d1d1f] font-semibold shadow-xs'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#007aff]" /> Transfers
          </button>

          <button
            onClick={() => setActiveTab('SNAPSHOTS')}
            className={`flex-1 py-1.5 rounded-[6px] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
              activeTab === 'SNAPSHOTS'
                ? 'bg-white text-[#1d1d1f] font-semibold shadow-xs'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#007aff]" /> Snapshots
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex-1 py-1.5 rounded-[6px] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 ${
              activeTab === 'SETTINGS'
                ? 'bg-white text-[#1d1d1f] font-semibold shadow-xs'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-[#515154]" /> Settings
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-white">
        {activeTab === 'TASKS' && (
          <TasksViewer />
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
      <footer className="h-9 border-t border-black/[0.06] px-4 flex items-center justify-between shrink-0 bg-[#f5f5f7] text-[11px] text-[#86868b] font-medium">
        <div className="flex items-center gap-1.5">
          <Cloud className="w-3.5 h-3.5 text-[#34c759]" />
          <span>Telegram Cloud Sync Active</span>
        </div>
        <span className="font-mono text-[10px] text-[#86868b]">v1.0.1</span>
      </footer>
    </div>
  );
};


