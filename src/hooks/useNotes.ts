import { useState, useCallback, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/useAppStore';

export interface NoteInfo {
  id: string;
  account_id: string;
  peer_id: number;
  message_id: number;
  content: string;
  created_at: number;
  from_self: boolean;
  sender_name?: string;
  attachment_ids?: string;
}

export function useNotes() {
  const { activeAccountId } = useAppStore();
  const [notes, setNotes] = useState<NoteInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotes = useCallback(async () => {
    if (!activeAccountId) return;
    setIsLoading(true);
    try {
      const result = await invoke<NoteInfo[]>('get_notes');
      // Filter by active account and deduplicate
      const filtered = result.filter(n => n.account_id === activeAccountId);
      
      const uniqueNotes = filtered.reduce((acc: NoteInfo[], current) => {
        const isDuplicate = acc.find(item => 
          item.peer_id === current.peer_id && 
          item.message_id === current.message_id
        );
        if (!isDuplicate) acc.push(current);
        return acc;
      }, []);
      
      setNotes(uniqueNotes);
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccountId]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(n => n.content.toLowerCase().includes(q));
  }, [notes, searchQuery]);

  const handleSync = useCallback(async () => {
    if (!activeAccountId) return;
    setIsLoading(true);
    try {
      await invoke('sync_account', { accountId: activeAccountId });
      await fetchNotes();
    } catch (e) {
      console.error('Notes sync failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccountId, fetchNotes]);

  const handleUpdate = useCallback(async (note: NoteInfo, content: string) => {
    try {
      await invoke('update_note', { 
        accountId: note.account_id, 
        peerId: note.peer_id, 
        messageId: note.message_id, 
        newContent: content,
        noteId: note.id
      });
      await fetchNotes();
    } catch (e) {
      alert('Failed to update note: ' + e);
    }
  }, [fetchNotes]);

  const handleDelete = useCallback(async (note: NoteInfo) => {
    if (!window.confirm('Wipe this note from the cloud?')) return;
    try {
      await invoke('delete_note', { 
        accountId: note.account_id, 
        peerId: note.peer_id, 
        messageId: note.message_id, 
        noteId: note.id
      });
      await fetchNotes();
    } catch (e: any) {
      console.error('Delete failed:', e);
      alert('Failed to delete note: ' + (e?.message || e || 'Unknown error'));
    }
  }, [fetchNotes]);

  const handleCreate = useCallback(async (content: string) => {
    if (!activeAccountId || !content.trim()) return;
    try {
      const newNote = await invoke<NoteInfo>('create_note', {
        accountId: activeAccountId,
        content
      });
      await fetchNotes();
      return newNote;
    } catch (e: any) {
      console.error('Create failed:', e);
      alert('Failed to create note: ' + (e?.message || e || 'Unknown error'));
      return null;
    }
  }, [activeAccountId, fetchNotes]);

  const handleAttach = useCallback(async (noteId: string, fileId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    try {
      await invoke('note_attach_file', {
        accountId: note.account_id,
        noteId: note.id,
        fileId
      });
      await fetchNotes();
    } catch (e: any) {
      console.error('Attach failed:', e);
      alert('Failed to attach: ' + (e?.message || e || 'Unknown error'));
    }
  }, [notes, fetchNotes]);

  const handleDetach = useCallback(async (noteId: string, fileId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    try {
      await invoke('note_detach_file', {
        accountId: note.account_id,
        noteId: note.id,
        fileId
      });
      await fetchNotes();
    } catch (e: any) {
      console.error('Detach failed:', e);
      alert('Failed to detach: ' + (e?.message || e || 'Unknown error'));
    }
  }, [notes, fetchNotes]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes: filteredNotes,
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
  };
}
