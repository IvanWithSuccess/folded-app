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
  const [step, setStep] = useState(1);
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
    <div 
      data-tauri-drag-region
      className="fixed inset-0 bg-[#f5f5f7]/40 backdrop-blur-2xl flex items-center justify-center z-[2500] p-6 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white border border-black/10 rounded-2xl p-8 flex flex-col shadow-2xl relative overflow-hidden min-h-[500px] text-[#1d1d1f]"
      >

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="flex flex-col h-full"
            >
              <div className="mb-6 w-12 h-12 bg-[#007aff] rounded-xl flex items-center justify-center text-white shadow-xs">
                <Cloud size={24} strokeWidth={2.5} />
              </div>
              <h1 className="text-[20px] font-bold text-[#1d1d1f] tracking-tight mb-2.5">Welcome to Folded</h1>
              <p className="text-[13px] text-[#86868b] leading-relaxed mb-auto font-medium">
                You've successfully connected your Telegram node. Now let's define where your encrypted data clusters will be stored.
              </p>
              
              <div className="space-y-3 my-6">
                <div className="flex gap-3 p-3.5 rounded-xl bg-white border border-black/[0.04] shadow-xs">
                  <Shield size={18} className="text-[#007aff] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-[#1d1d1f] mb-0.5">End-to-End Privacy</p>
                    <p className="text-[11px] text-[#86868b] leading-tight font-medium">Data is split into anonymous chunks and stored strictly in your own Telegram containers.</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3.5 rounded-xl bg-white border border-black/[0.04] shadow-xs">
                  <Zap size={18} className="text-[#007aff] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-[#1d1d1f] mb-0.5">Serverless Mesh</p>
                    <p className="text-[11px] text-[#86868b] leading-tight font-medium">We use Telegram's cloud as a high-speed, zero-knowledge distributed backend.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="mt-4 w-full py-2.5 bg-[#007aff] hover:bg-[#0066cc] active:scale-98 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs border-0"
              >
                Configure Storage <ChevronRight size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="flex flex-col h-full"
            >
              <header className="mb-6">
                <h2 className="text-[18px] font-bold text-[#1d1d1f] tracking-tight mb-1">Storage Hub Selection</h2>
                <p className="text-[#86868b] text-[11px] font-medium">Select your primary container for data storage.</p>
              </header>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                  onClick={() => setHubType('saved_messages')}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center text-center gap-2.5 cursor-pointer
                    ${hubType === 'saved_messages' ? 'bg-[#007aff] text-white border-[#007aff] shadow-xs' : 'bg-white border-black/[0.04] hover:bg-[#f5f5f7] text-[#1d1d1f]'}`}
                >
                  <div className={`p-2 rounded-lg ${hubType === 'saved_messages' ? 'bg-white/20 text-white' : 'bg-[#f5f5f7] text-[#007aff]'}`}>
                    <Star size={18} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold mb-0.5 ${hubType === 'saved_messages' ? 'text-white' : 'text-[#1d1d1f]'}`}>Saved Messages</p>
                    <p className={`text-[10px] leading-tight ${hubType === 'saved_messages' ? 'text-white/80' : 'text-[#86868b] font-medium'}`}>Simple & personal ("Избранное").</p>
                  </div>
                </button>

                <button 
                  onClick={() => setHubType('channel')}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center text-center gap-2.5 cursor-pointer
                    ${hubType === 'channel' ? 'bg-[#007aff] text-white border-[#007aff] shadow-xs' : 'bg-white border-black/[0.04] hover:bg-[#f5f5f7] text-[#1d1d1f]'}`}
                >
                  <div className={`p-2 rounded-lg ${hubType === 'channel' ? 'bg-white/20 text-white' : 'bg-[#f5f5f7] text-[#007aff]'}`}>
                    <Hash size={18} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold mb-0.5 ${hubType === 'channel' ? 'text-white' : 'text-[#1d1d1f]'}`}>Private Channel</p>
                    <p className={`text-[10px] leading-tight ${hubType === 'channel' ? 'text-white/80' : 'text-[#86868b] font-medium'}`}>Keeps storage separate from chats.</p>
                  </div>
                </button>
              </div>

              {hubType === 'channel' && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col min-h-0 mb-6"
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#86868b]">Available Channels</p>
                    <button 
                      onClick={handleCreateChannel}
                      disabled={creating}
                      className="text-[11px] font-semibold text-[#007aff] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Create New Hub
                    </button>
                  </div>
                  
                  <div className="flex-1 bg-white border border-black/[0.04] rounded-xl overflow-y-auto p-2 shadow-xs">
                    {loading ? (
                      <div className="h-28 flex items-center justify-center">
                        <Loader2 size={20} className="text-[#007aff] animate-spin" />
                      </div>
                    ) : channels.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center text-[#86868b]">
                        <p className="text-xs font-semibold mb-1">No channels found</p>
                        <button onClick={handleCreateChannel} className="text-xs font-semibold text-[#007aff] hover:underline">Create channel now</button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {channels.map(chan => (
                          <button 
                            key={chan.id}
                            onClick={() => setSelectedChannelId(chan.id)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all text-left cursor-pointer border-0
                              ${selectedChannelId === chan.id ? 'bg-[#007aff] text-white' : 'hover:bg-[#f5f5f7] text-[#1d1d1f]'}`}
                          >
                            <span className="text-xs font-semibold truncate">{chan.title}</span>
                            {selectedChannelId === chan.id && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3 mt-auto">
                <button 
                   onClick={() => setStep(1)}
                   className="p-2.5 rounded-lg bg-[#f5f5f7] hover:bg-[#e3e3e5] text-[#1d1d1f] transition-all active:scale-95 cursor-pointer border-0"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={handleFinish}
                  disabled={loading || (hubType === 'channel' && selectedChannelId === null)}
                  className="flex-1 py-2.5 bg-[#007aff] hover:bg-[#0066cc] text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer border-0 shadow-xs"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : "Complete Setup"}
                  {!loading && <Sparkles size={14} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-6 text-[9px] font-semibold text-[#86868b] uppercase tracking-widest flex justify-center w-full">
           Onboarding Mesh // Folded Vault
        </footer>
      </motion.div>
    </div>
  );
};
