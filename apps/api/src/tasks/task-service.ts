import { randomUUID } from 'node:crypto';
import { TaskNotFoundError } from '../errors.js';
import type { TaskRepository } from './task-repository.js';
import type { CreateTaskInput, Task, UpdateTaskInput } from './task.js';

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  list(): Promise<Task[]> { return this.repository.list(); }

  create(input: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    return this.repository.create({
      ...input, id: randomUUID(), completed: false, createdAt: now, updatedAt: now,
    });
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const task = await this.repository.update(id, input, new Date().toISOString());
    if (!task) throw new TaskNotFoundError();
    return task;
  }

  async delete(id: string): Promise<void> {
    if (!await this.repository.delete(id)) throw new TaskNotFoundError();
  }
}
