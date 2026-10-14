import type { ApiResponse, Task, TaskListResponse } from '../types/api';
import { api } from './api';

export interface TaskListParams {
  page: number;
  limit: number;
  search?: string;
  department?: Task['department'];
  priority?: Task['priority'];
  status?: Task['status'];
  dueDateFrom?: string;
  dueDateTo?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
  order?: 'asc' | 'desc';
  overdue?: 'true' | 'false';
}

export async function getTasks(params: TaskListParams, signal?: AbortSignal) {
  const response = await api.get<TaskListResponse>('/tasks', { params, signal });
  return response.data;
}

export async function exportTasksCsv(params: Omit<TaskListParams, 'page' | 'limit'>) {
  return api.get<Blob>('/tasks/export/csv', {
    params,
    responseType: 'blob',
  });
}

export async function getTask(id: string, signal?: AbortSignal) {
  const response = await api.get<ApiResponse<Task>>(`/tasks/${encodeURIComponent(id)}`, { signal });
  return response.data.data;
}

export interface TaskPayload {
  title: string;
  description: string;
  assignedEmployee: string;
  department: Task['department'];
  priority: Task['priority'];
  startDate: string;
  dueDate: string;
}

export async function createTask(payload: TaskPayload) {
  const response = await api.post<ApiResponse<Task>>('/tasks', payload);
  return response.data.data;
}

export async function updateTask(id: string, payload: TaskPayload) {
  const response = await api.put<ApiResponse<Task>>(
    `/tasks/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data.data;
}

export async function updateTaskStatus(
  id: string,
  status: Task['status'],
) {
  const response = await api.put<ApiResponse<Task>>(
    `/tasks/${encodeURIComponent(id)}/status`,
    { status },
  );
  return response.data.data;
}
