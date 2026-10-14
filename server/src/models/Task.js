import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { DEPARTMENTS } from './Employee.js';

export const TASK_STATUSES = ['Todo', 'In Progress', 'Completed', 'Cancelled'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const employeeSnapshotSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, trim: true, maxlength: 30 },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    department: { type: String, required: true, enum: DEPARTMENTS },
    role: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      default: () => `TASK-${randomUUID()}`,
      immutable: true,
    },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    employeeSnapshot: {
      type: employeeSnapshotSchema,
      default: undefined,
    },
    department: { type: String, required: true, enum: DEPARTMENTS },
    priority: {
      type: String,
      required: true,
      enum: TASK_PRIORITIES,
      default: 'Medium',
    },
    status: {
      type: String,
      required: true,
      enum: TASK_STATUSES,
      default: 'Todo',
    },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    completedDate: Date,
  },
  { timestamps: true },
);

taskSchema.index({ assignedEmployee: 1 });
taskSchema.index({ title: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ department: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });

taskSchema.pre('validate', function validateTaskDates() {
  if (
    this.startDate &&
    this.dueDate &&
    Date.UTC(this.dueDate.getUTCFullYear(), this.dueDate.getUTCMonth(), this.dueDate.getUTCDate()) <
      Date.UTC(
        this.startDate.getUTCFullYear(),
        this.startDate.getUTCMonth(),
        this.startDate.getUTCDate(),
      )
  ) {
    this.invalidate('dueDate', 'Due date cannot be earlier than start date');
  }
});

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
