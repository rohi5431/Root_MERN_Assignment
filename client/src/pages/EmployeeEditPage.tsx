import { RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EmployeeForm } from '../components/employees/EmployeeForm';
import { PageHeader } from '../components/ui/PageHeader';
import { StatePanel } from '../components/ui/StatePanel';
import { useEmployee } from '../hooks/useEmployee';
import { updateEmployee } from '../services/employeeService';
import type { EmployeePayload } from '../types/api';
import { Link } from 'react-router-dom';

export function EmployeeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee, loading, error, notFound, retry } = useEmployee(id);

  async function handleUpdate(payload: EmployeePayload) {
    if (!id) return;
    const updated = await updateEmployee(id, payload);
    toast.success('Employee updated successfully.');
    navigate(`/employees/${updated._id}`);
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
          <Link className="text-sm font-medium text-accent hover:underline" to="/employees">
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
        title="Edit employee"
        description={`Update the profile for ${employee.fullName}.`}
      />
      <EmployeeForm employee={employee} onSubmit={handleUpdate} submitLabel="Save changes" />
    </>
  );
}
