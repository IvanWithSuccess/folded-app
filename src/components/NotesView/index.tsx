import React, { useState, useEffect } from 'react';
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
    handleCreate, 
    handleAttach, 
    handleDetach 
  } = useNotes();

  const [selectedNote, setSelectedNote] = useState<NoteInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Sync selected note with the list when notes update
  useEffect(() => {
    try {
      if (selectedNote) {
        const updated = notes.find(n => n.id === selectedNote.id);
        if (updated) {
          if (updated !== selectedNote) {
            setSelectedNote(updated);
          }
        } else {
          // Note is no longer in the list (e.g. deleted externally or by us)
          setSelectedNote(null);
        }
      }
    } catch (e) {
      console.error('Error in NotesView effect:', e);
    }
  }, [notes, selectedNote]);

  const handleSelectNote = (note: NoteInfo) => {
    setSelectedNote(note);
    setIsCreating(false);
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsCreating(true);
  };

  const handleCreateNote = async (content: string) => {
    const newNote = await handleCreate(content);
    setIsCreating(false);
    if (newNote) {
      setSelectedNote(newNote);
    }
  };

  const handleUpdateNote = async (note: NoteInfo, content: string) => {
    await handleUpdate(note, content);
  };

  const handleDeleteNote = async (note: NoteInfo) => {
    if (!note || !note.id) return;
    try {
      if (selectedNote?.id === note.id) {
        setSelectedNote(null);
      }
      await handleDelete(note);
    } catch (e) {
      console.error('Delete note handler error:', e);
    }
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
            isCreating={isCreating}
            onClose={() => { setSelectedNote(null); setIsCreating(false); }}
            onSave={(id, content) => selectedNote ? handleUpdateNote(selectedNote, content) : handleCreateNote(content)}
            onDelete={async (id) => {
              const noteToDelete = notes.find(n => n.id === id);
              if (noteToDelete) await handleDeleteNote(noteToDelete);
            }}
            onUpdate={handleUpdateNote}
            onAttach={async (fileId) => { if (selectedNote) await handleAttach(selectedNote.id, fileId); }}
            onDetach={async (fileId) => { if (selectedNote) await handleDetach(selectedNote.id, fileId); }}
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
