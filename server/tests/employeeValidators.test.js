import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Task from '../src/models/Task.js';
import {
  createEmployeeSchema,
  employeeIdParamsSchema,
  listEmployeesSchema,
  updateEmployeeSchema,
} from '../src/validators/employeeValidators.js';
import { createTaskSchema, updateTaskSchema } from '../src/validators/taskValidators.js';

const validEmployee = {
  employeeId: 'EMP-100',
  fullName: 'Rohit Sharma',
  email: 'ROHIT@example.com',
  phone: '98765-43210',
  department: 'Development',
  role: 'Developer',
  joiningDate: '2024-01-15',
};

describe('employee request schemas', () => {
  it('normalizes email, phone, and date values', () => {
    const result = createEmployeeSchema.parse(validEmployee);

    expect(result.email).toBe('rohit@example.com');
    expect(result.phone).toBe('+919876543210');
    expect(result.joiningDate).toEqual(new Date('2024-01-15T00:00:00.000Z'));
    expect(result.status).toBe('Active');
    expect(result.skills).toEqual([]);
  });

  it.each([
    [{ ...validEmployee, email: 'not-an-email' }, 'email'],
    [{ ...validEmployee, department: 'Marketing' }, 'department'],
    [{ ...validEmployee, status: 'Suspended' }, 'status'],
    [{ ...validEmployee, phone: '1234567890' }, 'phone'],
    [{ ...validEmployee, unexpected: true }, 'unexpected'],
    [{ ...validEmployee, status: 'On Leave' }, 'leaveStart'],
    [
      {
        ...validEmployee,
        status: 'On Leave',
        leaveStart: '2024-02-02',
        leaveEnd: '2024-02-01',
      },
      'leaveEnd',
    ],
  ])('rejects invalid field input (%s)', (input, field) => {
    const result = createEmployeeSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path[0] === field ||
            (issue.code === 'unrecognized_keys' && issue.keys.includes(field)),
        ),
      ).toBe(true);
    }
  });

  it('rejects an empty update and unknown update fields', () => {
    expect(updateEmployeeSchema.safeParse({}).success).toBe(false);
    expect(updateEmployeeSchema.safeParse({ manager: 'Someone' }).success).toBe(false);
  });

  it('validates MongoDB ID parameters and list query limits', () => {
    expect(employeeIdParamsSchema.safeParse({ employeeId: 'not-an-object-id' }).success).toBe(
      false,
    );
    expect(listEmployeesSchema.parse({ page: '2', limit: '25', order: 'asc' })).toMatchObject({
      page: 2,
      limit: 25,
      sortBy: 'createdAt',
      order: 'asc',
    });
    expect(listEmployeesSchema.safeParse({ sortBy: 'email' }).success).toBe(false);
    expect(listEmployeesSchema.safeParse({ page: '0' }).success).toBe(false);
  });
});

describe('Task schema preparation', () => {
  it('accepts its parsed task values when services validate them again', () => {
    const employeeId = new mongoose.Types.ObjectId().toString();
    const parsed = createTaskSchema.parse({
      title: 'Review release',
      department: 'QA',
      startDate: '2024-01-01',
      dueDate: '2024-01-03',
      assignedEmployee: employeeId,
    });
    const reparsed = createTaskSchema.parse(parsed);
    const parsedUpdate = updateTaskSchema.parse({
      startDate: '2024-01-02',
      assignedEmployee: employeeId,
    });

    expect(reparsed.assignedEmployee).toEqual(new mongoose.Types.ObjectId(employeeId));
    expect(reparsed.startDate).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    expect(updateTaskSchema.parse(parsedUpdate)).toEqual(parsedUpdate);
  });

  it('generates unique task IDs and validates its employee reference snapshot', () => {
    const first = new Task({
      title: 'Review release',
      department: 'QA',
      startDate: '2024-01-01',
      dueDate: '2024-01-03',
      employeeSnapshot: {
        employeeId: 'EMP-100',
        fullName: 'Rohit Sharma',
        department: 'QA',
      },
    });
    const second = new Task({
      title: 'Review release',
      department: 'QA',
      startDate: '2024-01-01',
      dueDate: '2024-01-03',
    });

    expect(first.taskId).toMatch(/^TASK-[0-9a-f-]{36}$/i);
    expect(first.taskId).not.toBe(second.taskId);
    expect(first.assignedEmployee).toBeNull();
    expect(first.employeeSnapshot.department).toBe('QA');
    expect(Task.schema.path('assignedEmployee').options.ref).toBe('Employee');
    expect(first.validateSync()).toBeUndefined();
    expect(Task.schema.path('assignedEmployee').instance).toBe('ObjectId');
  });

  it('rejects due dates earlier than start dates', async () => {
    const task = new Task({
      title: 'Invalid dates',
      department: 'Development',
      startDate: '2024-02-02',
      dueDate: '2024-02-01',
    });

    await expect(task.validate()).rejects.toMatchObject({
      errors: { dueDate: expect.anything() },
    });
  });

  describe('Employee route validation', () => {
    const app = createApp('http://localhost:5173');

    it('returns field-specific errors for malformed request bodies and IDs', async () => {
      const invalidBody = await request(app).post('/api/employees').send({});
      const invalidId = await request(app).get('/api/employees/not-an-object-id');

      expect(invalidBody.status).toBe(400);
      expect(invalidBody.body).toMatchObject({
        success: false,
        message: 'Request validation failed',
      });
      expect(invalidBody.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'employeeId' })]),
      );
      expect(invalidId.status).toBe(400);
      expect(invalidId.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'employeeId' })]),
      );
    });

    it('rejects unknown request fields and unsupported list parameters', async () => {
      const unknownField = await request(app)
        .post('/api/employees')
        .send({ ...validEmployee, unexpected: true });
      const unknownSort = await request(app)
        .get('/api/employees')
        .query({ sortBy: 'email' });

      expect(unknownField.status).toBe(400);
      expect(unknownField.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'unexpected' })]),
      );
      expect(unknownSort.status).toBe(400);
    });

    it('returns safe, consistent responses for malformed JSON and unknown routes', async () => {
      const malformedJson = await request(app)
        .post('/api/employees')
        .set('Content-Type', 'application/json')
        .send('{');
      const unknownRoute = await request(app).get('/api/not-found');

      expect(malformedJson.status).toBe(400);
      expect(malformedJson.body).toEqual({
        success: false,
        message: 'Invalid JSON request body',
        errors: [],
      });
      expect(unknownRoute.status).toBe(404);
      expect(unknownRoute.body).toEqual({
        success: false,
        message: 'Route not found',
        errors: [],
      });
    });
  });
});
