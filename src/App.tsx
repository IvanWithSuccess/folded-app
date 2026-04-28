import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useTaskSync } from './hooks/useTaskSync';

// Components
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileManager } from './components/FileManager';
import { NotesView } from './components/NotesView';
import { AccountManager } from './components/AccountManager';
import { LoginModal } from './components/LoginModal';
import { SyncSplashScreen } from './components/SyncSplashScreen';
import { OnboardingStorage } from './components/OnboardingStorage';
import { SettingsView } from './components/SettingsView';
import { MirrorsView } from './components/MirrorsView';
import { ErrorBoundary } from './components/ErrorBoundary';

// UI
import { applyTheme } from './theme/themes';
import { Loader2 } from 'lucide-react';

function App() {
  const { 
    appState, 
    activeView, 
    syncStatus, 
    syncProgress, 
    activeAccountId,
    accounts,
    nodeStatus,
    activeTask,
    taskProgress,
    setAppState,
    setAccounts,
    setActiveAccount,
    setActiveView,
    setNodeStatus,
    setActiveTask,
    theme,
    setTheme
  } = useAppStore();

  const { initialize, startSync, checkOnboarding } = useAppInitialization();
  useTaskSync();
  const taskTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme globally
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    // Initial theme load
    const loadTheme = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const savedTheme = await invoke<string | null>('get_setting', { key: 'theme' });
        if (savedTheme) setTheme(savedTheme);
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    };
    loadTheme();
    initialize();
  }, [initialize, setTheme]);

  // Listen for backend progress events
  useEffect(() => {
    let unlistenFuncs: (() => void)[] = [];
    let isMounted = true;

    const setupListeners = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        
        const uUpload = await listen<{ file_id: string; file_name: string; processed_bytes: number; total_bytes: number }>('upload-progress', (event) => {
          if (!isMounted) return;
          const progress = Math.round((event.payload.processed_bytes * 100) / event.payload.total_bytes);
          setActiveTask(event.payload.file_id, progress);
          if (taskTimeout.current) clearTimeout(taskTimeout.current);
        });
        unlistenFuncs.push(uUpload);

        const uDownload = await listen<{ file_name: string; processed_bytes: number; total_bytes: number }>('download-progress', (event) => {
          if (!isMounted) return;
          const progress = Math.round((event.payload.processed_bytes * 100) / event.payload.total_bytes);
          setActiveTask(`Downloading: ${event.payload.file_name}`, progress);
          if (taskTimeout.current) clearTimeout(taskTimeout.current);
          taskTimeout.current = setTimeout(() => setActiveTask(null), 3000);
        });
        unlistenFuncs.push(uDownload);

        const uMirror = await listen<{ id: string; status: string }>('mirror-status-update', (event) => {
          if (!isMounted) return;
          useAppStore.getState().setMirrorStatus(event.payload.id, event.payload.status);
        });
        unlistenFuncs.push(uMirror);

      } catch (e) {
        console.error('Failed to setup global listeners:', e);
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      unlistenFuncs.forEach(fn => {
        try {
          fn();
        } catch (e) {
          console.error('Failed to unlisten:', e);
        }
      });
    };
  }, [setActiveTask]);

  // Update online status based on accounts AND actual connectivity
  useEffect(() => {
    const updateStatus = () => {
      const isOnline = navigator.onLine && accounts.length > 0;
      setNodeStatus(isOnline ? 'ONLINE' : 'OFFLINE');
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [accounts, setNodeStatus]);

  // Global Overlay States (Startup, Auth, Sync, Onboarding)
  if (appState === 'STARTUP') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-zinc-600">
        <Loader2 className="animate-spin mb-4" size={32} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Establishing Network Connection</span>
      </div>
    );
  }

  if (appState === 'AUTH') {
    return (
      <LoginModal 
        onClose={() => {}} 
        onSuccess={() => {
          initialize(); // Re-run init to pick up new accounts
        }} 
      />
    );
  }

  if (appState === 'SYNCING') {
    return (
      <SyncSplashScreen 
        status={syncStatus || ''} 
        progress={syncProgress} 
        onComplete={checkOnboarding} 
      />
    );
  }

  if (appState === 'ONBOARDING') {
    return (
      <OnboardingStorage 
        accountId={activeAccountId || accounts[0]?.id} 
        onComplete={() => setAppState('READY')} 
      />
    );
  }

  // --- Main Ready State ---
  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans bg-background text-foreground">
      {/* Global Sidebar (Zustand-connected) */}
      <ErrorBoundary name="SIDEBAR">
        <Sidebar />
      </ErrorBoundary>

      {/* Main Content Area */}
      <main className="flex-1 h-full flex flex-col overflow-hidden relative">
        <AnimateContent key={activeView}>
           {activeView === 'FILES' && (
             <ErrorBoundary name="FILE_MANAGER">
               <FileManager />
             </ErrorBoundary>
           )}
           {activeView === 'PHOTOS' && (
             <ErrorBoundary name="FILE_MANAGER_PHOTOS">
               <FileManager category="PHOTOS" />
             </ErrorBoundary>
           )}
           {activeView === 'DOCUMENTS' && (
             <ErrorBoundary name="FILE_MANAGER_DOCS">
               <FileManager category="DOCUMENTS" />
             </ErrorBoundary>
           )}
           {activeView === 'STARRED' && (
             <ErrorBoundary name="FILE_MANAGER_STARRED">
               <FileManager category="STARRED" />
             </ErrorBoundary>
           )}
           {activeView === 'NOTES' && (
             <ErrorBoundary name="NOTES_VIEW">
               <NotesView />
             </ErrorBoundary>
           )}
           {activeView === 'ACCOUNTS' && (
             <ErrorBoundary name="ACCOUNT_MANAGER">
               <AccountManager 
                 onAccountsEmpty={() => setAppState('AUTH')} 
               />
             </ErrorBoundary>
           )}
           {activeView === 'MIRRORS' && (
             <ErrorBoundary name="MIRRORS_VIEW">
               <MirrorsView />
             </ErrorBoundary>
           )}
           {activeView === 'SETTINGS' && (
             <ErrorBoundary name="SETTINGS_VIEW">
               <SettingsView />
             </ErrorBoundary>
           )}
        </AnimateContent>
      </main>
    </div>
  );
}

// Simple internal wrapper for transitions if needed
const AnimateContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-1 duration-300">
    {children}
  </div>
);

export default App;
