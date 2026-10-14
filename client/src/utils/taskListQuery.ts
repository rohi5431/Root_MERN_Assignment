import type { TaskListParams } from '../services/taskService';
import type { Task } from '../types/api';

const departments: Task['department'][] = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const priorities: Task['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
const statuses: Task['status'][] = ['Todo', 'In Progress', 'Completed', 'Cancelled'];
const sortFields: NonNullable<TaskListParams['sortBy']>[] = [
  'createdAt',
  'dueDate',
  'priority',
  'title',
];

export interface TaskListQueryState extends TaskListParams {
  page: number;
  limit: number;
  sortBy: NonNullable<TaskListParams['sortBy']>;
  sortOrder: 'asc' | 'desc';
  search: string;
}

function positiveInteger(value: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= max ? number : fallback;
}

function dateOnly(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

export function parseTaskListQuery(params: URLSearchParams): TaskListQueryState {
  const dueDateFrom = dateOnly(params.get('dueDateFrom'));
  let dueDateTo = dateOnly(params.get('dueDateTo'));
  if (dueDateFrom && dueDateTo && dueDateFrom > dueDateTo) dueDateTo = undefined;

  return {
    search: (params.get('search') ?? '').trim().slice(0, 100),
    department: departments.includes(params.get('department') as Task['department'])
      ? (params.get('department') as Task['department'])
      : undefined,
    priority: priorities.includes(params.get('priority') as Task['priority'])
      ? (params.get('priority') as Task['priority'])
      : undefined,
    status: statuses.includes(params.get('status') as Task['status'])
      ? (params.get('status') as Task['status'])
      : undefined,
    dueDateFrom,
    dueDateTo,
    sortBy: sortFields.includes(params.get('sortBy') as TaskListQueryState['sortBy'])
      ? (params.get('sortBy') as TaskListQueryState['sortBy'])
      : 'createdAt',
    sortOrder: params.get('sortOrder') === 'asc' ? 'asc' : 'desc',
    page: positiveInteger(params.get('page'), 1),
    limit: positiveInteger(params.get('limit'), 10, 100),
  };
}

export function serializeTaskListQuery(state: TaskListQueryState) {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.department) params.set('department', state.department);
  if (state.priority) params.set('priority', state.priority);
  if (state.status) params.set('status', state.status);
  if (state.dueDateFrom) params.set('dueDateFrom', state.dueDateFrom);
  if (state.dueDateTo) params.set('dueDateTo', state.dueDateTo);
  if (state.sortBy !== 'createdAt') params.set('sortBy', state.sortBy);
  if (state.sortOrder !== 'desc') params.set('sortOrder', state.sortOrder);
  if (state.page !== 1) params.set('page', String(state.page));
  if (state.limit !== 10) params.set('limit', String(state.limit));
  return params;
}

export function isCanonicalTaskListQuery(params: URLSearchParams) {
  return params.toString() === serializeTaskListQuery(parseTaskListQuery(params)).toString();
}
