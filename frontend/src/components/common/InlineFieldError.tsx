import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InlineFieldErrorProps {
  error?: string | null;
  className?: string;
  id?: string;
}

export const InlineFieldError: React.FC<InlineFieldErrorProps> = ({
  error,
  className = '',
  id,
}) => {
  if (!error) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-destructive mt-1.5 animate-in fade-in-50 duration-150 ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{error}</span>
    </div>
  );
};
