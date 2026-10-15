import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { z } from 'zod';
import { createApp } from './app.js';

const HOST = '0.0.0.0';

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .refine((value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'), {
      message: 'MONGODB_URI must be a MongoDB connection URI',
    }),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
});

function readEnvironment() {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid server environment configuration:\n${details.join('\n')}`);
  }

  return result.data;
}

export async function startServer() {
  const config = readEnvironment();
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const app = createApp(config.CLIENT_URL);
  const server = app.listen(config.PORT, HOST);

  try {
    await new Promise((resolveListening, rejectListening) => {
      server.once('listening', resolveListening);
      server.once('error', rejectListening);
    });
  } catch (error) {
    await mongoose.disconnect();
    throw new Error(`Unable to listen on port ${config.PORT}: ${error.message}`);
  }

  console.info(`API listening on ${HOST}:${config.PORT}`);

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.info(`${signal} received; closing the API and MongoDB connection.`);

    server.close(async (error) => {
      try {
        await mongoose.disconnect();
        if (error) {
          throw error;
        }
        process.exitCode = 0;
      } catch (shutdownError) {
        console.error('Graceful shutdown failed.', shutdownError);
        process.exitCode = 1;
      }
    });
  }

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  return server;
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  startServer().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown startup error';
    const mongoUri = process.env.MONGODB_URI;
    const safeMessage = mongoUri ? message.replaceAll(mongoUri, '[redacted MongoDB URI]') : message;
    console.error(`API startup failed. Check server environment settings and MongoDB availability.\n${safeMessage}`);
    process.exitCode = 1;
  });
}
