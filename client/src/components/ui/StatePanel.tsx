import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatePanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'empty' | 'error' | 'loading';
}

export function StatePanel({
  title,
  description,
  action,
  variant = 'empty',
}: StatePanelProps) {
  const Icon = variant === 'loading' ? LoaderCircle : variant === 'error' ? AlertCircle : Inbox;

  return (
    <div
      className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center"
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'loading' ? 'polite' : undefined}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-secondary-background text-secondary-text">
        <Icon
          aria-hidden="true"
          className={`size-5 ${variant === 'loading' ? 'animate-spin' : ''}`}
        />
      </div>
      <h2 className="text-sm font-semibold text-primary-text">{title}</h2>
      {description && (
        <p className="mt-1 max-w-md text-sm leading-6 text-secondary-text">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
