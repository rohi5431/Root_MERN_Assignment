import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import { createEmployeeSchema } from '../validators/employeeValidators.js';
import { AppError } from '../utils/appError.js';
import { lockEmployees, withAssignmentTransaction } from '../utils/assignmentTransaction.js';

const SORT_FIELDS = new Set(['fullName', 'employeeId', 'joiningDate', 'createdAt', 'department']);

function normalizeEmployee(employee) {
  const normalized = { ...employee };
  if (normalized.status !== 'On Leave') {
    normalized.leaveStart = undefined;
    normalized.leaveEnd = undefined;
  }
  return normalized;
}

function translateDatabaseError(error) {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0];
    const label = field === 'employeeId' ? 'Employee ID' : field === 'email' ? 'Email' : 'Value';
    return new AppError(409, `${label} is already in use`);
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError(
      400,
      'Employee validation failed',
      Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    );
  }
  return error;
}

async function saveEmployee(employee) {
  try {
    await employee.save();
    return employee;
  } catch (error) {
    throw translateDatabaseError(error);
  }
}

export async function createEmployee(data) {
  const validated = createEmployeeSchema.parse(data);
  const employee = new Employee(normalizeEmployee(validated));
  return saveEmployee(employee);
}

export async function getEmployeeById(id) {
  const employee = await Employee.findById(id);
  if (!employee) {
    throw new AppError(404, 'Employee not found');
  }
  return employee;
}

export async function listEmployees(query) {
  const { search, department, status, page, limit, sortBy, order } = query;
  if (!SORT_FIELDS.has(sortBy)) {
    throw new AppError(400, 'Unsupported sort field');
  }

  const filter = {};
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchPattern = new RegExp(escapedSearch, 'i');
    filter.$or = [
      { employeeId: searchPattern },
      { fullName: searchPattern },
      { email: searchPattern },
    ];
  }

  const sortDirection = order === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDirection, _id: 1 };
  const [employees, totalItems] = await Promise.all([
    Employee.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Employee.countDocuments(filter),
  ]);

  return {
    data: employees,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function updateEmployee(id, patch) {
  const employee = await Employee.findById(id);
  if (!employee) {
    throw new AppError(404, 'Employee not found');
  }

  const merged = {
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    department: employee.department,
    role: employee.role,
    joiningDate: employee.joiningDate.toISOString(),
    status: employee.status,
    skills: employee.skills,
    ...(employee.leaveStart && { leaveStart: employee.leaveStart.toISOString() }),
    ...(employee.leaveEnd && { leaveEnd: employee.leaveEnd.toISOString() }),
    ...patch,
  };
  const validated = createEmployeeSchema.parse(merged);
  employee.set(normalizeEmployee(validated));
  return saveEmployee(employee);
}

export async function deleteEmployee(id) {
  return withAssignmentTransaction(async (session) => {
    await lockEmployees([id], session);
    const employee = await Employee.findById(id).session(session);
    if (!employee) {
      throw new AppError(404, 'Employee not found');
    }

    const activeTasks = await Task.countDocuments({
      assignedEmployee: employee._id,
      status: { $in: ['Todo', 'In Progress'] },
    }).session(session);
    if (activeTasks > 0) {
      throw new AppError(400, 'Employee cannot be deleted while active tasks are assigned');
    }

    const employeeSnapshot = {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      department: employee.department,
      role: employee.role,
    };
    await Task.updateMany(
      {
        assignedEmployee: employee._id,
        $or: [
          { employeeSnapshot: { $exists: false } },
          { employeeSnapshot: null },
          { 'employeeSnapshot.employeeId': { $exists: false } },
        ],
      },
      {
        $set: { employeeSnapshot },
      },
      { session },
    );

    await employee.deleteOne({ session });
    return employee;
  });
}
