import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Phone, QrCode, Lock, ShieldCheck, 
  ChevronLeft, ArrowRight, Loader2, Smartphone
} from 'lucide-react';

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
      console.error('Request code failed:', e);
      setError(e?.message || e.toString());
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
      console.error('Verify code failed:', e);
      setError(e?.message || e.toString());
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
      console.error('Request QR failed:', e);
      setError(e?.message || e.toString());
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
      console.error('Verify password failed:', e);
      setError(e?.message || e.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 flex z-[2000] p-6 sm:p-12 overflow-y-auto overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-600/5 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
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
                  <div className="w-full mb-8 p-4 bg-red-950/20 border border-red-900/30 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                     <AlertCircle size={18} className="shrink-0" />
                     {error}
                  </div>
                )}

                {step === 'qr' && (
                  <div className="flex flex-col items-center w-full">
                    <div className="p-6 bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative mb-8 group transition-all duration-500 hover:scale-[1.02]">
                      {qrUri ? (
                        <div className="relative">
                            <QRCode value={qrUri} size={180} level="H" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-[2px] rounded-lg">
                                <span className="text-[10px] font-bold text-black uppercase tracking-widest bg-white/90 px-3 py-1 rounded-full shadow-sm">Scan with Telegram</span>
                            </div>
                        </div>
                      ) : (
                        <div className="w-[180px] h-[180px] flex flex-col items-center justify-center bg-zinc-50 rounded-2xl gap-4">
                          <Loader2 size={32} className="animate-spin text-zinc-300" />
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Generating Link</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6 text-center w-full">
                      <div className="space-y-2">
                        <p className="text-white font-semibold text-lg">Quick Login with QR</p>
                        <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed">
                          Open Telegram on your phone <br />
                          Go to <b>Settings &gt; Devices &gt; Link Desktop</b>
                        </p>
                      </div>

                      <div className="relative py-3 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-zinc-800"></div>
                        </div>
                        <span className="relative px-4 bg-zinc-950 text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">OR</span>
                      </div>

                      <button 
                         className="w-full py-4 sm:py-3.5 text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all flex items-center justify-center gap-3 group border border-transparent hover:border-white/10"
                         onClick={() => { setStep('phone'); setMethod('phone'); }}
                      >
                         <Phone size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                         Log in by Phone Number
                      </button>
                    </div>
                  </div>
                )}

                {step === 'phone' && (
                    <div className="space-y-6 w-full">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Phone Number</label>
                      <input 
                        type="text" 
                        className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-white placeholder:text-zinc-700 outline-none focus:ring-2 focus:ring-white/20 focus:border-white transition-all font-mono text-base" 
                        placeholder="+1 234 567 8900" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button 
                      className="w-full py-4 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                      onClick={handleRequestCode}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : "Next"}
                      {!loading && <ArrowRight size={18} />}
                    </button>
                    
                    <button 
                       className="w-full py-2 text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                       onClick={() => { setStep('qr'); setMethod('qr'); }}
                    >
                       Back to QR Scan
                    </button>
                  </div>
                )}

                {step === 'code' && (
                  <div className="space-y-8 text-center w-full">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Security Code</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-b-2 border-zinc-800 py-4 text-white text-center text-4xl font-mono tracking-[0.3em] outline-none focus:border-white transition-all" 
                        placeholder="•••••" 
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength={5}
                        autoFocus
                      />
                      <p className="text-zinc-500 text-xs sm:text-sm">A code was sent to your Telegram account</p>
                    </div>
                    
                    <button 
                      className="w-full py-4 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                      onClick={handleVerifyCode}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : "Confirm"}
                    </button>
                    
                    <button 
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                      onClick={() => setStep('phone')}
                    >
                      Change Number
                    </button>
                  </div>
                )}

                {step === 'password' && (
                  <div className="space-y-6 w-full">
                    <div className="space-y-5">
                      <div className="flex flex-col items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                        <p className="text-base font-bold text-white">Cloud Password</p>
                        <p className="text-zinc-500 text-xs text-center px-4">Your account is protected by 2-Step Verification.</p>
                      </div>
                      <input 
                        type="password" 
                        className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-white placeholder:text-zinc-700 outline-none focus:ring-2 focus:ring-white/20 focus:border-white transition-all text-base" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button 
                      className="w-full py-4 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                      onClick={handleVerifyPassword}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : "Connect Account"}
                    </button>
                    <button 
                      className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                      onClick={() => setStep('phone')}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
        </div>


      </motion.div>
    </div>
  );
};

const AlertCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

const Cloudy = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.4-1.9-4.3-4.3-4.5-1-3.2-3.8-5.5-7.2-5.5-4.2 0-7.5 3.4-7.5 7.5a7.5 7.5 0 0 0 7.5 7.5h7z"/></svg>
);
