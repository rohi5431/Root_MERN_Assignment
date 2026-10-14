import { z } from 'zod';
import { DEPARTMENTS, EMPLOYEE_STATUSES } from '../models/Employee.js';

const dateSchema = z
  .union([z.date(), z.iso.date(), z.iso.datetime()])
  .transform((value) => (value instanceof Date ? value : new Date(value)));

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+91[\s-]?)?[6-9](?:[\s-]?\d){9}$/, {
    message: 'Phone must be a valid Indian mobile number with 10 digits, optionally prefixed by +91',
  })
  .transform((value) => {
    const digits = value.replace(/\D/g, '');
    return `+91${digits.length === 12 ? digits.slice(2) : digits}`;
  });

const employeeFields = {
  employeeId: z.string().trim().min(1).max(30),
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  phone: phoneSchema,
  department: z.enum(DEPARTMENTS),
  role: z.string().trim().min(1).max(100),
  joiningDate: dateSchema,
  status: z.enum(EMPLOYEE_STATUSES),
  skills: z.array(z.string().trim().min(1).max(50)).max(30),
  leaveStart: dateSchema.optional(),
  leaveEnd: dateSchema.optional(),
};

function validateLeaveDates(employee, context) {
  if (employee.status === 'On Leave') {
    if (!employee.leaveStart) {
      context.addIssue({
        code: 'custom',
        path: ['leaveStart'],
        message: 'Leave start date is required when status is On Leave',
      });
    }
    if (!employee.leaveEnd) {
      context.addIssue({
        code: 'custom',
        path: ['leaveEnd'],
        message: 'Leave end date is required when status is On Leave',
      });
    }
    if (employee.leaveStart && employee.leaveEnd && employee.leaveEnd < employee.leaveStart) {
      context.addIssue({
        code: 'custom',
        path: ['leaveEnd'],
        message: 'Leave end date cannot be earlier than leave start date',
      });
    }
  }
}

export const createEmployeeSchema = z
  .object({
    ...employeeFields,
    status: employeeFields.status.default('Active'),
    skills: employeeFields.skills.default([]),
  })
  .strict()
  .superRefine(validateLeaveDates);

export const updateEmployeeSchema = z
  .object({
    employeeId: employeeFields.employeeId.optional(),
    fullName: employeeFields.fullName.optional(),
    email: employeeFields.email.optional(),
    phone: employeeFields.phone.optional(),
    department: employeeFields.department.optional(),
    role: employeeFields.role.optional(),
    joiningDate: employeeFields.joiningDate.optional(),
    status: employeeFields.status.optional(),
    skills: employeeFields.skills.optional(),
    leaveStart: employeeFields.leaveStart,
    leaveEnd: employeeFields.leaveEnd,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one employee field must be provided',
  })
  .superRefine((employee, context) => {
    if (employee.leaveStart && employee.leaveEnd && employee.leaveEnd < employee.leaveStart) {
      context.addIssue({
        code: 'custom',
        path: ['leaveEnd'],
        message: 'Leave end date cannot be earlier than leave start date',
      });
    }
  });

export const listEmployeesSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    department: z.enum(DEPARTMENTS).optional(),
    status: z.enum(EMPLOYEE_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z
      .enum(['fullName', 'employeeId', 'joiningDate', 'createdAt', 'department'])
      .default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export const employeeIdParamsSchema = z
  .object({
    employeeId: z.string().regex(/^[\da-f]{24}$/i, 'Invalid employee ID'),
  })
  .strict();
