const TERMINAL_STATUSES = new Set(['Completed', 'Cancelled']);
const STATUS_TRANSITIONS = {
  Todo: new Set(['In Progress', 'Cancelled']),
  'In Progress': new Set(['Completed', 'Cancelled']),
  Completed: new Set(),
  Cancelled: new Set(),
};

export function utcDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isTaskOverdue(task, now = new Date()) {
  return (
    !TERMINAL_STATUSES.has(task.status) &&
    utcDateKey(now) > utcDateKey(task.dueDate)
  );
}

export function canTransitionTaskStatus(currentStatus, nextStatus) {
  return STATUS_TRANSITIONS[currentStatus]?.has(nextStatus) ?? false;
}
