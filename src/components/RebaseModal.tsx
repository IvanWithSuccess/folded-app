import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GitCommitInfo } from './GitDashboard';
import { Layers, Loader2, GitCommit as GitCommitIcon, Check } from 'lucide-react';

interface RebaseModalProps {
  repoId: string;
  commits: GitCommitInfo[];
  onClose: () => void;
  onSuccess: () => void;
}

export const RebaseModal: React.FC<RebaseModalProps> = ({
  repoId,
  commits,
  onClose,
  onSuccess,
}) => {
  const [selectedCommitIds, setSelectedCommitIds] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [isSquashing, setIsSquashing] = useState(false);

  const toggleSelectCommit = (id: string) => {
    setSelectedCommitIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSquash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCommitIds.length < 2 || !summary.trim()) return;

    setIsSquashing(true);
    try {
      // Sort selected commit IDs based on their index order in commits array
      const sortedIds = commits
        .filter(c => selectedCommitIds.includes(c.id))
        .map(c => c.id);

      await invoke('squash_commits', {
        repoId,
        commitIds: sortedIds,
        newSummary: summary,
        newDescription: description || null,
      });

      onSuccess();
      onClose();
    } catch (e) {
      console.error('Failed to squash commits:', e);
    } finally {
      setIsSquashing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            <h3 className="text-[15px] font-bold text-[var(--app-text)]">Squash Commits (Interactive Rebase)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <p className="text-[11.5px] text-[var(--app-text-muted)] leading-relaxed">
          Select two or more consecutive commits to combine them into a single clean commit.
        </p>

        <form onSubmit={handleSquash} className="space-y-4">
          {/* Commit Selector List */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar bg-[var(--app-bg)] p-2 rounded-xl border border-[var(--app-border)] space-y-1.5">
            {commits.map(commit => {
              const isSelected = selectedCommitIds.includes(commit.id);
              return (
                <div
                  key={commit.id}
                  onClick={() => toggleSelectCommit(commit.id)}
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-[12px] transition-all border ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/30 text-[var(--app-text)] font-semibold'
                      : 'border-transparent hover:bg-[var(--app-surface)] text-[var(--app-text-muted)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border ${
                      isSelected ? 'bg-blue-600 text-white border-blue-600' : 'border-[var(--app-border)]'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <GitCommitIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{commit.message_summary}</span>
                  </div>

                  <span className="font-mono text-[10px] opacity-70 shrink-0">
                    {commit.id.substring(0, 7)}
                  </span>
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">
              New Combined Summary (Required)
            </label>
            <input
              type="text"
              placeholder="e.g. Refactor authentication module"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[12.5px] px-3 py-2 rounded-lg border border-[var(--app-border)] outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider block mb-1">
              New Combined Description (Optional)
            </label>
            <textarea
              placeholder="Squashed commit details..."
              value={description}
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--app-bg)] text-[var(--app-text)] text-[11.5px] px-3 py-2 rounded-lg border border-[var(--app-border)] outline-none focus:border-blue-500 resize-none font-medium"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-transparent hover:bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-text)] text-[12px] font-semibold rounded-lg cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedCommitIds.length < 2 || !summary.trim() || isSquashing}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg border-0 cursor-pointer shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              {isSquashing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              {isSquashing ? 'Squashing...' : `Squash ${selectedCommitIds.length} Commits`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
