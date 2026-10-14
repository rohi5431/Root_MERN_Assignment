import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  warning?: string;
  confirmLabel: string;
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  description,
  warning,
  confirmLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    confirmRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busy) onCancelRef.current();
      } else if (event.key === 'Tab') {
        const buttons = [cancelRef.current, confirmRef.current].filter(
          (button): button is HTMLButtonElement => Boolean(button && !button.disabled),
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-xl sm:p-6"
        role="alertdialog"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-primary-text" id={titleId}>
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-secondary-text" id={descriptionId}>
              {description}
            </p>
          </div>
        </div>
        {warning && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
            {warning}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-primary-text hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            disabled={busy}
            onClick={onCancel}
            ref={cancelRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-medium text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={onConfirm}
            ref={confirmRef}
            type="button"
          >
            {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
