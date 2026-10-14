import axios from 'axios';
import type { ApiErrorResponse } from '../types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
  timeout: 12000,
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (error.response?.data?.message) return error.response.data.message;
    if (error.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again.';
    }
    if (error.request) {
      return 'Unable to reach the API. Check that the backend is running and try again.';
    }
  }

  return 'Something went wrong while loading this page. Please try again.';
}

export function getApiFieldErrors(error: unknown): Array<{ field?: string; message: string }> {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.errors ?? [];
  }
  return [];
}
