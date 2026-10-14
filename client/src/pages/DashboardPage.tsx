import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
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
import { getPercentageWidthClass } from '../utils/percentageWidth';

const peopleMetrics = [
  {
    key: 'totalEmployees',
    label: 'Total employees',
    Icon: Users,
    color: 'text-blue-700 bg-blue-50',
    surface: 'from-blue-50/80 to-white',
  },
  {
    key: 'activeEmployees',
    label: 'Active employees',
    Icon: UserRoundCheck,
    color: 'text-green-700 bg-green-50',
    surface: 'from-green-50/80 to-white',
  },
  {
    key: 'inactiveEmployees',
    label: 'Inactive employees',
    Icon: UserRoundMinus,
    color: 'text-slate-700 bg-slate-100',
    surface: 'from-slate-100/80 to-white',
  },
  {
    key: 'employeesOnLeave',
    label: 'Employees on leave',
    Icon: UserRoundX,
    color: 'text-amber-700 bg-amber-50',
    surface: 'from-amber-50/80 to-white',
  },
] as const;

const taskMetrics = [
  {
    key: 'totalTasks',
    label: 'Total tasks',
    Icon: ListTodo,
    color: 'text-green-700 bg-green-50',
    surface: 'from-green-50/80 to-white',
  },
  {
    key: 'todoTasks',
    label: 'To do',
    Icon: CircleDashed,
    color: 'text-slate-700 bg-slate-100',
    surface: 'from-slate-100/80 to-white',
  },
  {
    key: 'inProgressTasks',
    label: 'In progress',
    Icon: Activity,
    color: 'text-amber-700 bg-amber-50',
    surface: 'from-amber-50/80 to-white',
  },
  {
    key: 'completedTasks',
    label: 'Completed tasks',
    Icon: CheckCircle2,
    color: 'text-violet-700 bg-violet-50',
    surface: 'from-violet-50/80 to-white',
  },
  {
    key: 'cancelledTasks',
    label: 'Cancelled tasks',
    Icon: CircleDashed,
    color: 'text-red-700 bg-red-50',
    surface: 'from-red-50/80 to-white',
  },
  {
    key: 'overdueTasks',
    label: 'Overdue tasks',
    Icon: AlertTriangle,
    color: 'text-red-700 bg-red-50',
    surface: 'from-red-50/80 to-white',
  },
] as const;

const taskStatuses = [
  { key: 'todoTasks', label: 'To do', color: 'bg-slate-400' },
  { key: 'inProgressTasks', label: 'In progress', color: 'bg-blue-500' },
  { key: 'completedTasks', label: 'Completed', color: 'bg-green-500' },
  { key: 'cancelledTasks', label: 'Cancelled', color: 'bg-red-500' },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value),
  );
}

function relativeDueDate(value: string) {
  const dueDate = new Date(value);
  dueDate.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilDue === 0) return 'Due today';
  if (daysUntilDue === 1) return 'Due tomorrow';
  return `Due in ${daysUntilDue} days`;
}

function DeadlinePanel({
  title,
  description,
  tasks,
  emptyTitle,
  emptyDescription,
  recentlyDue = false,
}: {
  title: string;
  description: string;
  tasks: DashboardMetrics['upcomingDeadlines'];
  emptyTitle: string;
  emptyDescription: string;
  recentlyDue?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
            recentlyDue ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-accent'
          }`}
        >
          <CalendarClock aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-primary-text">{title}</h2>
          <p className="mt-1 text-sm text-secondary-text">{description}</p>
        </div>
      </div>
      {tasks.length === 0 ? (
        <StatePanel description={emptyDescription} title={emptyTitle} />
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((task) => {
            const employee =
              task.assignedEmployeeDetails?.fullName ??
              task.employeeSnapshot?.fullName ??
              'Unassigned';
            return (
              <li key={task._id}>
                <Link
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  to={`/tasks/${task._id}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-primary-text">
                      {task.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-secondary-text">
                      {employee} · {recentlyDue ? 'Due ' : ''}
                      {formatDate(task.dueDate)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`text-xs font-semibold ${
                        task.isOverdue ? 'text-danger' : recentlyDue ? 'text-secondary-text' : 'text-accent'
                      }`}
                    >
                      {recentlyDue
                        ? task.isOverdue
                          ? 'Overdue'
                          : 'Recently due'
                        : relativeDueDate(task.dueDate)}
                    </span>
                    <StatusBadge status={task.status} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
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
                className="text-xs font-medium text-accent hover:text-accent-hover"
                to="/employees"
              >
                View team
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {peopleMetrics.map(({ key, label, Icon, color, surface }) => (
                <article
                  className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${surface} p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm sm:p-5`}
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
                className="text-xs font-medium text-accent hover:text-accent-hover"
                to="/tasks"
              >
                View tasks
              </Link>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
              {taskMetrics.map(({ key, label, Icon, color, surface }) => (
                <article
                  className={`rounded-xl border border-border bg-gradient-to-br ${surface} p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm`}
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
                          className={`${color} ${getPercentageWidthClass((data[key] / data.totalTasks) * 100)}`}
                          key={key}
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
                    className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
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

          <section aria-label="Task deadlines" className="grid gap-6 xl:grid-cols-2">
            <DeadlinePanel
              description="Active tasks due within the next 30 days"
              emptyDescription="There are no active tasks due in the next 30 days."
              emptyTitle="No upcoming deadlines"
              tasks={data.upcomingDeadlines}
              title="Upcoming deadlines"
            />
            <DeadlinePanel
              description="Tasks due in the previous 7 days"
              emptyDescription="No tasks reached their deadline in the previous 7 days."
              emptyTitle="No recent deadlines"
              recentlyDue
              tasks={data.recentDeadlines}
              title="Recently due"
            />
          </section>

          {data.employeeWorkload.length > 0 && (
            <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-primary-text">Employee workload</h2>
                  <p className="mt-1 text-sm text-secondary-text">
                    Active tasks per employee, calculated by the dashboard API.
                  </p>
                </div>
                <Link className="text-sm font-medium text-accent hover:text-accent-hover" to="/analytics">
                  View analytics
                </Link>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.employeeWorkload.slice(0, 6).map((employee) => {
                  const capacityPercent = (Math.min(employee.activeTaskCount, 3) / 3) * 100;
                  return (
                    <li key={employee._id}>
                      <Link
                        className="block rounded-lg border border-border p-4 transition hover:border-blue-200 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        to={`/employees/${employee._id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-primary-text">
                              {employee.fullName}
                            </p>
                            <p className="mt-1 text-xs text-secondary-text">
                              {employee.employeeId} · {employee.department}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-primary-text">
                            {employee.activeTaskCount} / 3
                          </span>
                        </div>
                        <div
                          aria-label={`${employee.activeTaskCount} of 3 active tasks`}
                          aria-valuemax={3}
                          aria-valuemin={0}
                          aria-valuenow={employee.activeTaskCount}
                          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                        >
                          <span
                            className={`block h-full rounded-full bg-blue-500 transition-[width] duration-300 ${getPercentageWidthClass(capacityPercent)}`}
                          />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
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
