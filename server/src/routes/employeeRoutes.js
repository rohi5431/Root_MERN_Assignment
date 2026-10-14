import { Router } from 'express';
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from '../controllers/employeeController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createEmployeeSchema,
  employeeIdParamsSchema,
  listEmployeesSchema,
  updateEmployeeSchema,
} from '../validators/employeeValidators.js';

const router = Router();

router
  .route('/')
  .get(validateRequest(listEmployeesSchema, 'query'), listEmployees)
  .post(validateRequest(createEmployeeSchema, 'body'), createEmployee);

router
  .route('/:employeeId')
  .all(validateRequest(employeeIdParamsSchema, 'params'))
  .get(getEmployee)
  .put(validateRequest(updateEmployeeSchema, 'body'), updateEmployee)
  .delete(deleteEmployee);

export default router;
