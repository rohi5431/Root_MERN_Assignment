import { z } from 'zod';
import mongoose from 'mongoose';
import { DEPARTMENTS } from '../models/Employee.js';
import { TASK_PRIORITIES, TASK_STATUSES } from '../models/Task.js';

const dateOnlySchema = z.union([
  z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`)),
  z.date(),
]);

function objectIdSchema(fieldName) {
  return z
    .union([z.string(), z.instanceof(mongoose.Types.ObjectId)])
    .refine((value) => mongoose.isValidObjectId(value), `Invalid ${fieldName}`)
    .transform((value) =>
      value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value),
    );
}

const requiredTaskFields = {
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(5000).optional().default(''),
  assignedEmployee: objectIdSchema('assigned employee ID').nullable().optional(),
  department: z.enum(DEPARTMENTS),
  priority: z.enum(TASK_PRIORITIES).default('Medium'),
  startDate: dateOnlySchema,
  dueDate: dateOnlySchema,
};

function validateDateRange(task, context) {
  if (task.startDate && task.dueDate && task.dueDate < task.startDate) {
    context.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message: 'Due date cannot be earlier than start date',
    });
  }
}

export const createTaskSchema = z
  .object(requiredTaskFields)
  .strict()
  .superRefine(validateDateRange);

export const updateTaskSchema = z
  .object({
    title: requiredTaskFields.title.optional(),
    description: z.string().trim().max(5000).optional(),
    assignedEmployee: objectIdSchema('assigned employee ID').nullable().optional(),
    department: z.enum(DEPARTMENTS).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    startDate: dateOnlySchema.optional(),
    dueDate: dateOnlySchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one editable task field must be provided',
  })
  .superRefine(validateDateRange);

export const updateTaskStatusSchema = z
  .object({
    status: z.enum(TASK_STATUSES),
  })
  .strict();

const taskListQueryInputSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    department: z.enum(DEPARTMENTS).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueDateFrom: dateOnlySchema.optional(),
    dueDateTo: dateOnlySchema.optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    dueFrom: dateOnlySchema.optional(),
    dueTo: dateOnlySchema.optional(),
    order: z.enum(['asc', 'desc']).optional(),
    overdue: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'title']).default('createdAt'),
  })
  .strict()
  .refine(
    (query) =>
      !query.dueDateFrom ||
      !query.dueFrom ||
      query.dueDateFrom.getTime() === query.dueFrom.getTime(),
    {
      path: ['dueDateFrom'],
      message: 'Conflicting due date start parameters',
    },
  )
  .refine(
    (query) =>
      !query.dueDateTo ||
      !query.dueTo ||
      query.dueDateTo.getTime() === query.dueTo.getTime(),
    {
      path: ['dueDateTo'],
      message: 'Conflicting due date end parameters',
    },
  )
  .refine((query) => !query.order || !query.sortOrder || query.order === query.sortOrder, {
    path: ['sortOrder'],
    message: 'Conflicting sort direction parameters',
  })
  .transform(({ dueDateFrom, dueDateTo, dueFrom, dueTo, order, sortOrder, ...query }) => ({
    ...query,
    dueDateFrom: dueDateFrom ?? dueFrom,
    dueDateTo: dueDateTo ?? dueTo,
    sortOrder: sortOrder ?? order ?? 'desc',
  }))
  .refine(
    (query) =>
      !query.dueDateFrom || !query.dueDateTo || query.dueDateFrom <= query.dueDateTo,
    {
      path: ['dueDateTo'],
      message: 'Due date start cannot be later than due date end',
    },
  );

export const taskListQuerySchema = taskListQueryInputSchema;

export const taskIdParamsSchema = z
  .object({
    taskId: z.string().refine((value) => mongoose.isValidObjectId(value), 'Invalid task ID'),
  })
  .strict();
