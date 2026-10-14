import type {
  ApiResponse,
  Employee,
  EmployeeListResponse,
  EmployeePayload,
} from '../types/api';
import { api } from './api';

export interface EmployeeListParams {
  page: number;
  limit: number;
  status?: Employee['status'];
}

export async function getEmployees(params: EmployeeListParams, signal?: AbortSignal) {
  const response = await api.get<EmployeeListResponse>('/employees', { params, signal });
  return response.data;
}

export async function getAllEmployees(signal?: AbortSignal) {
  const pageSize = 100;
  const firstPage = await getEmployees({ page: 1, limit: pageSize }, signal);
  const employees = [...firstPage.data];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await getEmployees({ page, limit: pageSize }, signal);
    employees.push(...result.data);
  }
  return employees;
}

export async function getEmployee(id: string, signal?: AbortSignal) {
  const response = await api.get<ApiResponse<Employee>>(`/employees/${encodeURIComponent(id)}`, {
    signal,
  });
  return response.data.data;
}

export async function createEmployee(payload: EmployeePayload) {
  const response = await api.post<ApiResponse<Employee>>('/employees', payload);
  return response.data.data;
}

export async function updateEmployee(id: string, payload: EmployeePayload) {
  const response = await api.put<ApiResponse<Employee>>(
    `/employees/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data.data;
}

export async function deleteEmployee(id: string) {
  const response = await api.delete<ApiResponse<Employee>>(
    `/employees/${encodeURIComponent(id)}`,
  );
  return response.data;
}
