import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Lock, ShieldCheck, Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: (accountId?: string) => void;
}

type AuthStep = 'qr' | 'password';

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<AuthStep>('qr');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('QR Login');
  const [qrUri, setQrUri] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-request QR on mount
  useEffect(() => {
    if (step === 'qr' && !qrUri) {
      handleRequestQR();
    }
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      invoke('auth_cancel').catch(e => console.error('Failed to cancel auth on cleanup:', e));
    };
  }, []);

  // Auto-refresh QR every 115 seconds
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
            onSuccess(response.Success.id);
            onClose();
          } else if (response === 'PasswordRequired') {
            clearInterval(pollInterval);
            setPhone('QR Login'); 
            setStep('password');
          } else if (response.Error) {
            if (response.Error.toLowerCase().includes('expired') || response.Error.includes('No pending QR')) {
              clearInterval(pollInterval);
              handleRequestQR();
            } else {
              setError(response.Error);
            }
          }
        } catch (e: any) {
          const errStr = e.toString().toLowerCase();
          if (errStr.includes('expired') || errStr.includes('timeout') || errStr.includes('no pending')) {
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

  const handleRequestQR = async () => {
    setLoading(true);
    setQrUri('');
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
    if (!password) {
      setError('Please enter your Telegram 2FA Password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response: any = await invoke('auth_verify_password', { phone, password });
      if (response.Success) {
        onSuccess(response.Success.id);
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
    <div className="w-full h-full bg-white text-[#1d1d1f] flex flex-col overflow-hidden select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Helvetica_Neue',sans-serif] window-frame">
      {/* macOS Window Toolbar Header */}
      <header
        data-tauri-drag-region
        className="h-11 border-b border-black/[0.06] px-3.5 flex items-center justify-between shrink-0 bg-white relative"
      >
        <div className="w-16 shrink-0 pointer-events-none" />

        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[12px] font-semibold text-[#1d1d1f] tracking-tight">Folded Vault</h1>
        </div>

        {useAppStore.getState().accounts.length > 0 ? (
          <button 
            onClick={onClose}
            className="z-10 p-1 text-[#86868b] hover:text-[#1d1d1f] transition-all cursor-pointer border-0"
            title="Cancel"
          >
            <X size={14} />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </header>

      {/* Main Login Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={step}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col items-center w-full max-w-[280px]"
          >
            {error && (
              <div className="w-full mb-4 p-2.5 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl flex items-center gap-2 text-[#d70015] text-[11px] font-medium">
                 <AlertCircle size={14} className="shrink-0 text-[#ff3b30]" />
                 <span className="break-all">{error}</span>
              </div>
            )}

            {step === 'qr' && (
              <div className="flex flex-col items-center w-full space-y-4">
                <div className="p-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-black/[0.06] relative group transition-all duration-300">
                  {qrUri ? (
                    <div className="relative">
                      <QRCode value={qrUri} size={180} level="H" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/70 backdrop-blur-[1px] rounded-lg">
                        <span className="text-[10px] font-semibold text-[#1d1d1f] bg-white px-2.5 py-1 rounded-md border border-black/10 shadow-xs">
                          Scan with Telegram
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-[180px] h-[180px] flex flex-col items-center justify-center bg-[#f5f5f7] rounded-xl gap-2.5">
                      <Loader2 size={26} className="animate-spin text-[#007aff]" />
                      <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">
                        Generating QR
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 w-full">
                  <div className="space-y-0.5">
                    <h2 className="text-[#1d1d1f] font-bold text-[13px] tracking-tight">Connect via Telegram QR</h2>
                    <p className="text-[#86868b] text-[11px] font-medium leading-normal px-2">
                      Open Telegram &gt; Settings &gt; Devices &gt; Link Desktop Device
                    </p>
                  </div>

                  <button 
                    onClick={handleRequestQR}
                    disabled={loading}
                    className="w-full py-1.5 bg-[#007aff] hover:bg-[#0066cc] active:scale-[0.98] text-white text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border-0 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    Refresh QR Code
                  </button>
                </div>
              </div>
            )}

            {step === 'password' && (
              <div className="space-y-3.5 w-full text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 bg-blue-500/10 text-[#007aff] rounded-xl flex items-center justify-center border border-blue-500/20 shadow-xs">
                    <ShieldCheck size={20} />
                  </div>
                  <h2 className="text-[#1d1d1f] font-bold text-[13px] tracking-tight">Two-Step Verification</h2>
                  <p className="text-[#86868b] text-[11px] font-medium">Enter your Telegram 2FA Cloud Password</p>
                </div>

                <input 
                  type="password" 
                  className="w-full bg-[#f5f5f7] border border-black/[0.06] p-2.5 rounded-lg text-[#1d1d1f] placeholder:text-[#86868b] outline-none focus:border-[#007aff] transition-all text-xs font-mono" 
                  placeholder="2FA Password..." 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  autoFocus
                />

                <button 
                  className="w-full py-2 bg-[#007aff] hover:bg-[#0066cc] text-white text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98] shadow-xs cursor-pointer border-0"
                  onClick={handleVerifyPassword}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : "Sign In"}
                </button>

                <button 
                  className="w-full py-1 text-[11px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer border-0 bg-transparent"
                  onClick={() => { setStep('qr'); handleRequestQR(); }}
                >
                  Back to QR Scan
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
