import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { 
  Cloud, Shield, Layout, Zap, ChevronRight, 
  ChevronLeft, Sparkles, Star, Hash, Plus, Loader2, Check 
} from 'lucide-react';
import { message } from '@tauri-apps/plugin-dialog';

interface OnboardingStorageProps {
  accountId: string;
  onComplete: () => void;
}

interface ChannelInfo {
  id: number;
  title: string;
}

export const OnboardingStorage: React.FC<OnboardingStorageProps> = ({ accountId, onComplete }) => {
  const [step, setStep] = useState(1); // 1: Welcome, 2: Storage Selection
  const [hubType, setHubType] = useState<'saved_messages' | 'channel'>('saved_messages');
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (step === 2) {
      loadChannels();
    }
  }, [step]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const list = await invoke<ChannelInfo[]>('get_user_channels', { accountId });
      setChannels(list);
    } catch (e) {
      console.error('Failed to load channels:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    setCreating(true);
    try {
      const channelId = await invoke<number>('create_storage_hub', { 
        accountId, 
        title: "Folded Storage Hub" 
      });
      await loadChannels();
      setSelectedChannelId(channelId);
      setHubType('channel');
    } catch (e) {
      await message("Failed to create channel: " + ((e as Error).message || String(e)) + ". You might have reached Telegram's channel limit.", { title: 'Storage Hub Error', kind: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await invoke('update_setting', { key: 'storage_hub_type', value: hubType });
      if (hubType === 'channel' && selectedChannelId !== null) {
        await invoke('update_setting', { key: 'storage_hub_id', value: selectedChannelId.toString() });
      }
      await invoke('update_setting', { key: 'onboarded', value: 'true' });
      onComplete();
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[2500] p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-zinc-950 border border-zinc-900 rounded-[48px] p-12 flex flex-col shadow-2xl relative overflow-hidden min-h-[600px]"
      >
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <div className="mb-10 w-20 h-20 bg-zinc-900 rounded-[24px] flex items-center justify-center border border-zinc-800 text-white">
                <Cloud size={40} strokeWidth={1.5} />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-6 italic">Welcome to Folded</h1>
              <p className="text-lg text-zinc-500 leading-relaxed mb-auto">
                You've successfully connected your Telegram node. Now we need to define where your encrypted data clusters will be stored.
              </p>
              
              <div className="space-y-4 mt-12">
                <div className="flex gap-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-900">
                  <Shield size={20} className="text-zinc-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white mb-1 uppercase tracking-wider">End-to-End Privacy</p>
                    <p className="text-[11px] text-zinc-500 leading-tight">Your data is split into anonymous chunks and stored strictly within your own Telegram containers.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-900">
                  <Zap size={20} className="text-zinc-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Serverless Mesh</p>
                    <p className="text-[11px] text-zinc-500 leading-tight">Folded doesn't have servers. We use Telegram's cloud as a high-speed distributed backend.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="mt-12 w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95"
              >
                Configure Storage <ChevronRight size={18} />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <header className="mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight italic mb-2">Storage Hub Selection</h2>
                <p className="text-zinc-500 text-sm font-medium">Select your primary container for data storage.</p>
              </header>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => setHubType('saved_messages')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-4
                    ${hubType === 'saved_messages' ? 'bg-white border-white' : 'bg-transparent border-zinc-900 hover:border-zinc-700'}`}
                >
                  <div className={`p-3 rounded-xl ${hubType === 'saved_messages' ? 'bg-black text-white' : 'bg-zinc-900 text-zinc-500'}`}>
                    <Star size={24} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest mb-1 ${hubType === 'saved_messages' ? 'text-black' : 'text-white'}`}>Saved Messages</p>
                    <p className={`text-[10px] leading-tight ${hubType === 'saved_messages' ? 'text-zinc-600' : 'text-zinc-500'}`}>Simple and personal. Stored in your "Избранное".</p>
                  </div>
                </button>

                <button 
                  onClick={() => setHubType('channel')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-4
                    ${hubType === 'channel' ? 'bg-white border-white' : 'bg-transparent border-zinc-900 hover:border-zinc-700'}`}
                >
                  <div className={`p-3 rounded-xl ${hubType === 'channel' ? 'bg-black text-white' : 'bg-zinc-900 text-zinc-500'}`}>
                    <Hash size={24} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest mb-1 ${hubType === 'channel' ? 'text-black' : 'text-white'}`}>Private Channel</p>
                    <p className={`text-[10px] leading-tight ${hubType === 'channel' ? 'text-zinc-600' : 'text-zinc-500'}`}>Advanced. Keeps storage separate from your chats.</p>
                  </div>
                </button>
              </div>

              {hubType === 'channel' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col min-h-0 mb-8"
                >
                  <div className="flex justify-between items-end mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Available Channels</p>
                    <button 
                      onClick={handleCreateChannel}
                      disabled={creating}
                      className="text-[10px] font-bold text-white hover:underline flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                      Create New
                    </button>
                  </div>
                  
                  <div className="flex-1 bg-zinc-900/50 border border-zinc-900 rounded-2xl overflow-y-auto p-2 scrollbar-hide">
                    {loading ? (
                      <div className="h-32 flex items-center justify-center">
                        <Loader2 size={24} className="text-zinc-800 animate-spin" />
                      </div>
                    ) : channels.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center text-zinc-700">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-2">No usable channels found</p>
                        <button onClick={handleCreateChannel} className="text-[10px] font-bold text-zinc-500 hover:text-white underline">Create one now</button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {channels.map(chan => (
                          <button 
                            key={chan.id}
                            onClick={() => setSelectedChannelId(chan.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl transition-all
                              ${selectedChannelId === chan.id ? 'bg-white text-black' : 'hover:bg-zinc-800 text-zinc-400'}`}
                          >
                            <span className="text-xs font-bold truncate">{chan.title}</span>
                            {selectedChannelId === chan.id && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="flex gap-4 mt-auto">
                <button 
                   onClick={() => setStep(1)}
                   className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white transition-all active:scale-95"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={handleFinish}
                  disabled={loading || (hubType === 'channel' && selectedChannelId === null)}
                  className="flex-1 py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Complete Setup"}
                  {!loading && <Sparkles size={18} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-12 text-[9px] font-bold text-zinc-800 uppercase tracking-[0.5em] flex justify-center w-full">
           Onboarding Mesh // Node 01
        </footer>
      </motion.div>
    </div>
  );
};
