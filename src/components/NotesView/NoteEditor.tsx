import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Save, 
  User, 
  Clock, 
  Share2, 
  Shield,
  Lock,
  Paperclip,
  Loader2,
  File,
  Image as ImageIcon,
  Video,
  Music,
  Download
} from 'lucide-react';
import { NoteInfo } from '../../hooks/useNotes';
import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';
import { FilePickerModal } from './FilePickerModal';
import { getErrorMessage } from '../../utils/errorUtils';

interface NoteEditorProps {
  note: NoteInfo | null;
  onClose: () => void;
  onSave: (id: string | null, content: string) => Promise<void>;
  onUpdate: (note: NoteInfo, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  onAttach: (fileId: string) => Promise<void>;
  onDetach: (fileId: string) => Promise<void>;
  isCreating: boolean;
}

interface FileManifest {
  id: string;
  name: string;
  total_size: number;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ 
  note, 
  onClose,
  onSave, 
  onUpdate, 
  onDelete,
  onAttach,
  onDetach,
  isCreating 
}) => {
  const [content, setContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileManifest[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const isNew = !note;
  const isReadOnly = note ? !note.from_self : false;

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setIsModified(false);
      fetchAttachmentInfo(note.attachment_ids).catch(err => console.error('Attachment fetch error:', err));
    } else {
      setContent('');
      setIsModified(true);
      setAttachedFiles([]);
    }
  }, [note]);

  const fetchAttachmentInfo = async (idsString?: string) => {
    if (!idsString) {
      setAttachedFiles([]);
      return;
    }
    setLoadingAttachments(true);
    try {
      const ids = idsString.split(',').filter(id => id.trim().length > 0);
      const allFiles = await invoke<FileManifest[]>('cluster_list_files');
      if (!Array.isArray(allFiles)) {
        setAttachedFiles([]);
        return;
      }
      const manifests = ids.map(id => allFiles.find(f => f?.id === id)).filter((f): f is FileManifest => !!f);
      setAttachedFiles(manifests);
    } catch (e) {
      console.error('Error fetching attachment info:', getErrorMessage(e));
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      if (isNew || isModified) {
        if (isNew) {
           await onSave(null, content);
        } else if (note) {
           await onUpdate(note, content);
        }
        setIsModified(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttachFile = async (fileId: string) => {
    if (!note) return;
    setIsPickerOpen(false);
    await onAttach(fileId);
  };

  const handleDetachFile = async (fileId: string) => {
    if (!note) return;
    const confirmed = await confirm('Remove this attachment?');
    if (!confirmed) return;
    await onDetach(fileId);
  };

  const handleOpenFile = async (fileId: string) => {
    try {
      const path = await invoke<string>('cluster_download_to_tmp', { fileId });
      await invoke('open_system_file', { path });
    } catch (e) {
      alert('Failed to open file: ' + getErrorMessage(e));
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return <ImageIcon size={14} />;
    if (['mp4', 'mkv', 'mov', 'avi'].includes(ext || '')) return <Video size={14} />;
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) return <Music size={14} />;
    return <File size={14} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950/50 animate-in fade-in duration-300">
      {/* Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/50">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">
                {isNew ? 'New Note' : isReadOnly ? 'View Note' : 'Edit Note'}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-bold text-zinc-400">
                  {isNew ? 'Draft' : note?.id?.slice(0, 16).toUpperCase() || 'N/A'}
                </p>
                {isReadOnly && (
                  <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                    <Shield size={8} />
                    <span>Read Only</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
              {!isReadOnly && (
                <button 
                  onClick={() => handleSave().catch(e => console.error('Save error:', e))}
                  disabled={(content.trim() === (note?.content || '').trim() && !isNew) || isSaving}
                  className={`flex items-center gap-2 px-5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all
                    ${(content.trim() !== (note?.content || '').trim() || isNew) ? 'bg-zinc-100 text-black hover:bg-white shadow-lg active:scale-95' : 'bg-zinc-900 text-zinc-700 cursor-default'}`}
                >
                  <Save size={14} />
                  <span>{isNew ? 'Create' : 'Save Changes'}</span>
                </button>
              )}

              {isReadOnly && (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <Lock size={12} className="text-zinc-700" />
                  <span>Forwarded Note</span>
                </div>
              )}

             {!isNew && (
               <button 
                 onClick={() => { 
                   if (note?.id) {
                     onDelete(note.id);
                   }
                 }}
                 className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                 title="Delete Note"
               >
                 <Trash2 size={16} />
               </button>
             )}
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 relative flex flex-col p-8 overflow-hidden">
          <textarea 
            autoFocus
            readOnly={isReadOnly}
            className={`flex-1 w-full bg-transparent text-lg text-zinc-100 placeholder:text-zinc-800 outline-none resize-none leading-relaxed font-medium transition-all selection:bg-white selection:text-black
              ${isReadOnly ? 'opacity-70 cursor-default' : ''}`}
            value={typeof content === 'string' ? content : ''}
            onChange={(e) => { 
              if (isReadOnly) return;
              setContent(e.target.value); 
              setIsModified(true); 
            }}
            placeholder={isReadOnly ? "No content available" : "Write something..."}
          />

          {/* Info Footer & Attachments */}
          {!isNew && note && (
            <div className="mt-auto space-y-6 pt-8">
              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-zinc-600">
                     <Paperclip size={14} strokeWidth={2.5} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Attachments</span>
                     <span className="text-[10px] font-bold bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-500">
                       {attachedFiles.length}
                     </span>
                   </div>
                   {!isReadOnly && (
                     <button 
                       onClick={() => setIsPickerOpen(true)}
                       className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
                     >
                       + Attach Existing
                     </button>
                   )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {loadingAttachments ? (
                    <div className="col-span-full py-4 flex items-center justify-center text-zinc-700">
                       <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : attachedFiles.length === 0 ? (
                    <div className="col-span-full py-4 px-5 rounded-lg border border-dashed border-zinc-800/50 bg-zinc-950/30 text-[10px] font-bold text-zinc-700 uppercase tracking-tight italic flex items-center justify-center">
                      No linked resource objects detected
                    </div>
                  ) : (
                    attachedFiles.map(file => (
                      <div 
                        key={file.id} 
                        className="group relative flex items-center gap-3 p-3 bg-zinc-950/80 border border-zinc-900 rounded-lg hover:border-zinc-700 transition-all cursor-pointer shadow-sm hover:shadow-xl"
                        onClick={() => handleOpenFile(file.id)}
                      >
                         <div className="p-2 rounded-lg bg-zinc-900 group-hover:bg-blue-500/10 text-zinc-500 group-hover:text-blue-500 transition-colors">
                           {getFileIcon(file.name)}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-zinc-300 truncate group-hover:text-zinc-100 transition-colors">
                              {file.name}
                            </p>
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mt-1">
                              {formatSize(file.total_size)}
                            </p>
                         </div>
                         {!isReadOnly && (
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDetachFile(file.id).catch(err => console.error('Detach error:', err));
                             }}
                             className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-500 text-zinc-700 rounded-md transition-all"
                           >
                             <X size={12} />
                           </button>
                         )}
                         <div className="opacity-0 group-hover:opacity-100 absolute bottom-2 right-2 flex gap-1 pointer-events-none transition-opacity">
                            <Download size={10} className="text-blue-500" strokeWidth={3} />
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-zinc-900/50 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                       <User size={12} className="text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">From</span>
                      <span className={`text-[10px] font-bold ${note && !note.from_self ? 'text-blue-500' : 'text-zinc-400'}`}>
                        {note?.sender_name || 'System'}
                        {note && !note.from_self && ' (Cloud)'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                       <Clock size={12} className="text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Date</span>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {note ? new Date(note.created_at * 1000).toLocaleString() : '---'}
                      </span>
                    </div>
                  </div>
                </div>

                {isReadOnly && (
                  <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider flex items-center gap-2 bg-zinc-950/50 px-3 py-1 rounded-lg border border-zinc-900">
                    <Share2 size={10} strokeWidth={3} />
                    External sync active
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isPickerOpen && note && (
          <FilePickerModal 
            onClose={() => setIsPickerOpen(false)}
            onSelect={handleAttachFile}
            alreadyAttachedIds={attachedFiles.map(f => f.id)}
          />
        )}
      </div>
    </div>
  );
};

