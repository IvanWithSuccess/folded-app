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
      alert('Notes sync failed: ' + (e as Error).message || String(e));
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
      console.error('Failed to update note:', e);
      alert('Failed to update note: ' + (e as Error).message || String(e));
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
    } catch (e) {
      console.error('Failed to delete note:', e);
      alert('Failed to delete note: ' + (e as Error).message || String(e));
    }
  }, [fetchNotes]);

  const handleCreate = useCallback(async (content: string) => {
    if (!activeAccountId || !content.trim()) return;
    try {
      await invoke('create_note', {
        accountId: activeAccountId,
        content
      });
      await fetchNotes();
    } catch (e) {
      console.error('Failed to create note:', e);
      alert('Failed to create note: ' + (e as Error).message || String(e));
    }
  }, [activeAccountId, fetchNotes]);

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
    handleCreate
  };
}
