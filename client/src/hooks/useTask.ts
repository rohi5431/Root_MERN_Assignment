import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/api';
import { getTask } from '../services/taskService';
import type { Task } from '../types/api';

export function useTask(id: string | undefined) {
  const [task, setTask] = useState<Task | null>(null);
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
    setTask(null);
    setError(null);
    setNotFound(false);
    getTask(id, controller.signal)
      .then(setTask)
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
  return { task, loading, error, notFound, retry };
}
