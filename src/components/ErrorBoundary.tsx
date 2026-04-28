import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { getErrorMessage } from '../utils/errorUtils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: unknown;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleGlobalRejection);
  }

  public componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleGlobalRejection);
  }

  private handleGlobalRejection = (event: PromiseRejectionEvent) => {
    if (event.reason) {
      this.setState({ hasError: true, error: event.reason });
    }
  };

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-red-500/10 text-center animate-in fade-in zoom-in duration-300 h-full w-full">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)] border border-red-500/20 rotate-3">
            <AlertCircle size={32} />
          </div>
          
          <div className="flex flex-col gap-2 mb-8">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Module Disruption</h3>
            <div className="h-px w-12 bg-red-500/30 mx-auto" />
          </div>

          <div className="max-w-md bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl mb-10">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-relaxed">
              {getErrorMessage(this.state.error)}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={this.handleReset}
                className="group flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-800"
              >
                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                Attempt Recovery
              </button>
              
              <button 
                onClick={this.handleReload}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-blue-600/20"
              >
                <Home size={14} />
                Reboot App
              </button>
            </div>

            <button 
              onClick={() => this.setState({ showDetails: !this.state.showDetails })}
              className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-blue-500 transition-colors"
            >
              { this.state.showDetails ? 'Hide Technical Details' : 'Show Technical Details' }
            </button>
          </div>

          { this.state.showDetails && (
            <div className="mt-8 w-full max-w-2xl bg-black/50 border border-zinc-800 rounded-xl p-4 overflow-hidden flex flex-col max-h-[300px] text-left">
              <pre className="text-[10px] text-red-400 font-mono whitespace-pre-wrap leading-tight overflow-auto custom-scrollbar">
                { (this.state.error as any)?.stack || (this.state.error as any)?.message || String(this.state.error) }
              </pre>
            </div>
          )}
          
          <div className="mt-12 opacity-20 flex items-center gap-4 grayscale">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Folded Cloud Node</span>
            <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">ID: {this.props.name || 'ROOT'}</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
