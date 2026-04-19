import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';

interface SyncSplashScreenProps {
  onComplete: () => void;
  status: string;
  progress: number;
}

export const SyncSplashScreen: React.FC<SyncSplashScreenProps> = ({ onComplete, status, progress }) => {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        setShowCheck(true);
        setTimeout(onComplete, 800);
      }, 500);
    }
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 bg-[#09090b] flex flex-col items-center justify-center z-[3000]">
      <div className="relative w-32 h-32 flex items-center justify-center mb-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-zinc-800 border-t-white"
        />
        <div className="text-white">
          {showCheck ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <CheckCircle2 size={48} className="text-emerald-500" />
            </motion.div>
          ) : (
            <Cloud size={48} strokeWidth={1} className="text-white/20" />
          )}
        </div>
      </div>

      <div className="text-center space-y-4 max-w-sm px-10">
        <h1 className="text-2xl font-black text-white tracking-tight italic uppercase">Synchronizing</h1>
        <p className="text-zinc-500 text-sm font-medium leading-relaxed">
          Establishing secure link with Telegram cluster and reconstituting your local workspace...
        </p>
      </div>

      <div className="mt-16 w-64 h-1 bg-zinc-900 rounded-full overflow-hidden relative">
        <motion.div 
          className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-zinc-600">
        <RefreshCw size={12} className="animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-widest">{status}</span>
      </div>

      <div className="absolute bottom-12 text-[10px] font-black uppercase tracking-[0.3em] text-white/5">
        Folded Core v2.0 // Secure Sync
      </div>
    </div>
  );
};
