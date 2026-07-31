import React, { useState, useEffect } from 'react';
import { Camera, Clock, RefreshCw, Smartphone, CheckCircle, CalendarClock, Trash2, RotateCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { confirm, message } from '@tauri-apps/plugin-dialog';

interface SnapshotRecord {
  id: string;
  seq: number;
  device_name: string;
  file_count: number;
  timestamp: number;
}

export const SnapshotViewer: React.FC = () => {
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [schedule, setSchedule] = useState<string>('OFF');
  const [isCapturing, setIsCapturing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const list = await invoke<SnapshotRecord[]>('list_snapshots');
      setSnapshots(list);
      const currentSchedule = await invoke<string>('get_snapshot_schedule');
      setSchedule(currentSchedule);
    } catch (e) {
      console.error('Failed to load snapshot data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    let unlisten: (() => void) | null = null;
    listen<SnapshotRecord[]>('snapshot-created', (event) => {
      setSnapshots(event.payload);
    }).then(fn => { unlisten = fn; }).catch(console.error);

    return () => {
      if (unlisten) {
        try { unlisten(); } catch (e) {}
      }
    };
  }, []);

  const handleCaptureSnapshot = async () => {
    setIsCapturing(true);
    try {
      const updatedList = await invoke<SnapshotRecord[]>('take_snapshot');
      setSnapshots(updatedList);
    } catch (e) {
      console.error('Failed to capture snapshot:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRestoreSnapshot = async (snap: SnapshotRecord) => {
    const confirmed = await confirm(`Restore vault state to Snapshot #${snap.seq}? Current active files will be replaced with files from this snapshot.`, { title: 'Restore Snapshot', kind: 'warning' });
    if (!confirmed) return;

    setRestoringId(snap.id);
    try {
      await invoke('restore_snapshot', { snapshotId: snap.id });
      await message(`Vault state successfully restored to Snapshot #${snap.seq}.`, { title: 'Restored', kind: 'info' });
    } catch (e) {
      console.error('Failed to restore snapshot:', e);
      await message('Failed to restore snapshot: ' + ((e as Error).message || String(e)), { title: 'Error', kind: 'error' });
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteSnapshot = async (snap: SnapshotRecord) => {
    const confirmed = await confirm(`Delete Snapshot #${snap.seq}? Any files exclusive to this snapshot will be permanently purged from Telegram.`, { title: 'Delete Snapshot', kind: 'warning' });
    if (!confirmed) return;

    setDeletingId(snap.id);
    try {
      const updatedList = await invoke<SnapshotRecord[]>('delete_snapshot', { snapshotId: snap.id });
      setSnapshots(updatedList);
    } catch (e) {
      console.error('Failed to delete snapshot:', e);
      await message('Failed to delete snapshot: ' + ((e as Error).message || String(e)), { title: 'Error', kind: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleScheduleChange = async (newSchedule: string) => {
    setSchedule(newSchedule);
    try {
      await invoke('set_snapshot_schedule', { schedule: newSchedule });
    } catch (e) {
      console.error('Failed to set snapshot schedule:', e);
    }
  };

  const formatDate = (epochSecs: number) => {
    if (!epochSecs) return 'Just now';
    const date = new Date(epochSecs * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-3.5 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif]">
      {/* Schedule Configuration Card */}
      <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#007aff]/10 text-[#007aff] rounded-lg flex items-center justify-center border border-[#007aff]/20">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-[#1d1d1f]">Automated Snapshot Schedule</h3>
              <p className="text-[11px] text-[#86868b]">Periodic ledger state backups</p>
            </div>
          </div>

          <select
            value={schedule}
            onChange={(e) => handleScheduleChange(e.target.value)}
            className="bg-[#f5f5f7] text-[#1d1d1f] text-xs font-semibold px-3 py-1.5 rounded-lg border border-black/[0.04] outline-none cursor-pointer"
          >
            <option value="OFF">Disabled (Manual Only)</option>
            <option value="HOURLY">Every Hour</option>
            <option value="DAILY">Every Day</option>
            <option value="WEEKLY">Every Week</option>
            <option value="MONTHLY">Every Month</option>
          </select>
        </div>
      </div>

      {/* Snapshot List Header & List */}
      <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-black/[0.04] text-[#1d1d1f] space-y-3.5">
        <div className="flex items-center justify-between border-b border-black/[0.04] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#007aff] text-white rounded-lg flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-[#1d1d1f]">Filesystem Snapshots</h3>
              <p className="text-[11px] text-[#86868b]">Point-in-Time Ledger Recovery</p>
            </div>
          </div>

          <button
            onClick={handleCaptureSnapshot}
            disabled={isCapturing}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#007aff] hover:bg-[#0066cc] active:scale-95 text-white text-[11px] font-medium rounded-lg shadow-xs transition-all cursor-pointer border-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCapturing ? 'animate-spin' : ''}`} />
            {isCapturing ? 'Saving...' : 'New Snapshot'}
          </button>
        </div>

        <div className="space-y-2">
          {snapshots.length === 0 ? (
            <div className="text-center py-6 text-[#86868b] space-y-1">
              <p className="text-xs font-medium">No snapshots captured yet</p>
              <p className="text-[11px]">Click "New Snapshot" above to save your first vault state.</p>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3 bg-[#f5f5f7] border border-black/[0.04] rounded-xl flex items-center justify-between text-xs hover:bg-[#ebebeb] transition-all"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-[#34c759] flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 font-mono font-semibold text-[#1d1d1f] text-[12px]">
                      <span>Snapshot #{snap.seq}</span>
                      <span className="text-[#86868b]">•</span>
                      <span className="text-[#515154] font-sans font-normal">{snap.file_count} Encrypted Files</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#86868b] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#86868b]" /> {formatDate(snap.timestamp)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-[#86868b]" /> {snap.device_name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreSnapshot(snap)}
                    disabled={restoringId === snap.id || deletingId === snap.id}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 active:scale-95 text-[#007aff] font-medium border border-black/[0.06] rounded-md text-[11px] shadow-xs cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <RotateCcw className={`w-3 h-3 ${restoringId === snap.id ? 'animate-spin' : ''}`} />
                    {restoringId === snap.id ? 'Restoring...' : 'Restore State'}
                  </button>

                  <button
                    onClick={() => handleDeleteSnapshot(snap)}
                    disabled={restoringId === snap.id || deletingId === snap.id}
                    className="p-1 text-[#86868b] hover:text-[#ff3b30] hover:bg-red-50 rounded-md transition-all cursor-pointer disabled:opacity-50"
                    title="Delete snapshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

};
