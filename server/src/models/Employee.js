import mongoose from 'mongoose';

export const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
export const EMPLOYEE_STATUSES = ['Active', 'Inactive', 'On Leave'];

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^\S+@\S+\.\S+$/,
    },
    phone: {
      type: String,
      required: true,
      match: /^\+91[6-9]\d{9}$/,
    },
    department: {
      type: String,
      required: true,
      enum: DEPARTMENTS,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: EMPLOYEE_STATUSES,
      default: 'Active',
      required: true,
    },
    skills: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: 50 }],
      default: [],
      validate: {
        validator: (skills) => skills.length <= 30,
        message: 'A maximum of 30 skills is allowed',
      },
    },
    leaveStart: Date,
    leaveEnd: Date,
    taskAssignmentVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  { timestamps: true },
);

employeeSchema.index({ employeeId: 1 }, { unique: true });
employeeSchema.index({ email: 1 }, { unique: true });
employeeSchema.index({ fullName: 1 });
employeeSchema.index({ department: 1, status: 1 });

employeeSchema.pre('validate', function validateLeaveDates() {
  if (this.status === 'On Leave') {
    if (!this.leaveStart) {
      this.invalidate('leaveStart', 'Leave start date is required when status is On Leave');
    }
    if (!this.leaveEnd) {
      this.invalidate('leaveEnd', 'Leave end date is required when status is On Leave');
    }
    if (this.leaveStart && this.leaveEnd && this.leaveEnd < this.leaveStart) {
      this.invalidate('leaveEnd', 'Leave end date cannot be earlier than leave start date');
    }
  }
});

export default mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
