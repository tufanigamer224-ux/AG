import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `Database access error (${parsed.operationType || 'read'}): ${parsed.error}`;
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center p-6">
          <div className="glass-card max-w-md w-full rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF6B1A]/15 text-[#FF6B1A] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-wide">
              Connection Interrupted
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed break-words">{friendly}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] text-white text-sm font-semibold transition-colors min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Arena
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
