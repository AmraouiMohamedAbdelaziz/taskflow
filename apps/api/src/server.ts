import { createApp } from './app.js';
import { parseConfig } from './config.js';
const config = parseConfig(process.env);
const server = createApp().listen(config.PORT, config.HOST, () => {
  console.info(`TaskFlow API: http://${config.HOST}:${config.PORT}`);
});
server.on('error', (error: Error) => {
  console.error('API startup failed:', error.message);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
