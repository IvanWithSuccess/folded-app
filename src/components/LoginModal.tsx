import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Phone, QrCode, Lock, ShieldCheck, 
  ChevronLeft, ArrowRight, Loader2, Smartphone, AlertCircle
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type AuthStep = 'phone' | 'code' | 'qr' | 'password';
type AuthMethod = 'phone' | 'qr';

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSuccess }) => {
  const [method, setMethod] = useState<AuthMethod>('qr');
  const [step, setStep] = useState<AuthStep>('qr');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-request QR on mount
  useEffect(() => {
    if (step === 'qr' && !qrUri) {
        handleRequestQR();
    }
  }, [step]); // Depend on step for manual transitions

  // Cleanup on unmount: ensure no pending auths leak memory/sessions
  useEffect(() => {
    return () => {
      invoke('auth_cancel').catch(e => console.error('Failed to cancel auth on cleanup:', e));
    };
  }, []);

  // Auto-refresh QR every 115 seconds (Telegram QRs usually last 2 mins)
  useEffect(() => {
    let refreshTimer: number;
    if (step === 'qr' && qrUri) {
      refreshTimer = window.setTimeout(() => {
        handleRequestQR();
      }, 115000);
    }
    return () => clearTimeout(refreshTimer);
  }, [qrUri, step]);

  // Poll for QR scan
  useEffect(() => {
    let pollInterval: number;
    if (step === 'qr' && qrUri) {
      pollInterval = window.setInterval(async () => {
        try {
          const response: any = await invoke('auth_poll_qr');
            if (response.Success) {
              clearInterval(pollInterval);
              onSuccess();
              onClose();
            } else if (response === 'PasswordRequired') {
              clearInterval(pollInterval);
              setPhone("QR Login"); 
              setStep('password');
            } else if (response.Error) {
              if (response.Error.toLowerCase().includes("expired") || response.Error.includes("No pending QR")) {
                clearInterval(pollInterval);
                handleRequestQR();
              } else {
                setError(response.Error);
              }
            }
          } catch (e: any) {
            const errStr = e.toString().toLowerCase();
            if (errStr.includes("expired") || errStr.includes("timeout") || errStr.includes("no pending")) {
              clearInterval(pollInterval);
              handleRequestQR();
            } else {
              console.error('QR Poll error:', e);
            }
          }
        }, 3000);
    }
    return () => clearInterval(pollInterval);
  }, [step, qrUri]);

  const handleRequestCode = async () => {
    setLoading(true);
    setError('');
    try {
      await invoke('auth_request_code', { phone });
      setStep('code');
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const response: any = await invoke('auth_verify_code', { phone, code });
      if (response.Success) {
        onSuccess();
        onClose();
      } else if (response === 'PasswordRequired') {
        setStep('password');
      } else if (response.Error) {
        setError(response.Error);
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleRequestQR = async () => {
    setMethod('qr');
    setLoading(true);
    setQrUri(''); // Clear old QR immediately
    setError('');
    try {
      const response: any = await invoke('auth_request_qr');
      if (response.QRReady) {
        setQrUri(response.QRReady.uri);
        setStep('qr');
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    setLoading(true);
    setError('');
    try {
      const response: any = await invoke('auth_verify_password', { phone, password });
      if (response.Success) {
        onSuccess();
        onClose();
      } else if (response.Error) {
        setError(response.Error);
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#09090b] flex z-[2000] p-6 sm:p-12 overflow-y-auto overflow-x-hidden animate-in fade-in duration-300">
      {/* Background decoration - subtle zinc/blue glow */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-600/5 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[800px] m-auto flex flex-col items-center relative z-10"
      >
        <div className="w-full max-w-[320px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center w-full"
              >
                {error && (
                  <div className="w-full mb-8 p-3 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center gap-3 text-red-400 text-[11px] font-bold uppercase tracking-tight">
                     <AlertCircle size={14} className="shrink-0" />
                     {error}
                  </div>
                )}

                {step === 'qr' && (
                  <div className="flex flex-col items-center w-full">
                    <div className="p-4 bg-white rounded-lg shadow-2xl relative mb-10 group transition-all duration-500 hover:scale-[1.02] border-4 border-zinc-900">
                      {qrUri ? (
                        <div className="relative">
                            <QRCode value={qrUri} size={180} level="H" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/40 backdrop-blur-[1px]">
                                <span className="text-[9px] font-black text-black uppercase tracking-widest bg-white/90 px-3 py-1 rounded border border-black/10">Scan with Telegram</span>
                            </div>
                        </div>
                      ) : (
                        <div className="w-[180px] h-[180px] flex flex-col items-center justify-center bg-zinc-50 rounded gap-4">
                          <Loader2 size={32} className="animate-spin text-zinc-300" />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Generating Link</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6 text-center w-full">
                      <div className="space-y-2">
                        <p className="text-white font-black text-xs uppercase tracking-[0.2em]">Quick Auth Pulse</p>
                        <p className="text-zinc-500 text-[10px] font-medium leading-relaxed uppercase tracking-widest">
                          Settings &gt; Devices &gt; Link Desktop
                        </p>
                      </div>

                      <div className="relative py-3 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-zinc-900"></div>
                        </div>
                        <span className="relative px-4 bg-[#09090b] text-zinc-700 text-[9px] font-black uppercase tracking-[0.3em]">Identity Hub</span>
                      </div>

                      <button 
                         className="w-full py-3.5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 hover:text-white hover:bg-zinc-900/50 rounded-lg transition-all flex items-center justify-center gap-3 group border border-zinc-800"
                         onClick={() => { setStep('phone'); setMethod('phone'); }}
                      >
                         <Phone size={14} className="text-zinc-600 group-hover:text-blue-500 transition-colors" />
                         Use Phone Number
                      </button>
                    </div>
                  </div>
                )}

                {step === 'phone' && (
                    <div className="space-y-6 w-full">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600 ml-1">Identity Terminal</label>
                      <input 
                        type="text" 
                        className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-lg text-white placeholder:text-zinc-800 outline-none focus:border-zinc-600 transition-all font-mono text-sm" 
                        placeholder="+0 000 000 0000" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button 
                      className="w-full py-3.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                      onClick={handleRequestCode}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : "Request Access"}
                      {!loading && <ArrowRight size={14} />}
                    </button>
                    
                    <button 
                       className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
                       onClick={() => { setStep('qr'); setMethod('qr'); }}
                    >
                       Return to QR
                    </button>
                  </div>
                )}

                {step === 'code' && (
                  <div className="space-y-8 text-center w-full">
                    <div className="space-y-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">Verification Code</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-b border-zinc-800 py-4 text-white text-center text-3xl font-mono tracking-[0.5em] outline-none focus:border-blue-500 transition-all" 
                        placeholder="•••••" 
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength={5}
                        autoFocus
                      />
                      <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-widest">Awaiting code from Telegram</p>
                    </div>
                    
                    <button 
                      className="w-full py-3.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                      onClick={handleVerifyCode}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : "Authenticate"}
                    </button>
                    
                    <button 
                      className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
                      onClick={() => setStep('phone')}
                    >
                      Wrong Number?
                    </button>
                  </div>
                )}

                {step === 'password' && (
                  <div className="space-y-6 w-full">
                    <div className="space-y-5">
                      <div className="flex flex-col items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                            <ShieldCheck size={20} className="text-blue-500" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Security Override</p>
                        <p className="text-zinc-600 text-[10px] font-medium uppercase tracking-widest text-center px-4">Two-Step Verification Active</p>
                      </div>
                      <input 
                        type="password" 
                        className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-lg text-white placeholder:text-zinc-800 outline-none focus:border-zinc-600 transition-all text-sm font-mono" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button 
                      className="w-full py-3.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                      onClick={handleVerifyPassword}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : "Authorize Node"}
                    </button>
                    <button 
                      className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
                      onClick={() => setStep('phone')}
                    >
                      Abort
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            
            {/* Stable Return button for secondary accounts */}
            {useAppStore.getState().accounts.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-10 pt-6 border-t border-zinc-900/50 w-full"
              >
                <button 
                  onClick={onClose}
                  className="w-full py-3.5 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 hover:text-zinc-400 transition-all flex items-center justify-center gap-2 group"
                >
                  <X size={12} className="group-hover:rotate-90 transition-transform duration-300" />
                  Abort Auth
                </button>
              </motion.div>
            )}
        </div>
      </motion.div>
    </div>
  );
};

const Cloudy = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.4-1.9-4.3-4.3-4.5-1-3.2-3.8-5.5-7.2-5.5-4.2 0-7.5 3.4-7.5 7.5a7.5 7.5 0 0 0 7.5 7.5h7z"/></svg>
);
