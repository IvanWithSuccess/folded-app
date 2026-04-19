import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950/50 rounded-2xl border border-red-900/20 text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">Component Crash</h3>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest max-w-[200px] leading-relaxed mb-6">
            {this.state.error?.message || 'Unexpected rendering error in inspector module.'}
          </p>
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <RefreshCw size={14} />
            Recover
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
