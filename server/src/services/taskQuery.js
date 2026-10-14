import Employee from '../models/Employee.js';

const PRIORITY_RANKS = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function startOfTodayUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function taskSort(query) {
  const direction = query.sortOrder === 'asc' ? 1 : -1;
  return {
    [query.sortBy === 'priority' ? '__priorityRank' : query.sortBy]: direction,
    _id: 1,
  };
}

export function buildTaskQueryPipeline(query, { includeSearch = true } = {}) {
  const match = {};
  if (query.department) match.department = query.department;
  if (query.priority) match.priority = query.priority;
  if (query.status) match.status = query.status;
  if (query.dueDateFrom || query.dueDateTo) {
    match.dueDate = {};
    if (query.dueDateFrom) match.dueDate.$gte = query.dueDateFrom;
    if (query.dueDateTo) {
      match.dueDate.$lt = new Date(query.dueDateTo.getTime() + 24 * 60 * 60 * 1000);
    }
  }
  const pipeline = [{ $match: match }];
  if (query.overdue === 'true') {
    pipeline.push({
      $match: {
        dueDate: { $lt: startOfTodayUtc() },
        status: { $nin: ['Completed', 'Cancelled'] },
      },
    });
  }
  if (query.overdue === 'false') {
    const today = startOfTodayUtc();
    pipeline.push({
      $match: {
        $or: [
          { dueDate: { $gte: today } },
          { status: { $in: ['Completed', 'Cancelled'] } },
        ],
      },
    });
  }
  pipeline.push({
      $lookup: {
        from: Employee.collection.name,
        let: { employeeId: '$assignedEmployee' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$employeeId'] } } },
          { $project: { employeeId: 1, fullName: 1, department: 1, role: 1 } },
        ],
        as: '__assignedEmployee',
      },
    });

  if (includeSearch && query.search) {
    const escapedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchPattern = new RegExp(escapedSearch, 'i');
    pipeline.push({
      $match: {
        $or: [
          { title: searchPattern },
          { 'employeeSnapshot.fullName': searchPattern },
          { '__assignedEmployee.fullName': searchPattern },
        ],
      },
    });
  }

  pipeline.push(
    {
      $addFields: {
        __priorityRank: {
          $switch: {
            branches: Object.entries(PRIORITY_RANKS).map(([name, rank]) => ({
              case: { $eq: ['$priority', name] },
              then: rank,
            })),
            default: 4,
          },
        },
        assignedEmployeeDetails: { $arrayElemAt: ['$__assignedEmployee', 0] },
      },
    },
  );

  return pipeline;
}

export function buildTaskListPipeline(query) {
  return [
    ...buildTaskQueryPipeline(query),
    {
      $facet: {
        data: [
          { $sort: taskSort(query) },
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          {
            $project: {
              __assignedEmployee: 0,
              __priorityRank: 0,
              'assignedEmployeeDetails.__v': 0,
              'assignedEmployeeDetails.email': 0,
              'assignedEmployeeDetails.phone': 0,
            },
          },
        ],
        total: [{ $count: 'totalItems' }],
      },
    },
  ];
}

export function buildTaskExportPipeline(query) {
  return [
    ...buildTaskQueryPipeline(query),
    { $sort: taskSort(query) },
    {
      $project: {
        taskId: 1,
        title: 1,
        description: 1,
        department: 1,
        priority: 1,
        status: 1,
        startDate: 1,
        dueDate: 1,
        createdAt: 1,
        completedDate: 1,
        assignedEmployeeName: {
          $ifNull: [
            '$assignedEmployeeDetails.fullName',
            { $ifNull: ['$employeeSnapshot.fullName', ''] },
          ],
        },
        isOverdue: {
          $and: [
            { $not: [{ $in: ['$status', ['Completed', 'Cancelled']] }] },
            { $lt: ['$dueDate', startOfTodayUtc()] },
          ],
        },
      },
    },
  ];
}
