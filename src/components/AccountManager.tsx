import React, { useState, useEffect } from 'react';
import { LoginModal } from './LoginModal';
import { invoke } from '@tauri-apps/api/core';
import { 
  Plus, Users, LogOut, 
  RefreshCw, Cloud, HardDrive, Info, 
  User, CheckCircle2, Clock
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

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
  const { setAccounts: setGlobalAccounts } = useAppStore();
  const [showLogin, setShowLogin] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const accs = await invoke<Account[]>('get_accounts');
      setAccounts(accs);
      setGlobalAccounts(accs as any); // Sync with Sidebar and other global components
      if (accs.length === 0 && onAccountsEmpty) {
        onAccountsEmpty();
      }
    } catch (e) {
      console.error('Failed to fetch accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleLogout = async (id: string) => {
    if (!window.confirm('Disconnect this account from the cloud?')) return;
    try {
      await invoke('auth_logout', { accountId: id });
      fetchAccounts();
    } catch (e) {
      console.error('Logout failed:', e);
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
    <div className="flex flex-col gap-10 max-w-4xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Cloud size={20} className="text-blue-500" />
            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">Account Center</h2>
          </div>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-8">Manage your cloud storage nodes and identities</p>
        </div>
      </div>
      
      {/* Account List */}
      <div className="grid gap-6">
        {loading && accounts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <RefreshCw size={32} className="text-zinc-800 animate-spin" strokeWidth={1} />
            <div className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
              Synchronizing Storage Metadata...
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-zinc-900 rounded-[32px] bg-zinc-950/20">
            <Users size={48} className="mx-auto mb-6 text-zinc-900" strokeWidth={1} />
            <p className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.2em]">No Active Storage Nodes Detected</p>
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc.id} className="bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700 p-8 rounded-[32px] flex flex-col gap-8 transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-blue-500 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-xl">
                    <User size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-base font-black text-white tracking-tight">{acc.name}</div>
                      <CheckCircle2 size={14} className="text-blue-500" />
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">{acc.phone}</div>
                  </div>
                </div>
                
                <button 
                  className="p-3 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all active:scale-90"
                  onClick={() => handleLogout(acc.id)}
                  title="Disconnect Account"
                >
                  <LogOut size={20} />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950/50 rounded-2xl p-4 border border-zinc-900/50">
                   <div className="flex items-center gap-2 mb-3">
                     <HardDrive size={12} className="text-zinc-600" />
                     <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Cloud Storage Used</span>
                   </div>
                   <div className="flex items-end gap-2 mb-2">
                     <span className="text-xl font-black text-white leading-none">{formatBytes(acc.used_bytes)}</span>
                     <span className="text-[10px] font-bold text-zinc-700 mb-0.5 uppercase tracking-tighter">indexed</span>
                   </div>
                   <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                     <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest truncate">Live cloud indexing active</span>
                   </div>
                </div>

                <div className="bg-zinc-950/50 rounded-2xl p-4 border border-zinc-900/50">
                   <div className="flex items-center gap-2 mb-3">
                     <Clock size={12} className="text-zinc-600" />
                     <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Last Index Action</span>
                   </div>
                   <div className="flex flex-col">
                     <span className={`text-xs font-bold mb-1 ${acc.last_indexed_at ? 'text-zinc-400' : 'text-zinc-600 italic'}`}>
                       {acc.last_indexed_at ? formatDate(acc.last_indexed_at) : 'Not indexed yet'}
                     </span>
                     {acc.last_indexed_at && (
                       <span className="text-[9px] font-medium text-emerald-500/80 uppercase tracking-widest leading-none">
                         Full deep scan sync completed
                       </span>
                     )}
                     {!acc.last_indexed_at && (
                       <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest leading-none animate-pulse">
                         Initial metadata crawl pending
                       </span>
                     )}
                   </div>
                </div>
              </div>

              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
            </div>
          ))
        )}

        {/* Add Account Action */}
        <button 
          className="mt-4 p-12 border-2 border-dashed border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/10 rounded-[40px] flex flex-col items-center justify-center gap-6 group transition-all duration-500 cursor-pointer"
          onClick={() => setShowLogin(true)}
        >
          <div className="w-16 h-16 rounded-3xl bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-800 group-hover:text-blue-500 group-hover:border-blue-500/30 transition-all duration-500 group-hover:scale-110">
            <Plus size={32} strokeWidth={1} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-700 group-hover:text-white transition-colors duration-500">Add New Account</span>
            <span className="text-[9px] font-bold text-zinc-800 group-hover:text-zinc-500 uppercase tracking-widest transition-colors duration-500">Integrate another service identity</span>
          </div>
        </button>
      </div>

      {/* Cloud Limits Info Section */}
      <div className="mt-12 p-8 bg-zinc-950/30 border border-zinc-900/50 rounded-[32px] flex items-start gap-6 relative overflow-hidden group">
        <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-blue-500 shadow-xl group-hover:scale-110 transition-transform duration-500">
           <Info size={24} strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300 mb-4 flex items-center gap-2">
            Telegram Cloud Architecture
            <div className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[8px] text-blue-500 uppercase">System Info</div>
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Storage Capacity</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
                  Telegram provides <span className="text-zinc-400">capacity-free storage</span> for Saved Messages. Folded indexes your assets without enforcing any artificial limits on your total cloud volume.
                </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Individual File Limits</h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
                Standard accounts: <span className="text-zinc-400">2 GB per file</span>. Premium accounts: <span className="text-zinc-400">4 GB per file</span>. High-speed indexing active.
              </p>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -mb-32 -mr-32 pointer-events-none"></div>
      </div>

      {showLogin && (
        <LoginModal 
          onClose={() => setShowLogin(false)}
          onSuccess={() => fetchAccounts()}
        />
      )}
    </div>
  );
};
