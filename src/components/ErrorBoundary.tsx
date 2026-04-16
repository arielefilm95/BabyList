import React, { ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-rose-600 text-2xl font-bold">!</span>
          </div>
          <h1 className="text-xl font-bold text-stone-800">Ups, algo salió mal</h1>
          <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm max-w-lg w-full text-left overflow-auto">
            <p className="text-xs font-mono text-rose-600 whitespace-pre-wrap break-words">
              {this.state.error?.message || 'Error desconocido'}
              {'\n\n'}
              {this.state.error?.stack}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 transition"
          >
            Recargar aplicación
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

