import type { ApiResponse, DashboardMetrics } from '../types/api';
import { api } from './api';

export async function getDashboardMetrics(signal?: AbortSignal): Promise<DashboardMetrics> {
  const response = await api.get<ApiResponse<DashboardMetrics>>('/dashboard', { signal });
  return response.data.data;
}
