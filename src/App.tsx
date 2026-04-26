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

// UI
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
    setActiveTask
  } = useAppStore();

  const { initialize, startSync, checkOnboarding } = useAppInitialization();
  useTaskSync();
  const taskTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Listen for backend progress events
  useEffect(() => {
    const unsubUpload = (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      return await listen<{ file_id: string; file_name: string; processed_bytes: number; total_bytes: number }>('upload-progress', (event) => {
        const progress = Math.round((event.payload.processed_bytes * 100) / event.payload.total_bytes);
        setActiveTask(event.payload.file_id, progress);
        
        if (taskTimeout.current) clearTimeout(taskTimeout.current);
        // taskTimeout.current = setTimeout(() => setActiveTask(null), 3000);
      });
    })();

    const unsubDownload = (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      return await listen<{ file_name: string; processed_bytes: number; total_bytes: number }>('download-progress', (event) => {
        const progress = Math.round((event.payload.processed_bytes * 100) / event.payload.total_bytes);
        setActiveTask(`Downloading: ${event.payload.file_name}`, progress);
        
        if (taskTimeout.current) clearTimeout(taskTimeout.current);
        taskTimeout.current = setTimeout(() => setActiveTask(null), 3000);
      });
    })();

    const unsubMirror = (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      return await listen<{ id: string; status: string }>('mirror-status-update', (event) => {
        useAppStore.getState().setMirrorStatus(event.payload.id, event.payload.status);
      });
    })();

    return () => {
      unsubUpload.then(u => u());
      unsubDownload.then(u => u());
      unsubMirror.then(u => u());
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#09090b] text-zinc-600">
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
    <div 
      className="flex h-screen w-screen overflow-hidden font-sans"
      style={{ backgroundColor: '#09090b', color: '#fafafa' }}
    >
      {/* Global Sidebar (Zustand-connected) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 h-full flex flex-col overflow-hidden relative">
        <AnimateContent key={activeView}>
           {activeView === 'FILES' && <FileManager />}
           {activeView === 'PHOTOS' && <FileManager category="PHOTOS" />}
           {activeView === 'DOCUMENTS' && <FileManager category="DOCUMENTS" />}
           {activeView === 'STARRED' && <FileManager category="STARRED" />}
           {activeView === 'NOTES' && <NotesView />}
           {activeView === 'ACCOUNTS' && (
             <AccountManager 
               onAccountsEmpty={() => setAppState('AUTH')} 
             />
           )}
           {activeView === 'MIRRORS' && <MirrorsView />}
           {activeView === 'SETTINGS' && (
             <SettingsView />
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
