import { create } from 'zustand';
import { AccountInfo, AppState } from '../types/auth';
import { ViewCategory, PersistentTask } from '../types/file';

interface AppStore {
  // Auth & Session
  accounts: AccountInfo[];
  activeAccountId: string | null;
  appState: AppState;
  
  // Navigation
  activeView: ViewCategory;
  expandedAccounts: Set<string>;
  navigationPath: (string | null)[] | null;
  pendingRevealId: string | null;
  
  // Sync & Activity Status
  isSyncing: boolean;
  syncStatus: string | null;
  syncProgress: number;
  
  nodeStatus: 'ONLINE' | 'OFFLINE';
  activeTask: string | null;
  taskProgress: number;
  queueTasks: PersistentTask[];
  
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
  navigateToPath: (accountId: string, path: (string | null)[], revealId?: string | null) => void;
  setMirrorStatus: (id: string, status: string) => void;
  setQueueTasks: (tasks: PersistentTask[]) => void;
  updateQueueTask: (taskId: string, status: string, error?: string) => void;
  activeMirrors: Record<string, string>;
  logoutAccount: (id: string) => void;
  clearNavigation: () => void;

  // Theme
  theme: string;
  setTheme: (themeId: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  accounts: [],
  activeAccountId: null,
  appState: 'STARTUP',
  
  activeView: 'FILES',
  expandedAccounts: new Set(),
  navigationPath: null,
  pendingRevealId: null,
  
  isSyncing: false,
  syncStatus: null,
  syncProgress: 0,
  
  nodeStatus: 'ONLINE',
  activeTask: null,
  taskProgress: 0,
  queueTasks: [],

  theme: 'deep_dark',
  setTheme: (themeId) => set({ theme: themeId }),
  
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
  
  navigateToPath: (accountId, path, revealId = null) => set({ 
    activeAccountId: accountId,
    activeView: 'FILES',
    navigationPath: path,
    pendingRevealId: revealId
  }),
  
  clearNavigation: () => set({ navigationPath: null, pendingRevealId: null }),
  
  activeMirrors: {},
  setMirrorStatus: (id, status) => set((state) => ({
    activeMirrors: {
      ...state.activeMirrors,
      [id]: status
    }
  })),
  setQueueTasks: (tasks) => set({ queueTasks: tasks }),
  updateQueueTask: (taskId, status, error) => set((state) => ({
    queueTasks: state.queueTasks.map(t => 
      t.id === taskId ? { ...t, status: status as any, error, updated_at: Date.now() } : t
    )
  })),
  logoutAccount: (id) => set((state) => {
    const nextAccounts = state.accounts.filter(a => a.id !== id);
    const wasActive = state.activeAccountId === id;
    const shouldGoToAuth = nextAccounts.length === 0;
    
    return {
      accounts: nextAccounts,
      activeAccountId: wasActive ? (nextAccounts[0]?.id || null) : state.activeAccountId,
      appState: shouldGoToAuth ? 'AUTH' : state.appState
    };
  }),
}));
