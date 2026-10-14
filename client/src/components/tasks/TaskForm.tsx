import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type FieldPath, type SubmitHandler } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { getApiErrorMessage, getApiFieldErrors } from '../../services/api';
import { getAllEmployees } from '../../services/employeeService';
import type { Employee, Task } from '../../types/api';
import type { TaskPayload } from '../../services/taskService';
import { FormField } from '../ui/FormField';
import { SampleDataButton } from '../ui/SampleDataButton';
import { StatePanel } from '../ui/StatePanel';

const departments = ['Development', 'Design', 'QA', 'HR', 'Sales'] as const;
const priorities = ['Low', 'Medium', 'High', 'Critical'] as const;
const taskFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Task title is required').max(150),
    description: z.string().trim().max(5000, 'Description must be 5,000 characters or fewer'),
    assignedEmployee: z.string().min(1, 'Select an employee'),
    department: z.enum(departments),
    priority: z.enum(priorities),
    startDate: z.string().min(1, 'Start date is required').pipe(z.iso.date()),
    dueDate: z.string().min(1, 'Due date is required').pipe(z.iso.date()),
  })
  .refine((value) => value.dueDate >= value.startDate, {
    path: ['dueDate'],
    message: 'Due date cannot be earlier than start date',
  })
  .transform((values): TaskPayload => ({
    ...values,
    title: values.title.trim(),
    description: values.description.trim(),
  }));

type TaskFormValues = z.input<typeof taskFormSchema>;
type TaskFormPayload = z.output<typeof taskFormSchema>;

interface TaskFormProps {
  task?: Task;
  submitLabel: string;
  onSubmit: (payload: TaskFormPayload) => Promise<void>;
}

const inputClass =
  'min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-primary-text shadow-sm outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:ring-rose-500/20';

function assignedEmployeeId(task?: Task) {
  if (!task) return '';
  if (typeof task.assignedEmployee === 'string') return task.assignedEmployee;
  return task.assignedEmployee?._id ?? '';
}

function isEligibleForStartDate(employee: Employee, startDate: string) {
  if (employee.status === 'Inactive') return false;
  if (employee.status !== 'On Leave' || !startDate) return true;
  if (!employee.leaveStart || !employee.leaveEnd) return true;
  const leaveStart = employee.leaveStart.slice(0, 10);
  const leaveEnd = employee.leaveEnd.slice(0, 10);
  return startDate < leaveStart || startDate > leaveEnd;
}

export function TaskForm({ task, submitLabel, onSubmit }: TaskFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [employeeRetry, setEmployeeRetry] = useState(0);
  const defaultValues = useMemo<TaskFormValues>(
    () => ({
      title: task?.title ?? '',
      description: task?.description ?? '',
      assignedEmployee: assignedEmployeeId(task),
      department: task?.department ?? task?.assignedEmployeeDetails?.department ?? 'Development',
      priority: task?.priority ?? 'Medium',
      startDate: task?.startDate?.slice(0, 10) ?? '',
      dueDate: task?.dueDate?.slice(0, 10) ?? '',
    }),
    [task],
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues, unknown, TaskFormPayload>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  });
  const startDate = watch('startDate');
  const selectedEmployeeId = watch('assignedEmployee');

  useEffect(() => {
    const controller = new AbortController();
    setEmployeesLoading(true);
    setEmployeesError(null);
    getAllEmployees(controller.signal)
      .then(setEmployees)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setEmployeesError(getApiErrorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setEmployeesLoading(false);
      });
    return () => controller.abort();
  }, [employeeRetry]);

  const eligibleEmployees = useMemo(
    () => employees.filter((employee) => isEligibleForStartDate(employee, startDate)),
    [employees, startDate],
  );
  const currentEmployeeId = assignedEmployeeId(task);
  const retainOriginalAssignment =
    selectedEmployeeId === currentEmployeeId && startDate === task?.startDate.slice(0, 10);
  const selectedEmployee = employees.find((employee) => employee._id === selectedEmployeeId);
  const employeeOptions = useMemo(
    () =>
      retainOriginalAssignment && selectedEmployee && !eligibleEmployees.includes(selectedEmployee)
        ? [...eligibleEmployees, selectedEmployee]
        : eligibleEmployees,
    [eligibleEmployees, retainOriginalAssignment, selectedEmployee],
  );

  useEffect(() => {
    if (
      !employeesLoading &&
      !employeesError &&
      selectedEmployeeId &&
      !employeeOptions.some((employee) => employee._id === selectedEmployeeId)
    ) {
      setValue('assignedEmployee', '', { shouldDirty: true, shouldValidate: true });
    }
  }, [employeeOptions, employeesError, employeesLoading, selectedEmployeeId, setValue]);

  const submit: SubmitHandler<TaskFormPayload> = async (payload) => {
    try {
      await onSubmit(payload);
    } catch (reason) {
      for (const fieldError of getApiFieldErrors(reason)) {
        if (fieldError.field && fieldError.field in defaultValues) {
          setError(fieldError.field as FieldPath<TaskFormValues>, {
            type: 'server',
            message: fieldError.message,
          });
        }
      }
      toast.error(getApiErrorMessage(reason));
    }
  };

  function fieldError(name: FieldPath<TaskFormValues>) {
    return errors[name]?.message?.toString();
  }

  function fillSampleData() {
    if (employeesError) {
      toast.error('Sample task data is unavailable because employees could not be loaded.');
      return;
    }
    const start = new Date();
    const startDate = [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, '0'),
      String(start.getDate()).padStart(2, '0'),
    ].join('-');
    const due = new Date(start);
    due.setDate(due.getDate() + 7);
    const dueDate = [
      due.getFullYear(),
      String(due.getMonth() + 1).padStart(2, '0'),
      String(due.getDate()).padStart(2, '0'),
    ].join('-');
    const sampleEmployee = employees.find((employee) =>
      isEligibleForStartDate(employee, startDate),
    );

    if (!sampleEmployee) {
      toast.error('Add or activate an eligible employee before filling a sample task.');
      return;
    }

    clearErrors();
    reset(
      {
        title: 'Prepare a marketing campaign performance report',
        description:
          'Summarize campaign reach, engagement, and conversion results. Highlight key findings and recommended next steps.',
        assignedEmployee: sampleEmployee._id,
        department: sampleEmployee.department,
        priority: 'High',
        startDate,
        dueDate,
      },
      { keepDefaultValues: true },
    );
  }

  const noAvailableEmployees = !employeesLoading && !employeesError && employeeOptions.length === 0;

  return (
    <form
      className="overflow-hidden rounded-xl border border-border bg-white"
      noValidate
      onSubmit={handleSubmit(submit)}
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-primary-text">Task information</h2>
          <p className="mt-1 text-sm text-secondary-text">
            New tasks are created with Todo status. Assignment availability is rechecked by the API.
          </p>
        </div>
        <SampleDataButton
          disabled={employeesLoading}
          label="Auto-fill Sample Task"
          onClick={fillSampleData}
        />
      </div>
      {employeesError && (
        <div className="border-b border-rose-100 bg-rose-50/60 px-5 py-3 sm:px-6">
          <StatePanel
            action={
              <button
                className="inline-flex min-h-9 items-center rounded-lg border border-border bg-white px-3 text-sm font-medium text-primary-text hover:bg-secondary-background"
                onClick={() => setEmployeeRetry((count) => count + 1)}
                type="button"
              >
                Retry
              </button>
            }
            description={employeesError}
            title="Employees could not be loaded"
            variant="error"
          />
        </div>
      )}
      {noAvailableEmployees && (
        <div className="border-b border-amber-100 bg-amber-50/60 px-5 py-3 sm:px-6">
          <p className="text-sm font-medium text-amber-900">No eligible employees are available.</p>
          <p className="mt-1 text-sm text-amber-800">
            Active employees and employees whose leave period does not include the selected start
            date can be assigned.
          </p>
        </div>
      )}
      <div className="grid gap-x-5 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
        <FormField error={fieldError('title')} id="task-title" label="Task title" required>
          <input
            className={inputClass}
            id="task-title"
            maxLength={150}
            placeholder="e.g. Prepare campaign report"
            required
            {...register('title')}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'task-title-error' : undefined}
          />
        </FormField>
        <FormField error={fieldError('assignedEmployee')} id="assignedEmployee" label="Assigned employee" required>
          <select
            className={inputClass}
            disabled={employeesLoading || Boolean(employeesError) || noAvailableEmployees}
            id="assignedEmployee"
            required
            {...register('assignedEmployee')}
            aria-invalid={Boolean(errors.assignedEmployee)}
            aria-describedby={errors.assignedEmployee ? 'assignedEmployee-error' : undefined}
          >
            <option value="">
              {employeesLoading ? 'Loading employees…' : 'Select an employee'}
            </option>
            {employeeOptions.map((employee) => (
              <option key={employee._id} value={employee._id}>
                {employee.fullName} · {employee.employeeId}
                {employee._id === currentEmployeeId && !isEligibleForStartDate(employee, startDate)
                  ? ' · current assignment'
                  : ''}
              </option>
            ))}
          </select>
          {employeesLoading && (
            <span className="sr-only" role="status">
              Loading employees
            </span>
          )}
        </FormField>
        <FormField
          error={fieldError('department')}
          hint="Task department is stored independently by the current API."
          id="task-department"
          label="Department"
          required
        >
          <select
            className={inputClass}
            id="task-department"
            required
            {...register('department')}
            aria-invalid={Boolean(errors.department)}
            aria-describedby={
              errors.department ? 'task-department-error' : 'task-department-hint'
            }
          >
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </FormField>
        <FormField error={fieldError('priority')} id="task-priority" label="Priority" required>
          <select
            className={inputClass}
            id="task-priority"
            required
            {...register('priority')}
            aria-invalid={Boolean(errors.priority)}
            aria-describedby={errors.priority ? 'task-priority-error' : undefined}
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </FormField>
        <FormField error={fieldError('startDate')} id="task-start-date" label="Start date" required>
          <input
            className={inputClass}
            id="task-start-date"
            required
            type="date"
            {...register('startDate')}
            aria-invalid={Boolean(errors.startDate)}
            aria-describedby={errors.startDate ? 'task-start-date-error' : undefined}
          />
        </FormField>
        <FormField error={fieldError('dueDate')} id="task-due-date" label="Due date" required>
          <input
            className={inputClass}
            id="task-due-date"
            required
            type="date"
            {...register('dueDate')}
            aria-invalid={Boolean(errors.dueDate)}
            aria-describedby={errors.dueDate ? 'task-due-date-error' : undefined}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField error={fieldError('description')} id="task-description" label="Description">
            <textarea
              className={`${inputClass} min-h-32 py-2.5`}
              id="task-description"
              maxLength={5000}
              placeholder="Add useful context or acceptance criteria for this task."
              {...register('description')}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? 'task-description-error' : undefined}
            />
          </FormField>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-secondary-text hover:bg-white hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          to={task ? `/tasks/${task._id}` : '/tasks'}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Cancel
        </Link>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || employeesLoading || Boolean(employeesError) || noAvailableEmployees}
          type="submit"
        >
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
