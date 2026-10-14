import { BarChart3, LayoutDashboard, ListTodo, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const links = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/employees', label: 'Employees', Icon: Users },
  { to: '/tasks', label: 'Tasks', Icon: ListTodo },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[4.75rem] items-center justify-between border-b border-border px-6">
          <NavLink
            className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={onClose}
            to="/dashboard"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-base font-bold text-white shadow-sm shadow-blue-200/70">
              R
            </span>
            <span>
              <span className="block text-base font-semibold text-primary-text">Roots Media</span>
              <span className="block text-sm text-secondary-text">Employee Management</span>
            </span>
          </NavLink>
          <button
            aria-label="Close navigation menu"
            className="rounded-lg p-2 text-secondary-text hover:bg-secondary-background lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Workspace
          </p>
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              className={({ isActive }) =>
                `group flex min-h-12 items-center gap-3 rounded-xl px-4 text-base font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive
                    ? 'bg-blue-50 text-accent shadow-sm shadow-blue-100'
                    : 'text-slate-600 hover:translate-x-0.5 hover:bg-blue-50/70 hover:text-blue-800'
                }`
              }
              onClick={onClose}
              to={to}
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <p className="text-sm font-medium text-secondary-text">Roots Media Marketing</p>
          <p className="mt-1 text-sm text-slate-400">Team workspace</p>
        </div>
      </aside>
    </>
  );
}
