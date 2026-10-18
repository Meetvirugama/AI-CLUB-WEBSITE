import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by AppErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env?.DEV);

      return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(244,63,94,0.1),rgba(255,255,255,0))] pointer-events-none" />

          <div className="relative z-10 max-w-md w-full bg-card border border-destructive/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/20 text-destructive shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3">
              Something went wrong
            </h1>

            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              We encountered an unexpected error while rendering this page. You can refresh the page or return to the homepage.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-primary-foreground py-2.5 px-4 rounded-xl font-medium transition-opacity shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2.5 px-4 rounded-xl font-medium transition-colors border border-border"
              >
                <Home className="w-4 h-4" />
                Return Home
              </button>
            </div>

            {isDev && this.state.error && (
              <div className="mt-8 p-4 rounded-xl bg-muted/60 border border-border w-full text-left overflow-auto max-h-48 text-xs font-mono text-destructive break-words">
                <div className="font-semibold text-foreground mb-1">Developer Error Details:</div>
                {this.state.error.name}: {this.state.error.message}
                {this.state.error.stack && (
                  <pre className="mt-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
