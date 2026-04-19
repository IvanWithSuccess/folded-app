import { create } from 'zustand';
import { AccountInfo, AppState } from '../types/auth';
import { ViewCategory } from '../types/file';

interface AppStore {
  // Auth & Session
  accounts: AccountInfo[];
  activeAccountId: string | null;
  appState: AppState;
  
  // Navigation
  activeView: ViewCategory;
  expandedAccounts: Set<string>;
  
  // Sync & Activity Status
  isSyncing: boolean;
  syncStatus: string | null;
  syncProgress: number;
  
  nodeStatus: 'ONLINE' | 'OFFLINE';
  activeTask: string | null;
  taskProgress: number;
  
  // Actions
  setAccounts: (accounts: AccountInfo[]) => void;
  setActiveAccount: (id: string | null) => void;
  setAppState: (state: AppState) => void;
  setActiveView: (view: ViewCategory) => void;
  toggleAccountExpanded: (id: string) => void;
  setSyncStatus: (status: string | null, progress?: number) => void;
  setIsSyncing: (syncing: boolean) => void;
  setNodeStatus: (status: 'ONLINE' | 'OFFLINE') => void;
  setActiveTask: (task: string | null, progress?: number) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  accounts: [],
  activeAccountId: null,
  appState: 'STARTUP',
  
  activeView: 'FILES',
  expandedAccounts: new Set(),
  
  isSyncing: false,
  syncStatus: null,
  syncProgress: 0,
  
  nodeStatus: 'ONLINE',
  activeTask: null,
  taskProgress: 0,
  
  setAccounts: (accounts) => set({ accounts }),
  setActiveAccount: (id) => set({ activeAccountId: id }),
  setAppState: (state) => set({ appState: state }),
  setActiveView: (view) => set({ activeView: view }),
  
  toggleAccountExpanded: (id) => set((state) => {
    const next = new Set(state.expandedAccounts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { expandedAccounts: next };
  }),
  
  setSyncStatus: (status, progress = 0) => set({ syncStatus: status, syncProgress: progress }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setNodeStatus: (status) => set({ nodeStatus: status }),
  setActiveTask: (task, progress = 0) => set({ activeTask: task, taskProgress: progress }),
}));
