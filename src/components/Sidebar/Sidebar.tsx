import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Files, Image, FileText, Star, Settings, UserPlus, 
  ChevronDown, ChevronRight, HardDrive, MessageSquare, RefreshCw
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ViewCategory } from '../../types/file';


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
    taskProgress,
    queueTasks
  } = useAppStore();


  const handleNavClick = (accountId: string, view: ViewCategory) => {
    setActiveAccount(accountId);
    setActiveView(view);
  };

  return (
    <div className="w-64 h-full flex flex-col border-r border-border shrink-0 select-none bg-background">
      {/* App Header */}
      <div className="h-12 flex items-center px-5 border-b border-border gap-3 bg-surface shrink-0">
        <div className="flex flex-col">
          <span className="text-[12px] font-black text-foreground tracking-tight uppercase">Folded Cloud</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-7 custom-scrollbar">
        
        {/* Account Drives */}
        <div className="space-y-1.5">
          <h3 className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground">Storage Nodes</h3>
          
          {accounts.map(account => {
            const isExpanded = expandedAccounts instanceof Set ? expandedAccounts.has(account.id) : Array.isArray(expandedAccounts) ? (expandedAccounts as any).includes(account.id) : false;
            const isActiveDrive = activeAccountId === account.id;

            return (
              <div key={account.id} className="space-y-0.5">
                <div 
                  className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all border border-transparent
                    ${isActiveDrive ? 'bg-zinc-900/50 border-zinc-800/50 text-white' : 'text-zinc-500 hover:bg-zinc-900/30 hover:text-zinc-300'}`}
                  onClick={() => {
                    if (!isActiveDrive) {
                      setActiveAccount(account.id);
                      setActiveView('FILES');
                    }
                    toggleAccountExpanded(account.id);
                  }}
                >
                  <span className={isActiveDrive ? 'text-blue-500' : 'text-zinc-700'}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <HardDrive size={14} className={isActiveDrive ? 'text-blue-400' : 'opacity-40'} />
                  <span className="text-[11px] font-bold tracking-tight truncate flex-1">{account.username || account.first_name || 'NODE'}</span>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden ml-4 pl-4 border-l border-zinc-800/50 space-y-0.5"
                    >
                      {[
                        { id: 'FILES', label: 'All Files', icon: <Files size={12} /> },
                        { id: 'PHOTOS', label: 'Media Lab', icon: <Image size={12} /> },
                        { id: 'DOCUMENTS', label: 'Documents', icon: <FileText size={12} /> },
                        { id: 'NOTES', label: 'Notes', icon: <MessageSquare size={12} /> },
                        { id: 'STARRED', label: 'Starred', icon: <Star size={12} /> },
                      ].map(item => (
                        <div 
                          key={item.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-[10px] uppercase font-black tracking-widest transition-all
                            ${isActiveDrive && activeView === item.id ? 'bg-white text-black' : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'}`}
                          onClick={() => handleNavClick(account.id, item.id as ViewCategory)}
                        >
                          <span className={isActiveDrive && activeView === item.id ? 'text-black' : 'opacity-60'}>{item.icon}</span>
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
        <div className="pt-6 border-t border-zinc-800/50 space-y-1">
          <h3 className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground">System Utilities</h3>
          <div 
            className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-[10px] font-black uppercase tracking-widest transition-all
              ${activeView === 'MIRRORS' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'}`}
            onClick={() => setActiveView('MIRRORS')}
          >
            <RefreshCw size={12} className={activeView === 'MIRRORS' ? 'text-blue-500' : 'opacity-60'} />
            Folder Mirroring
          </div>
          <div 
            className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-[10px] font-black uppercase tracking-widest transition-all
              ${activeView === 'ACCOUNTS' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'}`}
            onClick={() => setActiveView('ACCOUNTS')}
          >
            <UserPlus size={12} className={activeView === 'ACCOUNTS' ? 'text-blue-500' : 'opacity-60'} />
            Account Center
          </div>
          <div 
            className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-[10px] font-black uppercase tracking-widest transition-all
              ${activeView === 'SETTINGS' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'}`}
            onClick={() => setActiveView('SETTINGS')}
          >
            <Settings size={12} className={activeView === 'SETTINGS' ? 'text-blue-500' : 'opacity-60'} />
            Global Settings
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-5 border-t border-border bg-surface space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em]">Network Link</span>
              <span className={`text-[10px] font-black tracking-widest uppercase ${nodeStatus === 'OFFLINE' ? 'text-red-500' : 'text-zinc-400'}`}>
                {nodeStatus}
              </span>
           </div>
           <div className={`w-1.5 h-1.5 rounded-full ${
             nodeStatus === 'OFFLINE' ? 'bg-red-500' : 
             activeTask ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
           }`}></div>
        </div>


        <AnimatePresence>
          {queueTasks.filter(t => t.status !== 'COMPLETED').length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800/50 rounded-md p-3 space-y-3 overflow-hidden shadow-inner"
            >
               <div className="flex justify-between items-end">
                  <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.15em]">
                    Queue Manager ({queueTasks.filter(t => t.status === 'RUNNING').length}/{queueTasks.length})
                  </span>
               </div>
               
               <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                 {queueTasks.filter(t => t.status !== 'COMPLETED').map(task => (
                   <div key={task.id} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter">
                        <span className="text-zinc-400 truncate max-w-[120px]">{JSON.parse(task.payload).file_name || task.task_type}</span>
                        <span className={`px-1 rounded-[2px] ${
                          task.status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                          task.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      {task.status === 'RUNNING' && activeTask && task.id === activeTask && (
                        <div className="h-0.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${taskProgress}%` }}
                            className="h-full bg-blue-600 transition-all duration-300"
                          ></motion.div>
                        </div>
                      )}
                   </div>
                 ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
