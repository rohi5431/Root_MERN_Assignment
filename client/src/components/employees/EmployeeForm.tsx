import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react';
import { useMemo } from 'react';
import { useForm, type FieldPath, type SubmitHandler } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { getApiErrorMessage, getApiFieldErrors } from '../../services/api';
import type { Employee, EmployeePayload } from '../../types/api';
import { FormField } from '../ui/FormField';
import { SampleDataButton } from '../ui/SampleDataButton';

const departments = ['Development', 'Design', 'QA', 'HR', 'Sales'] as const;
const statuses = ['Active', 'Inactive', 'On Leave'] as const;

const dateField = z.string().min(1, 'This date is required').pipe(z.iso.date());
const employeeFormSchema = z
  .object({
    employeeId: z.string().trim().min(1, 'Employee ID is required').max(30),
    fullName: z.string().trim().min(1, 'Full name is required').max(100),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .pipe(z.email('Enter a valid email address').max(254))
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(
        /^(?:\+91[\s-]?)?[6-9](?:[\s-]?\d){9}$/,
        'Enter a valid 10-digit Indian mobile number, optionally prefixed with +91',
      ),
    department: z.enum(departments),
    role: z.string().trim().min(1, 'Role is required').max(100),
    joiningDate: dateField,
    status: z.enum(statuses),
    skillsText: z.string().max(1600, 'Skills must be 30 items or fewer'),
    leaveStart: z.string(),
    leaveEnd: z.string(),
  })
  .superRefine((values, context) => {
    const skills = values.skillsText
      .split(/[,\n]/)
      .map((skill) => skill.trim())
      .filter(Boolean);
    if (skills.length > 30) {
      context.addIssue({
        code: 'custom',
        path: ['skillsText'],
        message: 'A maximum of 30 skills is allowed',
      });
    }
    if (skills.some((skill) => skill.length > 50)) {
      context.addIssue({
        code: 'custom',
        path: ['skillsText'],
        message: 'Each skill must be 50 characters or fewer',
      });
    }
    if (values.status !== 'On Leave') return;
    const startIsValid = z.iso.date().safeParse(values.leaveStart).success;
    const endIsValid = z.iso.date().safeParse(values.leaveEnd).success;
    if (!startIsValid) {
      context.addIssue({
        code: 'custom',
        path: ['leaveStart'],
        message: 'A valid leave start date is required',
      });
    }
    if (!endIsValid) {
      context.addIssue({
        code: 'custom',
        path: ['leaveEnd'],
        message: 'A valid leave end date is required',
      });
    }
    if (startIsValid && endIsValid && values.leaveEnd < values.leaveStart) {
      context.addIssue({
        code: 'custom',
        path: ['leaveEnd'],
        message: 'Leave end date cannot be earlier than leave start date',
      });
    }
  })
  .transform((values): EmployeePayload => {
    const phoneDigits = values.phone.replace(/[\s-]/g, '');
    const phone = phoneDigits.startsWith('+91') ? phoneDigits : `+91${phoneDigits}`;
    const payload: EmployeePayload = {
      employeeId: values.employeeId.trim(),
      fullName: values.fullName.trim(),
      email: values.email.toLowerCase(),
      phone,
      department: values.department,
      role: values.role.trim(),
      joiningDate: values.joiningDate,
      status: values.status,
      skills: values.skillsText
        .split(/[,\n]/)
        .map((skill) => skill.trim())
        .filter(Boolean),
    };
    if (values.status === 'On Leave') {
      payload.leaveStart = values.leaveStart;
      payload.leaveEnd = values.leaveEnd;
    }
    return payload;
  });

type EmployeeFormValues = z.input<typeof employeeFormSchema>;
type EmployeeFormPayload = z.output<typeof employeeFormSchema>;

interface EmployeeFormProps {
  employee?: Employee;
  submitLabel: string;
  onSubmit: (payload: EmployeeFormPayload) => Promise<void>;
}

const inputClass =
  'min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-primary-text shadow-sm outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:ring-rose-500/20';

export function EmployeeForm({
  employee,
  submitLabel,
  onSubmit,
}: EmployeeFormProps) {
  const defaultValues = useMemo<EmployeeFormValues>(
    () => ({
      employeeId: employee?.employeeId ?? '',
      fullName: employee?.fullName ?? '',
      email: employee?.email ?? '',
      phone: employee?.phone ?? '',
      department: employee?.department ?? 'Development',
      role: employee?.role ?? '',
      joiningDate: employee?.joiningDate ? employee.joiningDate.slice(0, 10) : '',
      status: employee?.status ?? 'Active',
      skillsText: employee?.skills.join(', ') ?? '',
      leaveStart: employee?.leaveStart?.slice(0, 10) ?? '',
      leaveEnd: employee?.leaveEnd?.slice(0, 10) ?? '',
    }),
    [employee],
  );
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues, unknown, EmployeeFormPayload>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });
  const status = watch('status');

  const submit: SubmitHandler<EmployeeFormPayload> = async (payload) => {
    try {
      await onSubmit(payload);
    } catch (error) {
      for (const fieldError of getApiFieldErrors(error)) {
        if (
          fieldError.field &&
          fieldError.field in defaultValues &&
          fieldError.field !== 'skills'
        ) {
          setError(fieldError.field as FieldPath<EmployeeFormValues>, {
            type: 'server',
            message: fieldError.message,
          });
        }
      }
      toast.error(getApiErrorMessage(error));
    }
  };

  function fieldError(name: FieldPath<EmployeeFormValues>) {
    return errors[name]?.message?.toString();
  }

  function fillSampleData() {
    const timestamp = Date.now();
    const today = new Date();
    const joiningDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    const phoneDigits = `9${String(timestamp % 1_000_000_000).padStart(9, '0')}`;
    const uniqueSuffix = timestamp.toString(36);

    reset(
      {
        employeeId: `DEMO-${uniqueSuffix.toUpperCase()}`,
        fullName: 'Jordan Sample',
        email: `jordan.sample.${uniqueSuffix}@example.com`,
        phone: `+91 ${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5)}`,
        department: 'Design',
        role: 'Marketing Coordinator',
        joiningDate,
        status: 'Active',
        skillsText: 'Content strategy, Campaign planning, Analytics',
        leaveStart: '',
        leaveEnd: '',
      },
      { keepDefaultValues: true },
    );
  }

  return (
    <form
      className="overflow-hidden rounded-xl border border-border bg-white"
      noValidate
      onSubmit={handleSubmit(submit)}
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-primary-text">Employee information</h2>
          <p className="mt-1 text-sm text-secondary-text">
            Complete the employee details below. Fields marked as required must be provided.
          </p>
        </div>
        <SampleDataButton label="Auto-fill Sample Employee" onClick={fillSampleData} />
      </div>
      <div className="grid gap-x-5 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
        <FormField error={fieldError('employeeId')} id="employeeId" label="Employee ID" required>
          <input
            autoComplete="off"
            className={inputClass}
            id="employeeId"
            maxLength={30}
            placeholder="e.g. EMP-1001"
            required
            {...register('employeeId')}
            aria-invalid={Boolean(errors.employeeId)}
            aria-describedby={errors.employeeId ? 'employeeId-error' : undefined}
          />
        </FormField>
        <FormField error={fieldError('fullName')} id="fullName" label="Full name" required>
          <input
            autoComplete="name"
            className={inputClass}
            id="fullName"
            maxLength={100}
            placeholder="Employee full name"
            required
            {...register('fullName')}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          />
        </FormField>
        <FormField error={fieldError('email')} id="email" label="Email address" required>
          <input
            autoComplete="email"
            className={inputClass}
            id="email"
            placeholder="name@example.com"
            required
            type="email"
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </FormField>
        <FormField
          error={fieldError('phone')}
          hint="Use an Indian mobile number, with or without the +91 prefix."
          id="phone"
          label="Phone"
          required
        >
          <input
            autoComplete="tel"
            className={inputClass}
            id="phone"
            placeholder="+91 98765 43210"
            required
            type="tel"
            {...register('phone')}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
          />
        </FormField>
        <FormField error={fieldError('role')} id="role" label="Role" required>
          <input
            className={inputClass}
            id="role"
            maxLength={100}
            placeholder="e.g. Software Developer"
            required
            {...register('role')}
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? 'role-error' : undefined}
          />
        </FormField>
        <FormField error={fieldError('department')} id="department" label="Department" required>
          <select
            className={inputClass}
            id="department"
            required
            {...register('department')}
            aria-invalid={Boolean(errors.department)}
            aria-describedby={errors.department ? 'department-error' : undefined}
          >
            {departments.map((departmentOption) => (
              <option key={departmentOption} value={departmentOption}>
                {departmentOption}
              </option>
            ))}
          </select>
        </FormField>
        <FormField error={fieldError('joiningDate')} id="joiningDate" label="Joining date" required>
          <input
            className={inputClass}
            id="joiningDate"
            required
            type="date"
            {...register('joiningDate')}
            aria-invalid={Boolean(errors.joiningDate)}
            aria-describedby={errors.joiningDate ? 'joiningDate-error' : undefined}
          />
        </FormField>
        <FormField error={fieldError('status')} id="status" label="Status" required>
          <select
            className={inputClass}
            id="status"
            required
            {...register('status')}
            aria-invalid={Boolean(errors.status)}
            aria-describedby={errors.status ? 'status-error' : undefined}
          >
            {statuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
        </FormField>
        {status === 'On Leave' && (
          <>
            <FormField
              error={fieldError('leaveStart')}
              id="leaveStart"
              label="Leave start date"
              required
            >
              <input
                className={inputClass}
                id="leaveStart"
                required
                type="date"
                {...register('leaveStart')}
                aria-invalid={Boolean(errors.leaveStart)}
                aria-describedby={errors.leaveStart ? 'leaveStart-error' : undefined}
              />
            </FormField>
            <FormField
              error={fieldError('leaveEnd')}
              id="leaveEnd"
              label="Leave end date"
              required
            >
              <input
                className={inputClass}
                id="leaveEnd"
                required
                type="date"
                {...register('leaveEnd')}
                aria-invalid={Boolean(errors.leaveEnd)}
                aria-describedby={errors.leaveEnd ? 'leaveEnd-error' : undefined}
              />
            </FormField>
          </>
        )}
        <div className="sm:col-span-2">
          <FormField
            error={fieldError('skillsText')}
            hint="Separate multiple skills with commas or new lines, up to 30."
            id="skillsText"
            label="Skills"
          >
            <textarea
              className={`${inputClass} min-h-24 py-2.5`}
              id="skillsText"
              placeholder="React, TypeScript, API design"
              {...register('skillsText')}
              aria-invalid={Boolean(errors.skillsText)}
              aria-describedby={errors.skillsText ? 'skillsText-error' : 'skillsText-hint'}
            />
          </FormField>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-secondary-text hover:bg-white hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          to={employee ? `/employees/${employee._id}` : '/employees'}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Cancel
        </Link>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
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
