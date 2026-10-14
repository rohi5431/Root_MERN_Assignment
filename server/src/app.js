import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import dashboardRoutes from './routes/dashboardRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import { AppError } from './utils/appError.js';

export function createApp(clientUrl) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: clientUrl }));
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    const isConnected = mongoose.connection.readyState === 1;

    return response.status(isConnected ? 200 : 503).json({
      success: isConnected,
      message: isConnected ? 'API is running' : 'Database is unavailable',
      database: isConnected ? 'connected' : 'disconnected',
    });
  });

  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/tasks', taskRoutes);

  app.use((_request, _response, next) => {
    next(new AppError(404, 'Route not found'));
  });

  app.use((error, _request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    let status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
    let message = error.message;
    let errors = Array.isArray(error.errors) ? error.errors : [];

    if (error.code === 11000) {
      status = 409;
      message = 'A value that must be unique is already in use';
    } else if (error instanceof mongoose.Error.CastError) {
      status = 400;
      message = 'Invalid identifier';
    } else if (error instanceof mongoose.Error.ValidationError) {
      status = 400;
      message = 'Request validation failed';
      errors = Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      }));
    } else if (error instanceof ZodError) {
      status = 400;
      message = 'Request validation failed';
      errors = error.issues.map((issue) => ({
        field:
          issue.code === 'unrecognized_keys'
            ? issue.keys.join(', ')
            : issue.path.join('.'),
        message: issue.message,
      }));
    } else if (error.type === 'entity.parse.failed') {
      status = 400;
      message = 'Invalid JSON request body';
    }

    if (status >= 500) {
      message = 'Internal server error';
      errors = [];
    } else if (
      error.status === 400 &&
      !Array.isArray(error.errors) &&
      !(error instanceof mongoose.Error.ValidationError) &&
      error.type !== 'entity.parse.failed'
    ) {
      message = 'Invalid request';
    }

    if (status >= 500) {
      console.error(error);
    }

    return response.status(status).json({
      success: false,
      message,
      errors,
    });
  });

  return app;
}
