import { describe, expect, it } from 'vitest';
import { taskListQuerySchema } from '../src/validators/taskValidators.js';
import {
  buildTaskExportPipeline,
  buildTaskListPipeline,
  buildTaskQueryPipeline,
} from '../src/services/taskQuery.js';
import { createTaskExportCursor } from '../src/services/taskService.js';
import { taskCsvHeader, taskCsvRow } from '../src/utils/taskCsv.js';

describe('task query pipeline', () => {
  it('looks up current employees and searches escaped title and historical/current names', () => {
    const query = taskListQuerySchema.parse({ search: 'report.*', department: 'Design' });
    const pipeline = buildTaskQueryPipeline(query);

    expect(pipeline[0]).toEqual({ $match: { department: 'Design' } });
    expect(pipeline[1]).toHaveProperty('$lookup');
    expect(pipeline[2].$match.$or).toHaveLength(3);
    expect(pipeline[2].$match.$or[0].title.source).toBe('report\\.\\*');
    expect(pipeline[2].$match.$or[0].title.flags).toContain('i');
    expect(pipeline[2].$match.$or[1]).toHaveProperty('employeeSnapshot.fullName');
    expect(pipeline[2].$match.$or[2]).toHaveProperty('__assignedEmployee.fullName');
  });

  it('uses inclusive due-date bounds, stable sort and rank-based priority order', () => {
    const query = taskListQuerySchema.parse({
      dueDateFrom: '2026-10-01',
      dueDateTo: '2026-10-31',
      sortBy: 'priority',
      sortOrder: 'asc',
      page: 2,
      limit: 25,
    });
    const pipeline = buildTaskListPipeline(query);
    const match = pipeline[0].$match;
    const facet = pipeline[pipeline.length - 1].$facet;

    expect(match.dueDate.$gte.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(match.dueDate.$lt.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(facet.data[0].$sort).toEqual({ __priorityRank: 1, _id: 1 });
    expect(facet.data[1]).toEqual({ $skip: 25 });
    expect(facet.data[2]).toEqual({ $limit: 25 });
    expect(facet.total).toEqual([{ $count: 'totalItems' }]);
    const rankBranches = pipeline.find((stage) => stage.$addFields)?.$addFields.__priorityRank.$switch.branches;
    expect(rankBranches.map((branch) => [branch.case.$eq[1], branch.then])).toEqual([
      ['Critical', 0],
      ['High', 1],
      ['Medium', 2],
      ['Low', 3],
    ]);
  });

  it('builds an unpaginated CSV query with the same filtering and sort rules', () => {
    const query = taskListQuerySchema.parse({
      search: 'report',
      status: 'In Progress',
      sortBy: 'dueDate',
      sortOrder: 'asc',
      page: '9',
      limit: '1',
    });
    const pipeline = buildTaskExportPipeline(query);

    expect(pipeline.some((stage) => '$skip' in stage || '$limit' in stage)).toBe(false);
    expect(pipeline[0].$match.status).toBe('In Progress');
    expect(pipeline.some((stage) => stage.$sort?.dueDate === 1)).toBe(true);
    expect(pipeline.at(-1).$project).toHaveProperty('isOverdue');
    expect(pipeline.at(-1).$project).toHaveProperty('assignedEmployeeName');
  });

  it('creates a closable Mongoose cursor for streaming CSV results', async () => {
    const cursor = createTaskExportCursor(taskListQuerySchema.parse({}));

    expect(typeof cursor[Symbol.asyncIterator]).toBe('function');
  });
});

describe('task CSV serialization', () => {
  it('quotes delimiters and neutralizes spreadsheet formula prefixes', () => {
    const csv = taskCsvHeader() + taskCsvRow({
      taskId: 'TASK-1',
      title: 'Report, "review"',
      description: '=HYPERLINK("https://example.com")\nsecond line',
      assignedEmployeeName: 'Asha Rao',
      department: 'Design',
      priority: 'High',
      status: 'Todo',
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      dueDate: new Date('2026-10-02T00:00:00.000Z'),
      createdAt: new Date('2026-09-30T12:00:00.000Z'),
      completedDate: null,
      isOverdue: false,
    });

    expect(taskCsvHeader()).toContain('"Task ID","Title","Description"');
    expect(csv).toContain('"Report, ""review"""');
    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")\nsecond line"');
    expect(csv).toContain('"2026-10-01"');
    expect(csv).toContain('"false"');
    expect(csv).toContain('""');
  });
});
