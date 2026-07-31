import React, { useState, useEffect } from 'react';
import { Activity, UploadCloud, DownloadCloud, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface PersistentTask {
  id: string;
  task_type: string;
  payload: string;
  status: 'PENDING' | 'RUNNING' | 'FAILED' | 'COMPLETED';
  retries: number;
  error?: string;
  created_at: number;
  updated_at: number;
  processed_files?: number;
  total_files?: number;
}

interface ProgressItem {
  file_id: string;
  file_name: string;
  status: string;
  processed_bytes: number;
  total_bytes: number;
  percent: number;
}

export const TasksViewer: React.FC = () => {
  const [tasks, setTasks] = useState<PersistentTask[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressItem>>({});

  const fetchActiveTasks = async () => {
    try {
      const activeTasks = await invoke<PersistentTask[]>('get_active_tasks');
      setTasks(activeTasks);
    } catch (e) {
      console.error('Failed to fetch active tasks:', e);
    }
  };

  useEffect(() => {
    fetchActiveTasks();

    let unlistenTask: (() => void) | null = null;
    let unlistenProgress: (() => void) | null = null;

    listen<{ id: string; status: string }>('task-status-change', (event) => {
      if (event.payload.status === 'COMPLETED' || event.payload.status === 'FAILED') {
        setProgressMap((prev) => {
          const next = { ...prev };
          delete next[event.payload.id];
          return next;
        });
      }
      fetchActiveTasks();
    }).then(fn => { unlistenTask = fn; }).catch(console.error);

    listen<ProgressItem>('upload-progress', (event) => {
      const payload = event.payload;
      if (!payload.total_bytes || payload.processed_bytes >= payload.total_bytes) {
        // Transfer completed -> remove immediately
        setProgressMap((prev) => {
          const next = { ...prev };
          delete next[payload.file_id];
          return next;
        });
      } else {
        const percent = Math.min(99, Math.round((payload.processed_bytes / payload.total_bytes) * 100));
        setProgressMap((prev) => ({
          ...prev,
          [payload.file_id]: {
            ...payload,
            percent,
          },
        }));
      }
    }).then(fn => { unlistenProgress = fn; }).catch(console.error);

    let unlistenFiles: (() => void) | null = null;

    listen('files-changed', () => {
      fetchActiveTasks();
    }).then(fn => { unlistenFiles = fn; }).catch(console.error);

    const interval = setInterval(fetchActiveTasks, 5000);

    return () => {
      clearInterval(interval);
      if (unlistenTask) { try { unlistenTask(); } catch (e) {} }
      if (unlistenProgress) { try { unlistenProgress(); } catch (e) {} }
      if (unlistenFiles) { try { unlistenFiles(); } catch (e) {} }
    };
  }, []);


  const parseTaskFileName = (task: PersistentTask) => {
    try {
      const data = JSON.parse(task.payload);
      return data.file_name || data.file_path || data.directory_path || 'Vault Asset Transfer';
    } catch (e) {
      return 'Vault Asset Transfer';
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Combine DB running tasks & live progress items
  const activeTaskIds = new Set(tasks.map(t => t.id));
  const liveProgressItems = Object.values(progressMap);

  const hasActiveTasks = tasks.length > 0 || liveProgressItems.length > 0;

  const progressItemsWithoutDbTask = liveProgressItems.filter(p => !activeTaskIds.has(p.file_id));

  return (
    <div className="space-y-3.5 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif]">
      <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-black/[0.04] text-[#1d1d1f] space-y-3.5">
        <div className="flex items-center justify-between border-b border-black/[0.04] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#007aff]/10 text-[#007aff] rounded-lg flex items-center justify-center border border-[#007aff]/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-[#1d1d1f]">Active File Transfers</h3>
              <p className="text-[11px] text-[#86868b]">Live Upload & Download Progress</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-[#007aff]/10 text-[#007aff] px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono">
              {tasks.length + progressItemsWithoutDbTask.length} Active
            </span>
          </div>
        </div>

        {/* Live Transfer Items */}
        <div className="space-y-2.5">
          {!hasActiveTasks ? (
            <div className="text-center py-8 text-[#86868b] space-y-1">
              <CheckCircle2 className="w-6 h-6 text-[#34c759] mx-auto opacity-80 mb-1" />
              <p className="text-xs font-medium text-[#1d1d1f]">No Active Transfers — System Idle</p>
              <p className="text-[11px]">Active file uploads and downloads will appear here with live progress.</p>
            </div>
          ) : (
            <>
              {/* Live Progress Items */}
              {liveProgressItems.map((item) => (
                <div
                  key={item.file_id}
                  className="p-3 bg-[#f5f5f7] border border-black/[0.04] rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="p-1.5 bg-white rounded-lg border border-black/[0.04] shrink-0">
                        <UploadCloud className="w-4 h-4 text-[#007aff]" />
                      </div>
                      <span className="font-semibold text-[#1d1d1f] text-[12px] truncate">{item.file_name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[#007aff] font-bold text-[12px]">{item.percent}%</span>
                      <RefreshCw className="w-3 h-3 animate-spin text-[#007aff]" />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#007aff] rounded-full transition-all duration-300"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-[#86868b] font-mono">
                      <span>Uploading to Telegram</span>
                      <span>{formatBytes(item.processed_bytes)} / {formatBytes(item.total_bytes)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* DB Pending/Running Tasks without live progress */}
              {tasks.filter(t => !progressMap[t.id]).map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-[#f5f5f7] border border-black/[0.04] rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                    <div className="p-1.5 bg-white rounded-lg border border-black/[0.04] shrink-0">
                      {task.task_type.includes('DELETE') ? (
                        <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                      ) : task.task_type.includes('DOWNLOAD') ? (
                        <DownloadCloud className="w-4 h-4 text-[#34c759]" />
                      ) : (
                        <UploadCloud className="w-4 h-4 text-[#007aff]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1d1d1f] text-[12px] truncate">{parseTaskFileName(task)}</p>
                      <p className="text-[11px] text-[#86868b] font-mono mt-0.5">{task.task_type}</p>
                    </div>
                  </div>

                  {task.status === 'COMPLETED' ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#34c759]/15 text-[#248a3d] font-semibold text-[11px] rounded-md border border-[#34c759]/30 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-[#34c759]" /> {task.task_type.includes('DELETE') ? 'Deleted' : 'Finished'}
                    </span>
                  ) : task.task_type.includes('DELETE') ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/15 text-[#ff3b30] font-semibold text-[11px] rounded-md border border-red-500/30 shrink-0">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Deleting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#007aff]/15 text-[#007aff] font-semibold text-[11px] rounded-md border border-[#007aff]/30 shrink-0">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Transferring...
                    </span>
                  )}


                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
