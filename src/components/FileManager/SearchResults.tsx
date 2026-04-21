import React from 'react';
import { File, Folder, MapPin, Search } from 'lucide-react';
import { FileManifest } from '../../types/file';
import { formatBytes } from '../../utils/fileUtils';

interface SearchResultsProps {
  results: FileManifest[];
  onReveal: (item: FileManifest) => void;
  isLoading?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results, onReveal, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-widest">Searching across all accounts...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
        <Search size={48} strokeWidth={1} className="mb-4 opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest">No files matching your query</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/50">
      <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Global Search Results ({results.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-zinc-900/80 backdrop-blur-md z-10">
            <tr className="text-[9px] font-black uppercase tracking-widest text-zinc-600 border-b border-white/5">
              <th className="px-6 py-3 font-black">Name</th>
              <th className="px-6 py-3 font-black">Size</th>
              <th className="px-6 py-3 font-black">Account</th>
              <th className="px-6 py-3 font-black text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {results.map((item) => (
              <tr 
                key={item.id} 
                className="group hover:bg-white/[0.03] transition-colors cursor-default"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-zinc-900 border border-white/5 text-indigo-400 group-hover:scale-110 transition-transform">
                      {item.chunk_size === 0 ? <Folder size={14} /> : <File size={14} />}
                    </div>
                    <span className="text-sm font-medium text-zinc-300 truncate max-w-[300px]">
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500 font-mono">
                  {item.chunk_size === 0 ? '--' : formatBytes(item.total_size)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                    {item.account_id || 'Unknown'}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onReveal(item)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900 border border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all active:scale-95"
                  >
                    <MapPin size={10} />
                    Reveal
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
