import { expect, it } from 'vitest';
import { parseConfig } from '../src/config.js';
it('uses local development defaults', () => {
  expect(parseConfig({})).toMatchObject({ HOST: '127.0.0.1', PORT: 3001 });
});
it.each(['0', '65536', '3.5', 'abc', ''])('rejects invalid port %s', (PORT) => {
  expect(() => parseConfig({ PORT })).toThrow();
});
it('accepts a configured port', () => {
  expect(parseConfig({ PORT: '4000' }).PORT).toBe(4000);
});

it("rejects empty storage paths", () => { expect(() => parseConfig({ TASKS_FILE: "  " })).toThrow(); });
