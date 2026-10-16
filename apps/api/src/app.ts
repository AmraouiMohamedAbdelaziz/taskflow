import express from 'express';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ data: { status: 'ok' } });
  });
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });
  return app;
}
