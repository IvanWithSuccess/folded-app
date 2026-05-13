import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const ProcessesView: React.FC = () => {
  const { queueTasks, taskProgress, activeTask } = useAppStore();
  
  const activeTasks = queueTasks.filter(t => t.status !== 'COMPLETED');
  
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] text-zinc-300 font-sans select-none overflow-hidden border border-zinc-800 rounded-lg">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">Active Processes</span>
        </div>
        <div className="text-[9px] font-bold text-zinc-500">
          {activeTasks.length} Task(s)
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {activeTasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center space-y-2 opacity-40 py-10"
            >
              <CheckCircle2 size={32} className="text-emerald-500/50" />
              <span className="text-[9px] font-black uppercase tracking-widest">All tasks completed</span>
            </motion.div>
          ) : (
            activeTasks.map((task) => {
              const payload = JSON.parse(task.payload);
              const fileName = payload.file_name || payload.directory_path || task.task_type;
              const isActive = activeTask === task.id;

              return (
                <motion.div 
                  key={task.id}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 10, opacity: 0 }}
                  className="bg-zinc-900/40 border border-zinc-800/50 rounded-md p-3 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5 max-w-[80%]">
                      <span className="text-[10px] font-bold text-white truncate">{fileName}</span>
                      <span className="text-[8px] font-medium text-zinc-500 uppercase tracking-tight">
                        {task.task_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className={`px-1.5 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-tighter
                      ${task.status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 
                        task.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}
                    >
                      {task.status}
                    </div>
                  </div>

                  {task.status === 'RUNNING' && isActive && (
                    <div className="space-y-1.5">
                      <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,24(0.5)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${taskProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-black text-zinc-500 uppercase">
                        <span>Processing</span>
                        <span className="text-blue-400">{taskProgress}%</span>
                      </div>
                    </div>
                  )}

                  {task.error && (
                    <div className="flex items-center gap-1.5 text-[8px] text-red-400/80 bg-red-500/5 p-1.5 rounded border border-red-500/10">
                      <AlertCircle size={10} />
                      <span className="truncate">{task.error}</span>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="h-8 flex items-center px-4 bg-zinc-950 border-t border-zinc-900 text-[8px] font-black text-zinc-600 uppercase tracking-widest">
        Folded Engine v0.1.0
      </div>
    </div>
  );
};
