import * as fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { StorageError } from '../errors.js';
import type { TaskRepository } from '../tasks/task-repository.js';
import { taskSchema, type Task, type UpdateTaskInput } from '../tasks/task.js';

const collectionSchema = z.array(taskSchema).refine(
  (tasks) => new Set(tasks.map((task) => task.id)).size === tasks.length,
  { message: 'Duplicate task identifiers.' },
);
type FileSystem = Pick<typeof fs, 'readFile' | 'mkdir' | 'open' | 'rename' | 'link' | 'unlink'>;
function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

/** One shared instance per data file, in a single writer process. */
export class JsonTaskRepository implements TaskRepository {
  private tail: Promise<void> = Promise.resolve();
  private readonly file: string;

  constructor(file: string, private readonly io: FileSystem = fs) {
    this.file = resolve(file);
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation).catch((error: unknown) => {
      throw error instanceof StorageError ? error : new StorageError(error);
    });
    // A failed request must not poison later operations.
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }

  private async read(): Promise<Task[]> {
    let raw: string;
    try {
      raw = await this.io.readFile(this.file, 'utf8');
    } catch (error: unknown) {
      if (!hasCode(error, 'ENOENT')) throw error;
      await this.io.mkdir(dirname(this.file), { recursive: true });
      await this.write([], true);
      raw = await this.io.readFile(this.file, 'utf8');
    }
    const parsed: unknown = JSON.parse(raw);
    return collectionSchema.parse(parsed);
  }

  private async write(tasks: Task[], initialize = false): Promise<void> {
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    let created = false;
    try {
      const handle = await this.io.open(temporary, 'wx', 0o600);
      created = true;
      try {
        await handle.writeFile(`${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      if (initialize) {
        // Exclusive publication: never replace a file that appeared after ENOENT.
        try { await this.io.link(temporary, this.file); }
        catch (error: unknown) { if (!hasCode(error, 'EEXIST')) throw error; }
      } else {
        await this.io.rename(temporary, this.file);
      }
    } finally {
      if (created) {
        // Cleanup cannot turn an already committed write into a reported failure.
        await this.io.unlink(temporary).catch(() => undefined);
      }
    }
  }

  list(): Promise<Task[]> { return this.enqueue(() => this.read()); }

  create(task: Task): Promise<Task> {
    return this.enqueue(async () => {
      const tasks = await this.read();
      if (tasks.some((existing) => existing.id === task.id)) {
        throw new Error('Duplicate task identifier.');
      }
      tasks.push(taskSchema.parse(task));
      await this.write(tasks);
      return task;
    });
  }

  update(id: string, changes: UpdateTaskInput, updatedAt: string): Promise<Task | null> {
    return this.enqueue(async () => {
      const tasks = await this.read();
      const index = tasks.findIndex((task) => task.id === id);
      const current = tasks[index];
      if (!current) return null;
      const updated = taskSchema.parse({ ...current, ...changes, updatedAt });
      tasks[index] = updated;
      await this.write(tasks);
      return updated;
    });
  }

  delete(id: string): Promise<boolean> {
    return this.enqueue(async () => {
      const tasks = await this.read();
      const remaining = tasks.filter((task) => task.id !== id);
      if (remaining.length === tasks.length) return false;
      await this.write(remaining);
      return true;
    });
  }
}
