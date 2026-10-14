import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Check,
  LoaderCircle,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/api';
import { getEmployees } from '../../services/employeeService';
import { getTasks } from '../../services/taskService';
import type { Employee, Task } from '../../types/api';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  date: string;
  href: string;
  kind: 'overdue' | 'upcoming' | 'leave';
}

const panelClass =
  'absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-slate-900/10';

function utcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function taskEmployee(task: Task) {
  return (
    task.assignedEmployeeDetails?.fullName ??
    task.employeeSnapshot?.fullName ??
    'Unassigned'
  );
}

function toNotifications(
  overdueTasks: Task[],
  upcomingTasks: Task[],
  employees: Employee[],
): NotificationItem[] {
  const notifications: NotificationItem[] = [
    ...overdueTasks.map((task) => ({
      id: `overdue-${task._id}`,
      title: `Overdue: ${task.title}`,
      description: `${taskEmployee(task)} · ${task.taskId}`,
      date: task.dueDate,
      href: `/tasks/${task._id}`,
      kind: 'overdue' as const,
    })),
    ...upcomingTasks.map((task) => ({
      id: `upcoming-${task._id}`,
      title: `Due soon: ${task.title}`,
      description: `${taskEmployee(task)} · ${task.taskId}`,
      date: task.dueDate,
      href: `/tasks/${task._id}`,
      kind: 'upcoming' as const,
    })),
    ...employees.map((employee) => ({
      id: `leave-${employee._id}`,
      title: `${employee.fullName} is on leave`,
      description: `${employee.employeeId} · ${employee.department}`,
      date: employee.leaveStart ?? employee.updatedAt,
      href: `/employees/${employee._id}`,
      kind: 'leave' as const,
    })),
  ];

  return notifications.sort((first, second) => first.date.localeCompare(second.date));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function IconForKind({ kind }: { kind: NotificationItem['kind'] }) {
  if (kind === 'overdue') {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
    );
  }
  if (kind === 'upcoming') {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <CalendarClock aria-hidden="true" className="size-5" />
      </span>
    );
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
      <UserRound aria-hidden="true" className="size-5" />
    </span>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const today = new Date();
    const dueSoonEnd = new Date(today);
    dueSoonEnd.setUTCDate(today.getUTCDate() + 7);

    setLoading(true);
    setError(null);
    Promise.all([
      getTasks(
        { page: 1, limit: 5, overdue: 'true', sortBy: 'dueDate', sortOrder: 'asc' },
        controller.signal,
      ),
      getTasks(
        {
          page: 1,
          limit: 5,
          status: 'Todo',
          dueDateFrom: utcDate(today),
          dueDateTo: utcDate(dueSoonEnd),
          sortBy: 'dueDate',
          sortOrder: 'asc',
        },
        controller.signal,
      ),
      getTasks(
        {
          page: 1,
          limit: 5,
          status: 'In Progress',
          dueDateFrom: utcDate(today),
          dueDateTo: utcDate(dueSoonEnd),
          sortBy: 'dueDate',
          sortOrder: 'asc',
        },
        controller.signal,
      ),
      getEmployees({ page: 1, limit: 5, status: 'On Leave' }, controller.signal),
    ])
      .then(([overdue, todo, inProgress, employees]) => {
        setItems(
          toNotifications(
            overdue.data,
            [...todo.data, ...inProgress.data],
            employees.data,
          ),
        );
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, reload]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const visibleItems = useMemo(
    () => items.filter((item) => !dismissedIds.has(item.id)),
    [dismissedIds, items],
  );
  const unreadCount = visibleItems.filter((item) => !readIds.has(item.id)).length;

  function markRead(id: string) {
    setReadIds((current) => new Set(current).add(id));
  }

  function dismiss(id: string) {
    setDismissedIds((current) => new Set(current).add(id));
    markRead(id);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="relative inline-flex size-11 items-center justify-center rounded-xl border border-border bg-white text-secondary-text shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section aria-label="Notifications" className={panelClass}>
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
            <div>
              <h2 className="text-base font-semibold text-primary-text">Notifications</h2>
              <p className="mt-1 text-sm text-secondary-text">
                {unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label="Refresh notifications"
                className="rounded-lg p-2 text-secondary-text hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => setReload((current) => current + 1)}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="size-4" />
              </button>
              <button
                aria-label="Close notifications"
                className="rounded-lg p-2 text-secondary-text hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="border-b border-border px-4 py-2 text-right">
              <button
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => setReadIds((current) => new Set([...current, ...visibleItems.map((item) => item.id)]))}
                type="button"
              >
                <Check aria-hidden="true" className="size-4" />
                Mark all read
              </button>
            </div>
          )}

          <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-secondary-text">
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                Loading notifications…
              </div>
            ) : error ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-primary-text">Notifications unavailable</p>
                <p className="mt-1 text-sm text-secondary-text">{error}</p>
                <button
                  className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  onClick={() => setReload((current) => current + 1)}
                  type="button"
                >
                  Try again
                </button>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Check aria-hidden="true" className="size-6" />
                </span>
                <p className="mt-3 text-sm font-semibold text-primary-text">All caught up</p>
                <p className="mt-1 text-sm text-secondary-text">
                  No overdue or soon-due tasks or leave alerts were found.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visibleItems.map((item) => {
                  const unread = !readIds.has(item.id);
                  return (
                    <li className={unread ? 'bg-blue-50/45' : 'bg-white'} key={item.id}>
                      <div className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-blue-50/70">
                        <IconForKind kind={item.kind} />
                        <Link
                          className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          onClick={() => {
                            markRead(item.id);
                            setOpen(false);
                          }}
                          to={item.href}
                        >
                          <span className="flex items-start gap-2">
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold leading-5 text-primary-text">
                                {item.title}
                              </span>
                              <span className="mt-1 block truncate text-sm text-secondary-text">
                                {item.description}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                {item.date ? formatDate(item.date) : 'Date unavailable'}
                              </span>
                            </span>
                            {unread && <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600" />}
                          </span>
                        </Link>
                        <button
                          aria-label={`Dismiss ${item.title}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          onClick={() => dismiss(item.id)}
                          type="button"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border bg-slate-50/70 px-4 py-3">
            <Link
              className="block rounded-md text-center text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => setOpen(false)}
              to="/tasks"
            >
              View all tasks
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
