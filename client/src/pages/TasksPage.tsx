import {
  CalendarDays,
  Download,
  Eye,
  FilterX,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TaskStatusDialog } from '../components/tasks/TaskStatusDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { PriorityBadge, StatusBadge } from '../components/ui/StatusBadge';
import { StatePanel } from '../components/ui/StatePanel';
import { getApiErrorMessage } from '../services/api';
import {
  exportTasksCsv,
  getTasks,
  updateTaskStatus,
  type TaskListParams,
} from '../services/taskService';
import type { Task, TaskListResponse } from '../types/api';
import {
  isCanonicalTaskListQuery,
  parseTaskListQuery,
  serializeTaskListQuery,
  type TaskListQueryState,
} from '../utils/taskListQuery';

const actionClass =
  'inline-flex size-9 items-center justify-center rounded-lg text-secondary-text transition hover:bg-blue-50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const inputClass =
  'mt-1 min-h-12 w-full rounded-lg border border-border bg-white px-3 text-base font-semibold text-primary-text outline-none transition placeholder:font-normal placeholder:text-secondary-text focus:border-accent focus:ring-2 focus:ring-accent/20';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value),
  );
}

function assignedEmployeeName(task: Task) {
  return (
    task.assignedEmployeeDetails?.fullName ??
    task.employeeSnapshot?.fullName ??
    (task.assignedEmployee ? 'Employee details unavailable' : 'Unassigned')
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading tasks">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="h-12 animate-pulse rounded-lg bg-slate-100" key={index} />
      ))}
    </div>
  );
}

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const state = parseTaskListQuery(new URLSearchParams(queryString));
  const canonical = isCanonicalTaskListQuery(new URLSearchParams(queryString));
  const [searchInput, setSearchInput] = useState(state.search);
  const [result, setResult] = useState<TaskListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportLock = useRef(false);

  const updateQuery = useCallback(
    (
      changes: Partial<TaskListQueryState>,
      resetPage = true,
      replace = false,
    ) => {
      setSearchParams(
        (current) => {
          const currentState = parseTaskListQuery(current);
          return serializeTaskListQuery({
            ...currentState,
            ...changes,
            page: resetPage ? 1 : changes.page ?? currentState.page,
          });
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    setSearchInput(state.search);
  }, [state.search]);

  useEffect(() => {
    if (!canonical) {
      setSearchParams(
        serializeTaskListQuery(parseTaskListQuery(new URLSearchParams(queryString))),
        { replace: true },
      );
    }
  }, [canonical, setSearchParams, queryString]);

  useEffect(() => {
    const search = searchInput.trim().slice(0, 100);
    if (search === state.search) return;
    const timeout = window.setTimeout(() => updateQuery({ search }, true, true), 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput, state.search, updateQuery]);

  useEffect(() => {
    if (!canonical) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getTasks(parseTaskListQuery(new URLSearchParams(queryString)), controller.signal)
      .then(setResult)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [canonical, queryString, retry]);

  const reload = () => setRetry((value) => value + 1);

  const activeFilterCount = [
    state.search,
    state.department,
    state.priority,
    state.status,
    state.dueDateFrom,
    state.dueDateTo,
  ].filter(Boolean).length;

  async function downloadCsv() {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    const params: Omit<TaskListParams, 'page' | 'limit'> = {
      search: state.search || undefined,
      department: state.department,
      priority: state.priority,
      status: state.status,
      dueDateFrom: state.dueDateFrom,
      dueDateTo: state.dueDateTo,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
    };
    try {
      const response = await exportTasksCsv(params);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('CSV export downloaded.');
    } catch (reason) {
      toast.error(`CSV export failed. ${getApiErrorMessage(reason)}`);
    } finally {
      exportLock.current = false;
      setExporting(false);
    }
  }

  function clearFilters() {
    setSearchInput('');
    updateQuery(
      {
        search: '',
        department: undefined,
        priority: undefined,
        status: undefined,
        dueDateFrom: undefined,
        dueDateTo: undefined,
      },
      true,
    );
  }

  async function changeStatus(status: Task['status']) {
    if (!statusTask) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      await updateTaskStatus(statusTask._id, status);
      toast.success(`Task status changed to ${status}.`);
      setStatusTask(null);
      reload();
    } catch (reason) {
      const message = getApiErrorMessage(reason);
      setStatusError(message);
      throw reason;
    } finally {
      setStatusBusy(false);
    }
  }

  function openStatus(task: Task) {
    setStatusError(null);
    setStatusTask(task);
  }

  const pageActions = (
    <div className="flex flex-wrap gap-2">
      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-primary-text transition hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
        disabled={exporting}
        onClick={downloadCsv}
        type="button"
      >
        {exporting ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Download aria-hidden="true" className="size-4" />
        )}
        {exporting ? 'Exporting…' : 'Export CSV'}
      </button>
      <Link
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        to="/tasks/new"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add task
      </Link>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Tasks"
        description={
          result
            ? `${result.pagination.totalItems} tasks match the current search and filters.`
            : 'Review assignments, due dates and work status across the team.'
        }
        action={pageActions}
      />
      <section className="w-full overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-primary-text">Task list</h2>
            <p className="mt-1 text-sm text-secondary-text">
              {result ? `${result.pagination.totalItems} tasks` : 'Task records'}
            </p>
          </div>
          {error && (
            <button
              className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-border px-3 text-sm font-medium text-primary-text hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:self-auto"
              onClick={reload}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Retry
            </button>
          )}
        </div>

        <div className="space-y-4 border-b border-border bg-secondary-background p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-primary-text">Search tasks or employees</span>
              <span className="relative block">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
                <input
                  aria-label="Search task titles and employee names"
                  className={`${inputClass} pl-9 pr-10`}
                  maxLength={100}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by task title or employee"
                  type="search"
                  value={searchInput}
                />
                {searchInput && (
                  <button
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary-text hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    onClick={() => {
                      setSearchInput('');
                      updateQuery({ search: '' }, true, true);
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                )}
              </span>
            </label>
            <label>
              <span className="text-sm font-bold text-primary-text">Department</span>
              <select
                aria-label="Department filter"
                className={inputClass}
                onChange={(event) =>
                  updateQuery({
                    department: (event.target.value || undefined) as Task['department'] | undefined,
                  })
                }
                value={state.department ?? ''}
              >
                <option value="">All departments</option>
                {['Development', 'Design', 'QA', 'HR', 'Sales'].map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-bold text-primary-text">Priority</span>
              <select
                aria-label="Priority filter"
                className={inputClass}
                onChange={(event) =>
                  updateQuery({
                    priority: (event.target.value || undefined) as Task['priority'] | undefined,
                  })
                }
                value={state.priority ?? ''}
              >
                <option value="">All priorities</option>
                {['Critical', 'High', 'Medium', 'Low'].map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-bold text-primary-text">Status</span>
              <select
                aria-label="Status filter"
                className={inputClass}
                onChange={(event) =>
                  updateQuery({
                    status: (event.target.value || undefined) as Task['status'] | undefined,
                  })
                }
                value={state.status ?? ''}
              >
                <option value="">All statuses</option>
                {['Todo', 'In Progress', 'Completed', 'Cancelled'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-bold text-primary-text">Due date from</span>
              <input
                aria-label="Due date from"
                className={inputClass}
                max={state.dueDateTo}
                onChange={(event) =>
                  updateQuery({ dueDateFrom: event.target.value || undefined })
                }
                type="date"
                value={state.dueDateFrom ?? ''}
              />
            </label>
            <label>
              <span className="text-sm font-bold text-primary-text">Due date to</span>
              <input
                aria-label="Due date to"
                className={inputClass}
                min={state.dueDateFrom}
                onChange={(event) =>
                  updateQuery({ dueDateTo: event.target.value || undefined })
                }
                type="date"
                value={state.dueDateTo ?? ''}
              />
            </label>
            <label>
              <span className="text-sm font-bold text-primary-text">Sort by</span>
              <select
                className={inputClass}
                onChange={(event) =>
                  updateQuery({ sortBy: event.target.value as TaskListQueryState['sortBy'] })
                }
                value={state.sortBy}
              >
                <option value="createdAt">Created date</option>
                <option value="dueDate">Due date</option>
                <option value="priority">Priority</option>
                <option value="title">Title</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-bold text-primary-text">Sort direction</span>
              <select
                className={inputClass}
                onChange={(event) =>
                  updateQuery({ sortOrder: event.target.value as TaskListQueryState['sortOrder'] })
                }
                value={state.sortOrder}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-xs text-secondary-text">
              {activeFilterCount ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}` : 'No filters applied'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-secondary-text hover:bg-slate-100 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onClick={clearFilters}
                  type="button"
                >
                  <FilterX aria-hidden="true" className="size-4" />
                  Clear all filters
                </button>
              )}
              <label className="flex items-center gap-2 text-xs text-secondary-text">
                Rows per page
                <select
                  aria-label="Rows per page"
                  className="min-h-9 rounded-lg border border-border bg-white px-2 text-sm text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onChange={(event) => updateQuery({ limit: Number(event.target.value) })}
                  value={state.limit}
                >
                  {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingRows />
        ) : error ? (
          <StatePanel description={error} title="Tasks could not be loaded" variant="error" />
        ) : !result || result.data.length === 0 ? (
          <StatePanel
            action={
              <Link
                className="inline-flex min-h-9 items-center rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                to="/tasks/new"
              >
                Add task
              </Link>
            }
            description={
              activeFilterCount
                ? 'No tasks match the current search and filters. Adjust or clear them to see more results.'
                : 'Create the first task to begin tracking work across your team.'
            }
            title={activeFilterCount ? 'No matching tasks' : 'No tasks found'}
          />
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {result.data.map((task) => (
                <article
                  className="rounded-lg border border-border bg-white p-4"
                  key={task._id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-secondary-text">{task.taskId}</p>
                      <h3 className="mt-1 break-words text-sm font-semibold text-primary-text">
                        {task.title}
                      </h3>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <p className="mt-2 text-sm text-secondary-text">{assignedEmployeeName(task)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={task.status} />
                    {task.isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                        <TriangleAlert aria-hidden="true" className="size-3.5" />
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-secondary-text">
                    {task.department} · Due {formatDate(task.dueDate)}
                  </p>
                  <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                    <Link
                      aria-label={`View ${task.title}`}
                      className={actionClass}
                      to={`/tasks/${task._id}`}
                    >
                      <Eye aria-hidden="true" className="size-[18px]" />
                    </Link>
                    {!['Completed', 'Cancelled'].includes(task.status) && (
                      <>
                        <Link
                          aria-label={`Edit ${task.title}`}
                          className={actionClass}
                          to={`/tasks/${task._id}/edit`}
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </Link>
                        <button
                          aria-label={`Update status for ${task.title}`}
                          className={actionClass}
                          onClick={() => openStatus(task)}
                          type="button"
                        >
                          <RotateCw aria-hidden="true" className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden w-full md:block">
              <table className="w-full table-fixed text-left">
                <thead className="bg-slate-100 text-xs font-bold uppercase tracking-[0.08em] text-primary-text">
                  <tr>
                    <th className="w-[25%] px-3 py-3 lg:px-4">Task</th>
                    <th className="w-[20%] px-3 py-3 lg:px-4">Assignment</th>
                    <th className="w-[11%] px-2 py-3 lg:px-3">Priority</th>
                    <th className="w-[13%] px-2 py-3 lg:px-3">Status</th>
                    <th className="w-[19%] px-2 py-3 lg:px-3">Schedule</th>
                    <th className="w-[12%] px-2 py-3 text-right lg:px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.data.map((task) => (
                    <tr className="transition hover:bg-blue-50/50" key={task._id}>
                      <td className="px-3 py-4 lg:px-4">
                        <p className="truncate text-sm font-semibold text-primary-text" title={task.title}>
                          {task.title}
                        </p>
                        <p className="mt-1 truncate text-xs font-medium text-secondary-text">
                          {task.taskId}
                        </p>
                      </td>
                      <td className="px-3 py-4 text-sm font-semibold text-primary-text lg:px-4">
                        <p className="truncate" title={assignedEmployeeName(task)}>
                          {assignedEmployeeName(task)}
                        </p>
                        <p className="mt-1 truncate text-xs font-medium text-secondary-text">
                          {task.department}
                        </p>
                      </td>
                      <td className="px-2 py-4 lg:px-3">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-2 py-4 lg:px-3">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-2 py-4 text-xs font-medium text-primary-text lg:px-3">
                        <p className="whitespace-nowrap">Starts {formatDate(task.startDate)}</p>
                        <p className="mt-1 whitespace-nowrap">Due {formatDate(task.dueDate)}</p>
                        {task.isOverdue ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                            <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                            Overdue
                          </span>
                        ) : (
                          <span className="mt-1 block text-xs text-secondary-text">On track</span>
                        )}
                      </td>
                      <td className="px-2 py-4 lg:px-3">
                        <div className="flex justify-end gap-0.5">
                          <Link
                            aria-label={`View ${task.title}`}
                            className={actionClass}
                            to={`/tasks/${task._id}`}
                          >
                            <Eye aria-hidden="true" className="size-[18px]" />
                          </Link>
                          {!['Completed', 'Cancelled'].includes(task.status) && (
                            <>
                              <Link
                                aria-label={`Edit ${task.title}`}
                                className={actionClass}
                                to={`/tasks/${task._id}/edit`}
                              >
                                <Pencil aria-hidden="true" className="size-4" />
                              </Link>
                              <button
                                aria-label={`Update status for ${task.title}`}
                                className={actionClass}
                                onClick={() => openStatus(task)}
                                type="button"
                              >
                                <RotateCw aria-hidden="true" className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              {...result.pagination}
              onPageChange={(page) => updateQuery({ page }, false)}
            />
          </>
        )}
        <p className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-secondary-text">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
          Overdue state is computed by the API using UTC calendar dates; tasks due today are not
          overdue.
        </p>
      </section>
      {statusTask && (
        <TaskStatusDialog
          busy={statusBusy}
          error={statusError}
          onClose={() => {
            if (!statusBusy) setStatusTask(null);
          }}
          onUpdate={changeStatus}
          task={statusTask}
        />
      )}
    </>
  );
}
