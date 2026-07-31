import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useTaskSync } from './hooks/useTaskSync';

// Components
import { LoginModal } from './components/LoginModal';
import { SyncSplashScreen } from './components/SyncSplashScreen';
import { OnboardingStorage } from './components/OnboardingStorage';
import { GitDashboard } from './components/GitDashboard';
import { GlobalErrorBanner } from './components/GlobalErrorBanner';
import { ErrorBoundary } from './components/ErrorBoundary';




// UI
import { applyTheme } from './theme/themes';
import { Loader2 } from 'lucide-react';
import appIcon from './assets/app-icon.png';

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

  // Listen for window resize to toggle body.is-fullscreen class
  useEffect(() => {
    const updateFullscreenState = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        const fullscreen = await win.isFullscreen();
        const maximized = await win.isMaximized();
        if (fullscreen || maximized) {
          document.body.classList.add('is-fullscreen');
        } else {
          document.body.classList.remove('is-fullscreen');
        }
      } catch (e) {
        const isFS = window.innerHeight === window.screen.height;
        if (isFS) {
          document.body.classList.add('is-fullscreen');
        } else {
          document.body.classList.remove('is-fullscreen');
        }
      }
    };

    updateFullscreenState();
    window.addEventListener('resize', updateFullscreenState);
    return () => {
      window.removeEventListener('resize', updateFullscreenState);
    };
  }, []);

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
          taskTimeout.current = setTimeout(() => setActiveTask(null), 3000);
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


        const uTaskStatus = await listen<{ id: string; status: string }>('task-status-change', (event) => {
          if (!isMounted) return;
          if (event.payload.status === 'COMPLETED' || event.payload.status === 'FAILED') {
            if (activeTask === event.payload.id) {
               setActiveTask(null);
            }
          }
        });
        unlistenFuncs.push(uTaskStatus);

        const uPanic = await listen<boolean>('panic-status-changed', (event) => {
          if (!isMounted) return;
          if (event.payload) {
            useAppStore.getState().setAccounts([]);
            useAppStore.getState().setAppState('AUTH');
          }
        });
        unlistenFuncs.push(uPanic);


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
  }, [setActiveTask, activeTask]);

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
      <div 
        data-tauri-drag-region
        className="h-screen w-screen flex flex-col items-center justify-center bg-[#f5f5f7] select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif] window-frame"
      >
        <div className="relative w-16 h-16 flex items-center justify-center mb-5">
          <img 
            src={appIcon} 
            alt="Folded Vault" 
            className="w-14 h-14 rounded-xl border border-black/[0.04] shadow-md bg-white p-1.5 object-contain"
          />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin text-[#007aff]" size={14} strokeWidth={2.5} />
          <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-[0.15em]">Connecting Node...</span>
        </div>
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
    <ErrorBoundary name="GIT_DASHBOARD">
      <GlobalErrorBanner />
      <GitDashboard />
    </ErrorBoundary>
  );
}




// Simple internal wrapper for transitions if needed
const AnimateContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-1 duration-300">
    {children}
  </div>
);

export default App;
