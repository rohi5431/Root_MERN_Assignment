import type { Employee, Task } from '../../types/api';

type Status = Employee['status'] | Task['status'];
type Priority = Task['priority'];

const statusStyles: Record<Status, string> = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  'On Leave': 'bg-amber-50 text-amber-700 ring-amber-600/15',
  Todo: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  'In Progress': 'bg-blue-50 text-blue-700 ring-blue-600/15',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/15',
};

const priorityStyles: Record<Priority, string> = {
  Low: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  Medium: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  High: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  Critical: 'bg-rose-50 text-rose-700 ring-rose-600/15',
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge label={status} className={statusStyles[status]} />;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge label={priority} className={priorityStyles[priority]} />;
}
