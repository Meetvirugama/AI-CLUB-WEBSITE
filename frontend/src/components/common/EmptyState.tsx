import React from 'react';
import { LucideIcon, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = FolderOpen,
  action,
  className = '',
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={`p-6 rounded-2xl border border-border/60 bg-muted/20 text-center flex flex-col items-center justify-center ${className}`}>
        <Icon className="w-8 h-8 text-muted-foreground/60 mb-2" />
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto my-8 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-center mb-5 text-muted-foreground shadow-sm">
        <Icon className="w-8 h-8 opacity-70" />
      </div>

      <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-sm">
          {description}
        </p>
      )}

      {action && (
        action.href ? (
          <Link
            to={action.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-medium text-sm transition-all shadow-sm"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-medium text-sm transition-all shadow-sm"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
};
