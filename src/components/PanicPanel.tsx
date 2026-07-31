import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Unlock, RefreshCw, EyeOff, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const PanicPanel: React.FC = () => {
  const [isPanicActive, setIsPanicActive] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [saltHex, setSaltHex] = useState<string | null>(null);
  const [keyFingerprint, setKeyFingerprint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check initial panic status
    invoke<boolean>('get_panic_status')
      .then(status => setIsPanicActive(status))
      .catch(console.error);

    // Listen for panic status events
    let unlistenFn: (() => void) | null = null;
    listen<boolean>('panic-status-changed', event => {
      setIsPanicActive(event.payload);
      if (event.payload) {
        setIsLocked(true);
        setKeyFingerprint(null);
      }
    }).then(fn => { unlistenFn = fn; }).catch(console.error);

    return () => {
      if (unlistenFn) {
        try { unlistenFn(); } catch (e) {}
      }
    };

  }, []);

  const handlePanicTrigger = async () => {
    try {
      await invoke('trigger_panic_switch');
      setIsPanicActive(true);
      setIsLocked(true);
      setKeyFingerprint(null);
    } catch (err: any) {
      setError(err?.toString() || 'Panic trigger failed');
    }
  };

  const handleUnlock = async () => {
    if (!masterPassword) return;
    try {
      setError(null);
      const res = await invoke<string[]>('derive_vault_key', {
        password: masterPassword,
        saltHex: saltHex,
      });
      setSaltHex(res[0]);
      setKeyFingerprint(res[1]);
      setIsLocked(false);
      setIsPanicActive(false);
      setMasterPassword('');
    } catch (err: any) {
      setError('Invalid master password or decryption error');
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-xl mx-auto my-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isPanicActive ? 'bg-red-500/20 text-red-400 border border-red-500/40' : keyFingerprint ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
            {isPanicActive ? <ShieldAlert className="w-6 h-6 animate-pulse" /> : keyFingerprint ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Stealth Vault Security</h2>
            <p className="text-xs text-slate-400">Zero-Knowledge E2EE Storage</p>
          </div>
        </div>

        <button
          onClick={handlePanicTrigger}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-lg shadow-red-900/30"
          title="Emergency Cache Shred & Unmount"
        >
          <Zap className="w-4 h-4" />
          Panic Wipe
        </button>
      </div>

      {isPanicActive ? (
        <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-center mb-6">
          <p className="text-red-300 font-semibold text-sm">🚨 PANIC MODE IS ACTIVE</p>
          <p className="text-xs text-red-400/80 mt-1">Local caches shredded. Drive unmounted. Enter Master Password to unlock vault.</p>
        </div>
      ) : keyFingerprint ? (
        <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-xl mb-6 flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-xs font-medium">Vault Unlocked & Active</p>
            <p className="text-slate-400 text-[11px] font-mono mt-0.5">Key Fingerprint: {keyFingerprint}</p>
          </div>
          <button
            onClick={() => {
              setIsLocked(true);
              setKeyFingerprint(null);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" /> Lock Vault
          </button>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          <p className="text-xs text-slate-400">Enter your Master Password to derive the Argon2id key and unlock encrypted vault access.</p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Master Password..."
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleUnlock}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition"
            >
              Unlock
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          <div className="text-slate-400 mb-1 flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            <span>Encryption</span>
          </div>
          <span className="font-semibold text-slate-200">XChaCha20-Poly1305</span>
        </div>
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          <div className="text-slate-400 mb-1 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Key Derivation</span>
          </div>
          <span className="font-semibold text-slate-200">Argon2id (Zero-Knowledge)</span>
        </div>
      </div>
    </div>
  );
};
