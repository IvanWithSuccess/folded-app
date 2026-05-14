import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';

interface SyncSplashScreenProps {
  onComplete: () => void;
  status: string;
  progress: number;
}

const SYSTEM_LOGS = [
  "Initializing MTProto encryption layer...",
  "Establishing secure handshake with Telegram nodes...",
  "Resolving distributed file manifest...",
  "Hydrating local metadata cache...",
  "Reconstituting encrypted chunk map...",
  "Verifying cluster integrity...",
  "Synchronizing peer states...",
  "Applying differential updates...",
  "Optimizing storage mesh...",
  "Readying local workspace..."
];

export const SyncSplashScreen: React.FC<SyncSplashScreenProps> = ({ onComplete, status, progress }) => {
  const [showCheck, setShowCheck] = useState(false);
  const [currentLogIdx, setCurrentLogIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLogIdx(prev => (prev + 1) % SYSTEM_LOGS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        setShowCheck(true);
        setTimeout(onComplete, 800);
      }, 400);
    }
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 bg-[#09090b] flex flex-col items-center justify-center z-[3000]">
      {/* Background stays clean and dark */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        
        {/* Minimal Core Icon */}
        <div className="relative w-24 h-24 flex items-center justify-center mb-12">
          <div className="absolute inset-0 rounded-2xl border border-zinc-800 bg-zinc-900/20" />
          {showCheck ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <CheckCircle2 size={40} className="text-blue-500" strokeWidth={1.5} />
            </motion.div>
          ) : (
            <div className="relative">
              <Cloud size={40} strokeWidth={1} className="text-zinc-700" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 rounded-full border border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent"
              />
            </div>
          )}
        </div>

        {/* Text Area - Clean Typography */}
        <div className="text-center space-y-2 mb-10">
          <h1 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">System Synchronization</h1>
          <div className="flex items-center justify-center gap-2 h-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span 
                key={currentLogIdx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[9px] font-mono text-zinc-500 uppercase"
              >
                {SYSTEM_LOGS[currentLogIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Industrial Progress Bar - Matches Account Cards */}
        <div className="w-full px-8 space-y-3">
          <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <div className="flex justify-between items-center px-0.5">
            <div className="flex items-center gap-2">
              <RefreshCw size={10} className={`text-zinc-600 ${!showCheck ? 'animate-spin' : ''}`} />
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{status}</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-zinc-400">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Footer Meta - Very subtle */}
      <div className="absolute bottom-10 text-[8px] font-bold uppercase tracking-[0.4em] text-zinc-800">
        Folded Engine v1.0.1 // Node Mesh Active
      </div>
    </div>
  );
};
