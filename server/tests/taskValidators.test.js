import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  createTaskSchema,
  taskIdParamsSchema,
  taskListQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../src/validators/taskValidators.js';
import {
  canTransitionTaskStatus,
  isTaskOverdue,
  utcDateKey,
} from '../src/utils/taskUtils.js';

const validTask = {
  title: 'Prepare payment report',
  department: 'Finance',
  priority: 'High',
  assignedEmployee: '68f000000000000000000001',
  startDate: '2026-10-01',
  dueDate: '2026-10-08',
};

describe('Task request schemas', () => {
  it('rejects invalid departments, priorities, date ranges, and client-owned fields', () => {
    expect(createTaskSchema.safeParse(validTask).success).toBe(false);
    expect(
      createTaskSchema.safeParse({ ...validTask, department: 'Development', priority: 'Urgent' })
        .success,
    ).toBe(false);
    expect(
      createTaskSchema.safeParse({
        ...validTask,
        department: 'Development',
        priority: 'High',
        dueDate: '2026-09-30',
      }).success,
    ).toBe(false);
    expect(
      createTaskSchema.safeParse({
        ...validTask,
        department: 'Development',
        status: 'Completed',
      }).success,
    ).toBe(false);
    expect(
      createTaskSchema.safeParse({
        ...validTask,
        department: 'Development',
        completedDate: '2026-10-02',
      }).success,
    ).toBe(false);
  });

  it('parses date-only input into UTC midnight and applies the default priority', () => {
    const result = createTaskSchema.parse({ ...validTask, department: 'Development' });

    expect(result.startDate.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(result.dueDate.toISOString()).toBe('2026-10-08T00:00:00.000Z');
    expect(result.priority).toBe('High');
  });

  it('rejects invalid employee references and non-editable update fields', () => {
    expect(
      createTaskSchema.safeParse({
        ...validTask,
        department: 'Development',
        assignedEmployee: 'not-an-object-id',
      }).success,
    ).toBe(false);
    expect(createTaskSchema.safeParse({ ...validTask, assignedEmployee: null }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ status: 'Cancelled' }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ completedDate: '2026-10-08' }).success).toBe(false);
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
  });

  it('validates dedicated status updates, IDs, and list query bounds', () => {
    expect(updateTaskStatusSchema.safeParse({ status: 'Completed' }).success).toBe(true);
    expect(updateTaskStatusSchema.safeParse({ status: 'Todo', completedDate: null }).success).toBe(
      false,
    );
    expect(taskIdParamsSchema.safeParse({ taskId: 'invalid' }).success).toBe(false);
    expect(
      taskListQuerySchema.safeParse({
        dueFrom: '2026-10-10',
        dueTo: '2026-10-09',
      }).success,
    ).toBe(false);
    expect(taskListQuerySchema.parse({ overdue: 'true' }).overdue).toBe('true');
    expect(taskListQuerySchema.safeParse({ overdue: 'yes' }).success).toBe(false);
    expect(taskListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(taskListQuerySchema.safeParse({ sortBy: 'employeeSnapshot' }).success).toBe(false);
  });

  it('normalizes the canonical due date and sort query parameters', () => {
    const query = taskListQuerySchema.parse({
      dueDateFrom: '2026-10-01',
      dueDateTo: '2026-10-31',
      sortBy: 'priority',
      sortOrder: 'asc',
      page: '2',
      limit: '25',
    });
    expect(query).toMatchObject({
      sortBy: 'priority',
      sortOrder: 'asc',
      page: 2,
      limit: 25,
    });
    expect(query.dueDateFrom.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(query.dueDateTo.toISOString()).toBe('2026-10-31T00:00:00.000Z');
    expect(taskListQuerySchema.parse({ dueFrom: '2026-10-01', order: 'asc' })).toMatchObject({
      sortOrder: 'asc',
      dueDateFrom: new Date('2026-10-01T00:00:00.000Z'),
    });
    expect(
      taskListQuerySchema.safeParse({
        dueDateFrom: '2026-11-01',
        dueDateTo: '2026-10-31',
      }).success,
    ).toBe(false);
    expect(
      taskListQuerySchema.safeParse({
        dueDateFrom: '2026-10-01',
        dueFrom: '2026-10-02',
      }).success,
    ).toBe(false);
    expect(
      taskListQuerySchema.safeParse({ sortOrder: 'up' }).success,
    ).toBe(false);
  });
});

describe('shared overdue calculation', () => {
  it('uses UTC calendar days and excludes completed or cancelled tasks', () => {
    const now = new Date('2026-10-15T00:30:00.000Z');
    expect(utcDateKey('2026-10-14T23:59:00.000Z')).toBe(Date.UTC(2026, 9, 14));
    expect(isTaskOverdue({ status: 'Todo', dueDate: '2026-10-14' }, now)).toBe(true);
    expect(isTaskOverdue({ status: 'In Progress', dueDate: '2026-10-15' }, now)).toBe(false);
    expect(isTaskOverdue({ status: 'Completed', dueDate: '2026-10-14' }, now)).toBe(false);
    expect(isTaskOverdue({ status: 'Cancelled', dueDate: '2026-10-14' }, now)).toBe(false);
  });

  it.each([
    ['Todo', 'In Progress', true],
    ['Todo', 'Cancelled', true],
    ['Todo', 'Completed', false],
    ['In Progress', 'Completed', true],
    ['In Progress', 'Cancelled', true],
    ['In Progress', 'Todo', false],
    ['Completed', 'Todo', false],
    ['Cancelled', 'In Progress', false],
    ['Todo', 'Todo', false],
  ])('allows only the defined transition %s -> %s', (from, to, allowed) => {
    expect(canTransitionTaskStatus(from, to)).toBe(allowed);
  });
});

describe('Task route request validation', () => {
  const app = createApp('http://localhost:5173');

  it('rejects invalid task fields and protected fields with consistent errors', async () => {
    const invalidDepartment = await request(app)
      .post('/api/tasks')
      .send({ title: 'Task', department: 'Finance', startDate: '2026-10-01', dueDate: '2026-10-02' });
    const protectedUpdate = await request(app)
      .put('/api/tasks/68f000000000000000000001')
      .send({ status: 'Completed' });
    const invalidStatus = await request(app)
      .put('/api/tasks/68f000000000000000000001/status')
      .send({ status: 'Paused' });

    expect(invalidDepartment.status).toBe(400);
    expect(invalidDepartment.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'department' })]),
    );
    expect(protectedUpdate.status).toBe(400);
    expect(protectedUpdate.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'status' })]),
    );
    expect(invalidStatus.status).toBe(400);
  });
});
