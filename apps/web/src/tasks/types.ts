export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface TaskInput { title: string; description?: string }
export type TaskUpdate = Partial<TaskInput & { completed: boolean }>;
export type Filter = 'All' | 'Active' | 'Completed';
