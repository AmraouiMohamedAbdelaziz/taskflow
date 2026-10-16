import { Router, json } from 'express';
import { createTaskSchema, taskIdSchema, updateTaskSchema } from '../tasks/task.js';
import type { TaskService } from '../tasks/task-service.js';

export function taskRoutes(service: TaskService): Router {
  const router = Router();
  router.use((req, res, next) => {
    if (['POST', 'PATCH'].includes(req.method) && !req.is('application/json')) {
      res.status(415).json({ error: {
        code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Use uncompressed application/json with UTF-8 encoding.',
      } });
      return;
    }
    next();
  });
  router.use(json({ limit: '32kb', inflate: false }));
  router.get('/', async (_req, res) => {
    res.json({ data: await service.list() });
  });
  router.post('/', async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    res.status(201).json({ data: await service.create(input) });
  });
  router.patch('/:id', async (req, res) => {
    const id = taskIdSchema.parse(req.params.id);
    const input = updateTaskSchema.parse(req.body);
    res.json({ data: await service.update(id, input) });
  });
  router.delete('/:id', async (req, res) => {
    const id = taskIdSchema.parse(req.params.id);
    await service.delete(id);
    res.json({ data: { id } });
  });
  return router;
}
