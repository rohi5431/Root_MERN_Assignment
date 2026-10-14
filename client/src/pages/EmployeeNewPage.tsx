import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EmployeeForm } from '../components/employees/EmployeeForm';
import { PageHeader } from '../components/ui/PageHeader';
import { createEmployee } from '../services/employeeService';
import type { EmployeePayload } from '../types/api';

export function EmployeeNewPage() {
  const navigate = useNavigate();

  async function handleCreate(payload: EmployeePayload) {
    const employee = await createEmployee(payload);
    toast.success('Employee created successfully.');
    navigate(`/employees/${employee._id}`);
  }

  return (
    <>
      <PageHeader
        title="Add employee"
        description="Create a team member profile and add them to your employee directory."
      />
      <EmployeeForm onSubmit={handleCreate} submitLabel="Create employee" />
    </>
  );
}
