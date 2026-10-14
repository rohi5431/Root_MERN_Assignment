import type { DashboardMetrics, ListResponse, Task } from '../types/api';
import { api } from './api';

async function countItems(
  path: '/employees' | '/tasks',
  params: Record<string, string | number>,
  signal?: AbortSignal,
) {
  const response = await api.get<ListResponse<unknown>>(path, {
    params: { ...params, page: 1, limit: 1 },
    signal,
  });
  return response.data.pagination.totalItems;
}

export async function getDashboardMetrics(signal?: AbortSignal): Promise<DashboardMetrics> {
  const [
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    employeesOnLeave,
    totalTasks,
    inProgressTasks,
    completedTasks,
    todoTasks,
    cancelledTasks,
    overdueTasks,
    recentTasksResponse,
  ] = await Promise.all([
    countItems('/employees', {}, signal),
    countItems('/employees', { status: 'Active' }, signal),
    countItems('/employees', { status: 'Inactive' }, signal),
    countItems('/employees', { status: 'On Leave' }, signal),
    countItems('/tasks', {}, signal),
    countItems('/tasks', { status: 'In Progress' }, signal),
    countItems('/tasks', { status: 'Completed' }, signal),
    countItems('/tasks', { status: 'Todo' }, signal),
    countItems('/tasks', { status: 'Cancelled' }, signal),
    countItems('/tasks', { overdue: 'true' }, signal),
    api.get<ListResponse<Task>>('/tasks', {
      params: { page: 1, limit: 5, sortBy: 'createdAt', order: 'desc' },
      signal,
    }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    employeesOnLeave,
    totalTasks,
    inProgressTasks,
    completedTasks,
    todoTasks,
    cancelledTasks,
    overdueTasks,
    recentTasks: recentTasksResponse.data.data,
  };
}
