import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GitPullRequest, Plus, CheckCircle2, XCircle, GitBranch, ArrowRight, Loader2, MessageSquare, Clock, User } from 'lucide-react';

export interface PullRequestRecord {
  id: string;
  repository_id: string;
  title: string;
  description?: string;
  source_branch: string;
  target_branch: string;
  author: string;
  status: 'OPEN' | 'MERGED' | 'CLOSED';
  created_at: number;
}

export interface BranchInfo {
  name: string;
  head_commit_id?: string | null;
}

interface PullRequestsViewerProps {
  repoId: string;
  currentBranch: string;
  branches: BranchInfo[];
  currentUser: string;
  onRefreshRepo: () => void;
}

export const PullRequestsViewer: React.FC<PullRequestsViewerProps> = ({
  repoId,
  currentBranch,
  branches,
  currentUser,
  onRefreshRepo,
}) => {
  const [prs, setPrs] = useState<PullRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'MERGED' | 'CLOSED'>('OPEN');
  
  // New PR Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceBranch, setSourceBranch] = useState(currentBranch);
  const [targetBranch, setTargetBranch] = useState('main');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected PR Detail Inspector
  const [selectedPr, setSelectedPr] = useState<PullRequestRecord | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadPullRequests = async () => {
    setLoading(true);
    try {
      const list = await invoke<PullRequestRecord[]>('list_pull_requests', { repoId });
      setPrs(list);
    } catch (e) {
      console.error('Failed to load pull requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPullRequests();
  }, [repoId]);

  const handleCreatePr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || sourceBranch === targetBranch) return;
    setIsSubmitting(true);
    try {
      await invoke('create_pull_request', {
        repoId,
        title,
        description: description || null,
        sourceBranch,
        targetBranch,
        author: currentUser || 'Developer',
      });
      setShowNewModal(false);
      setTitle('');
      setDescription('');
      loadPullRequests();
    } catch (e) {
      console.error('Failed to create PR:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMergePr = async (prId: string) => {
    setIsActionLoading(true);
    try {
      await invoke('merge_pull_request', { repoId, prId });
      setSelectedPr(null);
      await loadPullRequests();
      onRefreshRepo();
    } catch (e) {
      console.error('Failed to merge PR:', e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClosePr = async (prId: string) => {
    setIsActionLoading(true);
    try {
      await invoke('close_pull_request', { prId });
      setSelectedPr(null);
      await loadPullRequests();
    } catch (e) {
      console.error('Failed to close PR:', e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredPrs = prs.filter(pr => filter === 'ALL' || pr.status === filter);

  return (
    <div className="h-full flex flex-col bg-[var(--app-bg)] overflow-hidden select-none">
      {/* Header */}
      <div className="h-12 bg-[var(--app-surface)] border-b border-[var(--app-border)] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-blue-500" />
            <h3 className="text-[13.5px] font-bold text-[var(--app-text)]">Pull Requests</h3>
            <span className="text-[11px] font-semibold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20">
              {prs.filter(p => p.status === 'OPEN').length} Open
            </span>
          </div>

          {/* Filters */}
          <div className="flex bg-[var(--app-bg)] p-0.5 rounded-lg border border-[var(--app-border)] text-[11px] font-semibold">
            {(['OPEN', 'MERGED', 'CLOSED', 'ALL'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold rounded-lg cursor-pointer border-0 shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> New Pull Request
        </button>
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center py-12 gap-2 text-[var(--app-text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-[12px] font-medium">Loading pull requests...</span>
          </div>
        ) : filteredPrs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--app-text-muted)] space-y-3">
            <div className="w-14 h-14 bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] flex items-center justify-center shadow-sm">
              <GitPullRequest className="w-7 h-7 text-[var(--app-text-muted)]" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-[var(--app-text)]">No Pull Requests found</h4>
              <p className="text-[11px] text-[var(--app-text-muted)] mt-1">There are no {filter.toLowerCase()} pull requests in this repository.</p>
            </div>
          </div>
        ) : (
          filteredPrs.map(pr => (
            <div
              key={pr.id}
              onClick={() => setSelectedPr(pr)}
              className="bg-[var(--app-surface)] border border-[var(--app-border)] hover:border-blue-500/40 p-3.5 rounded-xl cursor-pointer transition-all shadow-sm group hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${
                      pr.status === 'OPEN'
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : pr.status === 'MERGED'
                        ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {pr.status}
                    </span>
                    <h4 className="text-[13.5px] font-bold text-[var(--app-text)] group-hover:text-blue-400 transition-colors">
                      {pr.title}
                    </h4>
                  </div>

                  {pr.description && (
                    <p className="text-[11.5px] text-[var(--app-text-muted)] line-clamp-1">
                      {pr.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10.5px] font-mono text-[var(--app-text-muted)] pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {pr.author}
                    </span>
                    <span>•</span>
                    <div className="flex items-center gap-1.5 bg-[var(--app-bg)] px-2 py-0.5 rounded border border-[var(--app-border)]">
                      <span className="text-blue-400 font-bold">{pr.source_branch}</span>
                      <ArrowRight className="w-3 h-3 opacity-60" />
                      <span className="text-purple-400 font-bold">{pr.target_branch}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-[var(--app-text-muted)] font-mono shrink-0">
                  {new Date(pr.created_at * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New PR Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-3">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-blue-500" />
                <h3 className="text-[15px] font-bold text-[var(--app-text)]">Create Pull Request</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePr} className="space-y-3.5">
              {/* Branch Selector */}
              <div className="grid grid-cols-2 gap-3 bg-[var(--app-bg)] p-3 rounded-xl border border-[var(--app-border)]">
                <div>
                  <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">
                    Source (Compare)
                  </label>
                  <select
                    value={sourceBranch}
                    onChange={(e) => setSourceBranch(e.target.value)}
                    className="w-full bg-[var(--app-surface)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] font-semibold outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">
                    Target (Base)
                  </label>
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full bg-[var(--app-surface)] text-[var(--app-text)] text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] font-semibold outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {sourceBranch === targetBranch && (
                <p className="text-[11px] text-yellow-500 font-semibold text-center">
                  Source and Target branches must be different.
                </p>
              )}

              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">
                  Title (Required)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Add user authentication flow"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12.5px] px-3 py-2 rounded-lg border border-[var(--app-border)] outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Describe the changes introduced by this pull request..."
                  value={description}
                  rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[11.5px] px-3 py-2 rounded-lg border border-[var(--app-border)] outline-none focus:border-blue-500 resize-none font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2 bg-transparent hover:bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-text)] text-[12px] font-semibold rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || sourceBranch === targetBranch || isSubmitting}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4" />}
                  {isSubmitting ? 'Creating...' : 'Create Pull Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected PR Detail Modal */}
      {selectedPr && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl w-full max-w-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-[var(--app-border)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${
                    selectedPr.status === 'OPEN'
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : selectedPr.status === 'MERGED'
                      ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {selectedPr.status}
                  </span>
                  <h3 className="text-[15px] font-bold text-[var(--app-text)]">{selectedPr.title}</h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[var(--app-text-muted)] font-mono mt-1">
                  <span>Author: {selectedPr.author}</span>
                  <span>•</span>
                  <span>{new Date(selectedPr.created_at * 1000).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPr(null)}
                className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Branch Header */}
            <div className="flex items-center justify-between bg-[var(--app-bg)] p-3 rounded-xl border border-[var(--app-border)] text-[12px] font-mono">
              <span className="text-[var(--app-text-muted)]">Branches:</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{selectedPr.source_branch}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
                <span className="text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">{selectedPr.target_branch}</span>
              </div>
            </div>

            {selectedPr.description && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block">Description</span>
                <p className="text-[12px] text-[var(--app-text)] bg-[var(--app-bg)] p-3 rounded-xl border border-[var(--app-border)] leading-relaxed whitespace-pre-wrap">
                  {selectedPr.description}
                </p>
              </div>
            )}

            {/* Actions */}
            {selectedPr.status === 'OPEN' && (
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => handleClosePr(selectedPr.id)}
                  disabled={isActionLoading}
                  className="flex-1 py-2 bg-transparent hover:bg-red-500/10 text-red-500 border border-red-500/20 text-[12px] font-semibold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Close PR
                </button>
                <button
                  onClick={() => handleMergePr(selectedPr.id)}
                  disabled={isActionLoading}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-semibold rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isActionLoading ? 'Merging...' : 'Merge Pull Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
