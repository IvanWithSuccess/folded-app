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
    <div 
      data-tauri-drag-region
      className="fixed inset-0 bg-[#f5f5f7]/40 backdrop-blur-2xl flex flex-col items-center justify-center z-[3000] p-6 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xs bg-white rounded-2xl border border-black/10 shadow-2xl p-7 flex flex-col items-center text-[#1d1d1f]"
      >
        {/* Core Icon */}
        <div className="relative w-14 h-14 flex items-center justify-center mb-5">
          <div className="absolute inset-0 rounded-xl border border-black/[0.04] bg-[#f5f5f7] shadow-inner" />
          {showCheck ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <CheckCircle2 size={26} className="text-[#34c759]" strokeWidth={2.5} />
            </motion.div>
          ) : (
            <div className="relative flex items-center justify-center">
              <Cloud size={24} strokeWidth={2.5} className="text-[#007aff]" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-3.5 rounded-full border border-t-[#007aff] border-r-transparent border-b-transparent border-l-transparent"
              />
            </div>
          )}
        </div>

        {/* Text Area */}
        <div className="text-center space-y-1.5 mb-5 w-full">
          <h1 className="text-[12px] font-semibold text-[#1d1d1f] tracking-tight">System Synchronization</h1>
          <div className="flex items-center justify-center gap-2 h-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span 
                key={currentLogIdx}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="text-[9px] font-mono text-[#86868b] truncate max-w-[200px]"
              >
                {SYSTEM_LOGS[currentLogIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="h-1 bg-black/[0.06] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#007aff]"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <div className="flex justify-between items-center text-[10px] font-semibold">
            <span className="flex items-center gap-1.5 text-[#86868b]">
              <RefreshCw size={10} className={`text-[#007aff] ${!showCheck ? 'animate-spin' : ''}`} />
              <span className="truncate max-w-[140px] font-medium">{status}</span>
            </span>
            <span className="font-mono text-[#1d1d1f] font-bold">{Math.round(progress)}%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

