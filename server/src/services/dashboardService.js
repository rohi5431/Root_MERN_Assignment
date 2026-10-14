import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { isTaskOverdue } from '../utils/taskUtils.js';

const ACTIVE_TASK_STATUSES = ['Todo', 'In Progress'];
const TERMINAL_TASK_STATUSES = ['Completed', 'Cancelled'];

function emptyCounts(statuses) {
  return Object.fromEntries(statuses.map((status) => [status, 0]));
}

function countByStatus(rows, statuses) {
  return rows.reduce((counts, row) => {
    if (Object.hasOwn(counts, row._id)) counts[row._id] = row.count;
    return counts;
  }, emptyCounts(statuses));
}

export async function getDashboardMetrics() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const upcomingEnd = new Date(today);
  upcomingEnd.setUTCDate(upcomingEnd.getUTCDate() + 30);
  const recentStart = new Date(today);
  recentStart.setUTCDate(recentStart.getUTCDate() - 7);
  const taskProjection = 'employeeId fullName department role';

  const [
    totalEmployees,
    employeeStatusRows,
    totalTasks,
    taskStatusRows,
    taskDepartmentRows,
    taskPriorityRows,
    overdueTasks,
    employeeWorkload,
    recentTaskRows,
    upcomingDeadlineRows,
    recentDeadlineRows,
  ] = await Promise.all([
    Employee.countDocuments(),
    Employee.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.countDocuments(),
    Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]),
    Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Task.countDocuments({
      dueDate: { $lt: today },
      status: { $nin: TERMINAL_TASK_STATUSES },
    }),
    Employee.aggregate([
      {
        $lookup: {
          from: Task.collection.name,
          let: { employeeId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assignedEmployee', '$$employeeId'] },
                    { $in: ['$status', ACTIVE_TASK_STATUSES] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'activeTaskCount',
        },
      },
      {
        $project: {
          _id: 1,
          employeeId: 1,
          fullName: 1,
          department: 1,
          status: 1,
          activeTaskCount: {
            $ifNull: [{ $arrayElemAt: ['$activeTaskCount.count', 0] }, 0],
          },
        },
      },
      { $sort: { activeTaskCount: -1, fullName: 1, _id: 1 } },
    ]),
    Task.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .populate('assignedEmployee', taskProjection)
      .lean(),
    Task.find({
      dueDate: { $gte: today, $lt: upcomingEnd },
      status: { $in: ACTIVE_TASK_STATUSES },
    })
      .sort({ dueDate: 1, _id: 1 })
      .limit(5)
      .populate('assignedEmployee', taskProjection)
      .lean(),
    Task.find({
      dueDate: { $gte: recentStart, $lt: today },
      status: { $ne: 'Cancelled' },
    })
      .sort({ dueDate: -1, _id: -1 })
      .limit(5)
      .populate('assignedEmployee', taskProjection)
      .lean(),
  ]);

  const employeeCounts = countByStatus(employeeStatusRows, ['Active', 'Inactive', 'On Leave']);
  const taskCounts = countByStatus(taskStatusRows, [
    'Todo',
    'In Progress',
    'Completed',
    'Cancelled',
  ]);
  const tasksByDepartment = countByStatus(taskDepartmentRows, [
    'Development',
    'Design',
    'QA',
    'HR',
    'Sales',
  ]);
  const tasksByPriority = countByStatus(taskPriorityRows, ['Critical', 'High', 'Medium', 'Low']);

  return {
    totalEmployees,
    activeEmployees: employeeCounts.Active,
    inactiveEmployees: employeeCounts.Inactive,
    employeesOnLeave: employeeCounts['On Leave'],
    totalTasks,
    todoTasks: taskCounts.Todo,
    inProgressTasks: taskCounts['In Progress'],
    completedTasks: taskCounts.Completed,
    cancelledTasks: taskCounts.Cancelled,
    overdueTasks,
    completionRate: totalTasks ? Math.round((taskCounts.Completed / totalTasks) * 100) : 0,
    tasksByDepartment,
    tasksByPriority,
    employeeWorkload,
    recentTasks: recentTaskRows.map(formatDashboardTask),
    upcomingDeadlines: upcomingDeadlineRows.map(formatDashboardTask),
    recentDeadlines: recentDeadlineRows.map(formatDashboardTask),
  };
}

function formatDashboardTask(task) {
  return {
    ...task,
    assignedEmployeeDetails: task.assignedEmployee,
    isOverdue: isTaskOverdue(task),
  };
}
