import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Employee from '../src/models/Employee.js';
import Task from '../src/models/Task.js';

const app = createApp(process.env.CLIENT_URL ?? 'http://localhost:5173');
const testMongoUri =
  process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/roots_management_test';
const databaseName = testMongoUri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/i)?.[1];
const runTag = randomBytes(4).toString('hex');
const createdTaskIds = [];
const createdEmployeeIds = [];
let databaseAvailable = false;
let sequence = 0;

function employeePayload(overrides = {}) {
  const id = ++sequence;
  return {
    employeeId: `PH3-${runTag}-${id}`,
    fullName: `Phase Three ${runTag} Person ${id}`,
    email: `ph3-${runTag}-${id}@example.com`,
    phone: '9876543210',
    department: 'Development',
    role: 'Developer',
    joiningDate: '2024-01-15',
    ...overrides,
  };
}

async function createEmployee(overrides = {}) {
  const response = await request(app).post('/api/employees').send(employeePayload(overrides));
  if (response.status === 201) createdEmployeeIds.push(response.body.data._id);
  return response;
}

function taskPayload(employeeId, overrides = {}) {
  return {
    title: `Task ${runTag} ${sequence}`,
    description: 'Phase 3 business rule test',
    department: 'Development',
    priority: 'Medium',
    startDate: '2026-11-10',
    dueDate: '2026-11-12',
    ...(employeeId !== undefined && { assignedEmployee: employeeId }),
    ...overrides,
  };
}

async function createTask(employeeId, overrides = {}) {
  const response = await request(app)
    .post('/api/tasks')
    .send(taskPayload(employeeId, overrides));
  if (response.status === 201) createdTaskIds.push(response.body.data._id);
  return response;
}

let transactionSupported = false;
if (!databaseName?.endsWith('_test')) {
  console.warn('Task API tests skipped: MONGODB_TEST_URI must target a database ending in _test.');
} else {
  try {
    await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 1500 });
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(() => Employee.findOne({}).session(session));
      transactionSupported = true;
    } finally {
      await session.endSession();
    }
    await Promise.all([Employee.init(), Task.init()]);
    databaseAvailable = transactionSupported;
  } catch {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    console.warn(
      'Task API tests skipped: MongoDB must be available as a replica set or transaction-capable deployment.',
    );
  }
}

describe.skipIf(!databaseAvailable)('Task API business rules', () => {
  beforeAll(() => {
    if (!mongoose.connection.db?.databaseName.endsWith('_test')) {
      throw new Error('Integration tests require an isolated database name ending in _test');
    }
  });

  afterAll(async () => {
    if (createdTaskIds.length) await Task.deleteMany({ _id: { $in: createdTaskIds } });
    if (createdEmployeeIds.length) {
      await Employee.deleteMany({ _id: { $in: createdEmployeeIds } });
    }
    await mongoose.disconnect();
  });

  it('creates Todo tasks and rejects missing fields, client status, and client completion dates', async () => {
    const employee = await createEmployee();
    const created = await createTask(employee.body.data._id, {
      status: 'Completed',
      completedDate: '2026-11-11',
    });
    const valid = await createTask(employee.body.data._id);
    const missing = await request(app).post('/api/tasks').send({});

    expect(created.status).toBe(400);
    expect(valid.status).toBe(201);
    expect(valid.body.data.status).toBe('Todo');
    expect(valid.body.data.completedDate).toBeUndefined();
    expect(valid.body.data.employeeSnapshot).toMatchObject({
      employeeId: employee.body.data.employeeId,
      fullName: employee.body.data.fullName,
      department: 'Development',
    });
    expect(missing.status).toBe(400);
  });

  it('rejects invalid employee ObjectIds and missing employees', async () => {
    const invalidId = await createTask('not-an-object-id');
    const missingEmployee = await createTask(new mongoose.Types.ObjectId().toString());

    expect(invalidId.status).toBe(400);
    expect(missingEmployee.status).toBe(404);
  });

  it('rejects inactive employees and leave-period start dates at both inclusive boundaries', async () => {
    const inactive = await createEmployee({ status: 'Inactive' });
    const leave = await createEmployee({
      status: 'On Leave',
      leaveStart: '2026-11-10',
      leaveEnd: '2026-11-12',
    });
    const inactiveTask = await createTask(inactive.body.data._id);
    const firstLeaveDay = await createTask(leave.body.data._id, { startDate: '2026-11-10' });
    const lastLeaveDay = await createTask(leave.body.data._id, { startDate: '2026-11-12' });
    const beforeLeave = await createTask(leave.body.data._id, { startDate: '2026-11-09' });
    const afterLeave = await createTask(leave.body.data._id, {
      startDate: '2026-11-13',
      dueDate: '2026-11-15',
    });

    expect(inactiveTask.status).toBe(400);
    expect(firstLeaveDay.status).toBe(400);
    expect(lastLeaveDay.status).toBe(400);
    expect(beforeLeave.status).toBe(201);
    expect(afterLeave.status).toBe(201);
  });

  it('rejects due dates earlier than start dates', async () => {
    const employee = await createEmployee();
    const response = await createTask(employee.body.data._id, {
      startDate: '2026-11-11',
      dueDate: '2026-11-10',
    });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'dueDate' })]),
    );
  });

  it('retrieves and edits an active task without changing protected fields', async () => {
    const created = await createTask();
    const fetched = await request(app).get(`/api/tasks/${created.body.data._id}`);
    const updated = await request(app)
      .put(`/api/tasks/${created.body.data._id}`)
      .send({ title: 'Revised task title', description: 'Updated details' });

    expect(fetched.status).toBe(200);
    expect(fetched.body.data._id).toBe(created.body.data._id);
    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe('Revised task title');
    expect(updated.body.data.status).toBe('Todo');
    expect(updated.body.data.completedDate).toBeUndefined();
    expect(typeof fetched.body.data.isOverdue).toBe('boolean');
    const listed = await request(app)
      .get('/api/tasks')
      .query({ search: updated.body.data.title });
    expect(typeof listed.body.data[0].isOverdue).toBe('boolean');
  });

  it('allows three active tasks and rejects the fourth', async () => {
    const employee = await createEmployee();
    const results = await Promise.all([
      createTask(employee.body.data._id),
      createTask(employee.body.data._id),
      createTask(employee.body.data._id),
      createTask(employee.body.data._id),
    ]);

    expect(results.filter((result) => result.status === 201)).toHaveLength(3);
    expect(results.filter((result) => result.status === 400)).toHaveLength(1);
  });

  it('releases capacity for completed and cancelled tasks', async () => {
    const employee = await createEmployee();
    const tasks = await Promise.all([
      createTask(employee.body.data._id),
      createTask(employee.body.data._id),
      createTask(employee.body.data._id),
    ]);
    const started = await request(app)
      .put(`/api/tasks/${tasks[0].body.data._id}/status`)
      .send({ status: 'In Progress' });
    const completed = await request(app)
      .put(`/api/tasks/${tasks[0].body.data._id}/status`)
      .send({ status: 'Completed' });
    const replacementAfterCompletion = await createTask(employee.body.data._id);
    const cancelled = await request(app)
      .put(`/api/tasks/${tasks[1].body.data._id}/status`)
      .send({ status: 'Cancelled' });
    const replacementAfterCancellation = await createTask(employee.body.data._id);

    expect(tasks.every((result) => result.status === 201)).toBe(true);
    expect(started.status).toBe(200);
    expect(completed.status).toBe(200);
    expect(completed.body.data.completedDate).toBeDefined();
    expect(replacementAfterCompletion.status).toBe(201);
    expect(cancelled.status).toBe(200);
    expect(replacementAfterCancellation.status).toBe(201);
  });

  it('enforces capacity during reassignment and permits reassignment without self-counting', async () => {
    const source = await createEmployee();
    const target = await createEmployee();
    const targetTasks = await Promise.all([
      createTask(target.body.data._id),
      createTask(target.body.data._id),
      createTask(target.body.data._id),
    ]);
    const sourceTask = await createTask(source.body.data._id);
    const rejected = await request(app)
      .put(`/api/tasks/${sourceTask.body.data._id}`)
      .send({ assignedEmployee: target.body.data._id });
    const sourceSecond = await createTask(source.body.data._id);
    const sameEmployee = await request(app)
      .put(`/api/tasks/${sourceTask.body.data._id}`)
      .send({ assignedEmployee: source.body.data._id, title: 'Updated title' });

    expect(targetTasks.every((result) => result.status === 201)).toBe(true);
    expect(rejected.status).toBe(400);
    expect(sourceSecond.status).toBe(201);
    expect(sameEmployee.status).toBe(200);
  });

  it('allows reassignment to an eligible employee and refreshes the employee snapshot', async () => {
    const source = await createEmployee();
    const target = await createEmployee({ department: 'Design', role: 'Designer' });
    const task = await createTask(source.body.data._id);
    const reassigned = await request(app)
      .put(`/api/tasks/${task.body.data._id}`)
      .send({ assignedEmployee: target.body.data._id });

    expect(reassigned.status).toBe(200);
    expect(reassigned.body.data.assignedEmployee.toString()).toBe(target.body.data._id);
    expect(reassigned.body.data.employeeSnapshot).toMatchObject({
      employeeId: target.body.data.employeeId,
      fullName: target.body.data.fullName,
      department: 'Design',
    });
  });

  it('prevents concurrent assignments from oversubscribing employee capacity', async () => {
    const employee = await createEmployee();
    await createTask(employee.body.data._id);
    await createTask(employee.body.data._id);
    const attempts = await Promise.all([
      createTask(employee.body.data._id),
      createTask(employee.body.data._id),
    ]);

    expect(attempts.filter((result) => result.status === 201)).toHaveLength(1);
    expect(attempts.filter((result) => result.status === 400)).toHaveLength(1);
    expect(
      await Task.countDocuments({
        assignedEmployee: employee.body.data._id,
        status: { $in: ['Todo', 'In Progress'] },
      }),
    ).toBe(3);
  });

  it('enforces allowed transitions, rejects same/invalid transitions, and sets completion time on the backend', async () => {
    const todo = await createTask();
    const forbiddenCompletion = await request(app)
      .put(`/api/tasks/${todo.body.data._id}/status`)
      .send({ status: 'Completed' });
    const started = await request(app)
      .put(`/api/tasks/${todo.body.data._id}/status`)
      .send({ status: 'In Progress' });
    const sameStatus = await request(app)
      .put(`/api/tasks/${todo.body.data._id}/status`)
      .send({ status: 'In Progress' });
    const completed = await request(app)
      .put(`/api/tasks/${todo.body.data._id}/status`)
      .send({ status: 'Completed', completedDate: '2000-01-01' });
    const reopen = await request(app)
      .put(`/api/tasks/${todo.body.data._id}/status`)
      .send({ status: 'Todo' });

    expect(forbiddenCompletion.status).toBe(400);
    expect(started.status).toBe(200);
    expect(sameStatus.status).toBe(400);
    expect(completed.status).toBe(400);
    const validCompletion = await request(app)
      .put(`/api/tasks/${todo.body.data._id}/status`)
      .send({ status: 'Completed' });

    expect(validCompletion.status).toBe(200);
    expect(new Date(validCompletion.body.data.completedDate).getUTCFullYear()).toBeGreaterThan(2000);
    expect(reopen.status).toBe(400);
  });

  it('prevents edits or status changes through the regular edit endpoint', async () => {
    const task = await createTask();
    const directStatus = await request(app)
      .put(`/api/tasks/${task.body.data._id}`)
      .send({ status: 'Cancelled' });
    const complete = await request(app)
      .put(`/api/tasks/${task.body.data._id}/status`)
      .send({ status: 'In Progress' });
    const finish = await request(app)
      .put(`/api/tasks/${task.body.data._id}/status`)
      .send({ status: 'Completed' });
    const terminalEdit = await request(app)
      .put(`/api/tasks/${task.body.data._id}`)
      .send({ title: 'Cannot edit' });

    expect(directStatus.status).toBe(400);
    expect(complete.status).toBe(200);
    expect(finish.status).toBe(200);
    expect(terminalEdit.status).toBe(400);
  });

  it('rejects invalid transitions from In Progress and Cancelled', async () => {
    const inProgressTask = await createTask();
    const started = await request(app)
      .put(`/api/tasks/${inProgressTask.body.data._id}/status`)
      .send({ status: 'In Progress' });
    const backToTodo = await request(app)
      .put(`/api/tasks/${inProgressTask.body.data._id}/status`)
      .send({ status: 'Todo' });
    const cancelled = await request(app)
      .put(`/api/tasks/${inProgressTask.body.data._id}/status`)
      .send({ status: 'Cancelled' });
    const reopenCancelled = await request(app)
      .put(`/api/tasks/${inProgressTask.body.data._id}/status`)
      .send({ status: 'In Progress' });

    expect(started.status).toBe(200);
    expect(backToTodo.status).toBe(400);
    expect(cancelled.status).toBe(200);
    expect(reopenCancelled.status).toBe(400);
  });

  it('protects employees from active-task deletion and preserves snapshots on historic tasks', async () => {
    const employee = await createEmployee();
    const activeTask = await createTask(employee.body.data._id);
    const blocked = await request(app).delete(`/api/employees/${employee.body.data._id}`);
    const cancelled = await request(app)
      .put(`/api/tasks/${activeTask.body.data._id}/status`)
      .send({ status: 'Cancelled' });
    await Task.updateOne(
      { _id: activeTask.body.data._id },
      { $unset: { employeeSnapshot: 1 } },
    );
    const deleted = await request(app).delete(`/api/employees/${employee.body.data._id}`);
    const historic = await Task.findById(activeTask.body.data._id);

    expect(blocked.status).toBe(400);
    expect(cancelled.status).toBe(200);
    expect(deleted.status).toBe(200);
    expect(historic.employeeSnapshot).toMatchObject({
      employeeId: employee.body.data.employeeId,
      fullName: employee.body.data.fullName,
      department: 'Development',
    });
  });

  it('serializes assignment against employee deletion', async () => {
    const employee = await createEmployee();
    const [deletion, assignment] = await Promise.all([
      request(app).delete(`/api/employees/${employee.body.data._id}`),
      createTask(employee.body.data._id),
    ]);

    expect(
      (deletion.status === 200 && assignment.status === 404) ||
        (deletion.status === 400 && assignment.status === 201),
    ).toBe(true);
  });

  it('searches title and assigned employee name', async () => {
    const employee = await createEmployee();
    const title = `UniqueTitle-${runTag}`;
    const task = await createTask(employee.body.data._id, { title });
    const byTitle = await request(app).get('/api/tasks').query({ search: title });
    const byEmployee = await request(app)
      .get('/api/tasks')
      .query({ search: employee.body.data.fullName });

    expect(task.status).toBe(201);
    expect(byTitle.body.data.some((item) => item._id === task.body.data._id)).toBe(true);
    expect(byEmployee.body.data.some((item) => item._id === task.body.data._id)).toBe(true);
  });

  it('rechecks eligibility when an active task is reassigned or its start date changes', async () => {
    const active = await createEmployee();
    const inactive = await createEmployee({ status: 'Inactive' });
    const leave = await createEmployee({
      status: 'On Leave',
      leaveStart: '2026-11-10',
      leaveEnd: '2026-11-12',
    });
    const task = await createTask(active.body.data._id, {
      startDate: '2026-11-13',
      dueDate: '2026-11-15',
    });
    const inactiveReassignment = await request(app)
      .put(`/api/tasks/${task.body.data._id}`)
      .send({ assignedEmployee: inactive.body.data._id });
    const leavePeriodAssignment = await request(app)
      .put(`/api/tasks/${task.body.data._id}`)
      .send({ assignedEmployee: leave.body.data._id, startDate: '2026-11-11' });
    const validLeaveAssignment = await request(app)
      .put(`/api/tasks/${task.body.data._id}`)
      .send({ assignedEmployee: leave.body.data._id });
    const leaveDateUpdate = await request(app)
      .put(`/api/tasks/${task.body.data._id}`)
      .send({ startDate: '2026-11-11' });

    expect(inactiveReassignment.status).toBe(400);
    expect(leavePeriodAssignment.status).toBe(400);
    expect(validLeaveAssignment.status).toBe(200);
    expect(leaveDateUpdate.status).toBe(400);
  });

  it('combines filters, sorts by due date and priority, and returns pagination metadata', async () => {
    const marker = `List-${runTag}`;
    const low = await createTask(undefined, {
      title: `${marker} Low`,
      priority: 'Low',
      startDate: '2026-11-10',
      dueDate: '2026-11-15',
    });
    const critical = await createTask(undefined, {
      title: `${marker} Critical`,
      priority: 'Critical',
      startDate: '2026-11-10',
      dueDate: '2026-11-11',
      department: 'QA',
    });
    const byPriority = await request(app)
      .get('/api/tasks')
      .query({ search: marker, sortBy: 'priority', sortOrder: 'asc', page: 1, limit: 1 });
    const byDate = await request(app)
      .get('/api/tasks')
      .query({ search: marker, department: 'QA', priority: 'Critical', sortBy: 'dueDate' });

    expect(low.status).toBe(201);
    expect(critical.status).toBe(201);
    expect(byPriority.body.data[0]._id).toBe(critical.body.data._id);
    expect(byPriority.body.pagination).toEqual({
      currentPage: 1,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
    });
    expect(byDate.body.data).toHaveLength(1);
    expect(byDate.body.data[0]._id).toBe(critical.body.data._id);

    for (const sortBy of ['createdAt', 'dueDate', 'priority', 'title']) {
      const sorted = await request(app)
        .get('/api/tasks')
        .query({ search: marker, sortBy, order: 'asc' });
      expect(sorted.status).toBe(200);
    }
    const byDueDateRange = await request(app)
      .get('/api/tasks')
      .query({ search: marker, dueDateFrom: '2026-11-11', dueDateTo: '2026-11-11' });
    expect(byDueDateRange.body.data).toHaveLength(1);
  });

  it('exports every filtered task across pages with safe CSV escaping', async () => {
    const marker = `CsvExport-${runTag}`;
    for (let index = 0; index < 11; index += 1) {
      const task = await createTask(undefined, {
        title: `${marker} ${index}`,
        description:
          index === 0 ? '=HYPERLINK("https://example.com")\nA, "quoted" line' : 'Export fixture',
      });
      expect(task.status).toBe(201);
    }

    const response = await request(app)
      .get('/api/tasks/export/csv')
      .query({ search: marker, page: 2, limit: 1 });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(/tasks-export-\d{4}-\d{2}-\d{2}\.csv/);
    expect((response.text.match(new RegExp(marker, 'g')) ?? []).length).toBe(11);
    expect(response.text).toContain('"\'=HYPERLINK(""https://example.com"")\nA, ""quoted"" line"');
  });

  it('returns 400 for invalid task IDs and query parameters and 404 for missing task IDs', async () => {
    const invalidId = await request(app).get('/api/tasks/not-an-id');
    const missing = await request(app).get(`/api/tasks/${new mongoose.Types.ObjectId()}`);
    const invalidQuery = await request(app).get('/api/tasks').query({ order: 'random' });

    expect(invalidId.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(invalidQuery.status).toBe(400);
  });
});
