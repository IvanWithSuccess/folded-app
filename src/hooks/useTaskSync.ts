import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../store/useAppStore';
import { PersistentTask } from '../types/file';

export const useTaskSync = () => {
  const { setQueueTasks, updateQueueTask } = useAppStore();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasks = await invoke<PersistentTask[]>('get_active_tasks');
        setQueueTasks(tasks);
      } catch (err) {
        console.error('Failed to fetch initial tasks:', err);
      }
    };

    fetchTasks();

    const unlistenPromise = listen<{ id: string; status: string; error?: string }>('task-status-change', (event) => {
      console.log('Task status changed:', event.payload);
      updateQueueTask(event.payload.id, event.payload.status, event.payload.error);
      
      // If a task completes, we might want to refresh the files view
      if (event.payload.status === 'COMPLETED') {
         // Optionally trigger a global refresh or wait for the next poll
         fetchTasks(); 
      }
    });

    // Periodic poll for extra safety
    const interval = setInterval(fetchTasks, 30000);

    return () => {
      unlistenPromise.then(unlisten => unlisten());
      clearInterval(interval);
    };
  }, []);
};
