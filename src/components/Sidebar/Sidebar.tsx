import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Files, Image, FileText, Star, Settings, UserPlus, 
  ChevronDown, ChevronRight, HardDrive, MessageSquare
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ViewCategory } from '../../types/file';

import appIcon from '../../assets/app-icon.png';

export const Sidebar: React.FC = () => {
  const { 
    accounts, 
    activeAccountId, 
    activeView, 
    expandedAccounts, 
    setActiveAccount, 
    setActiveView, 
    toggleAccountExpanded,
    nodeStatus,
    activeTask,
    taskProgress
  } = useAppStore();

  const handleNavClick = (accountId: string, view: ViewCategory) => {
    setActiveAccount(accountId);
    setActiveView(view);
  };

  return (
    <div className="w-64 h-full flex flex-col border-r border-zinc-800 shrink-0 select-none" style={{ backgroundColor: '#0d0d0f' }}>
      {/* App Header */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-800 gap-3">
        <img src={appIcon} alt="Folded Cloud" className="w-8 h-8 rounded-lg shrink-0" />
        <div className="flex flex-col leading-tight">
          <span className="text-[12px] font-black text-white tracking-tight">Folded</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Cloud Storage</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
        
        {/* Account Drives */}
        <div className="space-y-1">
          <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Drives</h3>
          
          {accounts.map(account => {
            const isExpanded = expandedAccounts.has(account.id);
            const isActiveDrive = activeAccountId === account.id;

            return (
              <div key={account.id} className="space-y-0.5">
                <div 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
                    ${isActiveDrive ? 'bg-zinc-800/50 text-white' : 'text-zinc-500 hover:bg-zinc-800/30 hover:text-zinc-300'}`}
                  onClick={() => toggleAccountExpanded(account.id)}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <HardDrive size={16} className={isActiveDrive ? 'text-blue-400' : ''} />
                  <span className="text-[12px] font-medium truncate flex-1">{account.username || account.first_name || 'Account'}</span>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden ml-4 pl-4 border-l border-zinc-800 space-y-0.5"
                    >
                      {[
                        { id: 'FILES', label: 'Files', icon: <Files size={14} /> },
                        { id: 'PHOTOS', label: 'Photos', icon: <Image size={14} /> },
                        { id: 'DOCUMENTS', label: 'Documents', icon: <FileText size={14} /> },
                        { id: 'NOTES', label: 'Notes', icon: <MessageSquare size={14} /> },
                        { id: 'STARRED', label: 'Starred', icon: <Star size={14} /> },
                      ].map(item => (
                        <div 
                          key={item.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-[12px] transition-colors
                            ${isActiveDrive && activeView === item.id ? 'bg-white text-black font-semibold' : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'}`}
                          onClick={() => handleNavClick(account.id, item.id as ViewCategory)}
                        >
                          {item.icon}
                          {item.label}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Global Tools */}
        <div className="pt-4 border-t border-zinc-800 space-y-1">
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-[12px] transition-colors
              ${activeView === 'ACCOUNTS' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'}`}
            onClick={() => setActiveView('ACCOUNTS')}
          >
            <UserPlus size={14} />
            Account Center
          </div>
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-[12px] transition-colors
              ${activeView === 'SETTINGS' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'}`}
            onClick={() => setActiveView('SETTINGS')}
          >
            <Settings size={14} />
            Global Settings
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Network Status</span>
              <span className={`text-[10px] font-bold tracking-wide uppercase ${nodeStatus === 'OFFLINE' ? 'text-red-500' : 'text-zinc-300'}`}>
                {nodeStatus}
              </span>
           </div>
           <div className={`w-1.5 h-1.5 rounded-full ${
             nodeStatus === 'OFFLINE' ? 'bg-red-500' : 
             activeTask ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
           }`}></div>
        </div>

        <AnimatePresence>
          {activeTask && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-950/50 border border-zinc-800/30 rounded-xl p-3 space-y-2 overflow-hidden"
            >
               <div className="flex justify-between items-end mb-1">
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">
                    Active Task
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 leading-none">
                    {taskProgress}%
                  </span>
               </div>
               
               <div className="h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${taskProgress}%` }}
                    className="h-full bg-blue-500 transition-all duration-500"
                  ></motion.div>
               </div>
               
               <div className="text-[9px] font-medium text-zinc-400 truncate mt-2 italic">
                 {activeTask}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
