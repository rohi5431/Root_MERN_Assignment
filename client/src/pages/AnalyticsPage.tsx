import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  RefreshCw,
  Users,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { PriorityBadge, StatusBadge } from '../components/ui/StatusBadge';
import { StatePanel } from '../components/ui/StatePanel';
import { getApiErrorMessage } from '../services/api';
import { getDashboardMetrics } from '../services/dashboardService';
import type { DashboardMetrics, Task } from '../types/api';

const taskStatuses = [
  { key: 'todoTasks', label: 'To do', color: 'bg-slate-400' },
  { key: 'inProgressTasks', label: 'In progress', color: 'bg-blue-500' },
  { key: 'completedTasks', label: 'Completed', color: 'bg-emerald-500' },
  { key: 'cancelledTasks', label: 'Cancelled', color: 'bg-amber-500' },
] as const;

const employeeStatuses = [
  { key: 'activeEmployees', label: 'Active', color: 'bg-emerald-500' },
  { key: 'inactiveEmployees', label: 'Inactive', color: 'bg-slate-400' },
  { key: 'employeesOnLeave', label: 'On leave', color: 'bg-amber-500' },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function taskEmployee(task: Task) {
  return (
    task.assignedEmployeeDetails?.fullName ??
    task.employeeSnapshot?.fullName ??
    'Unassigned'
  );
}

function MetricCard({
  label,
  value,
  detail,
  Icon,
  color,
}: {
  label: string;
  value: number | string;
  detail: string;
  Icon: typeof Users;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-950/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-secondary-text">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-primary-text">{value}</p>
        </div>
        <span className={`flex size-11 items-center justify-center rounded-xl ${color}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
      <p className="mt-3 text-sm text-secondary-text">{detail}</p>
    </article>
  );
}

function DistributionRow({
  color,
  label,
  total,
  value,
}: {
  color: string;
  label: string;
  total: number;
  value: number;
}) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="shrink-0 text-secondary-text">
          {value} <span className="text-slate-400">({percent}%)</span>
        </span>
      </div>
      <div
        aria-label={`${label}: ${value} of ${total}, ${percent}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function LoadingAnalytics() {
  return (
    <div aria-busy="true" aria-label="Loading analytics" className="space-y-6">
      <div className="h-14 w-72 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-36 animate-pulse rounded-2xl border border-border bg-white" key={index} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-white" />
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-white" />
      </div>
    </div>
  );
}

export function AnalyticsPage() {
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

  if (loading) return <LoadingAnalytics />;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="A live snapshot of team availability and task delivery."
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
        <div className="rounded-2xl border border-border bg-white">
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
            title="Analytics could not be loaded"
            variant="error"
          />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <section aria-label="Key analytics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              color="bg-blue-50 text-blue-700"
              detail={`${data.activeEmployees} currently active`}
              Icon={Users}
              label="Team size"
              value={data.totalEmployees}
            />
            <MetricCard
              color="bg-indigo-50 text-indigo-700"
              detail={`${data.inProgressTasks} currently in progress`}
              Icon={ListTodo}
              label="Total tasks"
              value={data.totalTasks}
            />
            <MetricCard
              color="bg-emerald-50 text-emerald-700"
              detail={`${data.completedTasks} of ${data.totalTasks} tasks completed`}
              Icon={CheckCircle2}
              label="Completion rate"
              value={`${data.totalTasks ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0}%`}
            />
            <MetricCard
              color="bg-rose-50 text-rose-700"
              detail={`${data.employeesOnLeave} team members on leave`}
              Icon={AlertTriangle}
              label="Overdue tasks"
              value={data.overdueTasks}
            />
          </section>

          {data.totalEmployees === 0 && data.totalTasks === 0 ? (
            <div className="rounded-2xl border border-border bg-white">
              <StatePanel
                description="Analytics will appear here when employees and tasks are added."
                title="No records to analyze yet"
              />
            </div>
          ) : (
            <div className="grid items-stretch gap-5 xl:grid-cols-2">
              <section className="h-full rounded-2xl border border-border bg-white p-5 sm:p-6">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-primary-text">Task status</h2>
                  <p className="mt-1 text-sm text-secondary-text">
                    Current distribution across all tasks.
                  </p>
                </div>
                <div className="space-y-5">
                  {taskStatuses.map(({ key, label, color }) => (
                    <DistributionRow
                      color={color}
                      key={key}
                      label={label}
                      total={data.totalTasks}
                      value={data[key]}
                    />
                  ))}
                </div>
              </section>

              <section className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 sm:p-6">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-primary-text">Team availability</h2>
                  <p className="mt-1 text-sm text-secondary-text">
                    Current employee status from the management system.
                  </p>
                </div>
                <div className="flex-1 space-y-5">
                  {employeeStatuses.map(({ key, label, color }) => (
                    <DistributionRow
                      color={color}
                      key={key}
                      label={label}
                      total={data.totalEmployees}
                      value={data[key]}
                    />
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-4 text-sm">
                  <Link className="font-medium text-blue-700 hover:text-blue-900" to="/employees">
                    <UserRoundCheck aria-hidden="true" className="mr-1 inline size-4" />
                    View employees
                  </Link>
                  <Link className="font-medium text-blue-700 hover:text-blue-900" to="/employees">
                    <UserRoundX aria-hidden="true" className="mr-1 inline size-4" />
                    On leave: {data.employeesOnLeave}
                  </Link>
                </div>
              </section>
            </div>
          )}

          {data.recentTasks.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-border bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-semibold text-primary-text">Recent tasks</h2>
                  <p className="mt-1 text-sm text-secondary-text">
                    Latest tasks returned by the dashboard API.
                  </p>
                </div>
                <Link
                  className="text-sm font-medium text-blue-700 hover:text-blue-900"
                  to="/tasks"
                >
                  Browse tasks
                </Link>
              </div>
              <div className="divide-y divide-border">
                {data.recentTasks.map((task) => (
                  <Link
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-blue-50/50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    key={task._id}
                    to={`/tasks/${task._id}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary-text">{task.title}</p>
                      <p className="mt-1 text-sm text-secondary-text">
                        {taskEmployee(task)} · {task.department} · Due {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <p className="flex items-center gap-2 text-xs text-secondary-text">
            <Activity aria-hidden="true" className="size-4" />
            Metrics are fetched from the backend; completion rate is derived from its total and
            completed task counts.
          </p>
        </div>
      ) : null}
    </>
  );
}
