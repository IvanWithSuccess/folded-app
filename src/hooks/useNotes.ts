import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../store/useAppStore';
import { getErrorMessage } from '../utils/errorUtils';

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
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchNotes = useCallback(async () => {
    if (!activeAccountId) return;
    setIsLoading(true);
    try {
      const result = await invoke<NoteInfo[]>('get_notes');
      if (!Array.isArray(result)) throw new Error('Invalid notes response');
      
      // Filter by active account and deduplicate
      const filtered = result.filter(n => n.account_id === activeAccountId);
      
      const uniqueNotes = filtered.reduce((acc: NoteInfo[], current) => {
        if (!current) return acc;
        const isDuplicate = acc.find(item => 
          item.peer_id === current.peer_id && 
          item.message_id === current.message_id
        );
        if (!isDuplicate) acc.push(current);
        return acc;
      }, []);
      
      if (isMounted.current) {
        setNotes(uniqueNotes);
      }
    } catch (e) {
      if (isMounted.current) {
        console.error('Failed to fetch notes:', getErrorMessage(e));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [activeAccountId]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(n => n.content?.toLowerCase().includes(q));
  }, [notes, searchQuery]);

  const handleSync = useCallback(async () => {
    if (!activeAccountId) return;
    setIsLoading(true);
    try {
      await invoke('sync_account', { accountId: activeAccountId });
      await fetchNotes();
    } catch (e) {
      if (isMounted.current) {
        console.error('Notes sync failed:', getErrorMessage(e));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
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
      if (isMounted.current) {
        alert('Failed to update note: ' + getErrorMessage(e));
      }
    }
  }, [fetchNotes]);

  const handleDelete = useCallback(async (note: NoteInfo) => {
    const confirmed = await confirm('Wipe this note from the cloud?', { 
      title: 'Delete Note',
      kind: 'warning'
    });
    if (!confirmed) return;
    try {
        await invoke('delete_note', { 
          accountId: note.account_id, 
          peerId: note.peer_id, 
          messageId: note.message_id, 
          noteId: note.id
        });
        // Give React a moment to unmount components before refreshing the list
        await new Promise(resolve => setTimeout(resolve, 50));
        await fetchNotes();
    } catch (e) {
      if (isMounted.current) {
        console.error('Delete failed:', getErrorMessage(e));
        alert('Failed to delete note: ' + getErrorMessage(e));
      }
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
    } catch (e) {
      if (isMounted.current) {
        console.error('Create failed:', getErrorMessage(e));
        alert('Failed to create note: ' + getErrorMessage(e));
      }
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
    } catch (e) {
      console.error('Attach failed:', getErrorMessage(e));
      alert('Failed to attach: ' + getErrorMessage(e));
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
    } catch (e) {
      console.error('Detach failed:', getErrorMessage(e));
      alert('Failed to detach: ' + getErrorMessage(e));
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
