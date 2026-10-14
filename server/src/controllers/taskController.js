import * as taskService from '../services/taskService.js';
import { isTaskOverdue } from '../utils/taskUtils.js';
import { taskCsvHeader, taskCsvRow } from '../utils/taskCsv.js';

function serializeTask(task) {
  const data = typeof task.toObject === 'function' ? task.toObject() : task;
  return { ...data, isOverdue: isTaskOverdue(data) };
}

export async function createTask(request, response) {
  const task = await taskService.createTask(request.validated.body);
  return response.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: serializeTask(task),
  });
}

export async function listTasks(request, response) {
  const result = await taskService.listTasks(request.validated.query);
  return response.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
}

export async function exportTasksCsv(request, response, next) {
  const cursor = taskService.createTaskExportCursor(request.validated.query);
  const date = new Date().toISOString().slice(0, 10);
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="tasks-export-${date}.csv"`,
  );
  response.setHeader('Cache-Control', 'no-store');

  try {
    response.write('\uFEFF');
    response.write(taskCsvHeader());
    for await (const task of cursor) {
      if (!response.write(taskCsvRow(task))) {
        await new Promise((resolve) => response.once('drain', resolve));
      }
    }
    response.end();
  } catch (error) {
    if (response.headersSent) {
      console.error('Task CSV export stream failed');
      response.destroy();
      return;
    }
    return next(error);
  } finally {
    await cursor.close();
  }
}

export async function getTask(request, response) {
  const task = await taskService.getTaskById(request.validated.params.taskId);
  return response.status(200).json({
    success: true,
    data: serializeTask(task),
  });
}

export async function updateTask(request, response) {
  const task = await taskService.updateTask(
    request.validated.params.taskId,
    request.validated.body,
  );
  return response.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: serializeTask(task),
  });
}

export async function updateTaskStatus(request, response) {
  const task = await taskService.updateTaskStatus(
    request.validated.params.taskId,
    request.validated.body.status,
  );
  return response.status(200).json({
    success: true,
    message: 'Task status updated successfully',
    data: serializeTask(task),
  });
}
