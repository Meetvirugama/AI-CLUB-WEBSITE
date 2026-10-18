import React from 'react';
import { AlertCircle, WifiOff, ShieldAlert, ServerCrash, RefreshCw, ArrowLeft } from 'lucide-react';
import { ApiError } from '@/lib/apiClient';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  onBack?: () => void;
  isRetrying?: boolean;
  className?: string;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  error,
  onRetry,
  onBack,
  isRetrying = false,
  className = '',
  compact = false,
}) => {
  // Infer sensible icons and copy from ApiError or error type
  let displayTitle = title;
  let displayMessage = message;
  let Icon = AlertCircle;
  let requestId: string | undefined = undefined;

  if (error instanceof ApiError) {
    requestId = error.requestId;
    if (error.isNetworkError) {
      Icon = WifiOff;
      displayTitle = displayTitle || 'Connection Problem';
      displayMessage = displayMessage || 'Unable to connect to the server. Please check your internet connection and try again.';
    } else if (error.isAuthError) {
      Icon = ShieldAlert;
      displayTitle = displayTitle || 'Access Denied';
      displayMessage = displayMessage || (error.message || 'You do not have permission to view this resource.');
    } else if (error.isServerError) {
      Icon = ServerCrash;
      displayTitle = displayTitle || 'Server Error';
      displayMessage = displayMessage || 'Our server encountered an issue processing your request. Please try again.';
    } else {
      displayTitle = displayTitle || 'Unable to Load Content';
      displayMessage = displayMessage || error.message;
    }
  } else if (error instanceof Error) {
    displayTitle = displayTitle || 'Something went wrong';
    displayMessage = displayMessage || error.message;
  } else {
    displayTitle = displayTitle || 'Unable to Load Content';
    displayMessage = displayMessage || 'We were unable to load the requested information. Please try again.';
  }

  if (compact) {
    return (
      <div className={`p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive flex items-center justify-between gap-3 text-sm ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="w-4 h-4 shrink-0 text-destructive" />
          <span className="truncate text-foreground font-medium">{displayMessage}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-6 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mb-5 shadow-sm">
        <Icon className="w-8 h-8" />
      </div>

      <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
        {displayTitle}
      </h3>

      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        {displayMessage}
      </p>

      {requestId && (
        <div className="mb-6 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-[11px] font-mono text-muted-foreground select-all">
          Reference: {requestId}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-medium text-sm transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying…' : 'Try Again'}
          </button>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium text-sm transition-colors border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};
