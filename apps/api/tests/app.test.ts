import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixture } from './helpers.js';
describe('HTTP foundation', () => {
  let context: Awaited<ReturnType<typeof fixture>>;
  beforeEach(async () => { context = await fixture(); });
  afterEach(async () => { await context.cleanup(); });
  it('exposes a JSON health response without framework disclosure', async () => {
    const response = await request(context.app).get('/api/health').expect(200).expect('Content-Type', /json/);
    expect(response.body).toEqual({ data: { status: 'ok' } });
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });
  it('returns the standard JSON error for unknown routes', async () => {
    const response = await request(context.app).get('/api/unknown').expect(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });
});

// Local browser protections do not replace authentication or firewall controls.
describe('Local API security', () => {
  let context: Awaited<ReturnType<typeof fixture>>;
  beforeEach(async () => { context = await fixture(); });
  afterEach(async () => { await context.cleanup(); });
  it('prevents caching/sniffing on success and error responses', async () => {
    for (const route of ['/api/health', '/api/unknown']) {
      const response = await request(context.app).get(route);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
      expect(response.headers).not.toHaveProperty('etag');
    }
  });
  it.each(['https://attacker.example', 'null', 'http://localhost.attacker.example', 'http://user@localhost:5173', 'http://localhost:5173/path'])('rejects browser origin %s', async (origin) => {
    const response = await request(context.app).post('/api/tasks').set('Origin', origin).send({ title: 'Blocked' }).expect(403);
    expect(response.body.error.code).toBe('LOCAL_ACCESS_ONLY');
    expect(await context.repository.list()).toEqual([]);
  });
  it.each(['attacker.example', 'localhost.attacker.example', 'user@localhost'])('rejects rebinding Host %s', async (host) => {
    await request(context.app).get('/api/tasks').set('Host', host).expect(403);
  });
  it.each(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://[::1]:5173'])('accepts local origin %s', async (origin) => {
    await request(context.app).post('/api/tasks').set('Origin', origin).send({ title: 'Allowed' }).expect(201);
  });
});
