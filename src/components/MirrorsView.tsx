import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  RefreshCw, Plus, Trash2, Folder, 
  Clock, Activity, Settings, ExternalLink, 
  ShieldAlert, AlertTriangle, ChevronRight, X,
  MapPin, Edit3
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { listen } from '@tauri-apps/api/event';

interface MirrorRule {
  id: string;
  account_id: string;
  local_path: string;
  remote_folder_name: string;
  keep_history: boolean;
  enabled: boolean;
  last_sync_at?: number;
  status?: 'IDLE' | 'INDEXING' | 'SYNCING' | 'ERROR';
}

export const MirrorsView: React.FC = () => {
  const { navigateToPath } = useAppStore();
  const [rules, setRules] = useState<MirrorRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    let unlistenFn: (() => void) | null = null;

    const setupListener = async () => {
      try {
        const unlisten = await listen<{id: string, status: string}>('mirror-status-update', (event) => {
          if (!isMounted) return;
          setRules(prev => prev.map(r => 
            r.id === event.payload.id ? { ...r, status: event.payload.status as any } : r
          ));
        });
        if (isMounted) {
          unlistenFn = unlisten;
        } else {
          unlisten();
        }
      } catch (e) {
        console.error('Failed to setup mirror listener:', e);
      }
    };

    setupListener();
    
    return () => {
      isMounted = false;
      if (unlistenFn) unlistenFn();
    };
  }, []);
  
  const [newRule, setNewRule] = useState({
    accountId: '',
    localPath: '',
    keepHistory: true
  });
  
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const accs = await invoke<any[]>('get_accounts');
      setAccounts(accs);
      
      const mirrorRules = await invoke<MirrorRule[]>('get_mirror_rules');
      setRules(mirrorRules);
    } catch (e) {
      console.error('Failed to load mirrors:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectLocalPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Folder to Mirror'
      });
      if (selected && !Array.isArray(selected)) {
        setNewRule({ ...newRule, localPath: selected });
      }
    } catch (e) {
      console.error('Failed to open directory picker:', e);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.accountId || !newRule.localPath) return;
    
    try {
      if (editingRuleId) {
        // Simple update logic: remove and add
        // In a real app we'd have an update_mirror_rule command
        await invoke('remove_mirror_rule', { id: editingRuleId });
      }

      await invoke('add_mirror_rule', {
        accountId: newRule.accountId,
        localPath: newRule.localPath,
        keepHistory: newRule.keepHistory
      });
      
      setShowAddModal(false);
      setEditingRuleId(null);
      loadData();
    } catch (e) {
      console.error('Failed to add/update rule:', e);
    }
  };

  const handleToggleRule = async (id: string, enabled: boolean) => {
    try {
      await invoke('toggle_mirror_rule', { id, enabled });
      loadData();
    } catch (e) {
      console.error('Failed to toggle rule:', e);
    }
  };

  const handleRemoveRule = async (id: string) => {
    try {
      await invoke('remove_mirror_rule', { id });
      loadData();
    } catch (e) {
      console.error('Failed to remove rule:', e);
    }
  };

  const handleJumpToFolder = async (rule: MirrorRule) => {
    try {
      // 1. Find the root folder for this mirror (it's rule.remote_folder_name in root)
      const folders = await invoke<any[]>('list_folder_content', { 
        folderId: null, 
        accountId: rule.account_id 
      }).then(res => res[0]);
      
      // Handle "A/B/C" paths by taking the first part
      const baseName = rule.remote_folder_name.split('/')[0];
      const target = folders.find((f: any) => f.name === baseName);
      
      if (target) {
        navigateToPath(rule.account_id, [null, target.id]);
      } else {
        // If not found yet, maybe it hasn't synced. Just navigate to root of account
        navigateToPath(rule.account_id, [null]);
      }
    } catch (e) {
      console.error('Jump failed:', e);
    }
  };

  const handleEditRule = (rule: MirrorRule) => {
    setNewRule({
      accountId: rule.account_id,
      localPath: rule.local_path,
      keepHistory: rule.keep_history
    });
    setEditingRuleId(rule.id);
    setShowAddModal(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden animate-in fade-in duration-300">
      {/* Topbar matching FileManager Style */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-zinc-800 shrink-0" style={{ backgroundColor: '#0a0a0c' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-zinc-300">
            <RefreshCw size={14} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mirroring Manager</span>
          </div>
        </div>

        <button 
          onClick={() => {
            setEditingRuleId(null);
            setNewRule({ accountId: '', localPath: '', keepHistory: true });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-md transition-all border border-blue-500/20"
        >
          <Plus size={14} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-tight">Create Mirror</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Warning Banner - Subtle Zinc Style */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex gap-4 items-start">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Resource Usage Warning</span>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Real-time mirroring monitors every file change. For better battery life and CPU performance, avoid mirroring system folders or directories with frequently changing temporary files.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1">
          {rules.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-lg bg-zinc-900/10">
               <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">No active mirrors</span>
            </div>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className="group flex items-center justify-between p-4 bg-zinc-900/20 border border-transparent hover:border-zinc-800 hover:bg-zinc-900/40 rounded-lg transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-md border ${!rule.enabled ? 'bg-zinc-950 border-zinc-800 text-zinc-800' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>
                    <Folder size={16} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                       <span className={`text-[11px] font-bold ${!rule.enabled ? 'text-zinc-600' : 'text-white'}`}>{rule.local_path.split('/').pop()}</span>
                       <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.1em] px-1.5 py-0.5 bg-zinc-900 rounded border border-zinc-800">{accounts.find(a => a.id === rule.account_id)?.username || rule.account_id}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 mt-0.5">{rule.local_path}</span>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3 pr-4">
                    {rule.status && rule.status !== 'IDLE' && (
                      <div className="flex flex-col items-end mr-2">
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] animate-pulse">
                          {rule.status}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                          <RefreshCw size={10} className="text-blue-500/50 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Last Sync</span>
                      <span className="text-[11px] font-bold text-zinc-400">{rule.last_sync_at ? new Date(rule.last_sync_at * 1000).toLocaleTimeString() : '---'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 px-4 border-l border-zinc-800">
                     <div className="flex flex-col items-center gap-1">
                        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-tighter">History</span>
                        <div className={`w-2 h-2 rounded-full ${rule.keep_history ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'}`} />
                     </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleJumpToFolder(rule)}
                      className="p-2 text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                      title="Reveal in Explorer"
                    >
                      <MapPin size={14} />
                    </button>
                    <button 
                      onClick={() => handleEditRule(rule)}
                      className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                      title="Edit Rule"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                      className={`p-2 rounded-md transition-colors ${rule.enabled ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                      title={rule.enabled ? "Disable Mirror" : "Enable Mirror"}
                    >
                      <Activity size={14} className={rule.enabled ? "" : "opacity-40"} />
                    </button>
                    <button 
                      onClick={() => handleRemoveRule(rule.id)}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal - Matching FileModals style */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0c] border border-zinc-800/80 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-[#0a0a0c]">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Establish Sync Link</span>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-0.5">Target Cloud Account</label>
                <select 
                  value={newRule.accountId}
                  onChange={(e) => setNewRule({ ...newRule, accountId: e.target.value })}
                  className="w-full bg-[#050505] border border-zinc-800/80 text-white rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 appearance-none transition-all"
                >
                  <option value="">Select account...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.username || acc.id}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-0.5">Local Folder Path</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#050505] border border-zinc-800/80 text-zinc-500 rounded-xl px-4 py-3 text-[10px] font-mono truncate shadow-inner">
                    {newRule.localPath || 'No local directory selected'}
                  </div>
                  <button 
                    onClick={selectLocalPath}
                    className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 transition-all active:scale-95"
                  >
                    <Folder size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900/20 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-3">
                  <Clock size={14} className="text-zinc-500" />
                  <div>
                    <h4 className="text-white text-[11px] font-bold uppercase tracking-tight">Keep History</h4>
                    <p className="text-zinc-600 text-[9px] font-medium leading-none mt-1">Versioning Enabled</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNewRule({ ...newRule, keepHistory: !newRule.keepHistory })}
                  className={`w-10 h-5 rounded-full p-1 transition-colors ${newRule.keepHistory ? 'bg-blue-500' : 'bg-zinc-800'}`}
                >
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform ${newRule.keepHistory ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="p-6 bg-[#0a0a0c] border-t border-zinc-800 flex gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-zinc-800 transition-all rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddRule}
                disabled={!newRule.accountId || !newRule.localPath}
                className="flex-[2] py-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50 hover:text-blue-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] disabled:opacity-30 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Establish Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
