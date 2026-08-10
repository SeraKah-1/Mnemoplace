import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Mnemoplace ErrorBoundary] App crashed:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-white">Something Went Wrong</h1>
              <p className="text-sm text-slate-400 mt-1">
                The application encountered an unhandled rendering error.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reload Memory Palace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
