import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { first, second, mockApi, response } from './test/mockApi';

async function ready() { await waitFor(() => expect(screen.queryByText('Loading your tasks…')).not.toBeInTheDocument()); }
function createForm() { return screen.getByRole('form', { name: 'Create task' }); }
function fillTitle(value: string) { fireEvent.change(within(createForm()).getByRole('textbox', { name: /^Title/ }), { target: { value } }); }
function submit() { fireEvent.submit(createForm()); }
function filter(name: string) { fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name} [0-9]`) })); }

describe('Task workspace', () => {
  it('shows initial loading rather than an empty list', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    render(<App />);
    expect(screen.getByText('Loading your tasks…')).toBeVisible();
    expect(screen.queryByText('A fresh start')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeDisabled();
  });
  it('renders tasks, accessible actions, actual counters and progress', async () => {
    mockApi([first, second]); render(<App />); await ready();
    expect(screen.getByRole('heading', { name: first.title })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: `Mark ${first.title} completed` })).not.toBeChecked();
    expect(screen.getByRole('button', { name: `Edit ${first.title}` })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Task completion' })).toHaveAttribute('value', '50');
    expect(screen.getByText('Total tasks').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Active tasks').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Completed tasks').nextElementSibling).toHaveTextContent('1');
  });
  it('shows the empty collection state', async () => {
    mockApi(); render(<App />); await ready();
    expect(screen.getByText('A fresh start')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
  });
  it('creates a trimmed task and resets the form', async () => {
    const fetcher = mockApi(); render(<App />); await ready();
    fillTitle('  A new task  '); submit();
    expect(await screen.findByRole('heading', { name: 'A new task' })).toBeVisible();
    expect(within(createForm()).getByRole('textbox', { name: /^Title/ })).toHaveValue('');
    expect(fetcher.mock.calls.find(([, options]) => options?.method === 'POST')?.[1]?.body).toBe('{"title":"A new task"}');
    expect(screen.getByText('Task created.')).toBeInTheDocument();
  });
  it.each(['', '   ', 'x'.repeat(201)])('rejects invalid title %# without sending a mutation', async (title) => {
    const fetcher = mockApi(); render(<App />); await ready(); fillTitle(title); submit();
    expect(within(createForm()).getByRole('textbox', { name: /^Title/ })).toHaveAttribute('aria-invalid', 'true');
    expect(within(createForm()).getByRole('textbox', { name: /^Title/ })).toHaveFocus();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects an oversized description', async () => {
    const fetcher = mockApi(); render(<App />); await ready(); fillTitle('Valid');
    fireEvent.change(within(createForm()).getByRole('textbox', { name: /Description/ }), { target: { value: 'x'.repeat(5001) } }); submit();
    expect(screen.getByText('Use 5,000 characters or fewer.')).toBeVisible(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('prepopulates and saves edits with completion state', async () => {
    mockApi([first]); render(<App />); await ready();
    fireEvent.click(screen.getByRole('button', { name: `Edit ${first.title}` }));
    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    expect(within(dialog).getByRole('textbox', { name: /^Title/ })).toHaveValue(first.title);
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Title/ }), { target: { value: 'Edited title' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Description/ }), { target: { value: 'Edited description' } });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Completed' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('heading', { name: 'Edited title' })).toBeVisible();
    expect(screen.getByText('Edited description')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Mark Edited title active' })).toBeChecked();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('cancels edits and restores focus without a mutation', async () => {
    const fetcher = mockApi([first]); render(<App />); await ready();
    const edit = screen.getByRole('button', { name: `Edit ${first.title}` }); edit.focus(); fireEvent.click(edit);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Title/ }), { target: { value: 'Unsaved' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(edit).toHaveFocus(); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: first.title })).toBeVisible();
  });
  it('toggles server-confirmed completion and updates progress', async () => {
    const fetcher = mockApi([first]); render(<App />); await ready();
    fireEvent.click(screen.getByRole('checkbox', { name: `Mark ${first.title} completed` }));
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked());
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '100');
    expect(fetcher.mock.calls.at(-1)?.[1]?.body).toBe('{"completed":true}');
  });
  it('confirms deletion only after an explicit second action', async () => {
    const fetcher = mockApi([first]); render(<App />); await ready();
    fireEvent.click(screen.getByRole('button', { name: `Delete ${first.title}` }));
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: first.title })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: `Delete ${first.title}` }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete task' }));
    expect(await screen.findByText('A fresh start')).toBeVisible();
    expect(fetcher.mock.calls.at(-1)?.[1]?.method).toBe('DELETE');
  });
  it('closes a dialog on the native Escape cancel event', async () => {
    mockApi([first]); render(<App />); await ready();
    fireEvent.click(screen.getByRole('button', { name: `Delete ${first.title}` }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('filters tasks without changing collection counters', async () => {
    mockApi([first, second]); render(<App />); await ready();
    filter('Active'); expect(screen.queryByRole('heading', { name: second.title })).not.toBeInTheDocument();
    filter('Completed'); expect(screen.queryByRole('heading', { name: first.title })).not.toBeInTheDocument();
    filter('All'); expect(screen.getByRole('heading', { name: first.title })).toBeVisible();
    expect(screen.getByText('Total tasks').nextElementSibling).toHaveTextContent('2');
  });
  it('distinguishes empty filtered results from an empty collection', async () => {
    mockApi([first]); render(<App />); await ready(); filter('Completed');
    expect(screen.getByText('Progress starts with one task')).toBeVisible();
    expect(screen.queryByText('A fresh start')).not.toBeInTheDocument();
  });
  it('offers read retry after a network failure', async () => {
    const fetcher = mockApi([first]); fetcher.mockRejectedValueOnce(new TypeError('network'));
    render(<App />); await ready(); expect(screen.getByRole('alert')).toHaveTextContent('Unable to reach');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: first.title })).toBeVisible();
  });
  it('shows storage failure without showing an empty list', async () => {
    const fetcher = mockApi(); fetcher.mockResolvedValueOnce(response({ error: { code: 'STORAGE_UNAVAILABLE', message: 'private path' } }, 503));
    render(<App />); await ready();
    expect(screen.getByRole('alert')).toHaveTextContent('Task storage is unavailable');
    expect(screen.queryByText('A fresh start')).not.toBeInTheDocument(); expect(screen.queryByText('private path')).not.toBeInTheDocument();
  });
  it('preserves input after HTTP validation failure', async () => {
    const fetcher = mockApi(); render(<App />); await ready();
    fetcher.mockResolvedValueOnce(response({ error: { code: 'VALIDATION_ERROR', message: 'bad' } }, 400));
    fillTitle('Keep draft'); submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('server rejected');
    expect(within(createForm()).getByRole('textbox', { name: /^Title/ })).toHaveValue('Keep draft');
    expect(screen.queryByText('Task created.')).not.toBeInTheDocument();
  });
  it('preserves edits after failed save', async () => {
    const fetcher = mockApi([first]); render(<App />); await ready();
    fireEvent.click(screen.getByRole('button', { name: `Edit ${first.title}` }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Title/ }), { target: { value: 'Keep edits' } });
    fetcher.mockResolvedValueOnce(response({ error: { code: 'STORAGE_UNAVAILABLE', message: 'bad' } }, 503));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('storage');
    expect(within(dialog).getByRole('textbox', { name: /^Title/ })).toHaveValue('Keep edits');
    expect(screen.getByRole('heading', { name: first.title })).toBeInTheDocument();
  });
  it('does not falsely complete or remove a task after failed mutations', async () => {
    const fetcher = mockApi([first]); render(<App />); await ready();
    const fail = () => response({ error: { code: 'TASK_NOT_FOUND', message: 'missing' } }, 404);
    fetcher.mockResolvedValueOnce(fail()); fireEvent.click(screen.getByRole('checkbox'));
    await screen.findByRole('alert'); expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: `Delete ${first.title}` }));
    fetcher.mockResolvedValueOnce(fail()); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete task' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('no longer exists');
    expect(screen.getByRole('heading', { name: first.title })).toBeInTheDocument();
  });
  it('prevents duplicate in-flight submissions and requires refresh after an uncertain POST', async () => {
    const fetcher = mockApi(); render(<App />); await ready();
    let reject: (error: Error) => void = () => undefined;
    fetcher.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    fillTitle('Only once'); submit(); submit();
    expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await act(async () => { reject(new Error('lost response')); });
    expect(screen.getByRole('button', { name: 'Add task' })).toBeDisabled();
    expect(screen.getByText(/A change could not be confirmed/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh tasks' })); await ready();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeEnabled();
    expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  });
  it('ignores late aborted reads under StrictMode and makes no automatic mutations', async () => {
    const fetcher = mockApi([second]);
    let resolve: (value: Response) => void = () => undefined;
    fetcher.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<StrictMode><App /></StrictMode>); await ready();
    await act(async () => { resolve(response({ data: [first] })); });
    expect(screen.getByRole('heading', { name: second.title })).toBeVisible();
    expect(screen.queryByRole('heading', { name: first.title })).not.toBeInTheDocument();
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });
  it('selects and persists themes and supports returning to the system preference', async () => {
    mockApi(); const view = render(<App />); await ready();
    fireEvent.change(screen.getByRole('combobox', { name: 'Color theme' }), { target: { value: 'dark' } });
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('taskflow-theme')).toBe('dark');
    view.unmount(); render(<App />); await ready();
    expect(screen.getByRole('combobox')).toHaveValue('dark');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'light' } });
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'system' } });
    expect(localStorage.getItem('taskflow-theme')).toBeNull();
  });
});
