import { ArrowLeft, CalendarDays, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { StatePanel } from '../components/ui/StatePanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useEmployee } from '../hooks/useEmployee';
import { getApiErrorMessage } from '../services/api';
import { deleteEmployee } from '../services/employeeService';

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(value),
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border py-3 last:border-b-0 sm:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-secondary-text">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-primary-text">{value || '—'}</dd>
    </div>
  );
}

export function EmployeeDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee, loading, error, notFound, retry } = useEmployee(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!employee) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEmployee(employee._id);
      toast.success('Employee deleted successfully.');
      navigate('/employees', { replace: true });
    } catch (reason) {
      const message = getApiErrorMessage(reason);
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <StatePanel
        description="Loading the employee profile."
        title="Loading employee"
        variant="loading"
      />
    );
  }
  if (notFound) {
    return (
      <StatePanel
        action={
          <Link
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-blue-700"
            to="/employees"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Employees
          </Link>
        }
        description="The employee may have been removed or the address is incorrect."
        title="Employee not found"
      />
    );
  }
  if (error || !employee) {
    return (
      <StatePanel
        action={
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-primary-text hover:bg-secondary-background"
            onClick={retry}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Retry
          </button>
        }
        description={error ?? 'The employee profile could not be loaded.'}
        title="Employee could not be loaded"
        variant="error"
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Employee details"
        description="Review this employee's profile and current status."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-primary-text hover:bg-secondary-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              to="/employees"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Employees
            </Link>
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              to={`/employees/${employee._id}/edit`}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Edit employee
            </Link>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              onClick={() => {
                setDeleteError(null);
                setConfirmDelete(true);
              }}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </button>
          </div>
        }
      />

      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-semibold text-blue-700">
            {employee.fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-primary-text">{employee.fullName}</h2>
              <StatusBadge status={employee.status} />
            </div>
            <p className="mt-1 text-sm text-secondary-text">
              {employee.role} · {employee.department}
            </p>
            <p className="mt-1 text-xs text-secondary-text">Employee ID: {employee.employeeId}</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-lg bg-secondary-background px-3 py-2 text-xs text-secondary-text sm:self-center">
            <CalendarDays aria-hidden="true" className="size-4" />
            Joined {formatDate(employee.joiningDate)}
          </div>
        </div>

        <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
          <section aria-labelledby="profile-heading">
            <h3 className="text-sm font-semibold text-primary-text" id="profile-heading">
              Profile information
            </h3>
            <dl className="mt-3 grid gap-x-6 sm:grid-cols-2">
              <Detail label="Employee ID" value={employee.employeeId} />
              <Detail label="Full name" value={employee.fullName} />
              <Detail label="Email" value={employee.email} />
              <Detail label="Phone" value={employee.phone} />
              <Detail label="Department" value={employee.department} />
              <Detail label="Role" value={employee.role} />
              <Detail label="Joining date" value={formatDate(employee.joiningDate)} />
              <Detail label="Status" value={employee.status} />
              {employee.status === 'On Leave' && (
                <>
                  <Detail label="Leave start" value={formatDate(employee.leaveStart)} />
                  <Detail label="Leave end" value={formatDate(employee.leaveEnd)} />
                </>
              )}
              <Detail label="Created" value={formatDate(employee.createdAt)} />
              <Detail label="Last updated" value={formatDate(employee.updatedAt)} />
            </dl>
          </section>
          <section aria-labelledby="skills-heading">
            <h3 className="text-sm font-semibold text-primary-text" id="skills-heading">
              Skills
            </h3>
            {employee.skills.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {employee.skills.map((skill) => (
                  <li
                    className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800"
                    key={skill}
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-secondary-text">No skills have been added.</p>
            )}
            <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-secondary-text">
              Workload and task summaries are not provided by the employee API.
            </p>
          </section>
        </div>
      </section>

      {confirmDelete && (
        <ConfirmDialog
          busy={deleting}
          confirmLabel="Delete employee"
          description={`Permanently delete ${employee.fullName} (${employee.employeeId})? This action cannot be undone.`}
          error={deleteError}
          onCancel={() => {
            if (!deleting) setConfirmDelete(false);
          }}
          onConfirm={handleDelete}
          title="Delete employee?"
          warning="Employees with Todo or In Progress tasks cannot be deleted."
        />
      )}
    </>
  );
}
