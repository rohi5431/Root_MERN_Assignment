import { Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { StatePanel } from '../components/ui/StatePanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getApiErrorMessage } from '../services/api';
import { deleteEmployee, getEmployees } from '../services/employeeService';
import type { Employee, EmployeeListResponse } from '../types/api';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;
const actionClass =
  'inline-flex size-9 items-center justify-center rounded-lg text-secondary-text transition hover:bg-blue-50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value),
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading employees">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="h-12 animate-pulse rounded-lg bg-slate-100" key={index} />
      ))}
    </div>
  );
}

export function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<EmployeeListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getEmployees({ page, limit: PAGE_SIZE }, controller.signal)
      .then(setResult)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, retry]);

  const reload = () => setRetry((value) => value + 1);

  async function confirmDelete() {
    if (!employeeToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEmployee(employeeToDelete._id);
      toast.success('Employee deleted successfully.');
      setEmployeeToDelete(null);
      if (result?.data.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        reload();
      }
    } catch (reason) {
      const message = getApiErrorMessage(reason);
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage your team directory and employee records."
        action={
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            to="/employees/new"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add employee
          </Link>
        }
      />

      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-primary-text">Team directory</h2>
            <p className="mt-1 text-sm text-secondary-text">
              {result ? `${result.pagination.totalItems} employees` : 'Employee records'}
            </p>
          </div>
          {error && (
            <button
              className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-border px-3 text-sm font-medium text-primary-text hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:self-auto"
              onClick={reload}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Retry
            </button>
          )}
        </div>

        {loading ? (
          <LoadingRows />
        ) : error ? (
          <StatePanel description={error} title="Employees could not be loaded" variant="error" />
        ) : !result || result.data.length === 0 ? (
          <StatePanel
            action={
              <Link
                className="inline-flex min-h-9 items-center rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                to="/employees/new"
              >
                Add employee
              </Link>
            }
            description="Create the first employee record to start building your team directory."
            title="No employees found"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-slate-900 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                  <tr>
                    <th className="px-5 py-3">Employee ID</th>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Joining date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.data.map((employee) => (
                    <tr className="transition hover:bg-slate-50/70" key={employee._id}>
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-primary-text">
                        {employee.employeeId}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-48 items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                            {employee.fullName
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join('')
                              .toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-primary-text">
                              {employee.fullName}
                            </p>
                            <p className="truncate text-xs text-secondary-text">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{employee.department}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{employee.role}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDate(employee.joiningDate)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={employee.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <Link
                            aria-label={`View details for ${employee.fullName}`}
                            className={actionClass}
                            to={`/employees/${employee._id}`}
                          >
                            <Eye aria-hidden="true" className="size-[18px]" />
                          </Link>
                          <Link
                            aria-label={`Edit ${employee.fullName}`}
                            className={actionClass}
                            to={`/employees/${employee._id}/edit`}
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </Link>
                          <button
                            aria-label={`Delete ${employee.fullName}`}
                            className={`${actionClass} hover:bg-rose-50 hover:text-rose-700`}
                            onClick={() => {
                              setDeleteError(null);
                              setEmployeeToDelete(employee);
                            }}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...result.pagination} onPageChange={setPage} />
          </>
        )}
      </section>
      {employeeToDelete && (
        <ConfirmDialog
          busy={deleting}
          confirmLabel="Delete employee"
          description={`Permanently delete ${employeeToDelete.fullName} (${employeeToDelete.employeeId})? This action cannot be undone.`}
          error={deleteError}
          onCancel={() => {
            if (!deleting) setEmployeeToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete employee?"
          warning="Employees with Todo or In Progress tasks cannot be deleted."
        />
      )}
    </>
  );
}
