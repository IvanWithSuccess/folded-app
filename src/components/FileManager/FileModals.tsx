import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, FolderPlus, Edit3, Trash2 } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  icon?: React.ReactNode;
  confirmLabel?: string;
  confirmVarient?: 'primary' | 'danger';
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, onConfirm, title, icon, children, confirmLabel = 'Confirm', confirmVarient = 'primary' }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} 
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-xl ${confirmVarient === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {icon || <AlertTriangle size={20} />}
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
            </div>
            
            <div className="mb-8">
              {children}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={onConfirm}
                className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                  ${confirmVarient === 'danger' ? 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/20' : 'bg-white text-black hover:bg-zinc-200 shadow-lg'}`}
              >
                {confirmLabel}
              </button>
              <button 
                onClick={onClose}
                className="flex-1 py-3 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

interface FileModalsProps {
  activeModal: 'newFolder' | 'rename' | 'delete' | 'conflict' | null;
  onClose: () => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  onConfirm: () => void;
  conflictDetails?: { name: string };
  onConflictAction?: (action: 'overwrite' | 'duplicate' | 'cancel') => void;
}

export const FileModals: React.FC<FileModalsProps> = ({
  activeModal,
  onClose,
  inputValue,
  setInputValue,
  onConfirm,
  conflictDetails,
  onConflictAction
}) => {
  return (
    <>
      {/* New Folder Modal */}
      <Dialog 
        isOpen={activeModal === 'newFolder'} 
        onClose={onClose} 
        onConfirm={onConfirm}
        title="Create New Folder"
        icon={<FolderPlus size={20} />}
        confirmLabel="Create"
      >
        <p className="text-xs text-zinc-500 mb-4 font-medium uppercase tracking-tight">Enter folder designation</p>
        <input 
          autoFocus
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white focus:ring-1 focus:ring-zinc-700 outline-none shadow-inner"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="New Folder"
        />
      </Dialog>

      {/* Rename Modal */}
      <Dialog 
        isOpen={activeModal === 'rename'} 
        onClose={onClose} 
        onConfirm={onConfirm}
        title="Rename Object"
        icon={<Edit3 size={20} />}
        confirmLabel="Rename"
      >
        <p className="text-xs text-zinc-500 mb-4 font-medium uppercase tracking-tight">Enter new identification</p>
        <input 
          autoFocus
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white focus:ring-1 focus:ring-zinc-700 outline-none shadow-inner"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="New Name"
        />
      </Dialog>

      {/* Delete Modal */}
      <Dialog 
        isOpen={activeModal === 'delete'} 
        onClose={onClose} 
        onConfirm={onConfirm}
        title="Wipe Data?"
        icon={<Trash2 size={20} />}
        confirmLabel="Wipe Record"
        confirmVarient="danger"
      >
        <p className="text-sm text-zinc-300 leading-relaxed font-medium">
          Are you sure you want to permanently erase this record? This action is irreversible and the manifest will be removed from Telegram.
        </p>
      </Dialog>

      {/* Conflict Modal */}
      {activeModal === 'conflict' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <AlertTriangle size={20} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Resource Conflict</h2>
            </div>
            
            <p className="text-sm text-zinc-300 mb-8 leading-relaxed font-medium">
               An object named <span className="text-white font-bold">"{conflictDetails?.name}"</span> already exists in this directory. How would you like to proceed?
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => onConflictAction?.('overwrite')}
                className="w-full py-4 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
              >
                Overwrite Existing
              </button>
              <button 
                onClick={() => onConflictAction?.('duplicate')}
                className="w-full py-4 rounded-xl bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all active:scale-95"
              >
                Upload as Duplicate
              </button>
              <button 
                onClick={() => onConflictAction?.('cancel')}
                className="w-full py-4 rounded-xl border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all active:scale-95"
              >
                Abort Action
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
