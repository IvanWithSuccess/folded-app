import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../store/useAppStore';
import { PersistentTask } from '../types/file';

export const useTaskSync = () => {
  const { setQueueTasks, updateQueueTask } = useAppStore();

  useEffect(() => {
    let isMounted = true;
    let unlistenFn: (() => void) | null = null;

    const fetchTasks = async () => {
      try {
        const tasks = await invoke<PersistentTask[]>('get_active_tasks');
        if (isMounted) setQueueTasks(tasks);
      } catch (err) {
        console.error('Failed to fetch initial tasks:', err);
      }
    };

    fetchTasks();

    const setupListener = async () => {
      try {
        const unlisten = await listen<{ id: string; status: string; error?: string }>('task-status-change', (event) => {
          if (!isMounted) return;
          console.log('Task status changed:', event.payload);
          updateQueueTask(event.payload.id, event.payload.status, event.payload.error);
          
          if (event.payload.status === 'COMPLETED') {
             fetchTasks(); 
          }
        });
        if (isMounted) {
          unlistenFn = unlisten;
        } else {
          unlisten();
        }
      } catch (e) {
        console.error('Failed to setup task listener:', e);
      }
    };

    setupListener();

    // Periodic poll for extra safety
    const interval = setInterval(() => {
      if (isMounted) fetchTasks();
    }, 30000);

    return () => {
      isMounted = false;
      if (unlistenFn) unlistenFn();
      clearInterval(interval);
    };
  }, [setQueueTasks, updateQueueTask]);
};
