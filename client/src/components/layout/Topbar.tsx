import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';

interface TopbarProps {
  onMenuClick: () => void;
}

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analytics': 'Analytics',
  '/employees': 'Employees',
  '/tasks': 'Tasks',
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const employeePath = location.pathname.match(/^\/employees(?:\/([^/]+))?(?:\/(edit))?$/);
  const taskPath = location.pathname.match(/^\/tasks(?:\/([^/]+))?(?:\/(edit))?$/);
  const title =
    pageNames[location.pathname] ??
    (employeePath?.[1] === 'new'
      ? 'Add Employee'
      : employeePath?.[2]
        ? 'Edit Employee'
        : employeePath?.[1]
          ? 'Employee Details'
          : taskPath?.[1] === 'new'
            ? 'Add Task'
            : taskPath?.[2]
              ? 'Edit Task'
              : taskPath?.[1]
                ? 'Task Details'
                : 'Page not found');
  const breadcrumb =
    location.pathname === '/employees'
      ? 'Workspace / Employees'
      : location.pathname.startsWith('/employees/')
        ? `Workspace / Employees / ${title}`
        : location.pathname === '/tasks'
          ? 'Workspace / Tasks'
          : location.pathname.startsWith('/tasks/')
            ? `Workspace / Tasks / ${title}`
            : `Workspace / ${title}`;

  return (
    <header className="sticky top-0 z-20 flex h-[4.5rem] items-center justify-between gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-secondary-text transition hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          onClick={onMenuClick}
          type="button"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm text-secondary-text">{breadcrumb}</p>
          <p className="truncate text-base font-semibold text-primary-text">{title}</p>
        </div>
      </div>
      <NotificationCenter />
    </header>
  );
}
