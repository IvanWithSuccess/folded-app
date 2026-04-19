import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, FolderTree, FileText, ShieldCheck, 
  ChevronRight, ChevronLeft, Sparkles 
} from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: "Folded 2.0",
      description: "Convert your Telegram accounts into a high-performance digital workspace. Aggregate multiple accounts for infinite storage capacity.",
      icon: <Cloud size={48} strokeWidth={1} />,
      accent: "text-zinc-400"
    },
    {
      title: "Hierarchical Explorer",
      description: "Manage your file system in a professional monochromatic interface with infinite Miller Columns and recursive folder support.",
      icon: <FolderTree size={48} strokeWidth={1} />,
      accent: "text-zinc-400"
    },
    {
      title: "Digital Notes",
      description: "Your messages are automatically indexed into a clean, searchable notes archive. High-contrast typography for maximum focus.",
      icon: <FileText size={48} strokeWidth={1} />,
      accent: "text-zinc-400"
    },
    {
      title: "Private Hubs",
      description: "Establish dedicated storage nodes within Telegram channels. Secure, distributed, and strictly monochromatic.",
      icon: <ShieldCheck size={48} strokeWidth={1} />,
      accent: "text-zinc-400"
    }
  ];

  const current = steps[step - 1];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[2000] p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-[40px] p-12 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900">
           <motion.div 
              className="h-full bg-white" 
              initial={{ width: "25%" }}
              animate={{ width: `${(step / steps.length) * 100}%` }}
           />
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex flex-col items-center"
          >
            <div className={`mb-8 p-6 bg-zinc-900/50 rounded-3xl border border-zinc-900 ${current.accent}`}>
              {current.icon}
            </div>
            
            <h1 className="text-3xl font-black text-white tracking-tight mb-4">{current.title}</h1>
            <p className="text-lg text-zinc-500 leading-relaxed mb-12 px-2">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 w-full mt-auto">
          {step > 1 && (
            <button 
              className="flex-1 py-4 px-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95" 
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          <button 
            className="flex-[2] py-4 px-8 rounded-2xl bg-white text-black font-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 active:scale-95"
            onClick={() => {
              if (step < steps.length) setStep(step + 1);
              else onComplete();
            }}
          >
            {step === steps.length ? "Initialize Workspace" : "Continue"}
            {step === steps.length ? <Sparkles size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <div className="flex gap-1.5 mt-10">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-500 ${step === i + 1 ? 'w-8 bg-white' : 'w-2 bg-zinc-800'}`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
