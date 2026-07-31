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
    <div className="flex-1 flex flex-col h-full bg-white text-[#1d1d1f] overflow-hidden select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif]">

      {/* Topbar */}
      <div className="h-13 flex items-center justify-between px-5 border-b border-black/[0.06] shrink-0 bg-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#007aff] text-white flex items-center justify-center shadow-xs">
            <Users size={14} />
          </div>
          <span className="text-[13px] font-semibold text-[#1d1d1f]">Account Center</span>
        </div>

        <button 
          onClick={() => setShowLogin(true)}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#007aff] hover:bg-[#0066cc] text-white text-[11px] font-semibold rounded-lg shadow-xs transition-all cursor-pointer border-0"
        >
          <Plus size={14} />
          <span>Add Account</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Info Banner */}
        <div className="bg-white border border-black/[0.04] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex gap-3 items-start">
          <Info size={18} className="text-[#007aff] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-[#1d1d1f]">Telegram Storage Mesh</span>
            <p className="text-[#86868b] text-[11px] leading-relaxed">
              Each connected account provides an independent storage node. Folded clusters these nodes into a single unified workspace.
            </p>
          </div>
        </div>

        {loading && accounts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center bg-white border border-black/[0.04] rounded-xl shadow-xs">
             <RefreshCw size={22} className="text-[#007aff] animate-spin mb-2" />
             <span className="text-xs font-semibold text-[#86868b]">Syncing Nodes...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center bg-white border border-black/[0.04] rounded-xl shadow-xs cursor-pointer hover:bg-slate-50 transition-all" onClick={() => setShowLogin(true)}>
             <Users size={28} className="text-[#86868b] mb-2" />
             <span className="text-xs font-semibold text-[#1d1d1f]">No Active Nodes Connected</span>
             <span className="text-[11px] text-[#007aff] font-medium mt-1">Click to add a Telegram account</span>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map(acc => (
              <div key={acc.id} className="p-4 bg-white border border-black/[0.04] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-[#007aff] border border-blue-500/20 flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                           <span className="text-[13px] font-semibold text-[#1d1d1f]">{acc.name}</span>
                           <div className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                        </div>
                        <span className="text-[11px] font-mono text-[#86868b]">{acc.phone}</span>
                      </div>
                   </div>

                   <button 
                      className="p-1.5 text-[#86868b] hover:text-[#ff3b30] hover:bg-red-50 rounded-md transition-all cursor-pointer border-0"
                      onClick={() => handleLogout(acc.id)}
                      title="Disconnect Account"
                    >
                      <LogOut size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                   <div className="bg-[#f5f5f7] rounded-lg p-2.5 border border-black/[0.04]">
                      <span className="text-[10px] font-medium text-[#86868b] block mb-0.5">Storage Used</span>
                      <span className="text-[12px] font-bold text-[#1d1d1f]">{formatBytes(acc.used_bytes)}</span>
                   </div>
                   <div className="bg-[#f5f5f7] rounded-lg p-2.5 border border-black/[0.04]">
                      <span className="text-[10px] font-medium text-[#86868b] block mb-0.5">Last Indexed</span>
                      <span className="text-[12px] font-bold text-[#1d1d1f] truncate block">{acc.last_indexed_at ? formatDate(acc.last_indexed_at).split(',')[0] : 'Never'}</span>
                   </div>
                   <div className="bg-[#f5f5f7] rounded-lg p-2.5 border border-black/[0.04]">
                      <span className="text-[10px] font-medium text-[#86868b] block mb-0.5">Status</span>
                      <span className="text-[11px] font-semibold text-[#248a3d]">Active Syncing</span>
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
