import { Router } from 'express';
import {
  createTask,
  exportTasksCsv,
  getTask,
  listTasks,
  updateTask,
  updateTaskStatus,
} from '../controllers/taskController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createTaskSchema,
  taskIdParamsSchema,
  taskListQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../validators/taskValidators.js';

const router = Router();

router.get(
  '/export/csv',
  validateRequest(taskListQuerySchema, 'query'),
  exportTasksCsv,
);

router
  .route('/')
  .get(validateRequest(taskListQuerySchema, 'query'), listTasks)
  .post(validateRequest(createTaskSchema, 'body'), createTask);

router
  .route('/:taskId/status')
  .put(
    validateRequest(taskIdParamsSchema, 'params'),
    validateRequest(updateTaskStatusSchema, 'body'),
    updateTaskStatus,
  );

router
  .route('/:taskId')
  .all(validateRequest(taskIdParamsSchema, 'params'))
  .get(getTask)
  .put(validateRequest(updateTaskSchema, 'body'), updateTask);

export default router;
