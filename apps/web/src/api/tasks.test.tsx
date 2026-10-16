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
