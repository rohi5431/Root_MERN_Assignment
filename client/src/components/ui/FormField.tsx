import type { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}

export function FormField({ id, label, error, children, hint, required = false }: FormFieldProps) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-primary-text" htmlFor={id}>
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="ml-0.5 text-rose-700">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-secondary-text" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs text-rose-700" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
