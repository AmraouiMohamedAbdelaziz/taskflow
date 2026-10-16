import { fileURLToPath } from 'node:url';
import { z } from 'zod';
const environmentSchema = z.object({
  TASKS_FILE: z.string().trim().min(1).default(fileURLToPath(new URL('../data/tasks.json', import.meta.url))),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
});
export function parseConfig(environment: NodeJS.ProcessEnv) {
  return environmentSchema.parse(environment);
}
