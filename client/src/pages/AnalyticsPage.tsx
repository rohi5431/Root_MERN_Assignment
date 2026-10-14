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
import { StatePanel } from '../components/ui/StatePanel';
import { getApiErrorMessage } from '../services/api';
import { getDashboardMetrics } from '../services/dashboardService';
import type { DashboardMetrics } from '../types/api';
import { getPercentageWidthClass } from '../utils/percentageWidth';

const taskStatuses = [
  { key: 'todoTasks', label: 'To do', color: '#91A5CC' },
  { key: 'inProgressTasks', label: 'In progress', color: '#3B82F6' },
  { key: 'completedTasks', label: 'Completed', color: '#22C55E' },
  { key: 'cancelledTasks', label: 'Cancelled', color: '#EF4444' },
] as const;

const taskPriorities = [
  { key: 'Critical', label: 'Critical', color: '#EF4444' },
  { key: 'High', label: 'High', color: '#F59E0B' },
  { key: 'Medium', label: 'Medium', color: '#FBBF24' },
  { key: 'Low', label: 'Low', color: '#22C55E' },
] as const;

const departments = [
  { key: 'Development', label: 'Development', color: '#3B82F6' },
  { key: 'Design', label: 'Design', color: '#8B5CF6' },
  { key: 'QA', label: 'QA', color: '#F59E0B' },
  { key: 'HR', label: 'HR', color: '#22C55E' },
  { key: 'Sales', label: 'Sales', color: '#EF4444' },
] as const;

const employeeStatuses = [
  { key: 'activeEmployees', label: 'Active', color: 'bg-green-500' },
  { key: 'inactiveEmployees', label: 'Inactive', color: 'bg-slate-400' },
  { key: 'employeesOnLeave', label: 'On leave', color: 'bg-amber-500' },
] as const;

function MetricCard({
  label,
  value,
  detail,
  Icon,
  color,
  surface,
}: {
  label: string;
  value: number | string;
  detail: string;
  Icon: typeof Users;
  color: string;
  surface: string;
}) {
  return (
    <article className={`rounded-2xl border border-border bg-gradient-to-br ${surface} p-5 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-950/5`}>
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
        <span className="font-medium text-primary-text">{label}</span>
        <span className="shrink-0 text-secondary-text">
          {value} <span className="text-secondary-text">({percent}%)</span>
        </span>
      </div>
      <div
        aria-label={`${label}: ${value} of ${total}, ${percent}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="h-2.5 overflow-hidden rounded-full bg-secondary-background"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-500 ${getPercentageWidthClass(percent)}`}
        />
      </div>
    </div>
  );
}

function DonutChart({
  title,
  total,
  slices,
}: {
  title: string;
  total: number;
  slices: Array<{ label: string; value: number; color: string }>;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative size-44 shrink-0">
        <svg
          aria-label={`${title}: ${slices.map(({ label, value }) => `${label} ${value}`).join(', ')}; ${total} total tasks`}
          className="size-full -rotate-90"
          role="img"
          viewBox="0 0 128 128"
        >
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="16"
          />
          {total > 0 &&
            slices.map((slice) => {
              const arcLength = (slice.value / total) * circumference;
              const circle = (
                <circle
                  key={slice.label}
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeDasharray={`${Math.max(0, arcLength - 2)} ${circumference}`}
                  strokeDashoffset={-offset}
                  strokeWidth="16"
                />
              );
              offset += arcLength;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-primary-text">{total}</span>
          <span className="text-xs text-secondary-text">Total Tasks</span>
        </div>
      </div>
      <ul className="w-full space-y-3 sm:max-w-44">
        {slices.map((slice) => {
          const percentage = total === 0 ? 0 : Math.round((slice.value / total) * 100);
          return (
            <li className="flex items-center gap-2 text-xs" key={slice.label}>
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="min-w-0 flex-1 truncate text-secondary-text">{slice.label}</span>
              <span className="shrink-0 text-right font-semibold text-primary-text">
                {slice.value} <span className="font-normal text-secondary-text">({percentage}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DepartmentBarChart({
  values,
}: {
  values: Array<{ label: string; value: number; color: string }>;
}) {
  const maxValue = Math.max(5, Math.ceil(Math.max(...values.map(({ value }) => value), 0) / 5) * 5);
  const chartTop = 18;
  const chartBottom = 190;
  const chartHeight = chartBottom - chartTop;
  const barWidth = 42;
  const chartLeft = 38;
  const chartWidth = 470;
  const slotWidth = chartWidth / values.length;

  return (
    <svg
      aria-label="Task count by department"
      className="h-56 w-full overflow-visible"
      role="img"
      viewBox="0 0 540 236"
    >
      {[0, 1, 2, 3, 4].map((tick) => {
        const value = (maxValue / 4) * tick;
        const y = chartBottom - (chartHeight / 4) * tick;
        return (
          <g key={tick}>
            <line x1={chartLeft} x2={chartLeft + chartWidth} y1={y} y2={y} stroke="#E5E7EB" />
            <text
              fill="#6B7280"
              fontSize="11"
              textAnchor="end"
              x={chartLeft - 9}
              y={y + 4}
            >
              {Math.round(value)}
            </text>
          </g>
        );
      })}
      {values.map((item, index) => {
        const height = (item.value / maxValue) * chartHeight;
        const x = chartLeft + slotWidth * index + (slotWidth - barWidth) / 2;
        const y = chartBottom - height;
        return (
          <g key={item.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(height, item.value ? 2 : 0)}
              rx="4"
              fill={item.color}
            />
            <text
              fill="#1F2937"
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              x={x + barWidth / 2}
              y={Math.max(chartTop - 3, y - 8)}
            >
              {item.value}
            </text>
            <text
              fill="#6B7280"
              fontSize="10"
              textAnchor="middle"
              x={x + barWidth / 2}
              y={chartBottom + 20}
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
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
              surface="from-blue-50/80 to-white"
              value={data.totalEmployees}
            />
            <MetricCard
              color="bg-green-50 text-green-700"
              detail={`${data.inProgressTasks} currently in progress`}
              Icon={ListTodo}
              label="Total tasks"
              surface="from-green-50/80 to-white"
              value={data.totalTasks}
            />
            <MetricCard
              color="bg-violet-50 text-violet-700"
              detail={`${data.completedTasks} of ${data.totalTasks} tasks completed`}
              Icon={CheckCircle2}
              label="Completion rate"
              surface="from-violet-50/80 to-white"
              value={`${data.completionRate}%`}
            />
            <MetricCard
              color="bg-amber-50 text-amber-700"
              detail="Not completed or cancelled and past the due date"
              Icon={AlertTriangle}
              label="Overdue tasks"
              surface="from-amber-50/80 to-white"
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
            <div className="space-y-5">
              <div className="grid items-stretch gap-5 xl:grid-cols-[1.05fr_1fr_0.95fr]">
                <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-base font-semibold text-primary-text">Task status overview</h2>
                    <p className="mt-1 text-sm text-secondary-text">
                      Current distribution across all tasks.
                    </p>
                  </div>
                  <DonutChart
                    slices={taskStatuses.map(({ key, label, color }) => ({
                      label,
                      value: data[key],
                      color,
                    }))}
                    title="Task status overview"
                    total={data.totalTasks}
                  />
                </section>

                <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                  <div className="mb-3">
                    <h2 className="text-base font-semibold text-primary-text">Tasks by department</h2>
                    <p className="mt-1 text-sm text-secondary-text">
                      Distribution across the organization.
                    </p>
                  </div>
                  <DepartmentBarChart
                    values={departments.map(({ key, label, color }) => ({
                      label,
                      value: data.tasksByDepartment[key],
                      color,
                    }))}
                  />
                </section>

                <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-base font-semibold text-primary-text">Task priority</h2>
                    <p className="mt-1 text-sm text-secondary-text">
                      Priority mix across all tasks.
                    </p>
                  </div>
                  <DonutChart
                    slices={taskPriorities.map(({ key, label, color }) => ({
                      label,
                      value: data.tasksByPriority[key],
                      color,
                    }))}
                    title="Task priority"
                    total={data.totalTasks}
                  />
                </section>
              </div>

              <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-primary-text">Team availability</h2>
                  <p className="mt-1 text-sm text-secondary-text">
                    Current employee status from the management system.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
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
                  <Link className="font-medium text-accent hover:text-accent-hover" to="/employees">
                    <UserRoundCheck aria-hidden="true" className="mr-1 inline size-4" />
                    View employees
                  </Link>
                  <Link className="font-medium text-accent hover:text-accent-hover" to="/employees">
                    <UserRoundX aria-hidden="true" className="mr-1 inline size-4" />
                    On leave: {data.employeesOnLeave}
                  </Link>
                </div>
              </section>
            </div>
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
