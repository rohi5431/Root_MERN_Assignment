import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TaskStatusDialog } from '../components/tasks/TaskStatusDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { PriorityBadge, StatusBadge } from '../components/ui/StatusBadge';
import { StatePanel } from '../components/ui/StatePanel';
import { useTask } from '../hooks/useTask';
import { getApiErrorMessage } from '../services/api';
import { updateTaskStatus } from '../services/taskService';
import type { Task } from '../types/api';

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(value),
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-3 last:border-b-0 sm:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-secondary-text">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-primary-text">{value || '—'}</dd>
    </div>
  );
}

function employeeId(task: Task) {
  if (task.assignedEmployeeDetails) return task.assignedEmployeeDetails.employeeId;
  return task.employeeSnapshot?.employeeId ?? '—';
}

function employeeName(task: Task) {
  return task.assignedEmployeeDetails?.fullName ?? task.employeeSnapshot?.fullName ?? 'Unassigned';
}

function employeeDepartment(task: Task) {
  return task.assignedEmployeeDetails?.department ?? task.employeeSnapshot?.department ?? '—';
}

export function TaskDetailsPage() {
  const { id } = useParams();
  const { task, loading, error, notFound, retry } = useTask(id);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  async function changeStatus(status: Task['status']) {
    if (!task) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      await updateTaskStatus(task._id, status);
      toast.success(`Task status changed to ${status}.`);
      setShowStatusDialog(false);
      retry();
    } catch (reason) {
      const message = getApiErrorMessage(reason);
      setStatusError(message);
      throw reason;
    } finally {
      setStatusBusy(false);
    }
  }

  if (loading) {
    return (
      <StatePanel description="Loading the task details." title="Loading task" variant="loading" />
    );
  }
  if (notFound) {
    return (
      <StatePanel
        action={
          <Link
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-blue-700"
            to="/tasks"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Tasks
          </Link>
        }
        description="The task may have been removed or the address is incorrect."
        title="Task not found"
      />
    );
  }
  if (error || !task) {
    return (
      <StatePanel
        action={
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-primary-text hover:bg-secondary-background"
            onClick={retry}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Retry
          </button>
        }
        description={error ?? 'The task could not be loaded.'}
        title="Task could not be loaded"
        variant="error"
      />
    );
  }

  const isTerminal = task.status === 'Completed' || task.status === 'Cancelled';
  const hasDeletedAssignedEmployee =
    !task.assignedEmployeeDetails && Boolean(task.employeeSnapshot);

  return (
    <>
      <PageHeader
        title="Task details"
        description="Review task ownership, status and scheduling information."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-primary-text hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              to="/tasks"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Tasks
            </Link>
            {!isTerminal && (
              <>
                <Link
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-primary-text hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  to={`/tasks/${task._id}/edit`}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Edit task
                </Link>
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  onClick={() => {
                    setStatusError(null);
                    setShowStatusDialog(true);
                  }}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Update status
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="space-y-5">
        <section className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary-text">
                {task.taskId}
              </p>
              <h2 className="mt-2 break-words text-xl font-semibold tracking-tight text-primary-text">
                {task.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.isOverdue && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                    <TriangleAlert aria-hidden="true" className="size-4" />
                    Overdue
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 self-start rounded-lg bg-secondary-background px-3 py-2 text-xs text-secondary-text">
              {task.status === 'Completed' ? (
                <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" />
              ) : (
                <Clock3 aria-hidden="true" className="size-4" />
              )}
              {task.status}
            </div>
          </div>
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <section aria-labelledby="task-information-heading">
              <h3 className="text-sm font-semibold text-primary-text" id="task-information-heading">
                Task information
              </h3>
              <dl className="mt-3 grid gap-x-6 sm:grid-cols-2">
                <Detail label="Task ID" value={task.taskId} />
                <Detail label="Department" value={task.department} />
                <Detail label="Priority" value={task.priority} />
                <Detail label="Status" value={task.status} />
                <Detail label="Start date" value={formatDate(task.startDate)} />
                <Detail label="Due date" value={formatDate(task.dueDate)} />
                <Detail label="Created" value={formatDate(task.createdAt)} />
                {task.completedDate && (
                  <Detail label="Completed" value={formatDate(task.completedDate)} />
                )}
              </dl>
              <div className="mt-5 border-t border-border pt-4">
                <h4 className="text-xs font-medium uppercase tracking-wide text-secondary-text">
                  Description
                </h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-primary-text">
                  {task.description || 'No description was provided.'}
                </p>
              </div>
            </section>
            <section
              aria-labelledby="assigned-employee-heading"
              className="rounded-xl border border-border bg-slate-50/60 p-4"
            >
              <h3 className="text-sm font-semibold text-primary-text" id="assigned-employee-heading">
                Assigned employee
              </h3>
              <p className="mt-4 text-base font-semibold text-primary-text">
                {employeeName(task)}
              </p>
              <dl className="mt-2 space-y-1">
                <div>
                  <dt className="sr-only">Employee ID</dt>
                  <dd className="text-sm text-secondary-text">{employeeId(task)}</dd>
                </div>
                <div>
                  <dt className="sr-only">Department</dt>
                  <dd className="text-sm text-secondary-text">{employeeDepartment(task)}</dd>
                </div>
                {task.assignedEmployeeDetails?.role && (
                  <div>
                    <dt className="sr-only">Role</dt>
                    <dd className="text-sm text-secondary-text">
                      {task.assignedEmployeeDetails.role}
                    </dd>
                  </div>
                )}
              </dl>
              {hasDeletedAssignedEmployee && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                  The employee record was deleted. Historical assignment details are shown from
                  the task snapshot.
                </p>
              )}
              {task.employeeSnapshot?.role && hasDeletedAssignedEmployee && (
                <p className="mt-2 text-sm text-secondary-text">{task.employeeSnapshot.role}</p>
              )}
              {!task.assignedEmployeeDetails && !task.employeeSnapshot && (
                <p className="mt-3 text-sm text-secondary-text">This task has no assigned employee.</p>
              )}
            </section>
          </div>
          <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-secondary-text sm:px-6">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
            Overdue status is determined by the server using UTC calendar dates.
          </div>
        </section>
      </div>

      {showStatusDialog && (
        <TaskStatusDialog
          busy={statusBusy}
          error={statusError}
          onClose={() => {
            if (!statusBusy) setShowStatusDialog(false);
          }}
          onUpdate={changeStatus}
          task={task}
        />
      )}
    </>
  );
}
