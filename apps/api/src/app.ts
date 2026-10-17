import express from 'express';
import type { TaskRepository } from './tasks/task-repository.js';
import { TaskService } from './tasks/task-service.js';
import { taskRoutes } from './http/task-routes.js';
import { localSecurity } from './http/local-security.js';
import { errorHandler } from './http/error-handler.js';

export function createApp(repository: TaskRepository) {
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  app.use(localSecurity);
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ data: { status: 'ok' } });
  });
  app.use('/api/tasks', taskRoutes(new TaskService(repository)));
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });
  app.use(errorHandler);
  return app;
}
