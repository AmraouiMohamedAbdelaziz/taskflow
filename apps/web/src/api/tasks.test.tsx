import { expect, it, vi } from 'vitest';
import { taskApi } from './tasks';
import { first, mockApi, response } from '../test/mockApi';
it.each([{}, { data: null }, { data: [{}] }, { data: [first, first] }])('rejects unexpected collection payload %#', async (payload) => {
  const fetcher = mockApi(); fetcher.mockResolvedValueOnce(response(payload));
  await expect(taskApi.list()).rejects.toThrow('unexpected response');
});
it('rejects invalid JSON responses', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Oops</html>', { status: 200 })));
  await expect(taskApi.list()).rejects.toThrow('unexpected response');
});
it('treats malformed mutation success as uncertain', async () => {
  const fetcher = mockApi(); fetcher.mockResolvedValueOnce(response({ data: {} }, 201));
  await expect(taskApi.create({ title: 'Task' })).rejects.toMatchObject({ uncertain: true });
});
it('rejects mismatched identifiers on update/delete', async () => {
  const fetcher = mockApi(); fetcher.mockResolvedValueOnce(response({ data: { ...first, id: '00000000-0000-4000-8000-000000000000' } }));
  await expect(taskApi.update(first.id, { completed: true })).rejects.toMatchObject({ uncertain: true });
  fetcher.mockResolvedValueOnce(response({ data: { id: 'different' } }));
  await expect(taskApi.remove(first.id)).rejects.toMatchObject({ uncertain: true });
});

it.each(['2026-02-30T12:00:00.000Z', '2026-10-16T12:00Z', '2026-10-16T24:00:00.000Z'])('rejects invalid/non-contract timestamp %s', async (createdAt) => {
  const fetcher = mockApi(); fetcher.mockResolvedValueOnce(response({ data: [{ ...first, createdAt }] }));
  await expect(taskApi.list()).rejects.toThrow('unexpected response');
});
it.each(['__proto__', 'constructor', 'toString'])('normalizes unknown error code %s without prototype lookups', async (code) => {
  const fetcher = mockApi(); fetcher.mockResolvedValueOnce(response({ error: { code, message: 'Internal details' } }, 500));
  await expect(taskApi.list()).rejects.toThrow('The request failed. Refresh tasks and try again.');
});
