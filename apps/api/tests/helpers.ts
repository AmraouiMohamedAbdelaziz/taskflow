import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonTaskRepository } from '../src/storage/json-task-repository.js';
import { createApp } from '../src/app.js';
export async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'taskflow-test-'));
  const file = join(directory, 'data', 'tasks.json');
  const repository = new JsonTaskRepository(file);
  return { directory, file, repository, app: createApp(repository),
    cleanup: () => rm(directory, { recursive: true, force: true }) };
}
