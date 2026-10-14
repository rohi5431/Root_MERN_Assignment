import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { getApiErrorMessage } from '../../services/api';
import type { Task } from '../../types/api';
import { StatusBadge } from '../ui/StatusBadge';

const transitions: Partial<Record<Task['status'], Task['status'][]>> = {
  Todo: ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
};

const schema = z.object({ status: z.enum(['In Progress', 'Completed', 'Cancelled']) });
type StatusForm = z.infer<typeof schema>;

interface TaskStatusDialogProps {
  task: Task;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onUpdate: (status: Task['status']) => Promise<void>;
}

export function TaskStatusDialog({
  task,
  busy,
  error,
  onClose,
  onUpdate,
}: TaskStatusDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const availableTransitions = transitions[task.status] ?? [];
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<StatusForm>({
    resolver: zodResolver(schema),
    defaultValues: { status: availableTransitions[0] as StatusForm['status'] },
  });
  const status = watch('status');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy && !isSubmitting) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, isSubmitting, onClose]);

  async function submit(values: StatusForm) {
    try {
      await onUpdate(values.status);
    } catch (reason) {
      toast.error(getApiErrorMessage(reason));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-xl sm:p-6"
        role="dialog"
      >
        <h2 className="text-base font-semibold text-primary-text" id={titleId}>
          Update task status
        </h2>
        <p className="mt-2 text-sm leading-6 text-secondary-text" id={descriptionId}>
          {task.taskId} currently has status <StatusBadge status={task.status} />.
        </p>
        <form className="mt-5" onSubmit={handleSubmit(submit)}>
          <label
            className="mb-1.5 block text-sm font-medium text-primary-text"
            htmlFor="next-task-status"
          >
            Next status
          </label>
          <select
            className="min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-primary-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            id="next-task-status"
            {...register('status')}
          >
            {availableTransitions.map((nextStatus) => (
              <option key={nextStatus} value={nextStatus}>
                {nextStatus}
              </option>
            ))}
          </select>
          {status === 'Completed' && (
            <p className="mt-2 text-xs text-secondary-text">
              The server will set the completion date when this change succeeds.
            </p>
          )}
          {status === 'Cancelled' && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Cancellation is terminal; this task cannot be reopened.
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-primary-text hover:bg-secondary-background disabled:opacity-50"
              disabled={busy || isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || isSubmitting || availableTransitions.length === 0}
              type="submit"
            >
              {busy || isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <RefreshCw aria-hidden="true" className="size-4" />
              )}
              {busy || isSubmitting ? 'Updating…' : 'Update status'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
