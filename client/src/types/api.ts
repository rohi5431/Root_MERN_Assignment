export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ListResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
}

export interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: 'Development' | 'Design' | 'QA' | 'HR' | 'Sales';
  role: string;
  joiningDate: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  skills: string[];
  leaveStart?: string;
  leaveEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export type EmployeePayload = Pick<
  Employee,
  | 'employeeId'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'department'
  | 'role'
  | 'joiningDate'
  | 'status'
  | 'skills'
> & {
  leaveStart?: string;
  leaveEnd?: string;
};

export type EmployeeDepartment = Employee['department'];
export type EmployeeStatus = Employee['status'];

export type EmployeeListResponse = ListResponse<Employee>;

export interface TaskEmployeeSnapshot {
  employeeId: string;
  fullName: string;
  department: Employee['department'];
  role?: string;
}

export interface Task {
  _id: string;
  taskId: string;
  title: string;
  description: string;
  assignedEmployee?: string | Pick<Employee, '_id' | 'employeeId' | 'fullName' | 'department' | 'role'> | null;
  assignedEmployeeDetails?: Pick<Employee, '_id' | 'employeeId' | 'fullName' | 'department' | 'role'> | null;
  employeeSnapshot?: TaskEmployeeSnapshot;
  department: Employee['department'];
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Todo' | 'In Progress' | 'Completed' | 'Cancelled';
  startDate: string;
  dueDate: string;
  completedDate?: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskListResponse = ListResponse<Task>;

export interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  employeesOnLeave: number;
  totalTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  todoTasks: number;
  cancelledTasks: number;
  overdueTasks: number;
  completionRate: number;
  tasksByDepartment: Record<Employee['department'], number>;
  tasksByPriority: Record<Task['priority'], number>;
  employeeWorkload: EmployeeWorkload[];
  recentTasks: Task[];
  upcomingDeadlines: Task[];
  recentDeadlines: Task[];
}

export interface EmployeeWorkload {
  _id: string;
  employeeId: string;
  fullName: string;
  department: Employee['department'];
  status: Employee['status'];
  activeTaskCount: number;
}
