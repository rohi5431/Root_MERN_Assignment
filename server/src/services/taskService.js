import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Task, { TASK_STATUSES } from '../models/Task.js';
import { createTaskSchema, updateTaskSchema } from '../validators/taskValidators.js';
import { AppError } from '../utils/appError.js';
import { lockEmployees, withAssignmentTransaction } from '../utils/assignmentTransaction.js';
import { canTransitionTaskStatus, isTaskOverdue, utcDateKey } from '../utils/taskUtils.js';
import { buildTaskExportPipeline, buildTaskListPipeline } from './taskQuery.js';

const ACTIVE_STATUSES = ['Todo', 'In Progress'];
function getSnapshot(employee) {
  return employee
    ? {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        department: employee.department,
        role: employee.role,
      }
    : undefined;
}

function dateRangeIsValid(startDate, dueDate) {
  return utcDateKey(dueDate) >= utcDateKey(startDate);
}

export async function validateEmployeeEligibility(employeeId, startDate, session) {
  if (!employeeId) return null;

  const employee = await Employee.findById(employeeId).session(session);
  if (!employee) {
    throw new AppError(404, 'Assigned employee not found');
  }
  if (employee.status === 'Inactive') {
    throw new AppError(400, 'Tasks cannot be assigned to an inactive employee');
  }

  if (
    employee.status === 'On Leave' &&
    employee.leaveStart &&
    employee.leaveEnd &&
    utcDateKey(startDate) >= utcDateKey(employee.leaveStart) &&
    utcDateKey(startDate) <= utcDateKey(employee.leaveEnd)
  ) {
    throw new AppError(400, 'Task start date falls within the employee leave period');
  }

  return employee;
}

export async function countActiveTasks(employeeId, session, excludeTaskId) {
  const filter = { assignedEmployee: employeeId, status: { $in: ACTIVE_STATUSES } };
  if (excludeTaskId) filter._id = { $ne: excludeTaskId };
  return Task.countDocuments(filter).session(session);
}

async function enforceTaskCapacity(employeeId, session, excludeTaskId) {
  if (!employeeId) return;
  const activeCount = await countActiveTasks(employeeId, session, excludeTaskId);
  if (activeCount >= 3) {
    throw new AppError(400, 'Employee already has the maximum of three active tasks');
  }
}

function translateTaskError(error) {
  if (error?.code === 11000) {
    return new AppError(409, 'Task ID is already in use');
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError(
      400,
      'Task validation failed',
      Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    );
  }
  return error;
}

async function persistTask(task) {
  try {
    await task.save();
    return task;
  } catch (error) {
    throw translateTaskError(error);
  }
}

export async function createTask(input) {
  const data = createTaskSchema.parse(input);
  if (!dateRangeIsValid(data.startDate, data.dueDate)) {
    throw new AppError(400, 'Due date cannot be earlier than start date', [
      { field: 'dueDate', message: 'Due date cannot be earlier than start date' },
    ]);
  }

  const create = async (session) => {
    if (data.assignedEmployee) {
      await lockEmployees([data.assignedEmployee], session);
    }
    const employee = await validateEmployeeEligibility(data.assignedEmployee, data.startDate, session);
    if (employee) await enforceTaskCapacity(employee._id, session);

    const task = new Task({
      ...data,
      status: 'Todo',
      completedDate: undefined,
      employeeSnapshot: getSnapshot(employee),
    });
    return persistTask(task);
  };

  return data.assignedEmployee
    ? withAssignmentTransaction(create)
    : persistTask(
        new Task({
          ...data,
          status: 'Todo',
          completedDate: undefined,
        }),
      );
}

export async function getTaskById(id) {
  const task = await Task.findById(id).populate(
    'assignedEmployee',
    'employeeId fullName department role',
  );
  if (!task) {
    throw new AppError(404, 'Task not found');
  }
  return task;
}

export async function listTasks(query) {
  const { page, limit } = query;
  const [result] = await Task.aggregate(buildTaskListPipeline(query)).allowDiskUse(true);
  const totalItems = result.total[0]?.totalItems ?? 0;
  return {
    data: result.data.map((task) => ({ ...task, isOverdue: isTaskOverdue(task) })),
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export function createTaskExportCursor(query) {
  return Task.aggregate(buildTaskExportPipeline(query))
    .allowDiskUse(true)
    .cursor({ batchSize: 100 });
}

export async function updateTask(id, input) {
  const patch = updateTaskSchema.parse(input);

  return withAssignmentTransaction(async (session) => {
    const task = await Task.findById(id).session(session);
    if (!task) throw new AppError(404, 'Task not found');
    if (task.status === 'Completed' || task.status === 'Cancelled') {
      throw new AppError(400, 'Completed and Cancelled tasks cannot be edited');
    }

    const oldEmployeeId = task.assignedEmployee?.toString();
    const requestedEmployeeId = Object.hasOwn(patch, 'assignedEmployee')
      ? patch.assignedEmployee?.toString()
      : oldEmployeeId;
    const reassigned = requestedEmployeeId !== oldEmployeeId;
    const nextStartDate = patch.startDate ?? task.startDate;
    const changedAssignmentOrStartDate =
      reassigned || utcDateKey(nextStartDate) !== utcDateKey(task.startDate);

    await lockEmployees([oldEmployeeId, requestedEmployeeId], session);
    let employee = null;
    if (changedAssignmentOrStartDate && requestedEmployeeId) {
      employee = await validateEmployeeEligibility(
        requestedEmployeeId,
        nextStartDate,
        session,
      );
      if (reassigned && ACTIVE_STATUSES.includes(task.status)) {
        await enforceTaskCapacity(employee._id, session, task._id);
      }
    } else if (!reassigned && requestedEmployeeId) {
      employee = await Employee.findById(requestedEmployeeId).session(session);
    }

    const nextDueDate = patch.dueDate ?? task.dueDate;
    if (!dateRangeIsValid(nextStartDate, nextDueDate)) {
      throw new AppError(400, 'Due date cannot be earlier than start date', [
        { field: 'dueDate', message: 'Due date cannot be earlier than start date' },
      ]);
    }

    task.set(patch);
    if (reassigned) {
      if (employee) task.employeeSnapshot = getSnapshot(employee);
    }
    return persistTask(task);
  });
}

export async function updateTaskStatus(id, nextStatus, { clock = () => new Date() } = {}) {
  if (!TASK_STATUSES.includes(nextStatus)) {
    throw new AppError(400, 'Invalid task status');
  }
  return withAssignmentTransaction(async (session) => {
    const task = await Task.findById(id).session(session);
    if (!task) throw new AppError(404, 'Task not found');
    if (!canTransitionTaskStatus(task.status, nextStatus)) {
      throw new AppError(400, `Cannot transition task from ${task.status} to ${nextStatus}`);
    }

    task.status = nextStatus;
    if (nextStatus === 'Completed') {
      task.completedDate = clock();
    }
    return persistTask(task);
  });
}
