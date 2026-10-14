import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ListTodo,
  RefreshCw,
  Users,
  UserRoundCheck,
  UserRoundMinus,
  UserRoundX,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { PriorityBadge, StatusBadge } from '../components/ui/StatusBadge';
import { StatePanel } from '../components/ui/StatePanel';
import { getApiErrorMessage } from '../services/api';
import { getDashboardMetrics } from '../services/dashboardService';
import type { DashboardMetrics } from '../types/api';

const peopleMetrics = [
  { key: 'totalEmployees', label: 'Total employees', Icon: Users, color: 'text-blue-700 bg-blue-50' },
  {
    key: 'activeEmployees',
    label: 'Active employees',
    Icon: UserRoundCheck,
    color: 'text-emerald-700 bg-emerald-50',
  },
  {
    key: 'inactiveEmployees',
    label: 'Inactive employees',
    Icon: UserRoundMinus,
    color: 'text-slate-700 bg-slate-100',
  },
  {
    key: 'employeesOnLeave',
    label: 'Employees on leave',
    Icon: UserRoundX,
    color: 'text-amber-700 bg-amber-50',
  },
] as const;

const taskMetrics = [
  { key: 'totalTasks', label: 'Total tasks', Icon: ListTodo, color: 'text-indigo-700 bg-indigo-50' },
  {
    key: 'todoTasks',
    label: 'To do',
    Icon: CircleDashed,
    color: 'text-slate-700 bg-slate-100',
  },
  {
    key: 'inProgressTasks',
    label: 'In progress',
    Icon: Activity,
    color: 'text-sky-700 bg-sky-50',
  },
  {
    key: 'completedTasks',
    label: 'Completed tasks',
    Icon: CheckCircle2,
    color: 'text-emerald-700 bg-emerald-50',
  },
  {
    key: 'cancelledTasks',
    label: 'Cancelled tasks',
    Icon: CircleDashed,
    color: 'text-amber-700 bg-amber-50',
  },
  {
    key: 'overdueTasks',
    label: 'Overdue tasks',
    Icon: AlertTriangle,
    color: 'text-rose-700 bg-rose-50',
  },
] as const;

const taskStatuses = [
  { key: 'todoTasks', label: 'To do', color: 'bg-slate-400' },
  { key: 'inProgressTasks', label: 'In progress', color: 'bg-blue-500' },
  { key: 'completedTasks', label: 'Completed', color: 'bg-emerald-500' },
  { key: 'cancelledTasks', label: 'Cancelled', color: 'bg-rose-400' },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value),
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" aria-busy="true">
      <div className="h-14 w-72 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...peopleMetrics, ...taskMetrics].map(({ key }) => (
          <div className="h-28 animate-pulse rounded-xl border border-border bg-white" key={key} />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-border bg-white" />
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getDashboardMetrics(controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);

  if (loading) return <LoadingDashboard />;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A clear, real-time overview of your people, priorities and delivery."
        action={
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3.5 text-sm font-medium text-primary-text transition hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={reload}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-border bg-white">
          <StatePanel
            action={
              <button
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                onClick={reload}
                type="button"
              >
                Retry
              </button>
            }
            description={error}
            title="Dashboard data could not be loaded"
            variant="error"
          />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <section aria-label="Employee metrics" className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-primary-text">People</h2>
              <span className="h-px flex-1 bg-border" />
              <Link
                className="text-xs font-medium text-accent hover:text-blue-800"
                to="/employees"
              >
                View team
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {peopleMetrics.map(({ key, label, Icon, color }) => (
                <article
                  className="group relative overflow-hidden rounded-xl border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm sm:p-5"
                  key={key}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-secondary-text">{label}</p>
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                      <Icon aria-hidden="true" className="size-[19px]" />
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-tight text-primary-text">
                    {data[key].toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label="Task metrics" className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-primary-text">Work overview</h2>
              <span className="h-px flex-1 bg-border" />
              <Link
                className="text-xs font-medium text-accent hover:text-blue-800"
                to="/tasks"
              >
                View tasks
              </Link>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
              {taskMetrics.map(({ key, label, Icon, color }) => (
                <article
                  className="rounded-xl border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                  key={key}
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <p className="text-xs font-medium leading-4 text-secondary-text">{label}</p>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight text-primary-text">
                    {data[key].toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {data.totalEmployees === 0 && data.totalTasks === 0 ? (
            <section className="rounded-xl border border-border bg-white">
              <StatePanel
                description="There are no employees or tasks in the database yet. The lists will populate when records are added through the API."
                title="Your workspace is ready"
              />
            </section>
          ) : (
            <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              <article className="rounded-xl border border-border bg-white p-5">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-primary-text">Task status</h2>
                    <p className="mt-1 text-sm text-secondary-text">Current task distribution</p>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <CircleDashed aria-hidden="true" className="size-[18px]" />
                  </span>
                </div>
                {data.totalTasks === 0 ? (
                  <StatePanel
                    description="Task status data will appear here once tasks exist."
                    title="No tasks yet"
                  />
                ) : (
                  <div className="space-y-5">
                    <div
                      className="flex h-3 overflow-hidden rounded-full bg-slate-100"
                      aria-label="Task status distribution"
                    >
                      {taskStatuses.map(({ key, label, color }) => (
                        <div
                          className={color}
                          key={key}
                          style={{ width: `${(data[key] / data.totalTasks) * 100}%` }}
                          title={`${label}: ${data[key]}`}
                        />
                      ))}
                    </div>
                    <ul className="grid grid-cols-2 gap-4">
                      {taskStatuses.map(({ key, label, color }) => (
                        <li className="flex items-center gap-2.5" key={key}>
                          <span className={`size-2.5 rounded-full ${color}`} />
                          <span className="text-sm text-secondary-text">{label}</span>
                          <span className="ml-auto text-sm font-semibold text-primary-text">
                            {data[key]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>

              <article className="overflow-hidden rounded-xl border border-border bg-white">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-primary-text">Recent tasks</h2>
                    <p className="mt-1 text-sm text-secondary-text">Latest tasks added</p>
                  </div>
                  <Link
                    className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    to="/tasks"
                  >
                    View all <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
                {data.recentTasks.length === 0 ? (
                  <StatePanel description="Newly created tasks will appear here." title="No recent tasks" />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recentTasks.map((task) => {
                      const employee =
                        task.assignedEmployeeDetails?.fullName ??
                        task.employeeSnapshot?.fullName ??
                        'Unassigned';
                      return (
                        <li
                          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                          key={task._id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-primary-text">
                              {task.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-secondary-text">
                              {employee} · Due {formatDate(task.dueDate)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <PriorityBadge priority={task.priority} />
                            <StatusBadge status={task.status} />
                            {task.isOverdue && (
                              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                                Overdue
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            </section>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <Clock3 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-700" />
            <div>
              <p className="text-sm font-semibold text-primary-text">Overdue status</p>
              <p className="mt-1 text-sm leading-6 text-secondary-text">
                The overdue count and recent-task indicators come from the task API using UTC
                calendar dates. Tasks due today and tasks already completed or cancelled are not
                counted as overdue.
              </p>
            </div>
          </div>
          <div className="sr-only" aria-live="polite">
            Dashboard data refreshed.
          </div>
        </div>
      ) : null}
    </>
  );
}
