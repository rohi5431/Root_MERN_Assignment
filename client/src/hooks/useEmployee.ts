import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/api';
import { getEmployee } from '../services/employeeService';
import type { Employee } from '../types/api';

export function useEmployee(id: string | undefined) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setEmployee(null);
    setError(null);
    setNotFound(false);
    getEmployee(id, controller.signal)
      .then(setEmployee)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (axios.isAxiosError(reason) && reason.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(getApiErrorMessage(reason));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, retryCount]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);
  return { employee, loading, error, notFound, retry };
}
