import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { message } from '@tauri-apps/plugin-dialog';
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
      await message('Share failed: ' + ((e as Error).message || String(e)), { title: 'Transmission Error', kind: 'error' });
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
        className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-[#0a0a0c]">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Transmission Node</h2>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Select recipient identity</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/10">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
            <input 
              type="text"
              placeholder="QUERY IDENTITIES..."
              className="w-full bg-[#050505] border border-zinc-800/80 rounded-xl py-2.5 pl-10 pr-4 text-[11px] text-white placeholder:text-zinc-700 outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono tracking-tight uppercase"
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
              <Loader2 className="animate-spin" size={24} strokeWidth={1} />
              <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Identity Stream...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-800">
              <MessageSquare size={32} strokeWidth={1} />
              <span className="text-[10px] font-black uppercase tracking-widest">No matching identities</span>
            </div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-800/40 transition-all group active:scale-[0.98]"
                onClick={() => handleShare(chat.id)}
                disabled={sharing !== null}
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-blue-500 group-hover:border-blue-500/30 transition-all shadow-inner">
                  {chat.username ? <User size={18} /> : <Users size={18} />}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors uppercase tracking-tight">{chat.title}</div>
                  {chat.username && (
                    <div className="text-[9px] font-mono text-zinc-600">ID: @{chat.username.toUpperCase()}</div>
                  )}
                </div>
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-800 group-hover:text-blue-500 group-hover:border-blue-500/50 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all">
                  {sharing === chat.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0a0a0c] border-t border-zinc-800">
           <div className="flex items-center gap-3 px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></div>
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Telegram Direct Forwarding Active</span>
           </div>
        </div>
      </div>
    </div>
  );
};
