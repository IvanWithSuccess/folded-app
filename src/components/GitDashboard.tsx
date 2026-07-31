import React, { useState, useEffect } from 'react';
import { 
  GitFork, GitCommit, Plus, Trash2, Folder, 
  ArrowUp, ArrowDown, RefreshCw, Check, CheckSquare, 
  Square, User, Clock, Settings, LogOut, FileText,
  AlertCircle, AlertTriangle, ChevronRight, HardDrive, Terminal,
  Loader2
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open, confirm } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../store/useAppStore';
import { THEMES, applyTheme } from '../theme/themes';
import logoUrl from '../assets/logo.svg';

interface GitRepository {
  id: string;
  name: string;
  local_path: string;
  telegram_chat_id: string;
  current_head: string | null;
  remote_head: string | null;
  current_branch: string;
  created_at: number;
}

interface GitBranch {
  id: string;
  repository_id: string;
  name: string;
  head_commit_id: string | null;
  created_at: number;
}

interface GitCommitInfo {
  id: string;
  repository_id: string;
  parent_id: string | null;
  message_summary: string;
  message_description: string | null;
  author: string;
  timestamp: number;
  manifest_data: string;
  is_pushed: boolean;
}

interface FileChange {
  relative_path: String;
  status: 'added' | 'modified' | 'deleted';
}

interface DiffLine {
  line_type: 'added' | 'deleted' | 'unchanged';
  content: string;
  old_line_num: number | null;
  new_line_num: number | null;
}

interface RepoFileEntry {
  relative_path: string;
  size: number;
  sha256: string;
}

interface GitManifest {
  files: RepoFileEntry[];
}

export const GitDashboard: React.FC = () => {
  const { accounts, activeAccountId, setActiveAccount, logoutAccount, theme, setTheme } = useAppStore();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMac] = useState(() => {
    return typeof navigator !== 'undefined' && (
      navigator.userAgent.includes('Mac') ||
      navigator.platform.includes('Mac')
    );
  });
  
  // Lists & active selections
  const [repositories, setRepositories] = useState<GitRepository[]>([]);
  const [activeRepo, setActiveRepo] = useState<GitRepository | null>(null);
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [history, setHistory] = useState<GitCommitInfo[]>([]);
  
  // Account Status / Resilience states
  const [repoAccountStatus, setRepoAccountStatus] = useState<Record<string, boolean>>({});
  const [discoveredManifestRepos, setDiscoveredManifestRepos] = useState<any[]>([]);
  const [showManifestDiscoverModal, setShowManifestDiscoverModal] = useState(false);
  const [selectedDiscoverRepo, setSelectedDiscoverRepo] = useState<any | null>(null);
  const [discoverClonePath, setDiscoverClonePath] = useState('');

  // Selection details
  const [selectedChangeFile, setSelectedChangeFile] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<GitCommitInfo | null>(null);
  const [selectedCommitFile, setSelectedCommitFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<DiffLine[]>([]);
  const [commitFileList, setCommitFileList] = useState<RepoFileEntry[]>([]);

  // Selection states
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'CHANGES' | 'HISTORY'>('CHANGES');
  
  // Column Resizer States
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('folded-sidebar-width');
    return saved ? parseInt(saved, 10) : 300;
  });

  const [historySidebarWidth, setHistorySidebarWidth] = useState(() => {
    const saved = localStorage.getItem('folded-history-sidebar-width');
    return saved ? parseInt(saved, 10) : 280;
  });

  const isDraggingSidebar = React.useRef(false);
  const isDraggingHistorySidebar = React.useRef(false);
  const sidebarWidthRef = React.useRef(sidebarWidth);
  
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const handleResizeSidebar = React.useCallback((e: MouseEvent) => {
    if (!isDraggingSidebar.current) return;
    const newWidth = Math.max(200, Math.min(600, e.clientX));
    setSidebarWidth(newWidth);
    localStorage.setItem('folded-sidebar-width', newWidth.toString());
  }, []);

  const stopResizeSidebar = React.useCallback(() => {
    isDraggingSidebar.current = false;
    document.removeEventListener('mousemove', handleResizeSidebar);
    document.removeEventListener('mouseup', stopResizeSidebar);
    document.body.style.cursor = '';
    document.body.classList.remove('select-none');
  }, [handleResizeSidebar]);

  const startResizeSidebar = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSidebar.current = true;
    document.addEventListener('mousemove', handleResizeSidebar);
    document.addEventListener('mouseup', stopResizeSidebar);
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('select-none');
  }, [handleResizeSidebar, stopResizeSidebar]);

  const handleResizeHistorySidebar = React.useCallback((e: MouseEvent) => {
    if (!isDraggingHistorySidebar.current) return;
    const newWidth = Math.max(180, Math.min(500, e.clientX - sidebarWidthRef.current));
    setHistorySidebarWidth(newWidth);
    localStorage.setItem('folded-history-sidebar-width', newWidth.toString());
  }, []);

  const stopResizeHistorySidebar = React.useCallback(() => {
    isDraggingHistorySidebar.current = false;
    document.removeEventListener('mousemove', handleResizeHistorySidebar);
    document.removeEventListener('mouseup', stopResizeHistorySidebar);
    document.body.style.cursor = '';
    document.body.classList.remove('select-none');
  }, [handleResizeHistorySidebar]);

  const startResizeHistorySidebar = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingHistorySidebar.current = true;
    document.addEventListener('mousemove', handleResizeHistorySidebar);
    document.addEventListener('mouseup', stopResizeHistorySidebar);
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('select-none');
  }, [handleResizeHistorySidebar, stopResizeHistorySidebar]);

  // Clean up global drag listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeSidebar);
      document.removeEventListener('mouseup', stopResizeSidebar);
      document.removeEventListener('mousemove', handleResizeHistorySidebar);
      document.removeEventListener('mouseup', stopResizeHistorySidebar);
    };
  }, [handleResizeSidebar, stopResizeSidebar, handleResizeHistorySidebar, stopResizeHistorySidebar]);
  
  // Dialog / Input forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPath, setNewRepoPath] = useState('');
  const [newRepoAccount, setNewRepoAccount] = useState('');
  
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showRepoSettingsModal, setShowRepoSettingsModal] = useState(false);
  const [settingsRepoName, setSettingsRepoName] = useState('');
  const [settingsRepoPath, setSettingsRepoPath] = useState('');
  const [settingsRepoAccount, setSettingsRepoAccount] = useState('');
  const [cloneRepoId, setCloneRepoId] = useState('');
  const [clonePath, setClonePath] = useState('');
  const [cloneAccount, setCloneAccount] = useState('');
  const [discoveredRepos, setDiscoveredRepos] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState(false);

  const scanConnectedAccountsForManifests = async () => {
    if (accounts.length === 0) return;
    let discovered: any[] = [];
    for (const acc of accounts) {
      try {
        const manifestRepos = await invoke<any[]>('check_account_manifests', { telegramChatId: acc.id });
        for (const repo of manifestRepos) {
          if (!repo.already_exists_locally) {
            discovered.push({
              name: repo.name,
              created_at: repo.created_at,
              accountId: acc.id,
              accountName: acc.first_name || 'Telegram Account'
            });
          }
        }
      } catch (e) {
        console.error(`Failed to scan manifest for account ${acc.id}:`, e);
      }
    }
    if (discovered.length > 0) {
      setDiscoveredManifestRepos(discovered);
      setSelectedDiscoverRepo(discovered[0]);
      setShowManifestDiscoverModal(true);
    }
  };

  const checkRepoAccountStatus = async () => {
    try {
      const statuses = await invoke<any[]>('get_repo_account_status');
      const statusMap: Record<string, boolean> = {};
      for (const item of statuses) {
        statusMap[item.repo_id] = item.connected;
      }
      setRepoAccountStatus(statusMap);
    } catch (e) {
      console.error('Failed to check repo account status:', e);
    }
  };

  const discoverRepos = async (accountId: string) => {
    if (!accountId) return;
    setDiscovering(true);
    try {
      const list = await invoke<string[]>('discover_telegram_repositories', { telegramChatId: accountId });
      setDiscoveredRepos(list);
      if (list.length > 0) {
        setCloneRepoId(list[0]);
      } else {
        setCloneRepoId('');
      }
    } catch (e) {
      console.error('Failed to discover repos:', e);
      setDiscoveredRepos([]);
      setCloneRepoId('');
    } finally {
      setDiscovering(false);
    }
  };

  useEffect(() => {
    if (showCloneModal && cloneAccount) {
      discoverRepos(cloneAccount);
    }
  }, [showCloneModal, cloneAccount]);

  const [commitSummary, setCommitSummary] = useState('');
  const [commitDesc, setCommitDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);
  const [localFolderMissing, setLocalFolderMissing] = useState(false);
  const [commitsBehind, setCommitsBehind] = useState<number>(0);

  const checkUpdates = async () => {
    if (!activeRepo) return;
    try {
      const behind = await invoke<number>('check_remote_updates', { repoId: activeRepo.id });
      setCommitsBehind(behind);
    } catch (e) {
      console.error('Failed to check remote updates:', e);
    }
  };

  useEffect(() => {
    setCommitsBehind(0);
    checkUpdates();
    const interval = setInterval(checkUpdates, 3 * 60 * 1000); // Poll every 3 minutes
    return () => clearInterval(interval);
  }, [activeRepo]);

  useEffect(() => {
    let unlistenSync: (() => void) | null = null;
    let unlistenUpload: (() => void) | null = null;
    let unlistenDownload: (() => void) | null = null;

    async function setupListeners() {
      unlistenSync = await listen<{ progress: number; message: string }>('sync-progress', (event) => {
        setSyncProgress(event.payload.progress);
        setSyncStatus(event.payload.message);
        if (event.payload.progress >= 100) {
          setTimeout(() => {
            setSyncProgress(null);
            setSyncStatus(null);
          }, 1500);
        }
      });

      unlistenUpload = await listen<{ processed_bytes: number; total_bytes: number; file_name: string }>('upload-progress', (event) => {
        const { processed_bytes, total_bytes, file_name } = event.payload;
        if (total_bytes > 0) {
          const percent = Math.round((processed_bytes * 100) / total_bytes);
          setSyncStatus(`Uploading ${file_name}: ${percent}% (${Math.round(processed_bytes / 1024)} KB / ${Math.round(total_bytes / 1024)} KB)`);
        }
      });

      unlistenDownload = await listen<{ processed_bytes: number; total_bytes: number; file_name: string }>('download-progress', (event) => {
        const { processed_bytes, total_bytes, file_name } = event.payload;
        if (total_bytes > 0) {
          const percent = Math.round((processed_bytes * 100) / total_bytes);
          setSyncStatus(`Downloading ${file_name}: ${percent}% (${Math.round(processed_bytes / 1024)} KB / ${Math.round(total_bytes / 1024)} KB)`);
        }
      });
    }

    setupListeners();

    return () => {
      if (unlistenSync) unlistenSync();
      if (unlistenUpload) unlistenUpload();
      if (unlistenDownload) unlistenDownload();
    };
  }, []);

  // Branches states
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchFromCommit, setNewBranchFromCommit] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSourceBranch, setMergeSourceBranch] = useState('');

  // Initialize accounts
  useEffect(() => {
    if (accounts.length > 0 && !newRepoAccount) {
      setNewRepoAccount(accounts[0].id);
      setCloneAccount(accounts[0].id);
    }
    if (accounts.length > 0) {
      scanConnectedAccountsForManifests();
      checkRepoAccountStatus();
    }
  }, [accounts]);

  // Load repositories on mount
  useEffect(() => {
    loadRepositories();
  }, []);

  // Sync details when active repository changes
  useEffect(() => {
    setSelectedChangeFile(null);
    setSelectedCommit(null);
    setSelectedCommitFile(null);
    setFileDiff([]);
    if (activeRepo) {
      refreshRepoState();
    } else {
      setChanges([]);
      setHistory([]);
    }
  }, [activeRepo]);

  // Sync settings inputs when activeRepo changes
  const [activeMergeState, setActiveMergeState] = useState<any | null>(null);
  const [repoSettingsTab, setRepoSettingsTab] = useState<'GENERAL' | 'IGNORE'>('GENERAL');
  const [ignoredPatterns, setIgnoredPatterns] = useState<string[]>([]);
  const [newIgnorePattern, setNewIgnorePattern] = useState('');

  useEffect(() => {
    if (activeRepo) {
      setSettingsRepoName(activeRepo.name);
      setSettingsRepoPath(activeRepo.local_path);
      setSettingsRepoAccount(activeRepo.telegram_chat_id);
      if (showRepoSettingsModal) {
        setRepoSettingsTab('GENERAL');
        invoke<string[]>('read_ignored_patterns', { repoId: activeRepo.id })
          .then(setIgnoredPatterns)
          .catch(e => console.error('Failed to read ignore patterns:', e));
      }
    }
  }, [activeRepo, showRepoSettingsModal]);

  // Fetch diff when selected change file changes
  useEffect(() => {
    if (activeRepo && selectedChangeFile && activeTab === 'CHANGES') {
      fetchDiff(selectedChangeFile);
    }
  }, [selectedChangeFile, activeTab]);

  // Fetch diff when selected commit file changes
  useEffect(() => {
    if (activeRepo && selectedCommit && selectedCommitFile && activeTab === 'HISTORY') {
      fetchCommitFileDiff(selectedCommit, selectedCommitFile);
    }
  }, [selectedCommitFile, selectedCommit, activeTab]);

  // Auto-select first file when selectedCommit changes in History tab
  useEffect(() => {
    if (selectedCommit) {
      const commitFiles = getCommitChanges();
      if (commitFiles.length > 0) {
        if (!selectedCommitFile || !commitFiles.some(f => f.relative_path === selectedCommitFile)) {
          setSelectedCommitFile(commitFiles[0].relative_path);
        }
      } else {
        setSelectedCommitFile(null);
      }
    } else {
      setSelectedCommitFile(null);
    }
  }, [selectedCommit]);

  const loadRepositories = async () => {
    try {
      const list = await invoke<GitRepository[]>('list_repositories');
      setRepositories(list);
      await checkRepoAccountStatus();
      if (list.length > 0 && !activeRepo) {
        setActiveRepo(list[0]);
      }
    } catch (e) {
      console.error('Failed to load repos:', e);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    setTheme(themeId);
    applyTheme(themeId);
    try {
      await invoke('update_setting', { key: 'theme', value: themeId });
    } catch (e) {
      console.error(e);
    }
  };

  const loadBranches = async (repoId: string) => {
    try {
      const list = await invoke<GitBranch[]>('list_branches', { repoId });
      setBranches(list);
    } catch (e) {
      console.error('Failed to load branches:', e);
    }
  };

  const refreshRepoState = async () => {
    if (!activeRepo) return;
    try {
      await checkRepoAccountStatus();
      
      // Reload repo details to pick up head changes
      const all = await invoke<GitRepository[]>('list_repositories');
      const updated = all.find(r => r.id === activeRepo.id);
      if (updated) {
        if (updated.current_head !== activeRepo.current_head ||
            updated.remote_head !== activeRepo.remote_head ||
            updated.current_branch !== activeRepo.current_branch ||
            updated.local_path !== activeRepo.local_path ||
            updated.telegram_chat_id !== activeRepo.telegram_chat_id) {
          setActiveRepo(updated);
        }
        setCurrentBranch(updated.current_branch);
        await loadBranches(updated.id);
      }

      // Fetch changes (Status)
      try {
        const list = await invoke<FileChange[]>('get_repository_status', { repoId: activeRepo.id });
        setChanges(list);
        setLocalFolderMissing(false);
        
        // Auto-check all files by default
        const fileNames = list.map(f => f.relative_path.toString());
        setSelectedFiles(new Set(fileNames));

        // Auto-select the first file in changes if none is selected, or if the previously selected file is no longer in changes
        if (list.length > 0) {
          if (!selectedChangeFile || !fileNames.includes(selectedChangeFile)) {
            setSelectedChangeFile(list[0].relative_path.toString());
          }
        } else {
          setSelectedChangeFile(null);
        }
      } catch (e: any) {
        const msg = e ? e.toString() : '';
        if (msg.includes('does not exist') || msg.includes('directory') || msg.includes('Folder')) {
          setLocalFolderMissing(true);
          setChanges([]);
          setSelectedChangeFile(null);
        } else {
          console.error('Failed to get status:', e);
        }
      }
      
      // Fetch history for active branch
      if (updated) {
        const historyList = await invoke<GitCommitInfo[]>('get_branch_history', { 
          repoId: activeRepo.id,
          branchName: updated.current_branch 
        });
        setHistory(historyList);
      }

      try {
        const mergeState = await invoke<any>('read_merge_state', { repoId: activeRepo.id });
        setActiveMergeState(mergeState);
      } catch (e) {
        console.error('Failed to read merge state:', e);
      }
    } catch (e) {
      console.error('Failed to refresh repo:', e);
    }
  };

  const fetchDiff = async (relPath: string) => {
    if (!activeRepo) return;
    try {
      const diff = await invoke<DiffLine[]>('get_file_diff', { 
        repoId: activeRepo.id, 
        filePath: relPath 
      });
      setFileDiff(diff);
    } catch (e) {
      console.error('Failed to fetch diff:', e);
    }
  };

  const fetchCommitFileDiff = async (commit: GitCommitInfo, relPath: string) => {
    if (!activeRepo) return;
    try {
      const manifest = serdeParseManifest(commit.manifest_data);
      const fileEntry = manifest.files.find(f => f.relative_path === relPath);
      if (fileEntry) {
        const parentId = commit.parent_id || undefined;
        const diff = await invoke<DiffLine[]>('get_commit_file_diff', {
          repoId: activeRepo.id,
          filePath: relPath,
          commitId: commit.id,
          parentCommitId: parentId,
        });
        setFileDiff(diff);
      } else {
        setFileDiff([]);
      }
    } catch (e) {
      console.error('Failed to fetch commit file diff:', e);
      setFileDiff([]);
    }
  };

  const getCommitManifest = async (commitId: string): Promise<GitManifest | null> => {
    try {
      const commit = await invoke<GitCommitInfo | null>('get_commit', { commitId });
      if (commit) {
        return serdeParseManifest(commit.manifest_data);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const serdeParseManifest = (manifestStr: string): GitManifest => {
    try {
      return JSON.parse(manifestStr) as GitManifest;
    } catch (e) {
      return { files: [] };
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCommitChanges = () => {
    if (!selectedCommit) return [];
    const currentManifest = serdeParseManifest(selectedCommit.manifest_data);
    const parentCommit = history.find(c => c.id === selectedCommit.parent_id);
    
    if (!parentCommit) {
      return currentManifest.files.map(file => ({
        relative_path: file.relative_path,
        size: file.size,
        status: 'added' as const
      }));
    }

    const parentManifest = serdeParseManifest(parentCommit.manifest_data);
    const parentFilesMap = new Map(parentManifest.files.map(f => [f.relative_path, f]));
    const currentFilesMap = new Map(currentManifest.files.map(f => [f.relative_path, f]));

    const result: Array<{ relative_path: string; size: number; status: 'added' | 'modified' | 'deleted' }> = [];

    for (const file of currentManifest.files) {
      const parentFile = parentFilesMap.get(file.relative_path);
      if (!parentFile) {
        result.push({
          relative_path: file.relative_path,
          size: file.size,
          status: 'added'
        });
      } else if (parentFile.sha256 !== file.sha256) {
        result.push({
          relative_path: file.relative_path,
          size: file.size,
          status: 'modified'
        });
      }
    }

    for (const parentFile of parentManifest.files) {
      if (!currentFilesMap.has(parentFile.relative_path)) {
        result.push({
          relative_path: parentFile.relative_path,
          size: parentFile.size,
          status: 'deleted'
        });
      }
    }

    return result.sort((a, b) => a.relative_path.localeCompare(b.relative_path));
  };

  const handleCheckoutCommit = async (commitId: string) => {
    if (!activeRepo || loading) return;
    const isConfirmed = await confirm(`Are you sure you want to checkout commit "${selectedCommit?.message_summary || ''}"?\n\nThis will restore all files in your local project directory to match this commit state!`, {
      title: 'Checkout Commit',
      kind: 'warning',
    });
    if (!isConfirmed) return;

    setLoading(true);
    setSyncStatus('Checking out files from Telegram...');
    try {
      await invoke('checkout_repository_commit', {
        repoId: activeRepo.id,
        commitId: commitId,
      });
      await refreshRepoState();
      alert('Successfully checked out commit!');
    } catch (e) {
      alert('Error checking out commit: ' + e);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    if (!activeRepo || loading) return;
    setLoading(true);
    setSyncStatus(`Switching to branch '${branchName}'...`);
    try {
      await invoke('switch_branch', { repoId: activeRepo.id, name: branchName });
      await refreshRepoState();
      setSelectedCommit(null);
      setSelectedCommitFile(null);
      setFileDiff([]);
    } catch (e) {
      alert('Error switching branch: ' + e);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleCreateBranch = async () => {
    if (!activeRepo || !newBranchName.trim() || loading) return;
    setLoading(true);
    try {
      const commitId = newBranchFromCommit || undefined;
      await invoke('create_branch', { 
        repoId: activeRepo.id, 
        name: newBranchName.trim(),
        fromCommitId: commitId 
      });
      const targetName = newBranchName.trim();
      setNewBranchName('');
      setNewBranchFromCommit('');
      setShowNewBranchModal(false);
      
      await invoke('switch_branch', { repoId: activeRepo.id, name: targetName });
      await refreshRepoState();
    } catch (e) {
      alert('Error creating branch: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (!activeRepo || loading) return;
    const isConfirmed = await confirm(`Are you sure you want to delete branch "${branchName}"? This action cannot be undone.`, {
      title: 'Delete Branch',
      kind: 'warning',
    });
    if (!isConfirmed) return;

    setLoading(true);
    try {
      await invoke('delete_branch', { repoId: activeRepo.id, name: branchName });
      await loadBranches(activeRepo.id);
    } catch (e) {
      alert('Error deleting branch: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeBranch = async () => {
    if (!activeRepo || !mergeSourceBranch || loading) return;
    if (repoAccountStatus[activeRepo.id] === false) {
      alert('Cannot merge branches: linked Telegram account is disconnected.');
      return;
    }
    setLoading(true);
    setSyncStatus(`Merging branch '${mergeSourceBranch}' into '${currentBranch}'...`);
    try {
      await invoke('merge_branch', { 
        repoId: activeRepo.id, 
        sourceBranch: mergeSourceBranch, 
        targetBranch: currentBranch 
      });
      setShowMergeModal(false);
      setMergeSourceBranch('');
      await refreshRepoState();
      alert(`Successfully merged branch '${mergeSourceBranch}' into '${currentBranch}'!`);
    } catch (e) {
      if (e === 'MERGE_CONFLICTS') {
        setShowMergeModal(false);
        setMergeSourceBranch('');
        await refreshRepoState();
        alert('Merge conflicts detected! Please resolve conflicts in the files panel before committing.');
      } else {
        alert('Merge failed: ' + e);
      }
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleResolveConflict = async (relativePath: string, choice: 'current' | 'incoming') => {
    if (!activeRepo) return;
    setLoading(true);
    try {
      await invoke('resolve_conflict', {
        repoId: activeRepo.id,
        relativePath,
        choice,
      });
      await refreshRepoState();
    } catch (e) {
      alert('Failed to resolve conflict: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const handleAbortMerge = async () => {
    if (!activeRepo) return;
    const isConfirmed = await confirm(
      "Are you sure you want to abort this merge?\n\nThis will wipe all active conflict markers and restore your repository files to their clean pre-merge state. Uncommitted changes will be lost.",
      {
        title: 'Abort Merge',
        kind: 'warning',
      }
    );
    if (!isConfirmed) return;

    setLoading(true);
    setSyncStatus('Aborting merge and restoring files...');
    try {
      await invoke('abort_merge', { repoId: activeRepo.id });
      await refreshRepoState();
      alert('Merge aborted successfully. Repository restored.');
    } catch (e) {
      alert('Failed to abort merge: ' + e);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleSelectDirectory = async (type: 'NEW' | 'CLONE' | 'SETTINGS') => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Repository Directory',
      });
      if (selected && typeof selected === 'string') {
        if (type === 'NEW') {
          setNewRepoPath(selected);
          // Set repo name to folder name by default
          const name = selected.split(/[/\\]/).pop() || '';
          setNewRepoName(name);

          // Check for existing .folded.json config
          try {
            const config = await invoke<{ name: string; telegram_chat_id: string } | null>('read_folded_config', { path: selected });
            if (config) {
              setNewRepoName(config.name);
              setNewRepoAccount(config.telegram_chat_id);
            }
          } catch (e) {
            console.error('Failed to read config:', e);
          }
        } else if (type === 'CLONE') {
          setClonePath(selected);
        } else if (type === 'SETTINGS') {
          setSettingsRepoPath(selected);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRepo = async () => {
    if (!newRepoName || !newRepoPath || !newRepoAccount) return;
    setLoading(true);
    try {
      await invoke('create_repository', {
        name: newRepoName,
        path: newRepoPath,
        accountId: newRepoAccount
      });
      setShowAddModal(false);
      setNewRepoName('');
      setNewRepoPath('');
      await loadRepositories();
    } catch (e) {
      alert('Error creating repository: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneRepo = async () => {
    if (!cloneRepoId || !clonePath || !cloneAccount) return;
    setLoading(true);
    setSyncStatus('Cloning repository from Telegram...');
    try {
      await invoke('clone_repository', {
        localPath: clonePath,
        telegramChatId: cloneAccount,
        repositoryId: cloneRepoId
      });
      setShowCloneModal(false);
      setCloneRepoId('');
      setClonePath('');
      await loadRepositories();
    } catch (e) {
      alert('Error cloning repository: ' + e);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleRestoreMissingRepo = async () => {
    if (!activeRepo) return;
    setLoading(true);
    setSyncStatus('Recreating project folder and checking out files from Telegram...');
    try {
      await invoke('clone_repository', {
        localPath: activeRepo.local_path,
        telegramChatId: activeRepo.telegram_chat_id,
        repositoryId: activeRepo.id,
      });
      setLocalFolderMissing(false);
      await loadRepositories();
    } catch (e) {
      alert('Error restoring repository: ' + e);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleSaveRepoSettings = async () => {
    if (!activeRepo || !settingsRepoPath || !settingsRepoAccount) return;
    setLoading(true);
    try {
      if (settingsRepoAccount !== activeRepo.telegram_chat_id) {
        const isConfirmed = await confirm(
          `Change Telegram storage account for "${activeRepo.name}"?\n\nIf you relink this repository to a new account, please make sure the remote data exists in the new account, or you will need to push it there. Proceed?`,
          {
            title: 'Relink Telegram Account',
            kind: 'warning',
          }
        );
        if (!isConfirmed) {
          setLoading(false);
          return;
        }
      }

      await invoke('update_repository_settings', {
        repoId: activeRepo.id,
        newPath: settingsRepoPath,
        newAccountId: settingsRepoAccount,
      });

      await invoke('save_ignored_patterns', {
        repoId: activeRepo.id,
        patterns: ignoredPatterns,
      });

      setShowRepoSettingsModal(false);
      await loadRepositories();
    } catch (e) {
      alert('Error updating repository settings: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const handleWipeRemoteRepo = async () => {
    if (!activeRepo || loading) return;
    const isConfirmed = await confirm(
      `PERMANENTLY WIPE REMOTE REPOSITORY?\nThis will completely delete all commits, document manifests, and file chunks for "${activeRepo.name}" from your Telegram Saved Messages.\n\nTHIS CANNOT BE UNDONE. Are you sure?`,
      {
        title: 'Wipe Remote Repository',
        kind: 'warning',
      }
    );
    if (!isConfirmed) return;

    setLoading(true);
    setSyncStatus('Wiping remote repository files and history from Telegram...');
    try {
      await invoke('delete_remote_repository', { repoId: activeRepo.id });
      // Now also remove from local SQLite database mapping
      await invoke('delete_repository', { id: activeRepo.id });
      setActiveRepo(null);
      setShowRepoSettingsModal(false);
      await loadRepositories();
      alert('Remote repository wiped and local mapping removed!');
    } catch (e) {
      alert('Error wiping remote repository: ' + e);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    const isConfirmed = await confirm(
      "Are you sure you want to disconnect this Telegram account?\n\nThis will terminate the active session and remove its metadata. All linked repositories will be disabled until you link an account again.",
      {
        title: 'Disconnect Telegram Account',
        kind: 'warning',
      }
    );
    if (!isConfirmed) return;

    setLoading(true);
    setSyncStatus('Logging out account and purging session...');
    try {
      await invoke('auth_logout', { accountId });
      logoutAccount(accountId);
      setShowSettingsModal(false);
      alert('Telegram account disconnected successfully!');
    } catch (e) {
      alert('Failed to disconnect account: ' + e);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleDeleteRepo = async (id: string, name: string) => {
    if (loading) return;
    const isConfirmed = await confirm(`Remove repository "${name}" from Folded? This will NOT delete your local files.`, {
      title: 'Remove Repository',
      kind: 'warning',
    });
    if (isConfirmed) {
      setLoading(true);
      setSyncStatus(`Removing repository "${name}"...`);
      try {
        await invoke('delete_repository', { id });
        if (activeRepo?.id === id) {
          setActiveRepo(null);
        }
        await loadRepositories();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setSyncStatus(null);
      }
    }
  };

  const toggleSelectFile = (filePath: string) => {
    const next = new Set(selectedFiles);
    if (next.has(filePath)) {
      next.delete(filePath);
    } else {
      next.add(filePath);
    }
    setSelectedFiles(next);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === changes.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(changes.map(c => c.relative_path.toString())));
    }
  };

  const handleCommit = async () => {
    if (!activeRepo || !commitSummary || selectedFiles.size === 0) return;
    if (repoAccountStatus[activeRepo.id] === false) {
      alert('Cannot commit: linked Telegram account is disconnected.');
      return;
    }
    setLoading(true);
    try {
      // Get currently signed in user or default to "Me"
      const activeAccount = accounts.find(a => a.id === activeRepo.telegram_chat_id);
      const author = activeAccount?.first_name || 'Local Developer';

      await invoke('commit_changes', {
        repoId: activeRepo.id,
        messageSummary: commitSummary,
        messageDescription: commitDesc || null,
        author,
        filesToCommit: Array.from(selectedFiles),
      });

      setCommitSummary('');
      setCommitDesc('');
      setSelectedChangeFile(null);
      await refreshRepoState();
    } catch (e) {
      alert('Commit failed: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!activeRepo) return;
    if (repoAccountStatus[activeRepo.id] === false) {
      alert('Cannot push: linked Telegram account is disconnected.');
      return;
    }
    setLoading(true);
    setSyncStatus('Uploading commits to Telegram...');
    try {
      await invoke('push_commits', { repoId: activeRepo.id });
      await refreshRepoState();
    } catch (e) {
      alert('Push failed: ' + e);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handlePull = async () => {
    if (!activeRepo) return;
    if (repoAccountStatus[activeRepo.id] === false) {
      alert('Cannot pull: linked Telegram account is disconnected.');
      return;
    }
    setLoading(true);
    setSyncStatus('Downloading commits from Telegram...');
    try {
      await invoke('pull_commits', { repoId: activeRepo.id });
      setCommitsBehind(0);
      await refreshRepoState();
    } catch (e) {
      alert('Pull failed: ' + e);
    } finally {
      setLoading(false);
      setSyncStatus(null);
    }
  };

  const handleFetch = async () => {
    // For our simplified model, Fetch is same as Pull, it scans and downloads/indexes remote commits
    await handlePull();
  };

  // Compute unpushed commits count
  const unpushedCount = history.filter(c => !c.is_pushed).length;
  
  return (
    <div className="w-full h-full bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col overflow-hidden font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif] window-frame">
      
      {/* Top Header Controls (GitHub Desktop Style) */}
      <header 
        data-tauri-drag-region 
        className={`h-12 bg-[var(--app-surface)] border-b border-[var(--app-border)] flex items-center justify-between shrink-0 select-none ${isMac ? 'pl-20 pr-4' : 'px-4'}`}
      >
        <div className="flex items-center gap-6 z-10 pointer-events-auto">
          {/* Logo & Dropdown */}
          <div className="flex items-center gap-2.5">
            <img src={logoUrl} className="w-7 h-7 rounded-lg shadow-md shrink-0" alt="Folded Logo" />
            <div className="flex items-end gap-2">
              <div>
                <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block leading-none">Current Repository</span>
                <select
                  value={activeRepo?.id || ''}
                  onChange={(e) => {
                    const r = repositories.find(repo => repo.id === e.target.value);
                    if (r) setActiveRepo(r);
                  }}
                  className="bg-transparent text-[13px] font-semibold text-[var(--app-text)] outline-none cursor-pointer pr-4 border-0"
                >
                  {repositories.length === 0 ? (
                    <option value="" className="bg-[var(--app-surface)] text-[var(--app-text)]">No Repositories</option>
                  ) : (
                    repositories.map(repo => (
                      <option key={repo.id} value={repo.id} className="bg-[var(--app-surface)] text-[var(--app-text)]">
                        {repo.name} {repoAccountStatus[repo.id] === false ? '⚠ (Disconnected)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              <div className="flex items-center gap-1 mb-0.5">
                <button 
                  onClick={() => setShowAddModal(true)} 
                  title="Create Local Repository" 
                  className="p-1 hover:bg-[var(--app-bg)] rounded-md text-[var(--app-text-muted)] hover:text-blue-500 border-0 cursor-pointer flex items-center justify-center transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setShowCloneModal(true)} 
                  title="Clone Repository from Telegram" 
                  className="p-1 hover:bg-[var(--app-bg)] rounded-md text-[var(--app-text-muted)] hover:text-blue-500 border-0 cursor-pointer flex items-center justify-center transition-all"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Branch status */}
          {activeRepo && (
            <div className="h-8 w-px bg-[var(--app-border)]" />
          )}

          {activeRepo && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-[var(--app-text-muted)]" />
                <div>
                  <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block leading-none">Branch</span>
                  <select
                    value={currentBranch}
                    onChange={(e) => handleSwitchBranch(e.target.value)}
                    disabled={loading || branches.length === 0}
                    className="bg-transparent text-[13px] font-semibold text-[var(--app-text)] outline-none cursor-pointer pr-4 border-0 font-mono"
                  >
                    {branches.length === 0 ? (
                      <option value="main" className="bg-[var(--app-surface)] text-[var(--app-text)]">main</option>
                    ) : (
                      branches.map(b => (
                        <option key={b.id} value={b.name} className="bg-[var(--app-surface)] text-[var(--app-text)]">
                          {b.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setShowNewBranchModal(true)}
                  title="Create New Branch"
                  disabled={loading}
                  className="p-1 hover:bg-[var(--app-bg)] rounded-md text-[var(--app-text-muted)] hover:text-blue-500 border-0 cursor-pointer flex items-center justify-center transition-all disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {branches.length > 1 && (
                  <button
                    onClick={() => {
                      const other = branches.find(b => b.name !== currentBranch);
                      if (other) {
                        setMergeSourceBranch(other.name);
                        setShowMergeModal(true);
                      }
                    }}
                    title="Merge Branch"
                    disabled={loading}
                    className="p-1 hover:bg-[var(--app-bg)] rounded-md text-[var(--app-text-muted)] hover:text-blue-500 border-0 cursor-pointer flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    <GitFork className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="h-4 w-px bg-[var(--app-border)] mx-1" />
              
              <button 
                onClick={() => setShowRepoSettingsModal(true)} 
                title="Repository Settings"
                className="p-1 hover:bg-[var(--app-bg)] rounded-md text-[var(--app-text-muted)] hover:text-blue-500 border-0 cursor-pointer flex items-center justify-center transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Sync Controls */}
        {activeRepo && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleFetch}
              disabled={loading || repoAccountStatus[activeRepo.id] === false}
              className="px-3 py-1.5 bg-[var(--app-bg)] hover:bg-[var(--app-surface)] text-[12px] font-medium text-[var(--app-text)] rounded-lg flex items-center gap-1.5 cursor-pointer border border-[var(--app-border)] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading && syncStatus?.includes('Down') ? 'animate-spin' : ''}`} />
              Fetch origin
            </button>

            {unpushedCount > 0 ? (
              <button
                onClick={handlePush}
                disabled={loading || repoAccountStatus[activeRepo.id] === false}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white rounded-lg flex items-center gap-1.5 cursor-pointer border-0 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                Push {unpushedCount} commits
              </button>
            ) : commitsBehind > 0 ? (
              <button
                onClick={handlePull}
                disabled={loading || repoAccountStatus[activeRepo.id] === false}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-[12px] font-semibold text-white rounded-lg flex items-center gap-1.5 cursor-pointer border-0 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                Pull {commitsBehind} commits
              </button>
            ) : (
              <button
                disabled
                className="px-3.5 py-1.5 bg-[var(--app-bg)] text-[12px] font-semibold text-[var(--app-text-muted)] rounded-lg flex items-center gap-1.5 border border-[var(--app-border)]"
              >
                <Check className="w-3.5 h-3.5" />
                Synced with Telegram
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Repository Area */}
      {activeRepo ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {repoAccountStatus[activeRepo.id] === false && (
            <div className="bg-yellow-500/10 border-b border-yellow-500/25 px-4 py-2 flex items-center justify-between text-[12px] text-yellow-600 font-semibold shrink-0 select-none">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                <span>
                  The Telegram account associated with this repository is disconnected. Push, pull, and commits are disabled.
                </span>
              </div>
              <button
                onClick={() => setShowRepoSettingsModal(true)}
                className="px-2.5 py-1 bg-yellow-500/25 hover:bg-yellow-500/35 border border-yellow-500/30 text-yellow-700 hover:text-yellow-800 rounded font-bold cursor-pointer transition-all text-[11px]"
              >
                Re-link Account ▸
              </button>
            </div>
          )}
          {commitsBehind > 0 && repoAccountStatus[activeRepo.id] !== false && (
            <div className="bg-blue-500/10 border-b border-blue-500/25 px-4 py-2 flex items-center justify-between text-[12px] text-blue-600 font-semibold shrink-0 select-none animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <ArrowDown className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  Origin has {commitsBehind} newer commits. Click Pull to update your files.
                </span>
              </div>
              <button
                onClick={handlePull}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer border-0 shadow-md active:scale-95 transition-all text-[11px]"
              >
                Pull {commitsBehind} commits
              </button>
            </div>
          )}
          {activeMergeState && (
            <div className="bg-red-500/10 border-b border-red-500/25 px-4 py-2 flex items-center justify-between text-[12px] text-red-600 font-semibold shrink-0 select-none animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>
                  Merging branch <span className="font-mono bg-red-500/20 px-1.5 py-0.5 rounded text-red-700 font-bold">{activeMergeState.source_branch}</span> into <span className="font-mono bg-red-500/20 px-1.5 py-0.5 rounded text-red-700 font-bold">{activeMergeState.target_branch}</span>. Please resolve conflicts ({activeMergeState.conflicts.length} remaining) before committing.
                </span>
              </div>
              <button
                onClick={handleAbortMerge}
                disabled={loading}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg cursor-pointer border-0 shadow-md active:scale-95 transition-all text-[11px]"
              >
                Abort Merge
              </button>
            </div>
          )}
          <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Files List / Commit Form */}
          <div 
            style={{ width: sidebarWidth }}
            className="bg-[var(--app-surface)] flex flex-col shrink-0"
          >
            {/* Tabs Selector */}
            <div className="flex border-b border-[var(--app-border)] p-2 shrink-0">
              <button
                onClick={() => { setActiveTab('CHANGES'); setSelectedCommit(null); }}
                className={`flex-1 py-1 text-[12px] font-semibold rounded-md border cursor-pointer transition-all ${
                  activeTab === 'CHANGES'
                    ? 'bg-[var(--app-bg)] border-[var(--app-border)] text-[var(--app-text)] shadow-sm'
                    : 'bg-transparent border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                Changes ({changes.length})
              </button>
              <button
                onClick={() => { setActiveTab('HISTORY'); setSelectedChangeFile(null); }}
                className={`flex-1 py-1 text-[12px] font-semibold rounded-md border cursor-pointer transition-all ${
                  activeTab === 'HISTORY'
                    ? 'bg-[var(--app-bg)] border-[var(--app-border)] text-[var(--app-text)] shadow-sm'
                    : 'bg-transparent border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                History ({history.length})
              </button>
            </div>

            {/* Content Lists */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {activeTab === 'CHANGES' ? (
                /* Changes View */
                changes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[var(--app-text-muted)]">
                    <Check className="w-8 h-8 text-green-500/80 mb-2" />
                    <span className="text-[12px] font-medium">No uncommitted changes</span>
                    <span className="text-[10px] mt-1">Files in your repository match the last commit.</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Header Select All */}
                    <div 
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[var(--app-bg)] rounded-md cursor-pointer text-[12px] text-[var(--app-text-muted)] font-semibold"
                    >
                      {selectedFiles.size === changes.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-500" />
                      ) : selectedFiles.size > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-500/60" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <span>Select all {changes.length} files</span>
                    </div>

                    {/* Files Checklist */}
                    {changes.map(change => {
                      const pathStr = change.relative_path.toString();
                      const isSelected = selectedFiles.has(pathStr);
                      return (
                        <div
                          key={pathStr}
                          onClick={() => setSelectedChangeFile(pathStr)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-[12px] group ${
                            selectedChangeFile === pathStr
                              ? 'bg-blue-600/10 border border-blue-500/30 text-[var(--app-text)] font-semibold'
                              : 'hover:bg-[var(--app-bg)] border border-transparent text-[var(--app-text)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div 
                              onClick={(e) => { e.stopPropagation(); toggleSelectFile(pathStr); }}
                              className="cursor-pointer shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                              )}
                            </div>
                            <FileText className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
                            <span className="truncate font-mono" title={pathStr}>{pathStr}</span>
                          </div>
                          
                          {/* Status Tag */}
                          {activeMergeState?.conflicts?.some((c: any) => c.relative_path === pathStr) ? (
                            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 bg-yellow-500/15 text-yellow-600 border border-yellow-500/25 font-bold">
                              Conflict
                            </span>
                          ) : (
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                              change.status === 'added' 
                                ? 'bg-green-500/15 text-green-500 border border-green-500/25'
                                : change.status === 'modified'
                                ? 'bg-blue-500/15 text-blue-500 border border-blue-500/25'
                                : 'bg-red-500/15 text-red-500 border border-red-500/25'
                            }`}>
                              {change.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* History View */
                history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[var(--app-text-muted)]">
                    <AlertCircle className="w-8 h-8 mb-2 text-[var(--app-text-muted)]" />
                    <span className="text-[12px] font-medium">No commits yet</span>
                    <span className="text-[10px] mt-1">Make your first changes and commit them below.</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {history.map(commit => (
                      <div
                        key={commit.id}
                        onClick={async () => {
                          setSelectedCommit(commit);
                          setSelectedCommitFile(null);
                          setFileDiff([]);
                          const manifest = serdeParseManifest(commit.manifest_data);
                          setCommitFileList(manifest.files);
                          if (manifest.files.length > 0) {
                            setSelectedCommitFile(manifest.files[0].relative_path);
                          }
                        }}
                        className={`p-2.5 rounded-lg cursor-pointer text-left transition-all border ${
                          selectedCommit?.id === commit.id
                            ? 'bg-[var(--app-bg)] border-[var(--app-border)] text-[var(--app-text)] font-semibold shadow-sm'
                            : 'bg-transparent border-transparent text-[var(--app-text)] hover:bg-[var(--app-bg)]'
                        }`}
                      >
                        <span className="text-[12.5px] font-semibold block truncate leading-tight">
                          {commit.message_summary}
                        </span>
                        
                        <div className="flex items-center justify-between text-[10px] text-[var(--app-text-muted)] mt-1.5 font-mono">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {commit.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(commit.timestamp * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Pushed Status */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[9px] text-[var(--app-text-muted)] font-bold uppercase tracking-wider">
                            SHA: {commit.id.substring(0, 7)}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${
                            commit.is_pushed
                              ? 'bg-green-500/15 text-green-500 border-green-500/25'
                              : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/25'
                          }`}>
                            {commit.is_pushed ? 'PUSHED' : 'LOCAL'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Commit Input Box at Footer of Changes tab */}
            {activeTab === 'CHANGES' && changes.length > 0 && (
              <div className="p-3 border-t border-[var(--app-border)] bg-[var(--app-surface)] space-y-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">
                    Commit Author: {accounts.find(a => a.id === activeRepo.telegram_chat_id)?.first_name || 'Default Developer'}
                  </span>
                </div>
                
                <input
                  type="text"
                  placeholder="Commit summary (required)"
                  value={commitSummary}
                  onChange={(e) => setCommitSummary(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 transition-all font-medium"
                />

                <textarea
                  placeholder="Description (optional)"
                  value={commitDesc}
                  rows={2}
                  onChange={(e) => setCommitDesc(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[11px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 transition-all resize-none font-medium"
                />

                <button
                  onClick={handleCommit}
                  disabled={!commitSummary || selectedFiles.size === 0 || loading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[var(--app-bg)] text-white disabled:text-[var(--app-text-muted)] text-[12px] font-semibold rounded-lg border-0 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" /> Commit to main
                </button>
              </div>
            )}
          </div>

          {/* Left Sidebar Resizer Handle */}
          <div
            onMouseDown={startResizeSidebar}
            className="w-[1px] bg-[var(--app-border)] hover:bg-blue-500/50 active:bg-blue-500 cursor-col-resize shrink-0 transition-colors z-30 relative"
          >
            <div className="absolute -inset-x-2 top-0 bottom-0 cursor-col-resize" />
          </div>

          {/* Right panel: Workspace Diff Viewer / Commit Inspector */}
          <div className="flex-1 bg-[var(--app-bg)] flex flex-col overflow-hidden">
            {localFolderMissing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--app-bg)] max-w-xl mx-auto space-y-4">
                <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[var(--app-text)]">Local Project Folder Missing</h2>
                  <p className="text-[12px] text-[var(--app-text-muted)] mt-1.5 leading-relaxed font-semibold">
                    The local directory for this repository does not exist:<br />
                    <code className="bg-[var(--app-surface)] px-1.5 py-0.5 rounded text-blue-500 font-mono text-[11px] break-all block mt-2">{activeRepo.local_path}</code>
                  </p>
                  <p className="text-[11px] text-[var(--app-text-muted)] mt-2">
                    This database mapping is saved in Folded, and your commits and files are fully secured on Telegram. You can restore this repository now.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleRestoreMissingRepo}
                    disabled={loading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                  >
                    Recreate Folder & Restore
                  </button>
                  <button
                    onClick={() => handleDeleteRepo(activeRepo.id, activeRepo.name)}
                    disabled={loading}
                    className="px-4 py-2.5 bg-transparent border border-[var(--app-border)] hover:bg-[var(--app-surface)] text-[var(--app-text)] text-[12px] font-semibold rounded-lg cursor-pointer transition-all"
                  >
                    Remove Mapping
                  </button>
                </div>
              </div>
            ) : activeTab === 'CHANGES' ? (
              /* CHANGES TAB RIGHT PANE */
              selectedChangeFile ? (
                <div className="h-full flex flex-col overflow-hidden">
                  {/* File Header */}
                  <div className="h-10 bg-[var(--app-surface)] border-b border-[var(--app-border)] px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-[12.5px] font-mono text-[var(--app-text)] font-semibold">{selectedChangeFile}</span>
                    </div>
                  </div>

                  {activeMergeState?.conflicts?.some((c: any) => c.relative_path === selectedChangeFile) && (
                    <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3.5 flex flex-col gap-2 shrink-0 select-none animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-600 text-[12px] font-bold">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span>Merge Conflict in File</span>
                      </div>
                      <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed font-medium">
                        This file has conflicting modifications from both branches. Choose which version to keep:
                      </p>
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => handleResolveConflict(selectedChangeFile, 'current')}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg border-0 cursor-pointer text-[11px] font-bold shadow-sm transition-all active:scale-[0.98]"
                        >
                          Keep Current (HEAD)
                        </button>
                        <button
                          onClick={() => handleResolveConflict(selectedChangeFile, 'incoming')}
                          className="px-3.5 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg border-0 cursor-pointer text-[11px] font-bold shadow-sm transition-all active:scale-[0.98]"
                        >
                          Keep Incoming ({activeMergeState.source_branch})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lines Diff Box */}
                  <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg custom-scrollbar select-text m-2">
                    {fileDiff.length === 0 ? (
                      <span className="text-[var(--app-text-muted)] block italic">Empty file or no changes computed.</span>
                    ) : (
                      fileDiff.map((line, idx) => (
                        <div 
                          key={idx}
                          className={`flex whitespace-pre px-2.5 py-0.5 rounded-sm ${
                            line.line_type === 'added'
                              ? 'bg-green-500/10 text-green-500 border-l-[3px] border-green-500'
                              : line.line_type === 'deleted'
                              ? 'bg-red-500/10 text-red-500 border-l-[3px] border-red-500'
                              : 'text-[var(--app-text-muted)] border-l-[3px] border-transparent'
                          }`}
                        >
                          {/* Line Numbers */}
                          <span className="w-10 text-right select-none text-[var(--app-text-muted)] mr-4 text-[10px]">
                            {line.line_type === 'added' ? '' : line.old_line_num}
                          </span>
                          <span className="w-10 text-right select-none text-[var(--app-text-muted)] mr-4 text-[10px]">
                            {line.line_type === 'deleted' ? '' : line.new_line_num}
                          </span>
                          
                          {/* Prefix sign */}
                          <span className="w-4 select-none shrink-0 font-bold">
                            {line.line_type === 'added' ? '+' : line.line_type === 'deleted' ? '-' : ' '}
                          </span>
                          
                          {/* Code Content */}
                          <span>{line.content}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--app-text-muted)] space-y-3">
                  <div className="w-16 h-16 bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] flex items-center justify-center shadow-lg">
                    <FileText className="w-7 h-7 text-[var(--app-text-muted)]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold text-[var(--app-text)]">No file selected</h3>
                    <p className="text-[11px] mt-1">Select an item on the changes checklist to view its diff.</p>
                  </div>
                </div>
              )
            ) : (
              /* HISTORY TAB RIGHT PANE */
              selectedCommit ? (
                <div className="h-full flex flex-row overflow-hidden">
                  
                  {/* Commit metadata & files list */}
                  <div 
                    style={{ width: historySidebarWidth }}
                    className="bg-[var(--app-surface)] p-4 flex flex-col shrink-0"
                  >
                    <div className="space-y-3 pb-4 border-b border-[var(--app-border)] shrink-0">
                      <div>
                        <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Commit Header</span>
                        <h4 className="text-[13.5px] font-bold text-[var(--app-text)] leading-tight mt-1">{selectedCommit.message_summary}</h4>
                      </div>
                      
                      {selectedCommit.message_description && (
                        <div>
                          <span className="text-[9.5px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Description</span>
                          <p className="text-[11px] text-[var(--app-text-muted)] mt-1 leading-relaxed whitespace-pre-wrap">{selectedCommit.message_description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono text-[var(--app-text-muted)] bg-[var(--app-bg)] p-2 rounded-md border border-[var(--app-border)]">
                        <div>
                          <span className="text-[9px] text-[var(--app-text-muted)] block">SHA</span>
                          <span className="font-semibold">{selectedCommit.id.substring(0, 10)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[var(--app-text-muted)] block">Status</span>
                          <span className={selectedCommit.is_pushed ? 'text-green-400 font-semibold' : 'text-yellow-400 font-semibold'}>
                            {selectedCommit.is_pushed ? 'Pushed' : 'Local'}
                          </span>
                        </div>
                      </div>

                      {/* Checkout Commit / Rollback Button */}
                      <div className="pt-1 flex flex-col gap-2">
                        {activeRepo.current_head === selectedCommit.id ? (
                          <div className="w-full py-2 bg-green-500/10 text-green-500 border border-green-500/25 text-[12px] font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-default select-none">
                            <Check className="w-4 h-4" /> Active Commit (HEAD)
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCheckoutCommit(selectedCommit.id)}
                            disabled={loading}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                          >
                            <Clock className="w-4 h-4" /> Checkout Commit
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setNewBranchFromCommit(selectedCommit.id);
                            setNewBranchName('');
                            setShowNewBranchModal(true);
                          }}
                          disabled={loading}
                          className="w-full py-2 bg-transparent hover:bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-text)] text-[12px] font-semibold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
                        >
                          <GitFork className="w-3.5 h-3.5" /> Branch from Commit
                        </button>
                      </div>
                    </div>

                    {/* Files modified in commit */}
                    <div className="flex-1 flex flex-col overflow-hidden pt-4">
                      {(() => {
                        const changesList = getCommitChanges();
                        return (
                          <>
                            <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-2 shrink-0">
                              Files Changed ({changesList.length})
                            </span>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                              {changesList.map(file => (
                                <div
                                  key={file.relative_path}
                                  onClick={() => setSelectedCommitFile(file.relative_path)}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-[12px] font-mono transition-all group ${
                                    selectedCommitFile === file.relative_path
                                      ? 'bg-blue-600/10 text-[var(--app-text)] border border-blue-500/30 font-semibold'
                                      : 'hover:bg-[var(--app-bg)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate pr-2">
                                    <FileText className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
                                    <span className="truncate" title={file.relative_path}>{file.relative_path}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[9.5px] text-[var(--app-text-muted)] opacity-85 group-hover:opacity-100">{formatBytes(file.size)}</span>
                                    <span className={`text-[8.5px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 ${
                                      file.status === 'added' 
                                        ? 'bg-green-500/15 text-green-500 border border-green-500/20'
                                        : file.status === 'modified'
                                        ? 'bg-blue-500/15 text-blue-500 border border-blue-500/20'
                                        : 'bg-red-500/15 text-red-500 border border-red-500/20'
                                    }`}>
                                      {file.status === 'added' ? '+' : file.status === 'modified' ? 'M' : '-'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* History Resizer Handle */}
                  <div
                    onMouseDown={startResizeHistorySidebar}
                    className="w-[1px] bg-[var(--app-border)] hover:bg-blue-500/50 active:bg-blue-500 cursor-col-resize shrink-0 transition-colors z-30 relative"
                  >
                    <div className="absolute -inset-x-2 top-0 bottom-0 cursor-col-resize" />
                  </div>

                  {/* Commit File Diff panel */}
                  <div className="flex-1 bg-[var(--app-bg)] flex flex-col overflow-hidden">
                    {selectedCommitFile ? (
                      <div className="h-full flex flex-col overflow-hidden">
                        <div className="h-10 bg-[var(--app-surface)] border-b border-[var(--app-border)] px-4 flex items-center justify-between shrink-0">
                          <span className="text-[12.5px] font-mono text-[var(--app-text)] font-semibold truncate">
                            {selectedCommitFile}
                          </span>
                          {loading && (
                            <span className="text-[10px] text-[var(--app-text-muted)] flex items-center gap-1">
                              <Loader2 className="animate-spin text-blue-500" size={12} />
                              Loading...
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg custom-scrollbar select-text m-2">
                          {loading && fileDiff.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--app-text-muted)]">
                              <Loader2 className="animate-spin text-blue-500" size={16} />
                              <span>Generating Diff...</span>
                            </div>
                          ) : fileDiff.length === 0 ? (
                            <span className="text-[var(--app-text-muted)] block italic text-center py-10">
                              No changes in this file.
                            </span>
                          ) : (
                            fileDiff.map((line, idx) => (
                              <div 
                                key={idx}
                                className={`flex whitespace-pre px-2.5 py-0.5 rounded-sm ${
                                  line.line_type === 'added'
                                    ? 'bg-green-500/10 text-green-500 border-l-[3px] border-green-500'
                                    : line.line_type === 'deleted'
                                    ? 'bg-red-500/10 text-red-500 border-l-[3px] border-red-500'
                                    : 'text-[var(--app-text-muted)] border-l-[3px] border-transparent'
                                }`}
                              >
                                <span className="w-10 text-right select-none text-[var(--app-text-muted)] mr-4 text-[10px]">
                                  {line.line_type === 'added' ? '' : line.old_line_num}
                                </span>
                                <span className="w-10 text-right select-none text-[var(--app-text-muted)] mr-4 text-[10px]">
                                  {line.line_type === 'deleted' ? '' : line.new_line_num}
                                </span>
                                <span className="w-4 select-none shrink-0 font-bold">
                                  {line.line_type === 'added' ? '+' : line.line_type === 'deleted' ? '-' : ' '}
                                </span>
                                <span>{line.content}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--app-text-muted)]">
                        <FileText className="w-10 h-10 mb-2 text-[var(--app-text-muted)]" />
                        <h4 className="text-[12.5px] font-semibold text-[var(--app-text)]">No file selected</h4>
                        <p className="text-[10px] mt-1">Select a file from the list to view its changes in this commit.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--app-text-muted)]">
                  <Clock className="w-12 h-12 mb-3 text-[var(--app-text-muted)]" />
                  <h3 className="text-[13.5px] font-semibold text-[var(--app-text)]">No commit selected</h3>
                  <p className="text-[11px] mt-1">Select a commit from the history list to inspect its contents.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
      ) : (
        /* NO ACTIVE REPOSITORY SCREEN */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--app-bg)]">
          <img src={logoUrl} className="w-20 h-20 mb-6 shadow-xl rounded-[22px] animate-pulse shrink-0" alt="Folded Logo" />
          <h2 className="text-[18px] font-bold text-[var(--app-text)] tracking-tight">Welcome to Folded Desktop</h2>
          <p className="text-[12px] text-[var(--app-text-muted)] mt-2 max-w-[380px] leading-relaxed">
            Create or clone Git-style repositories that securely store their version history and file chunks inside your Telegram Saved Messages.
          </p>

          <div className="mt-8 flex flex-col gap-3 w-[280px]">
            <button
              onClick={() => setShowAddModal(true)}
              className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[13px] rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Local Repository
            </button>
            <button
              onClick={() => setShowCloneModal(true)}
              className="py-2.5 bg-[var(--app-surface)] hover:bg-[var(--app-bg)] text-[var(--app-text)] font-semibold text-[13px] rounded-lg border border-[var(--app-border)] cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Clone Repository from Telegram
            </button>
          </div>
        </div>
      )}

      {/* FOOTER BAR */}
      <footer className="h-10 bg-[var(--app-surface)] border-t border-[var(--app-border)] px-4 flex items-center justify-between shrink-0 select-none text-[11px] text-[var(--app-text-muted)] font-medium">
        <div className="flex items-center gap-2">
          {activeRepo ? (
            <>
              <Terminal className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-mono text-[10.5px] truncate max-w-[400px] text-[var(--app-text)]">Path: {activeRepo.local_path}</span>
            </>
          ) : (
            <span>No repository linked</span>
          )}
        </div>

        {/* Global actions: Settings, logout, repo add */}
        <div className="flex items-center gap-3">
          {activeRepo && (
            <button
              onClick={() => handleDeleteRepo(activeRepo.id, activeRepo.name)}
              className="text-[var(--app-text-muted)] hover:text-red-400 bg-transparent border-0 cursor-pointer flex items-center gap-1 transition-all"
              title="Remove repository mapping"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove Repo
            </button>
          )}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] bg-transparent border-0 cursor-pointer flex items-center gap-1 transition-all font-semibold"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-blue-400 hover:text-blue-300 bg-transparent border-0 cursor-pointer flex items-center gap-1 transition-all font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Add Repo
          </button>
        </div>
      </footer>

      {/* SYNC OVERLAY / LOADER */}
      {syncStatus && (
        <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[var(--app-surface)] rounded-2xl p-6 border border-[var(--app-border)] shadow-2xl flex flex-col items-center w-[320px] text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <div className="w-full">
              <h4 className="text-[13px] font-semibold text-[var(--app-text)]">Syncing with Telegram</h4>
              <p className="text-[11px] text-[var(--app-text-muted)] mt-1.5 break-words px-2">{syncStatus}</p>
            </div>
            {syncProgress !== null && (
              <div className="w-full px-2 space-y-1.5">
                <div className="w-full h-1.5 bg-[var(--app-bg)] rounded-full overflow-hidden border border-[var(--app-border)]">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
                <div className="text-[10px] font-bold text-blue-500">{syncProgress}%</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE NEW REPO MODAL */}
      {showAddModal && (
        <div className="absolute inset-0 bg-[#000]/60 flex items-center justify-center z-40 p-4">
          <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-5 shadow-2xl w-full max-w-[400px] text-left space-y-4 animate-in zoom-in-95 duration-150 text-[var(--app-text)]">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--app-text)]">Create Local Repository</h3>
              <p className="text-[11px] text-[var(--app-text-muted)] mt-1">Initialize a local directory to be tracked by Folded.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Local Directory Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="/Users/username/Projects/my-project"
                    value={newRepoPath}
                    onChange={(e) => setNewRepoPath(e.target.value)}
                    className="flex-1 bg-[var(--app-bg)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={() => handleSelectDirectory('NEW')}
                    className="px-3 bg-[var(--app-bg)] hover:bg-[var(--app-surface)] text-[12px] text-[var(--app-text)] rounded-md border border-[var(--app-border)] cursor-pointer shrink-0 transition-all font-semibold"
                  >
                    Browse...
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Repository Display Name</label>
                <input
                  type="text"
                  placeholder="My Awesome App"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Telegram Storage Node (Account)</label>
                <select
                  value={newRepoAccount}
                  onChange={(e) => setNewRepoAccount(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12.5px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 cursor-pointer font-semibold"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="bg-[var(--app-surface)] text-[var(--app-text)]">
                      {acc.first_name} ({acc.username ? `@${acc.username}` : 'Saved Messages'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 text-[12px] font-semibold">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)] border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRepo}
                disabled={!newRepoName || !newRepoPath || !newRepoAccount || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[var(--app-bg)] disabled:text-[var(--app-text-muted)] text-white rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLONE REPO MODAL */}
      {showCloneModal && (
        <div className="absolute inset-0 bg-[#000]/60 flex items-center justify-center z-40 p-4">
          <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-5 shadow-2xl w-full max-w-[400px] text-left space-y-4 animate-in zoom-in-95 duration-150 text-[var(--app-text)]">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--app-text)]">Clone Repository from Telegram</h3>
              <p className="text-[11px] text-[var(--app-text-muted)] mt-1">Download and restore file state from a repository ID stored in Telegram Saved Messages.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Telegram Storage Node (Account)</label>
                <select
                  value={cloneAccount}
                  onChange={(e) => setCloneAccount(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12.5px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 cursor-pointer font-semibold"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="bg-[var(--app-surface)] text-[var(--app-text)]">
                      {acc.first_name} ({acc.username ? `@${acc.username}` : 'Saved Messages'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Select Repository to Clone</label>
                  <button
                    onClick={() => discoverRepos(cloneAccount)}
                    disabled={discovering}
                    className="text-[10px] text-blue-500 hover:text-blue-400 bg-transparent border-0 cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${discovering ? 'animate-spin' : ''}`} /> Refresh list
                  </button>
                </div>
                {discovering ? (
                  <div className="w-full py-2 bg-[var(--app-bg)] text-xs text-[var(--app-text-muted)] rounded-md border border-[var(--app-border)] text-center animate-pulse">
                    Scanning Saved Messages for repositories...
                  </div>
                ) : discoveredRepos.length === 0 ? (
                  <div className="space-y-2">
                    <div className="w-full py-2 bg-[var(--app-bg)] text-xs text-[var(--app-text-muted)] rounded-md border border-[var(--app-border)] text-center">
                      No repositories found. Enter name manually below:
                    </div>
                    <input
                      type="text"
                      placeholder="Repository name (e.g. My Repo)"
                      value={cloneRepoId}
                      onChange={(e) => setCloneRepoId(e.target.value)}
                      className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                ) : (
                  <select
                    value={cloneRepoId}
                    onChange={(e) => setCloneRepoId(e.target.value)}
                    className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12.5px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 cursor-pointer font-semibold"
                  >
                    {discoveredRepos.map(name => (
                      <option key={name} value={name} className="bg-[var(--app-surface)] text-[var(--app-text)]">
                        {name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Local Directory Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="/Users/username/Projects/my-project"
                    value={clonePath}
                    onChange={(e) => setClonePath(e.target.value)}
                    className="flex-1 bg-[var(--app-bg)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={() => handleSelectDirectory('CLONE')}
                    className="px-3 bg-[var(--app-bg)] hover:bg-[var(--app-surface)] text-[12px] text-[var(--app-text)] rounded-md border border-[var(--app-border)] cursor-pointer shrink-0 transition-all font-semibold"
                  >
                    Browse...
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 text-[12px] font-semibold">
              <button
                onClick={() => setShowCloneModal(false)}
                className="px-4 py-2 bg-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)] border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneRepo}
                disabled={!cloneRepoId || !clonePath || !cloneAccount || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[var(--app-surface)] disabled:text-[var(--app-text-muted)] text-white rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                Clone & Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center z-45 p-4 select-none">
          <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-5 shadow-2xl w-full max-w-[420px] text-left space-y-4 animate-in zoom-in-95 duration-150 text-[var(--app-text)]">
            <div className="flex justify-between items-center border-b border-[var(--app-border)] pb-2.5">
              <h3 className="text-[15px] font-bold">Settings</h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-500 hover:text-[var(--app-text)] bg-transparent border-0 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-2">Visual Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(THEMES).map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`px-3 py-2 text-[12px] font-semibold rounded-lg border cursor-pointer transition-all ${
                        theme === t.id
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                          : 'bg-[var(--app-bg)] border-[var(--app-border)] text-[var(--app-text)] hover:bg-[var(--app-surface)]'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--app-border)]">
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-2">Telegram Accounts</label>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-2 bg-[var(--app-bg)] rounded-lg border border-[var(--app-border)] text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold truncate max-w-[120px]">{acc.first_name}</span>
                        {acc.username && <span className="text-[var(--app-text-muted)] text-[10px] truncate max-w-[100px]">(@{acc.username})</span>}
                      </div>
                      <button
                        onClick={() => handleDisconnectAccount(acc.id)}
                        className="text-red-500 hover:text-red-400 bg-transparent border-0 cursor-pointer text-xs font-semibold shrink-0"
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 text-[12px] font-semibold border-t border-[var(--app-border)]">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPOSITORY SETTINGS MODAL */}
      {showRepoSettingsModal && activeRepo && (
        <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center z-45 p-4 select-none">
          <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-5 shadow-2xl w-full max-w-[420px] text-left space-y-4 animate-in zoom-in-95 duration-150 text-[var(--app-text)]">
            <div className="flex justify-between items-center border-b border-[var(--app-border)] pb-2.5">
              <div>
                <h3 className="text-[15px] font-bold">Repository Settings</h3>
                <span className="text-[10px] text-[var(--app-text-muted)] font-mono">{activeRepo.id}</span>
              </div>
              <button 
                onClick={() => setShowRepoSettingsModal(false)}
                className="text-gray-500 hover:text-[var(--app-text)] bg-transparent border-0 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-[var(--app-border)] text-xs font-semibold gap-4">
              <button
                onClick={() => setRepoSettingsTab('GENERAL')}
                className={`pb-1.5 border-b-2 cursor-pointer bg-transparent border-0 transition-all font-bold ${
                  repoSettingsTab === 'GENERAL' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                General Settings
              </button>
              <button
                onClick={() => setRepoSettingsTab('IGNORE')}
                className={`pb-1.5 border-b-2 cursor-pointer bg-transparent border-0 transition-all font-bold ${
                  repoSettingsTab === 'IGNORE' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                Ignored Files (.foldedignore)
              </button>
            </div>

            <div className="space-y-3.5">
              {repoSettingsTab === 'GENERAL' ? (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Local Directory Path</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="/Users/username/Projects/my-project"
                        value={settingsRepoPath}
                        onChange={(e) => setSettingsRepoPath(e.target.value)}
                        className="flex-1 bg-[var(--app-bg)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        onClick={() => handleSelectDirectory('SETTINGS')}
                        className="px-3 bg-[var(--app-bg)] hover:bg-[var(--app-surface)] text-[12px] text-[var(--app-text)] rounded-md border border-[var(--app-border)] cursor-pointer shrink-0 transition-all font-semibold"
                      >
                        Browse...
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Telegram Storage Node (Account)</label>
                    <select
                      value={settingsRepoAccount}
                      onChange={(e) => setSettingsRepoAccount(e.target.value)}
                      className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12.5px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 cursor-pointer font-semibold"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id} className="bg-[var(--app-surface)] text-[var(--app-text)]">
                          {acc.first_name} ({acc.username ? `@${acc.username}` : 'Saved Messages'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 border-t border-[var(--app-border)]">
                    <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-2">Branches Management</label>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                      {branches.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-2 bg-[var(--app-bg)] rounded-lg border border-[var(--app-border)] text-xs">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className={`w-2 h-2 rounded-full ${b.name === currentBranch ? 'bg-green-500' : 'bg-[var(--app-text-muted)] opacity-50'}`} />
                            <span className="font-semibold truncate font-mono">{b.name}</span>
                          </div>
                          {b.name !== 'main' && b.name !== currentBranch && (
                            <button
                              onClick={() => handleDeleteBranch(b.name)}
                              disabled={loading}
                              className="text-red-500 hover:text-red-400 bg-transparent border-0 cursor-pointer text-xs font-semibold shrink-0"
                              title="Delete Branch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--app-border)] space-y-2">
                    <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Danger Zone</label>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          handleDeleteRepo(activeRepo.id, activeRepo.name);
                          setShowRepoSettingsModal(false);
                        }}
                        disabled={loading}
                        className="w-full py-2 bg-transparent hover:bg-red-500/10 border border-red-500/30 text-red-500 text-[12px] font-semibold rounded-lg cursor-pointer transition-all"
                      >
                        Remove Repository from App
                      </button>
                      <button
                        onClick={handleWipeRemoteRepo}
                        disabled={loading}
                        className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-[12px] font-semibold rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                      >
                        Wipe Repository from Telegram
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">
                      Add Ignore Pattern
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. *.log, temp/, secret.txt"
                        value={newIgnorePattern}
                        onChange={(e) => setNewIgnorePattern(e.target.value)}
                        className="flex-1 bg-[var(--app-bg)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 font-mono"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newIgnorePattern.trim()) {
                              setIgnoredPatterns([...ignoredPatterns, newIgnorePattern.trim()]);
                              setNewIgnorePattern('');
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newIgnorePattern.trim()) {
                            setIgnoredPatterns([...ignoredPatterns, newIgnorePattern.trim()]);
                            setNewIgnorePattern('');
                          }
                        }}
                        className="px-3 bg-blue-600 hover:bg-blue-500 text-[12px] text-white rounded-md border-0 cursor-pointer shrink-0 transition-all font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-2">
                      Custom Ignored Patterns ({ignoredPatterns.length})
                    </label>
                    {ignoredPatterns.length === 0 ? (
                      <div className="text-center py-6 text-[11px] text-[var(--app-text-muted)] bg-[var(--app-bg)] rounded-xl border border-dashed border-[var(--app-border)]">
                        No custom ignore patterns defined yet.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                        {ignoredPatterns.map((pattern, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-[var(--app-bg)] rounded-lg border border-[var(--app-border)] text-xs font-mono">
                            <span className="truncate pr-2">{pattern}</span>
                            <button
                              onClick={() => setIgnoredPatterns(ignoredPatterns.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-400 bg-transparent border-0 cursor-pointer text-xs shrink-0"
                              title="Remove Pattern"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-[var(--app-text-muted)] leading-relaxed italic bg-[var(--app-bg)] p-2 rounded-lg border border-[var(--app-border)]">
                    Default system patterns (node_modules/, target/, dist/, build/, .git/, and .folded.json) are always ignored.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 text-[12px] font-semibold border-t border-[var(--app-border)]">
              <button
                onClick={() => setShowRepoSettingsModal(false)}
                className="px-4 py-2 bg-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)] border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRepoSettings}
                disabled={loading || !settingsRepoPath}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW BRANCH MODAL */}
      {showNewBranchModal && activeRepo && (
        <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center z-45 p-4 select-none">
          <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-5 shadow-2xl w-full max-w-[400px] text-left space-y-4 animate-in zoom-in-95 duration-150 text-[var(--app-text)]">
            <div className="flex justify-between items-center border-b border-[var(--app-border)] pb-2.5">
              <h3 className="text-[15px] font-bold">Create New Branch</h3>
              <button 
                onClick={() => setShowNewBranchModal(false)}
                className="text-gray-500 hover:text-[var(--app-text)] bg-transparent border-0 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. feature/login-ui"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Create From (Commit Base)</label>
                <select
                  value={newBranchFromCommit}
                  onChange={(e) => setNewBranchFromCommit(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12.5px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 cursor-pointer font-mono font-semibold"
                >
                  <option value="">Current HEAD commit</option>
                  {history.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id.substring(0, 7)} - {c.message_summary}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-[12px] font-semibold border-t border-[var(--app-border)]">
              <button
                onClick={() => setShowNewBranchModal(false)}
                className="px-4 py-2 bg-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)] border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBranch}
                disabled={loading || !newBranchName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                Create & Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MERGE BRANCH MODAL */}
      {showMergeModal && activeRepo && (
        <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center z-45 p-4 select-none">
          <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-5 shadow-2xl w-full max-w-[400px] text-left space-y-4 animate-in zoom-in-95 duration-150 text-[var(--app-text)]">
            <div className="flex justify-between items-center border-b border-[var(--app-border)] pb-2.5">
              <h3 className="text-[15px] font-bold">Merge Branch</h3>
              <button 
                onClick={() => setShowMergeModal(false)}
                className="text-gray-500 hover:text-[var(--app-text)] bg-transparent border-0 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <p className="text-[12px] text-[var(--app-text-muted)] leading-relaxed">
                  Merge modifications from a source branch into your currently checked out active branch:
                </p>
                <div className="mt-2.5 p-2 bg-[var(--app-bg)] rounded-md border border-[var(--app-border)] text-[12px] font-mono font-semibold text-center">
                  Into active branch: <span className="text-blue-500 font-bold">{currentBranch}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Source Branch (Merge From)</label>
                <select
                  value={mergeSourceBranch}
                  onChange={(e) => setMergeSourceBranch(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12.5px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 cursor-pointer font-mono font-semibold"
                >
                  {branches.filter(b => b.name !== currentBranch).map(b => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-[12px] font-semibold border-t border-[var(--app-border)]">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 bg-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)] border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeBranch}
                disabled={loading || !mergeSourceBranch}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                Merge Branches
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AUTO-DISCOVERED MANIFEST REPOS MODAL */}
      {showManifestDiscoverModal && discoveredManifestRepos.length > 0 && selectedDiscoverRepo && (
        <div className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center z-45 p-4 select-none">
          <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-5 shadow-2xl w-full max-w-[420px] text-left space-y-4 animate-in zoom-in-95 duration-150 text-[var(--app-text)]">
            <div className="flex justify-between items-center border-b border-[var(--app-border)] pb-2.5">
              <div>
                <h3 className="text-[15px] font-bold">Import Repositories from Telegram</h3>
                <p className="text-[10px] text-[var(--app-text-muted)] mt-0.5">Found active system manifests in your storage accounts.</p>
              </div>
              <button 
                onClick={() => setShowManifestDiscoverModal(false)}
                className="text-gray-500 hover:text-[var(--app-text)] bg-transparent border-0 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Select Discovered Repository</label>
                <select
                  value={selectedDiscoverRepo.name}
                  onChange={(e) => {
                    const r = discoveredManifestRepos.find(repo => repo.name === e.target.value);
                    if (r) setSelectedDiscoverRepo(r);
                  }}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12.5px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 cursor-pointer font-semibold"
                >
                  {discoveredManifestRepos.map(repo => (
                    <option key={repo.name} value={repo.name} className="bg-[var(--app-surface)] text-[var(--app-text)]">
                      {repo.name} ({repo.accountName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">Local Directory for Clone</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="/Users/username/Projects/my-project"
                    value={discoverClonePath}
                    onChange={(e) => setDiscoverClonePath(e.target.value)}
                    className="flex-1 bg-[var(--app-bg)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--app-border)] outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={async () => {
                      try {
                        const selected = await open({
                          directory: true,
                          multiple: false,
                          title: 'Select Clone Directory',
                        });
                        if (selected && typeof selected === 'string') {
                          setDiscoverClonePath(selected);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="px-3 bg-[var(--app-bg)] hover:bg-[var(--app-surface)] text-[12px] text-[var(--app-text)] rounded-md border border-[var(--app-border)] cursor-pointer shrink-0 transition-all font-semibold"
                  >
                    Browse...
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-[12px] font-semibold border-t border-[var(--app-border)]">
              <button
                onClick={() => setShowManifestDiscoverModal(false)}
                className="px-4 py-2 bg-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)] border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedDiscoverRepo || !discoverClonePath) return;
                  setLoading(true);
                  setSyncStatus(`Importing and cloning "${selectedDiscoverRepo.name}"...`);
                  try {
                    await invoke('clone_repository', {
                      localPath: discoverClonePath,
                      telegramChatId: selectedDiscoverRepo.accountId,
                      repositoryId: selectedDiscoverRepo.name,
                    });
                    setShowManifestDiscoverModal(false);
                    setDiscoverClonePath('');
                    await loadRepositories();
                    alert(`Successfully imported and cloned repository "${selectedDiscoverRepo.name}"!`);
                  } catch (e) {
                    alert('Error importing repository: ' + e);
                  } finally {
                    setLoading(false);
                    setSyncStatus(null);
                  }
                }}
                disabled={loading || !discoverClonePath}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                Import & Clone
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
