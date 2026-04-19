import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useNotes, NoteInfo } from '../../hooks/useNotes';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';

export const NotesView: React.FC = () => {
  const { 
    notes, 
    isLoading, 
    searchQuery, 
    setSearchQuery, 
    fetchNotes, 
    handleSync,
    handleUpdate, 
    handleDelete, 
    handleCreate 
  } = useNotes();

  const [selectedNote, setSelectedNote] = useState<NoteInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectNote = (note: NoteInfo) => {
    setSelectedNote(note);
    setIsCreating(false);
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsCreating(true);
  };

  const handleCreateNote = async (content: string) => {
    await handleCreate(content);
    setIsCreating(false);
  };

  const handleUpdateNote = async (note: NoteInfo, content: string) => {
    await handleUpdate(note, content);
  };

  const handleDeleteNote = async (note: NoteInfo) => {
    await handleDelete(note);
    if (selectedNote?.id === note.id) setSelectedNote(null);
  };

  return (
    <div className="flex-1 h-full flex overflow-hidden">
      {/* Column 1: List */}
      <NoteList 
        notes={notes}
        selectedNoteId={selectedNote?.id || null}
        onSelect={handleSelectNote}
        onNew={handleNewNote}
        onRefresh={handleSync}
        isLoading={isLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Column 2: Editor */}
      <div className="flex-1 h-full bg-zinc-950/40 relative">
        {selectedNote || isCreating ? (
          <NoteEditor 
            note={selectedNote}
            onClose={() => { setSelectedNote(null); setIsCreating(false); }}
            onSave={(id, content) => selectedNote ? handleUpdateNote(selectedNote, content) : handleCreateNote(content)}
            onDelete={selectedNote ? () => handleDeleteNote(selectedNote) : () => {}}
            onUpdate={handleUpdateNote}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <MessageSquare size={48} strokeWidth={1} />
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Select a note to view its contents</p>
          </div>
        )}
      </div>
    </div>
  );
};
