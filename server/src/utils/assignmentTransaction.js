import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import { AppError } from './appError.js';

const transactionUnavailable = (error) =>
  error?.code === 20 ||
  error?.codeName === 'IllegalOperation' ||
  /transactions are not supported|transaction numbers are only allowed|replica set/i.test(
    error?.message ?? '',
  );

export async function withAssignmentTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (transactionUnavailable(error)) {
      throw new AppError(
        503,
        'Task assignment changes require MongoDB transactions; configure a replica set or transaction-capable MongoDB deployment',
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function lockEmployees(employeeIds, session) {
  const ids = [...new Set(employeeIds.filter(Boolean).map(String))].sort();
  for (const id of ids) {
    const employee = await Employee.findOneAndUpdate(
      { _id: id },
      { $inc: { taskAssignmentVersion: 1 } },
      { new: true, session, timestamps: false },
    );
    if (!employee) {
      throw new AppError(404, 'Employee not found');
    }
  }
}
