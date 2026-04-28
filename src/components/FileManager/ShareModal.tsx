import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileManifest } from '../../types/file';
import { X, Search, Send, User, Users, MessageSquare, Loader2 } from 'lucide-react';

interface Chat {
  id: number;
  title: string;
  username?: string;
}

interface ShareModalProps {
  file: FileManifest;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ file, onClose }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<number | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const results = await invoke<Chat[]>('get_chats', { accountId: file.account_id });
        setChats(results);
      } catch (e) {
        console.error('Failed to fetch chats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [file.account_id]);

  const handleShare = async (chatId: number) => {
    setSharing(chatId);
    try {
      await invoke('share_file', { 
        fileId: file.id, 
        targetChatId: chatId 
      });
      onClose();
    } catch (e) {
      console.error('Share failed:', e);
      alert('Share failed: ' + ((e as Error).message || String(e)));
    } finally {
      setSharing(null);
    }
  };

  const filteredChats = chats.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
      <div 
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Share File</h2>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Select a recipient in Telegram</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
            <input 
              type="text"
              placeholder="Search chats or usernames..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-xs text-white placeholder:text-zinc-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="h-[400px] overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-700">
              <Loader2 className="animate-spin" size={32} strokeWidth={1} />
              <span className="text-[10px] font-black uppercase tracking-widest">Fetching contacts...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-800">
              <MessageSquare size={48} strokeWidth={1} />
              <span className="text-[10px] font-black uppercase tracking-widest">No chats found</span>
            </div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-800/80 transition-all group active:scale-[0.98]"
                onClick={() => handleShare(chat.id)}
                disabled={sharing !== null}
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-blue-500 group-hover:border-blue-500/30 transition-all">
                  {chat.username ? <User size={20} /> : <Users size={20} />}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{chat.title}</div>
                  {chat.username && (
                    <div className="text-[10px] font-mono text-zinc-600">@{chat.username}</div>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-800 group-hover:text-blue-500 group-hover:border-blue-500/50 transition-all">
                  {sharing === chat.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950/40 border-t border-zinc-800">
           <div className="flex items-center gap-3 px-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Telegram Direct Forwarding Active</span>
           </div>
        </div>
      </div>
    </div>
  );
};
