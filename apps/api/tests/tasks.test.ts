import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { JsonTaskRepository } from '../src/storage/json-task-repository.js';
import type { TaskRepository } from '../src/tasks/task-repository.js';
import { taskSchema } from '../src/tasks/task.js';
import { fixture } from './helpers.js';

describe('Task HTTP API', () => {
  let context: Awaited<ReturnType<typeof fixture>>;
  beforeEach(async () => { context = await fixture(); });
  afterEach(async () => { await context.cleanup(); });
  async function create() {
    const response = await request(context.app).post('/api/tasks').send({ title: 'First task' }).expect(201);
    return taskSchema.parse(response.body.data);
  }
  it('initializes an empty collection', async () => {
    const response = await request(context.app).get('/api/tasks').expect(200);
    expect(response.body).toEqual({ data: [] });
    expect(JSON.parse(await readFile(context.file, 'utf8'))).toEqual([]);
  });
  it('creates normalized tasks with server-owned fields and optional description', async () => {
    const response = await request(context.app).post('/api/tasks')
      .send({ title: '  Plan work  ', description: 'Keep\nline breaks' }).expect(201);
    const task = taskSchema.parse(response.body.data);
    expect(task.title).toBe('Plan work');
    expect(task.description).toBe('Keep\nline breaks');
    expect(task.completed).toBe(false);
    expect(task.createdAt).toBe(task.updatedAt);
    expect(Date.parse(task.createdAt)).not.toBeNaN();
    const second = await create();
    expect(second.id).not.toBe(task.id);
    expect(second).not.toHaveProperty('description');
    const listed = await request(context.app).get('/api/tasks').expect(200);
    expect(listed.body.data).toEqual([task, second]);
  });
  it('accepts field length boundaries', async () => {
    await request(context.app).post('/api/tasks').send({ title: 'x'.repeat(200), description: 'x'.repeat(5000) }).expect(201);
  });
  it.each([
    {}, { title: '' }, { title: ' \t\n' }, { title: 42 }, { title: null },
    { title: 'x'.repeat(201) }, { title: 'ok', description: 'x'.repeat(5001) },
    { title: 'ok', description: false }, { title: 'ok', description: null },
    { title: 'ok', completed: true }, { title: 'ok', id: randomUUID() },
    { title: 'ok', createdAt: new Date().toISOString() }, { title: 'ok', updatedAt: 'x' },
    { title: 'ok', unknown: 'field' }, [],
  ])('rejects invalid create body %#', async (body) => {
    const response = await request(context.app).post('/api/tasks').send(body).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect((await context.repository.list())).toEqual([]);
  });
  it('partially updates fields, clears description and toggles completion both ways', async () => {
    const original = await create();
    const response = await request(context.app).patch(`/api/tasks/${original.id}`)
      .send({ title: '  Revised  ', description: 'Details', completed: true }).expect(200);
    const updated = taskSchema.parse(response.body.data);
    expect(updated).toMatchObject({ id: original.id, title: 'Revised', description: 'Details', completed: true, createdAt: original.createdAt });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(original.updatedAt));
    const cleared = await request(context.app).patch(`/api/tasks/${original.id}`)
      .send({ description: '', completed: false }).expect(200);
    expect(cleared.body.data).toMatchObject({ title: 'Revised', description: '', completed: false });
  });
  it.each([
    {}, { title: ' ' }, { title: 1 }, { title: 'x'.repeat(201) },
    { description: 'x'.repeat(5001) }, { description: null }, { description: 3 },
    { completed: 'true' }, { completed: null }, { id: randomUUID() },
    { createdAt: '2026-01-01T00:00:00.000Z' }, { updatedAt: 'x' },
    { unexpected: true }, { title: 'ok', unexpected: true }, [],
  ])('rejects invalid patch body %# without changing the task', async (body) => {
    const task = await create();
    const response = await request(context.app).patch(`/api/tasks/${task.id}`).send(body).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(await context.repository.list()).toEqual([task]);
  });
  it('deletes an existing task and returns 404 on repeated deletion', async () => {
    const task = await create();
    const response = await request(context.app).delete(`/api/tasks/${task.id}`).expect(200);
    expect(response.body).toEqual({ data: { id: task.id } });
    expect(await context.repository.list()).toEqual([]);
    await request(context.app).delete(`/api/tasks/${task.id}`).expect(404);
  });
  it('returns task-specific 404 for well-formed missing identifiers', async () => {
    const response = await request(context.app).patch(`/api/tasks/${randomUUID()}`).send({ completed: true }).expect(404);
    expect(response.body).toEqual({ error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' } });
    await request(context.app).delete(`/api/tasks/${randomUUID()}`).expect(404);
  });
  it('rejects malformed identifiers before touching storage', async () => {
    await request(context.app).patch('/api/tasks/not-a-uuid').send({ completed: true }).expect(400);
    await request(context.app).delete('/api/tasks/not-a-uuid').expect(400);
    await expect(readFile(context.file)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it.each(['{', '{"title":}', 'null', '42'])('handles malformed or non-object JSON: %s', async (body) => {
    const response = await request(context.app).post('/api/tasks').set('Content-Type', 'application/json').send(body).expect(400);
    expect(response.body).toEqual({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
  });
  it('handles invalid URL encoding safely', async () => {
    const response = await request(context.app).delete('/api/tasks/%ZZ').expect(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
  });
  it('rejects absent JSON body', async () => {
    await request(context.app).post('/api/tasks').set('Content-Type', 'application/json').expect(400);
  });
  it('limits request bytes', async () => {
    const response = await request(context.app).post('/api/tasks').send({ title: 'x'.repeat(33 * 1024) }).expect(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
  it('rejects unsupported media type, charset and compression', async () => {
    await request(context.app).post('/api/tasks').type('text').send('{}').expect(415);
    await request(context.app).post('/api/tasks').set('Content-Type', 'application/json; charset=iso-8859-1').send('{}').expect(415);
    await request(context.app).post('/api/tasks').set('Content-Type', 'application/json').set('Content-Encoding', 'gzip').send('{}').expect(415);
  });
  it('persists creation, editing and deletion across application recreation', async () => {
    const first = await create();
    const second = await create();
    await request(context.app).patch(`/api/tasks/${first.id}`).send({ completed: true }).expect(200);
    await request(context.app).delete(`/api/tasks/${second.id}`).expect(200);
    const restarted = createApp(new JsonTaskRepository(context.file));
    const response = await request(restarted).get('/api/tasks').expect(200);
    expect(response.body.data).toEqual([{ ...first, completed: true, updatedAt: expect.any(String) }]);
  });
  it('handles concurrent HTTP creates without lost tasks', async () => {
    const responses = await Promise.all(Array.from({ length: 30 }, (_, i) =>
      request(context.app).post('/api/tasks').send({ title: `Task ${i}` }).expect(201)));
    const tasks = await context.repository.list();
    expect(tasks).toHaveLength(30);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(responses.length);
  });
  it('maps corrupt storage to safe 503 while health remains live', async () => {
    await context.repository.list();
    await writeFile(context.file, '{broken secret data');
    const response = await request(context.app).post('/api/tasks').send({ title: 'New' }).expect(503);
    expect(response.body).toEqual({ error: { code: 'STORAGE_UNAVAILABLE', message: 'Task storage is unavailable.' } });
    expect(await readFile(context.file, 'utf8')).toBe('{broken secret data');
    await request(context.app).get('/api/health').expect(200);
  });
  it('does not disclose unexpected internal error details', async () => {
    const broken: TaskRepository = { ...context.repository,
      list: () => Promise.reject(new Error('/private/path secret stack')),
      create: (task) => context.repository.create(task),
      update: (id, input, at) => context.repository.update(id, input, at),
      delete: (id) => context.repository.delete(id),
    };
    const response = await request(createApp(broken)).get('/api/tasks').expect(500);
    expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  });
});
