import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/useAppStore';

export function useAppInitialization() {
  const { 
    setAccounts, 
    setAppState, 
    setSyncStatus, 
    setIsSyncing, 
    setActiveAccount,
    setActiveView 
  } = useAppStore();

  const startSync = useCallback(async (account: any) => {
    setIsSyncing(true);
    setSyncStatus('Indexing messages...', 20);
    
    try {
      // 1. Full index: scans Telegram messages, indexes notes
      setSyncStatus('Indexing database...', 30);
      await invoke('cluster_index_account', { accountId: account.id });
      
      // 2. Explicitly pull manifest to reconstruct folders (best-effort)
      setSyncStatus('Fetching cloud structure...', 70);
      try {
        await invoke('pull_manifest', { accountId: account.id });
      } catch (e) {
        console.warn('Manifest pull skipped or failed:', e);
      }
      
      setSyncStatus('Ready', 100);
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [setIsSyncing, setSyncStatus]);

  const checkOnboarding = useCallback(async () => {
    try {
      const onboarded = await invoke<string | null>('get_setting', { key: 'onboarded' });
      if (onboarded === 'true') {
        setAppState('READY');
      } else {
        setAppState('ONBOARDING');
      }
    } catch (e) {
      setAppState('READY');
    }
  }, [setAppState]);

  const initialize = useCallback(async () => {
    try {
      const accounts = await invoke<any[]>('get_accounts');
      setAccounts(accounts);
      
      if (accounts.length === 0) {
        setAppState('AUTH');
        return;
      }

      const expiredIds = await invoke<string[]>('verify_session_health');
      const healthyAccounts = accounts.filter(a => !expiredIds.includes(a.id));
      
      if (healthyAccounts.length === 0) {
        setAppState('AUTH');
        return;
      }

      const primary = healthyAccounts[0];
      setActiveAccount(primary.id);
      
      // Set to SYNCING state to show splash screen during first startup
      setAppState('SYNCING');
      setActiveView('FILES');
      
      await startSync(primary);
      
      // Once sync is done, set to READY
      setAppState('READY');
    } catch (e) {
      console.error('Initialization failed:', e);
      setAppState('AUTH');
    }
  }, [setAccounts, setAppState, setActiveAccount, setActiveView, startSync]);

  return { initialize, startSync, checkOnboarding };
}
