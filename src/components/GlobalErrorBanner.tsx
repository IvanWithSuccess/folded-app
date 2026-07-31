import React, { useState, useEffect } from 'react';
import { WifiOff, AlertCircle, X, RefreshCw } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';

interface BannerNotice {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  isRetrying?: boolean;
}

export const GlobalErrorBanner: React.FC = () => {
  const [notice, setNotice] = useState<BannerNotice | null>(null);

  useEffect(() => {
    let unlistenNetwork: (() => void) | null = null;
    let unlistenSession: (() => void) | null = null;

    listen<{ message: string }>('network-warning', (event) => {
      setNotice({
        id: Date.now().toString(),
        type: 'warning',
        message: event.payload.message || 'Connection lost. Reconnecting to Telegram Cloud...',
        isRetrying: true,
      });
    }).then(fn => { unlistenNetwork = fn; }).catch(console.error);

    listen<{ message: string }>('session-warning', (event) => {
      setNotice({
        id: Date.now().toString(),
        type: 'error',
        message: event.payload.message || 'Telegram session issue detected. Check settings.',
        isRetrying: false,
      });
    }).then(fn => { unlistenSession = fn; }).catch(console.error);

    return () => {
      if (unlistenNetwork) try { unlistenNetwork(); } catch (e) {}
      if (unlistenSession) try { unlistenSession(); } catch (e) {}
    };
  }, []);

  if (!notice) return null;

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className={`px-3.5 py-2 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2.5 backdrop-blur-md ${
        notice.type === 'error'
          ? 'bg-red-500/90 text-white border-red-400'
          : 'bg-[#1d1d1f]/90 text-white border-black/10'
      }`}>
        {notice.isRetrying ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#007aff]" />
        ) : notice.type === 'error' ? (
          <AlertCircle className="w-3.5 h-3.5 text-white" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-[#ff9500]" />
        )}

        <span>{notice.message}</span>

        <button
          onClick={() => setNotice(null)}
          className="ml-1 p-0.5 hover:bg-white/20 rounded-md transition-all cursor-pointer border-0 text-white/80 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
