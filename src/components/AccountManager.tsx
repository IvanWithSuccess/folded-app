import React, { useState, useEffect } from 'react';
import { LoginModal } from './LoginModal';
import { invoke } from '@tauri-apps/api/core';
import { confirm, message } from '@tauri-apps/plugin-dialog';
import { 
  Plus, Users, LogOut, 
  RefreshCw, Cloud, HardDrive, Info, 
  User, CheckCircle2, Clock, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAppInitialization } from '../hooks/useAppInitialization';

interface Account {
  id: string;
  phone: string;
  name: string;
  is_active: boolean;
  last_indexed_at: number | null;
  used_bytes: number;
}

interface AccountManagerProps {
  onAccountsEmpty?: () => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({ onAccountsEmpty }) => {
  const { setAccounts: setGlobalAccounts, logoutAccount: logoutGlobal } = useAppStore();
  const { initialize } = useAppInitialization();
  const [showLogin, setShowLogin] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    return () => setIsMounted(false);
  }, []);

  const fetchAccounts = async () => {
    if (!isMounted) return;
    setLoading(true);
    try {
      const accs = await invoke<Account[]>('get_accounts');
      if (isMounted) {
        setAccounts(accs);
        setGlobalAccounts(accs as any); 
        if (accs.length === 0 && onAccountsEmpty) {
          onAccountsEmpty();
        }
      }
    } catch (e) {
      console.error('Failed to fetch accounts:', e);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleLogout = async (id: string) => {
    const confirmed = await confirm('Disconnect this account from the cloud?');
    if (!confirmed) return;
    try {
      await invoke('auth_logout', { accountId: id });
      logoutGlobal(id);
      await fetchAccounts();
    } catch (e) {
      console.error('Logout failed:', e);
      await message('Logout failed: ' + ((e as Error).message || String(e)), { title: 'Auth Error', kind: 'error' });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-300">
      {/* Topbar matching industrial style */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-border shrink-0 bg-surface">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-zinc-300">
            <Users size={14} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Account Center</span>
          </div>
        </div>

        <button 
          onClick={() => setShowLogin(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-md transition-all border border-blue-500/20"
        >
          <Plus size={14} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-tight">Add Account</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex gap-4 items-start">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Telegram Storage Model</span>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Each connected account provides independent storage nodes. Folded clusters these nodes into a single unified workspace.
            </p>
          </div>
        </div>

        {loading && accounts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-lg">
             <RefreshCw size={24} className="text-zinc-800 animate-spin mb-4" strokeWidth={1} />
             <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Syncing Nodes...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-lg group hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => setShowLogin(true)}>
             <Users size={32} className="text-zinc-800 mb-4 group-hover:text-zinc-600 transition-colors" strokeWidth={1} />
             <span className="text-[10px] font-black text-zinc-700 group-hover:text-zinc-500 uppercase tracking-widest">No Active Nodes Detected</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {accounts.map(acc => (
              <div key={acc.id} className="group flex flex-col p-5 bg-zinc-900/20 border border-transparent hover:border-zinc-800 hover:bg-zinc-900/40 rounded-lg transition-all">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-blue-500 transition-colors">
                        <User size={18} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                           <span className="text-[12px] font-bold text-white">{acc.name}</span>
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 mt-0.5">{acc.phone}</span>
                      </div>
                   </div>

                   <button 
                      className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => handleLogout(acc.id)}
                    >
                      <LogOut size={14} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                   <div className="bg-zinc-950/50 rounded-md p-3 border border-zinc-900/50">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Storage Used</span>
                      <span className="text-sm font-bold text-zinc-300">{formatBytes(acc.used_bytes)}</span>
                   </div>
                   <div className="bg-zinc-950/50 rounded-md p-3 border border-zinc-900/50">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Last Indexed</span>
                      <span className="text-sm font-bold text-zinc-300 truncate">{acc.last_indexed_at ? formatDate(acc.last_indexed_at).split(',')[0] : 'Never'}</span>
                   </div>
                   <div className="bg-zinc-950/50 rounded-md p-3 border border-zinc-900/50 flex flex-col justify-center">
                      <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest block mb-1">Node Status</span>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Active Syncing</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLogin && (
        <LoginModal 
          onClose={() => setShowLogin(false)}
          onSuccess={async () => {
            setShowLogin(false);
            await initialize();
          }}
        />
      )}
    </div>
  );
};
