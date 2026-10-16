import * as fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonTaskRepository } from '../src/storage/json-task-repository.js';
import { StorageError } from '../src/errors.js';
import type { Task } from '../src/tasks/task.js';
import { fixture } from './helpers.js';

function task(title = 'Task'): Task {
  const now = new Date().toISOString();
  return { id: randomUUID(), title, completed: false, createdAt: now, updatedAt: now };
}
function ioError(code: string): Error { return Object.assign(new Error(`Simulated ${code}`), { code }); }

describe('JSON persistence guarantees', () => {
  let context: Awaited<ReturnType<typeof fixture>>;
  beforeEach(async () => { context = await fixture(); });
  afterEach(async () => { await context.cleanup(); });
  it('survives recreation and returns independent values on reads', async () => {
    const original = task();
    await context.repository.create(original);
    const read = await context.repository.list();
    read[0]!.title = 'mutated in memory';
    expect(await new JsonTaskRepository(context.file).list()).toEqual([original]);
  });
  it('serializes concurrent creates, partial updates and deletes', async () => {
    const tasks = Array.from({ length: 40 }, (_, i) => task(`Task ${i}`));
    await Promise.all(tasks.map((value) => context.repository.create(value)));
    const first = tasks[0]!;
    await Promise.all([
      context.repository.update(first.id, { title: 'Updated' }, new Date().toISOString()),
      context.repository.update(first.id, { completed: true }, new Date().toISOString()),
      ...tasks.slice(1, 20).map((value) => context.repository.delete(value.id)),
    ]);
    const saved = await new JsonTaskRepository(context.file).list();
    expect(saved).toHaveLength(21);
    expect(saved.find((value) => value.id === first.id)).toMatchObject({ title: 'Updated', completed: true });
    expect(await fs.readdir(dirname(context.file))).toEqual(['tasks.json']);
  });
  it.each(['{bad', '', '{}', '[{"title":"missing fields"}]', JSON.stringify([task('   ')])])(
    'never changes corrupt storage %#', async (contents) => {
      await context.repository.list();
      await fs.writeFile(context.file, contents);
      for (const operation of [
        () => context.repository.list(), () => context.repository.create(task()),
        () => context.repository.update(randomUUID(), { completed: true }, new Date().toISOString()),
        () => context.repository.delete(randomUUID()),
      ]) { await expect(operation()).rejects.toBeInstanceOf(StorageError); }
      expect(await fs.readFile(context.file, 'utf8')).toBe(contents);
    });
  it('rejects duplicate IDs and unknown persisted fields without overwriting', async () => {
    await context.repository.list();
    const value = task();
    for (const content of [JSON.stringify([value, value]), JSON.stringify([{ ...value, secret: true }])]) {
      await fs.writeFile(context.file, content);
      await expect(context.repository.create(task())).rejects.toBeInstanceOf(StorageError);
      expect(await fs.readFile(context.file, 'utf8')).toBe(content);
    }
  });
  it('does not overwrite a file created during initialization', async () => {
    const existing = '{external corruption';
    const repository = new JsonTaskRepository(context.file, { ...fs,
      link: async (source, target) => {
        await fs.writeFile(context.file, existing);
        return fs.link(source, target);
      },
    });
    await expect(repository.list()).rejects.toBeInstanceOf(StorageError);
    expect(await fs.readFile(context.file, 'utf8')).toBe(existing);
  });
  it('preserves the old file on rename failure and recovers the operation queue', async () => {
    const original = task();
    await context.repository.create(original);
    const before = await fs.readFile(context.file, 'utf8');
    const rename = vi.fn<typeof fs.rename>().mockRejectedValueOnce(ioError('EACCES')).mockImplementation(fs.rename);
    const repository = new JsonTaskRepository(context.file, { ...fs, rename });
    await expect(repository.create(task())).rejects.toBeInstanceOf(StorageError);
    expect(await fs.readFile(context.file, 'utf8')).toBe(before);
    expect(await fs.readdir(dirname(context.file))).toEqual(['tasks.json']);
    const recovered = task('Recovered');
    await repository.create(recovered);
    expect(await repository.list()).toEqual([original, recovered]);
  });
  it('handles temporary-file creation failure without touching existing data', async () => {
    await context.repository.create(task());
    const before = await fs.readFile(context.file, 'utf8');
    const repository = new JsonTaskRepository(context.file, { ...fs,
      open: vi.fn<typeof fs.open>().mockRejectedValue(ioError('ENOSPC')),
    });
    await expect(repository.create(task())).rejects.toBeInstanceOf(StorageError);
    expect(await fs.readFile(context.file, 'utf8')).toBe(before);
  });
  it('handles read permission errors without treating them as missing storage', async () => {
    const mkdir = vi.fn(async () => undefined);
    const repository = new JsonTaskRepository(context.file, { ...fs, mkdir,
      readFile: async () => { throw ioError('EACCES'); },
    });
    await expect(repository.list()).rejects.toBeInstanceOf(StorageError);
    expect(mkdir).not.toHaveBeenCalled();
  });
  it('handles invalid parent directory and directory-as-file failures', async () => {
    const parent = join(context.directory, 'regular-file');
    await fs.writeFile(parent, 'keep');
    await expect(new JsonTaskRepository(join(parent, 'tasks.json')).list()).rejects.toBeInstanceOf(StorageError);
    await expect(new JsonTaskRepository(context.directory).list()).rejects.toBeInstanceOf(StorageError);
    expect(await fs.readFile(parent, 'utf8')).toBe('keep');
  });

  it.each(['writeFile', 'sync'] as const)('preserves data and removes temporary files after %s failure', async (stage) => {
    await context.repository.create(task());
    const before = await fs.readFile(context.file, 'utf8');
    const open = vi.fn<typeof fs.open>().mockImplementation(async (path, flags, mode) => {
      const handle = await fs.open(path, flags, mode);
      vi.spyOn(handle, stage).mockRejectedValueOnce(ioError('ENOSPC'));
      return handle;
    });
    const repository = new JsonTaskRepository(context.file, { ...fs, open });
    await expect(repository.create(task())).rejects.toBeInstanceOf(StorageError);
    expect(await fs.readFile(context.file, 'utf8')).toBe(before);
    expect(await fs.readdir(dirname(context.file))).toEqual(['tasks.json']);
  });
  it('handles initialization publication failure without leaving a target file', async () => {
    const repository = new JsonTaskRepository(context.file, { ...fs,
      link: vi.fn<typeof fs.link>().mockRejectedValue(ioError('EACCES')),
    });
    await expect(repository.list()).rejects.toBeInstanceOf(StorageError);
    expect(await fs.readdir(dirname(context.file))).toEqual([]);
  });

  it('rejects duplicate inserts without losing existing tasks', async () => {
    const original = task();
    await context.repository.create(original);
    await expect(context.repository.create(original)).rejects.toBeInstanceOf(StorageError);
    expect(await context.repository.list()).toEqual([original]);
  });
});
