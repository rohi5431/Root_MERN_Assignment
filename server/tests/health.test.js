import mongoose from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp('http://localhost:5173');
let originalReadyState;

beforeEach(() => {
  originalReadyState = mongoose.connection.readyState;
});

afterEach(() => {
  mongoose.connection.readyState = originalReadyState;
});

describe('GET /api/health', () => {
  it('reports connected only when Mongoose is connected', async () => {
    mongoose.connection.readyState = 0;
    const disconnectedResponse = await request(app).get('/api/health');

    expect(disconnectedResponse.status).toBe(503);
    expect(disconnectedResponse.body).toEqual({
      success: false,
      message: 'Database is unavailable',
      database: 'disconnected',
    });

    mongoose.connection.readyState = 1;
    const connectedResponse = await request(app).get('/api/health');

    expect(connectedResponse.status).toBe(200);
    expect(connectedResponse.body).toEqual({
      success: true,
      message: 'API is running',
      database: 'connected',
    });
  });

  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/api/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
      errors: [],
    });
  });
});
