import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import Employee from '../src/models/Employee.js';

const app = createApp(process.env.CLIENT_URL ?? 'http://localhost:5173');
const testMongoUri =
  process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/roots_management_test';
const databaseName = testMongoUri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/i)?.[1];
const runTag = randomBytes(4).toString('hex');
const createdIds = [];
let databaseAvailable = false;
let employeeSequence = 0;

function buildEmployee(overrides = {}) {
  const sequence = ++employeeSequence;
  return {
    employeeId: `EMP-${runTag}-${sequence}`,
    fullName: `${runTag} Person ${sequence}`,
    email: `${runTag}-${sequence}@example.com`,
    phone: '9876543210',
    department: 'Development',
    role: 'Developer',
    joiningDate: '2024-01-15',
    ...overrides,
  };
}

async function createEmployee(overrides = {}) {
  const response = await request(app).post('/api/employees').send(buildEmployee(overrides));
  if (response.status === 201) {
    createdIds.push(response.body.data._id);
  }
  return response;
}

if (!databaseName?.endsWith('_test')) {
  console.warn('Employee API tests skipped: MONGODB_TEST_URI must target a database ending in _test.');
} else {
  try {
    await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 1500 });
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(() => Employee.findOne({}).session(session));
      databaseAvailable = true;
    } finally {
      await session.endSession();
    }
    await Employee.init();
  } catch {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.warn(
      'Employee API integration tests skipped: MongoDB must be available as a transaction-capable deployment.',
    );
  }
}

describe.skipIf(!databaseAvailable)('Employee API', () => {
  beforeAll(() => {
    if (!mongoose.connection.db?.databaseName.endsWith('_test')) {
      throw new Error('Integration tests require an isolated database name ending in _test');
    }
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await Employee.deleteMany({ _id: { $in: createdIds } });
    }
    await mongoose.disconnect();
  });

  it('creates a valid employee', async () => {
    const response = await createEmployee();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Employee created successfully',
      data: { department: 'Development', status: 'Active' },
    });
  });

  it('rejects missing required fields with a consistent validation response', async () => {
    const response = await request(app).post('/api/employees').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Request validation failed');
    expect(response.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'employeeId' })]));
  });

  it('rejects an invalid email', async () => {
    const response = await createEmployee({ email: 'not-an-email' });
    expect(response.status).toBe(400);
  });

  it('normalizes email to lowercase', async () => {
    const response = await createEmployee({ email: `${runTag.toUpperCase()}@EXAMPLE.COM` });
    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe(`${runTag.toLowerCase()}@example.com`);
  });

  it('rejects duplicate employee IDs with HTTP 409', async () => {
    const employee = buildEmployee();
    const first = await createEmployee(employee);
    const duplicate = await createEmployee({ ...employee, email: `duplicate-${runTag}@example.com` });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
  });

  it('rejects duplicate normalized email addresses with HTTP 409', async () => {
    const employee = buildEmployee({ email: `shared-${runTag}@example.com` });
    const first = await createEmployee(employee);
    const duplicate = await createEmployee({
      ...buildEmployee(),
      email: employee.email.toUpperCase(),
    });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
  });

  it('rejects unsupported departments and statuses', async () => {
    const invalidDepartment = await createEmployee({ department: 'Marketing' });
    const invalidStatus = await createEmployee({ status: 'Suspended' });

    expect(invalidDepartment.status).toBe(400);
    expect(invalidStatus.status).toBe(400);
  });

  it('requires ordered leave dates for an On Leave employee', async () => {
    const missingDates = await createEmployee({ status: 'On Leave' });
    const invalidRange = await createEmployee({
      status: 'On Leave',
      leaveStart: '2024-02-10',
      leaveEnd: '2024-02-09',
    });
    const validRange = await createEmployee({
      status: 'On Leave',
      leaveStart: '2024-02-09',
      leaveEnd: '2024-02-10',
    });

    expect(missingDates.status).toBe(400);
    expect(invalidRange.status).toBe(400);
    expect(validRange.status).toBe(201);
  });

  it('retrieves an existing employee and returns 404 for a missing employee', async () => {
    const created = await createEmployee();
    const found = await request(app).get(`/api/employees/${created.body.data._id}`);
    const missing = await request(app).get(`/api/employees/${new mongoose.Types.ObjectId()}`);

    expect(found.status).toBe(200);
    expect(found.body.data._id).toBe(created.body.data._id);
    expect(missing.status).toBe(404);
  });

  it('updates an employee and clears obsolete leave dates when status changes', async () => {
    const created = await createEmployee({
      status: 'On Leave',
      leaveStart: '2024-02-01',
      leaveEnd: '2024-02-05',
    });
    const updated = await request(app)
      .put(`/api/employees/${created.body.data._id}`)
      .send({ status: 'Active', email: `${runTag}-UPDATED@example.com` });

    expect(updated.status).toBe(200);
    expect(updated.body.data.email).toBe(`${runTag}-updated@example.com`);
    expect(updated.body.data.status).toBe('Active');
    expect(updated.body.data.leaveStart).toBeUndefined();
    expect(updated.body.data.leaveEnd).toBeUndefined();
  });

  it('rejects malformed employee IDs', async () => {
    const response = await request(app).get('/api/employees/not-a-mongodb-id');

    expect(response.status).toBe(400);
  });

  it('deletes an employee under the Phase 2 scope', async () => {
    const created = await createEmployee();
    const response = await request(app).delete(`/api/employees/${created.body.data._id}`);
    const fetched = await request(app).get(`/api/employees/${created.body.data._id}`);

    expect(response.status).toBe(200);
    expect(fetched.status).toBe(404);
  });

  it.each([
    ['fullName', (token) => `Search-${token}`],
    ['employeeId', (token) => `SEARCH-${token}`],
    ['email', (token) => `search-${token}@example.com`],
  ])('searches employees by %s', async (field, getSearchValue) => {
    const token = `${runTag}-${employeeSequence + 1}`;
    const created = await createEmployee({
      employeeId: `SEARCH-${token}`,
      fullName: `Search-${token} Name`,
      email: `search-${token}@example.com`,
    });
    const response = await request(app)
      .get('/api/employees')
      .query({ search: getSearchValue(token, field) });

    expect(created.status).toBe(201);
    expect(response.status).toBe(200);
    expect(response.body.data.some((item) => item._id === created.body.data._id)).toBe(true);
  });

  it('combines department and status filters', async () => {
    const matching = await createEmployee({ department: 'QA', status: 'Inactive' });
    await createEmployee({ department: 'QA', status: 'Active' });
    const response = await request(app)
      .get('/api/employees')
      .query({ search: runTag, department: 'QA', status: 'Inactive' });

    expect(matching.status).toBe(201);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((item) => item.department === 'QA' && item.status === 'Inactive')).toBe(
      true,
    );
  });

  it('sorts by whitelisted fields and rejects unknown sort fields', async () => {
    const alpha = await createEmployee({ fullName: `Sort-${runTag} Alpha` });
    const zulu = await createEmployee({ fullName: `Sort-${runTag} Zulu` });
    const sorted = await request(app)
      .get('/api/employees')
      .query({ search: `Sort-${runTag}`, sortBy: 'fullName', order: 'asc' });
    const invalid = await request(app)
      .get('/api/employees')
      .query({ sortBy: 'email' });

    expect(alpha.status).toBe(201);
    expect(zulu.status).toBe(201);
    expect(sorted.body.data[0]._id).toBe(alpha.body.data._id);
    expect(invalid.status).toBe(400);
  });

  it('returns accurate server-side pagination metadata and an empty out-of-range page', async () => {
    const marker = `Page-${runTag}`;
    await createEmployee({ fullName: `${marker} One` });
    await createEmployee({ fullName: `${marker} Two` });
    await createEmployee({ fullName: `${marker} Three` });

    const firstPage = await request(app)
      .get('/api/employees')
      .query({ search: marker, page: 1, limit: 2 });
    const outOfRangePage = await request(app)
      .get('/api/employees')
      .query({ search: marker, page: 3, limit: 2 });

    expect(firstPage.body.data).toHaveLength(2);
    expect(firstPage.body.pagination).toEqual({
      currentPage: 1,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    });
    expect(outOfRangePage.body.data).toEqual([]);
    expect(outOfRangePage.body.pagination.currentPage).toBe(3);
  });

  it('keeps the health endpoint operational while MongoDB is connected', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, database: 'connected' });
  });
});
