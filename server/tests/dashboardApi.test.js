import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Employee from '../src/models/Employee.js';
import Task from '../src/models/Task.js';

const app = createApp('http://localhost:5173');
const testMongoUri =
  process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/roots_management_test';
const databaseName = testMongoUri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/i)?.[1];
const runTag = randomBytes(4).toString('hex');
let databaseAvailable = false;
let employeeId;
const taskIds = [];

if (!databaseName?.endsWith('_test')) {
  console.warn('Dashboard API tests skipped: MONGODB_TEST_URI must target a database ending in _test.');
} else {
  try {
    await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 1500 });
    databaseAvailable = true;
  } catch {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    console.warn('Dashboard API tests skipped: the isolated MongoDB test database is unavailable.');
  }
}

describe.skipIf(!databaseAvailable)('GET /api/dashboard', () => {
  afterAll(async () => {
    if (taskIds.length) await Task.deleteMany({ _id: { $in: taskIds } });
    if (employeeId) await Employee.deleteOne({ _id: employeeId });
    await mongoose.disconnect();
  });

  it('returns metrics, employee workload, and ordered deadline windows', async () => {
    const employee = await Employee.create({
      employeeId: `DASH-${runTag}`,
      fullName: `Dashboard ${runTag}`,
      email: `dashboard-${runTag}@example.com`,
      phone: '+919876543210',
      department: 'Development',
      role: 'Developer',
      joiningDate: new Date('2024-01-15T00:00:00.000Z'),
      status: 'Active',
      skills: [],
    });
    employeeId = employee._id;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dateOffset = (days) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + days);
      return date;
    };
    const dueDate = dateOffset(1);
    const task = await Task.create({
      title: `Dashboard task ${runTag}`,
      department: 'Development',
      priority: 'High',
      status: 'Todo',
      startDate: today,
      dueDate,
      assignedEmployee: employee._id,
      employeeSnapshot: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        department: employee.department,
        role: employee.role,
      },
    });
    taskIds.push(task._id);

    const [laterUpcoming, recentlyCompleted, cancelledUpcoming, outsideWindow] = await Task.create([
      {
        title: `Later upcoming ${runTag}`,
        department: 'Development',
        priority: 'Medium',
        status: 'Todo',
        startDate: today,
        dueDate: dateOffset(3),
        assignedEmployee: employee._id,
      },
      {
        title: `Recently completed ${runTag}`,
        department: 'Development',
        priority: 'Low',
        status: 'Completed',
        startDate: dateOffset(-3),
        dueDate: dateOffset(-1),
        completedDate: today,
        assignedEmployee: employee._id,
      },
      {
        title: `Cancelled upcoming ${runTag}`,
        department: 'Development',
        priority: 'Low',
        status: 'Cancelled',
        startDate: today,
        dueDate: dateOffset(2),
        assignedEmployee: employee._id,
      },
      {
        title: `Outside upcoming window ${runTag}`,
        department: 'Development',
        priority: 'Low',
        status: 'Todo',
        startDate: today,
        dueDate: dateOffset(30),
        assignedEmployee: employee._id,
      },
    ]);
    taskIds.push(laterUpcoming._id, recentlyCompleted._id, cancelledUpcoming._id, outsideWindow._id);

    const response = await request(app).get('/api/dashboard');
    const result = response.body.data;

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(result.totalEmployees).toBeGreaterThanOrEqual(1);
    expect(result.activeEmployees).toBeGreaterThanOrEqual(1);
    expect(result.totalTasks).toBeGreaterThanOrEqual(1);
    expect(result.todoTasks).toBeGreaterThanOrEqual(1);
    expect(result.tasksByDepartment.Development).toBeGreaterThanOrEqual(5);
    expect(result.tasksByPriority.High).toBeGreaterThanOrEqual(1);
    expect(result.completionRate).toBe(
      Math.round((result.completedTasks / result.totalTasks) * 100),
    );
    expect(result.employeeWorkload).toContainEqual(
      expect.objectContaining({
        _id: employee._id.toString(),
        employeeId: employee.employeeId,
        activeTaskCount: 3,
      }),
    );
    expect(result.recentTasks).toContainEqual(
      expect.objectContaining({
        _id: task._id.toString(),
        assignedEmployeeDetails: expect.objectContaining({ fullName: employee.fullName }),
        isOverdue: false,
      }),
    );
    const upcomingIds = result.upcomingDeadlines.map((deadline) => deadline._id);
    expect(upcomingIds).toContain(task._id.toString());
    expect(upcomingIds).toContain(laterUpcoming._id.toString());
    expect(upcomingIds.indexOf(task._id.toString())).toBeLessThan(
      upcomingIds.indexOf(laterUpcoming._id.toString()),
    );
    expect(upcomingIds).not.toContain(cancelledUpcoming._id.toString());
    expect(upcomingIds).not.toContain(outsideWindow._id.toString());
    expect(result.recentDeadlines).toContainEqual(
      expect.objectContaining({
        _id: recentlyCompleted._id.toString(),
        status: 'Completed',
        isOverdue: false,
      }),
    );
  });
});
