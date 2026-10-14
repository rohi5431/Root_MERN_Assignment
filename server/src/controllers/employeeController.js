import * as employeeService from '../services/employeeService.js';

export async function createEmployee(request, response) {
  const employee = await employeeService.createEmployee(request.validated.body);
  return response.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: employee,
  });
}

export async function getEmployee(request, response) {
  const employee = await employeeService.getEmployeeById(request.validated.params.employeeId);
  return response.status(200).json({
    success: true,
    data: employee,
  });
}

export async function listEmployees(request, response) {
  const result = await employeeService.listEmployees(request.validated.query);
  return response.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
}

export async function updateEmployee(request, response) {
  const employee = await employeeService.updateEmployee(
    request.validated.params.employeeId,
    request.validated.body,
  );
  return response.status(200).json({
    success: true,
    message: 'Employee updated successfully',
    data: employee,
  });
}

export async function deleteEmployee(request, response) {
  const employee = await employeeService.deleteEmployee(request.validated.params.employeeId);
  return response.status(200).json({
    success: true,
    message: 'Employee deleted successfully',
    data: employee,
  });
}
