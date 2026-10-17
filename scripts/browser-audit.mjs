/** Optional real-browser acceptance. Run after build; no personal task data is used. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import axe from 'axe-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const engine = process.argv.find((arg) => arg.startsWith('--browser='))?.split('=')[1] ?? 'chromium';
assert.ok(['chromium', 'firefox', 'webkit'].includes(engine), 'Select chromium, firefox or webkit.');
const capture = process.argv.includes('--screenshots');
const directory = await mkdtemp(join(tmpdir(), 'taskflow-acceptance-'));
const storage = join(directory, 'tasks.json');
const screenshots = join(root, 'docs', 'screenshots');
let api;
let web;
let browser;
const consoleErrors = [];
let axeChecks = 0;

// Wait for this process's own readiness message. Never attach to a user's server.
async function launchServer(args, cwd, env, readyText) {
  const child = spawn(process.execPath, args, {
    cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    let logs = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Startup timed out: ${logs}`)); }, 15_000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error(`Server exited before readiness: ${logs}`)); });
    child.stdout.on('data', (data) => {
      logs += data;
      if (logs.includes(readyText)) { clearTimeout(timer); resolve(); }
    });
    child.stderr.on('data', (data) => { logs += data; });
  });
  return child;
}
async function startApi() {
  api = await launchServer(['apps/api/dist/server.js'], root,
    { HOST: '127.0.0.1', PORT: '3001', TASKS_FILE: storage }, 'TaskFlow API:');
}
async function stop(child) {
  if (child && child.exitCode === null) {
    const stopped = once(child, 'exit');
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    await stopped;
    clearTimeout(timer);
  }
}
try {
  await startApi();
  web = await launchServer(['../../node_modules/vite/bin/vite.js'], join(root, 'apps/web'), {}, 'Local:');
  const type = { chromium, firefox, webkit }[engine];
  // Optional custom binary/flags for constrained QA hosts; default uses Playwright browsers.
  const executablePath = process.env.TASKFLOW_QA_BROWSER_PATH;
  const args = process.env.TASKFLOW_QA_BROWSER_ARGS_FILE
    ? JSON.parse(await readFile(process.env.TASKFLOW_QA_BROWSER_ARGS_FILE, 'utf8')) : undefined;
  browser = await type.launch({ headless: true, ...(executablePath ? { executablePath } : {}), ...(args ? { args } : {}) });
  console.log(`Engine: ${engine} ${browser.version()}`);
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  async function accessibility(label) {
    await page.evaluate(axe.source);
    const result = await page.evaluate(() => window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    }));
    assert.deepEqual(result.violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })), [], label);
    axeChecks++;
  }
  async function create(title, description = '') {
    const form = page.getByRole('form', { name: 'Create task' });
    await form.getByRole('textbox', { name: /^Title/ }).fill(title);
    await form.getByRole('textbox', { name: /Description/ }).fill(description);
    await form.getByRole('button', { name: 'Add task' }).click();
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === 'create-title');
  }
  async function noOverflow() {
    const overflow = await page.evaluate(() => ({
      width: innerWidth, document: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll('main *')].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).map((element) => element.className).slice(0, 8),
    }));
    assert.ok(overflow.document <= overflow.width, `Horizontal page overflow: ${JSON.stringify(overflow)}`);
  }
  await page.goto('http://127.0.0.1:5173');
  await page.getByText('A fresh start', { exact: true }).waitFor();
  await accessibility('empty light');
  const form = page.getByRole('form', { name: 'Create task' });
  await form.getByRole('textbox', { name: /^Title/ }).fill('   ');
  await form.getByRole('button', { name: 'Add task' }).click();
  await page.getByText('Enter a task title.', { exact: true }).waitFor();
  assert.equal(await form.getByRole('textbox', { name: /^Title/ }).evaluate((element) => element === document.activeElement), true);
  await accessibility('invalid form');
  await create('Review TaskFlow', 'Read the frontend and API together.');
  await page.getByRole('button', { name: 'Edit Review TaskFlow', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await accessibility('edit dialog');
  await dialog.getByRole('textbox', { name: /^Title/ }).fill('Review the release');
  await dialog.getByRole('textbox', { name: /Description/ }).fill('Run the complete application.');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('checkbox', { name: 'Mark Review the release completed', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Mark Review the release active', exact: true }).waitFor();
  await page.getByRole('button', { name: /^Active / }).click();
  await page.getByText('You’re all caught up', { exact: true }).waitFor();
  await page.getByRole('button', { name: /^Completed / }).click();
  await page.getByRole('heading', { name: 'Review the release', exact: true }).waitFor();
  assert.equal(await page.getByRole('progressbar').getAttribute('value'), '100');
  await page.reload();
  await page.getByRole('checkbox', { name: 'Mark Review the release active', exact: true }).waitFor();
  await stop(api); await startApi(); await page.reload();
  await page.getByRole('checkbox', { name: 'Mark Review the release active', exact: true }).waitFor();
  console.log('PASS create, edit, completion, filters, progress, reload and real API restart persistence');

  const remove = page.getByRole('button', { name: 'Delete Review the release', exact: true });
  await remove.click(); dialog = page.getByRole('dialog');
  await accessibility('delete dialog');
  assert.equal(await dialog.getByRole('button', { name: 'Cancel' }).evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press('Tab');
  assert.equal(await dialog.getByRole('button', { name: 'Delete task' }).evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await dialog.getByRole('button', { name: 'Cancel' }).evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
  assert.equal(await remove.evaluate((element) => element === document.activeElement), true);
  await remove.click(); await page.getByRole('dialog').getByRole('button', { name: 'Delete task' }).click();
  await page.getByText('A fresh start', { exact: true }).waitFor();
  await page.reload(); await page.getByText('A fresh start', { exact: true }).waitFor();
  console.log('PASS delete Cancel focus, Tab/Shift+Tab, Escape, focus restoration, confirmed deletion and reload');

  // Real transport failure and recovery, then real backend schema/storage errors.
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Refresh tasks' }).click();
  await page.getByText(/Unable to reach the server/).waitFor();
  await accessibility('network failure');
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByText('A fresh start', { exact: true }).waitFor();
  await page.route('**/api/tasks', async (route) => {
    if (route.request().method() === 'POST') await route.continue({ postData: JSON.stringify({ title: ' ' }) });
    else await route.continue();
  });
  await form.getByRole('textbox', { name: /^Title/ }).fill('Keep my draft');
  await form.getByRole('button', { name: 'Add task' }).click();
  await page.getByText(/The server rejected these values/).waitFor();
  assert.equal(await form.getByRole('textbox', { name: /^Title/ }).inputValue(), 'Keep my draft');
  await page.unroute('**/api/tasks');
  await writeFile(storage, '{broken');
  await page.getByRole('button', { name: 'Refresh tasks' }).click();
  await page.getByRole('alert').filter({ hasText: 'Task storage is unavailable' }).waitFor();
  assert.equal(await readFile(storage, 'utf8'), '{broken');
  await accessibility('storage failure');
  await writeFile(storage, '[]');
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByText('A fresh start', { exact: true }).waitFor();
  await page.reload(); await page.getByText('A fresh start', { exact: true }).waitFor();
  console.log('PASS real network recovery, HTTP validation failure and preserved corrupt storage/503 recovery');

  await create('Shape the next version', 'Map out the small improvements that will make a meaningful difference.');
  await create('Review the API integration', 'Check the happy path, then spend a little time with the edge cases.');
  await create('Write a thoughtful README', 'Make it easy for someone new to understand the project.');
  await create('Finish the backend foundation', 'Validation, persistence, and tests — all in place.');
  await page.getByRole('checkbox', { name: 'Mark Finish the backend foundation completed', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Mark Finish the backend foundation active', exact: true }).waitFor();
  assert.equal(await page.getByRole('progressbar').getAttribute('value'), '25');
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Color theme' }).selectOption(theme);
    await page.reload(); await page.getByRole('heading', { name: 'Shape the next version', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
    for (const width of [320, 375, 390, 430, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 960 }); await noOverflow();
      if (width === 390 || width === 1280) {
        await accessibility(`${theme} ${width}`);
        if (capture) {
          await mkdir(screenshots, { recursive: true });
          await page.screenshot({ path: join(screenshots, `${width === 1280 ? 'desktop' : 'mobile'}-${theme}.png`), fullPage: true });
        }
      }
    }
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'Edit Shape the next version', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: /^Title/ }).fill('x'.repeat(200));
  await dialog.getByRole('textbox', { name: /Description/ }).fill('y'.repeat(5000));
  await accessibility('small dark edit dialog');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await dialog.waitFor({ state: 'detached' }); await noOverflow();
  // Text resize is separate from narrow viewport reflow; this is not OS/browser zoom.
  await page.evaluate(() => { document.querySelectorAll('main h1, main h2, main h3, main p, main label, main button').forEach((element) => { element.style.fontSize = `${parseFloat(getComputedStyle(element).fontSize) * 2}px`; }); });
  await noOverflow();
  await page.reload(); await page.getByRole('heading', { name: 'x'.repeat(200), exact: true }).waitFor();
  await page.getByRole('combobox').selectOption('system');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  assert.deepEqual(consoleErrors, [], 'Browser runtime errors');
  console.log(`PASS both themes, persistence/system preferences, 7 widths, long content, text resizing, no runtime errors; ${axeChecks} axe checks without violations`);
} finally {
  await browser?.close(); await stop(web); await stop(api);
  await rm(directory, { recursive: true, force: true });
}
