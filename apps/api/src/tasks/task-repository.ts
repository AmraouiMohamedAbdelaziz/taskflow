import type { Task, UpdateTaskInput } from './task.js';

// Each mutation is atomic relative to other operations on this repository.
// No HTTP or filesystem types cross this boundary.
export interface TaskRepository {
  list(): Promise<Task[]>;
  create(task: Task): Promise<Task>;
  update(id: string, changes: UpdateTaskInput, updatedAt: string): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
}
