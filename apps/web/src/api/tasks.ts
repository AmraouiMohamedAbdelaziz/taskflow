import type { Task, TaskInput, TaskUpdate } from '../tasks/types';

export class ApiError extends Error {
  constructor(message: string, readonly uncertain = false, readonly code = 'UNEXPECTED_RESPONSE') {
    super(message);
  }
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function timestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  // Reject dates normalized by Date.parse, such as February 30.
  return new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19);
}
function isTask(value: unknown): value is Task {
  return object(value) && typeof value.id === 'string' && uuid.test(value.id)
    && typeof value.title === 'string' && value.title.length > 0 && value.title === value.title.trim() && value.title.length <= 200
    && (value.description === undefined || typeof value.description === 'string' && value.description.length <= 5000)
    && typeof value.completed === 'boolean' && timestamp(value.createdAt) && timestamp(value.updatedAt);
}
const messages: Record<string, string> = {
  LOCAL_ACCESS_ONLY: 'Open TaskFlow using localhost or 127.0.0.1.',
  VALIDATION_ERROR: 'The server rejected these values. Check the task fields and try again.',
  INVALID_JSON: 'The request could not be read. Refresh the page and try again.',
  TASK_NOT_FOUND: 'This task no longer exists. Refresh tasks to update your list.',
  PAYLOAD_TOO_LARGE: 'This task is too large to send. Shorten the description and try again.',
  UNSUPPORTED_MEDIA_TYPE: 'The server could not accept this request. Refresh the page.',
  STORAGE_UNAVAILABLE: 'Task storage is unavailable. Your list could not be updated. Try again later.',
  INTERNAL_ERROR: 'The server encountered a problem. Try again later.',
};
function unexpected(mutation: boolean): ApiError {
  return new ApiError('The server returned an unexpected response.' +
    (mutation ? ' The change may have been saved. Refresh tasks before trying again.' : ' Try loading your tasks again.'), mutation);
}
async function send(method: string, path: string, body?: TaskInput | TaskUpdate, signal?: AbortSignal): Promise<unknown> {
  const mutation = method !== 'GET';
  let response: Response;
  try {
    const timeout = AbortSignal.timeout(15_000);
    response = await fetch(`/api/tasks${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch {
    throw new ApiError('Unable to reach the server.' + (mutation
      ? ' The change may have been saved. Refresh tasks before trying again.'
      : ' Check your connection and make sure the API is running.'), mutation, 'NETWORK_ERROR');
  }
  let payload: unknown;
  try { payload = await response.json(); } catch { throw unexpected(mutation); }
  if (!response.ok) {
    if (object(payload) && object(payload.error) && typeof payload.error.code === 'string'
      && typeof payload.error.message === 'string') {
      throw new ApiError((Object.hasOwn(messages, payload.error.code) ? messages[payload.error.code] : undefined) ?? 'The request failed. Refresh tasks and try again.', false, payload.error.code);
    }
    throw unexpected(mutation);
  }
  const expected = method === 'POST' ? 201 : 200;
  if (response.status !== expected || !object(payload) || !('data' in payload)) throw unexpected(mutation);
  return payload.data;
}
export const taskApi = {
  async list(signal?: AbortSignal): Promise<Task[]> {
    const data = await send('GET', '', undefined, signal);
    if (!Array.isArray(data) || !data.every(isTask) || new Set(data.map((task) => task.id)).size !== data.length) throw unexpected(false);
    return data;
  },
  async create(input: TaskInput): Promise<Task> {
    const data = await send('POST', '', input);
    if (!isTask(data)) throw unexpected(true);
    return data;
  },
  async update(id: string, input: TaskUpdate): Promise<Task> {
    const data = await send('PATCH', `/${encodeURIComponent(id)}`, input);
    if (!isTask(data) || data.id !== id) throw unexpected(true);
    return data;
  },
  async remove(id: string): Promise<void> {
    const data = await send('DELETE', `/${encodeURIComponent(id)}`);
    if (!object(data) || data.id !== id) throw unexpected(true);
  },
};
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Refresh tasks and try again.';
}
