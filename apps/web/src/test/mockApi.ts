import { vi } from 'vitest';
import type { Task } from '../tasks/types';
export const first: Task = { id: '79d7b749-f6fe-46c6-9d61-92dddeae0920', title: 'Plan the week', description: 'Choose three priorities.', completed: false, createdAt: '2026-10-16T12:00:00.000Z', updatedAt: '2026-10-16T12:00:00.000Z' };
export const second: Task = { ...first, id: 'c914120a-48ae-4d20-8e84-71f714fc7a7b', title: 'Review notes', description: '', completed: true };
export function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
export function mockApi(initial: Task[] = []) {
  let tasks = structuredClone(initial);
  let sequence = 0;
  const fetcher = vi.fn<typeof fetch>(async (url, options) => {
    const method = options?.method ?? 'GET';
    const id = String(url).split('/').at(-1);
    if (method === 'GET') return response({ data: tasks });
    const body: unknown = typeof options?.body === 'string' ? JSON.parse(options.body) : {};
    if (method === 'POST') {
      const saved: Task = { ...first, ...(body as Partial<Task>), id: `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` };
      tasks.push(saved); return response({ data: saved }, 201);
    }
    if (method === 'PATCH') {
      tasks = tasks.map((task) => task.id === id ? { ...task, ...(body as Partial<Task>) } : task);
      return response({ data: tasks.find((task) => task.id === id) });
    }
    tasks = tasks.filter((task) => task.id !== id);
    return response({ data: { id } });
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
