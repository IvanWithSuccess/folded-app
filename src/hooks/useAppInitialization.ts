import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/useAppStore';
import { getErrorMessage } from '../utils/errorUtils';

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
    if (!account) return;
    setIsSyncing(true);
    setSyncStatus('Indexing messages...', 20);
    
    try {
      // 1. Full intelligent sync: manifest pull + burst message index + starts background crawler
      setSyncStatus('Synchronizing cloud storage...', 40);
      await invoke('sync_account', { accountId: account.id });
      
      setSyncStatus('Ready', 100);
    } catch (e) {
      const msg = getErrorMessage(e);
      console.error('Sync failed:', msg);
      setSyncStatus(`Sync issue: ${msg}`, 100);
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
        // Auto-configure to Saved Messages and skip selection screen
        console.log('Auto-configuring storage to Saved Messages...');
        await invoke('update_setting', { key: 'storage_hub_type', value: 'saved_messages' });
        await invoke('update_setting', { key: 'onboarded', value: 'true' });
        setAppState('READY');
      }
    } catch (e) {
      console.warn('Failed to check onboarding status, defaulting to READY:', getErrorMessage(e));
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

      // Set active account to the first one by default
      setActiveAccount(healthyAccounts[0].id);
      
      // Go directly to READY state (no syncing screen needed for local Git repositories)
      setAppState('READY');
    } catch (e) {
      console.error('Initialization failed:', getErrorMessage(e));
      setAppState('AUTH');
    }
  }, [setAccounts, setAppState, setActiveAccount, setActiveView, startSync]);

  return { initialize, startSync, checkOnboarding };
}
