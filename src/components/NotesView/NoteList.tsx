import React from 'react';
import { Search, X, MessageSquare, Plus, RefreshCw, Calendar } from 'lucide-react';
import { NoteInfo } from '../../hooks/useNotes';

interface NoteListProps {
  notes: NoteInfo[];
  selectedNoteId: string | null;
  onSelect: (note: NoteInfo) => void;
  onNew: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  selectedNoteId,
  onSelect,
  onNew,
  onRefresh,
  isLoading,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <div className="w-[360px] h-full border-r border-zinc-800 flex flex-col bg-zinc-950/20 shrink-0">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-zinc-800 bg-zinc-900/10">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Notes</h3>
        <div className="flex gap-2">
           <button 
             onClick={onRefresh} 
             disabled={isLoading}
             className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-600 hover:text-white transition-colors"
           >
             <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
           </button>
           <button 
             onClick={onNew}
             className="p-1.5 rounded-md bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm"
           >
             <Plus size={14} />
           </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-zinc-800/50">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            className="w-full pl-8 pr-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[11px] text-white outline-none focus:border-zinc-700 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-20 mt-10">
            <MessageSquare size={32} strokeWidth={1} />
            <span className="text-[9px] font-black uppercase tracking-widest mt-4 text-center">No notes found</span>
          </div>
        ) : (
          <div className="space-y-1">
            {notes.map(note => (
              <div 
                key={note.id}
                onClick={() => onSelect(note)}
                className={`group p-4 rounded-2xl cursor-pointer transition-all border border-transparent
                  ${selectedNoteId === note.id ? 'bg-zinc-800 border-zinc-700 shadow-xl' : 'hover:bg-zinc-800/30'}`}
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                   <span className={`text-[12px] font-medium line-clamp-2 leading-relaxed flex-1
                     ${selectedNoteId === note.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                     {note.content || 'Empty note'}
                   </span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-60 transition-opacity">
                      <Calendar size={10} />
                      <span className="text-[9px] font-bold uppercase tracking-tighter">
                        {new Date(note.created_at * 1000).toLocaleDateString()}
                      </span>
                   </div>
                   {note.from_self && (
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
