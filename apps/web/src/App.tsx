import { useState } from 'react';
import { AlertCircle, CheckCheck, CheckCircle2, ListTodo, RefreshCw, Sparkles } from 'lucide-react';
import { Dialog } from './components/Dialog';
import { errorMessage } from './api/tasks';
import { ThemeControl } from './theme/ThemeControl';
import { TaskForm } from './tasks/TaskForm';
import { TaskRow } from './tasks/TaskRow';
import { TaskStats } from './tasks/TaskStats';
import { DeleteDialog } from './tasks/DeleteDialog';
import { useTasks } from './tasks/useTasks';
import type { Filter, Task } from './tasks/types';

export function App() {
  const state = useTasks();
  const [filter, setFilter] = useState<Filter>('All');
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [actionError, setActionError] = useState('');
  const completed = state.tasks.filter((task) => task.completed).length;
  const visible = state.tasks.filter((task) => filter === 'All' || (filter === 'Completed') === task.completed);
  async function toggle(task: Task) {
    setActionError('');
    try { await state.update(task.id, { completed: !task.completed }); }
    catch (error: unknown) { setActionError(errorMessage(error)); }
  }
  function refresh() { setActionError(''); void state.refresh(); }
  return <>
    <a className="skip-link" href="#main">Skip to tasks</a>
    <header className="site-header"><div className="header-inner">
      <div className="brand"><span className="brand-mark"><CheckCheck size={23} aria-hidden="true" /></span>TaskFlow<span className="workspace-label">Your workspace</span></div>
      <ThemeControl />
    </div></header>
    <main id="main" className="page">
      <div className="page-intro"><div><p className="eyebrow">A little focus. A lot of progress.</p><h1 id="tasks-heading" tabIndex={-1}>My tasks<span className="heading-dot">.</span></h1>
        <p className="subtitle">Make room for what matters. One task at a time.</p></div>
        <button className="button secondary refresh" onClick={refresh} disabled={state.busy || state.status === 'loading'}><RefreshCw size={16} aria-hidden="true" />Refresh tasks</button></div>
      <TaskStats total={state.tasks.length} completed={completed} available={state.status === 'ready'} />
      <div className="workspace-grid">
        <aside className="composer panel" aria-labelledby="new-task-heading"><div className="panel-heading"><span className="section-icon"><ListTodo size={19} aria-hidden="true" /></span><h2 id="new-task-heading">New task</h2></div>
          <p className="muted composer-intro">Start with one small next step.</p>
          <TaskForm disabled={state.disabled} onSave={async (input) => { await state.create(input); setFilter('All'); }} />
          <p className="composer-note"><CheckCircle2 size={14} aria-hidden="true" />Changes are saved to your local server.</p>
        </aside>
        <section className="task-panel panel" aria-label="Your tasks">
          <h2 className="sr-only">Task list</h2>
          <div className="list-toolbar"><div className="filter-group" role="group" aria-label="Filter tasks">
            {(['All', 'Active', 'Completed'] as const).map((value) => <button key={value} className="filter-button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}{' '}<span className="filter-count">{state.status === 'ready' ? value === 'All' ? state.tasks.length : value === 'Active' ? state.tasks.length - completed : completed : '—'}</span></button>)}
          </div>{state.busy && <span className="pending-status">Saving changes…</span>}</div>
          {state.uncertain && <p role="alert" className="error-message list-error">A change could not be confirmed. Close any dialog and refresh tasks before submitting again. Check whether your change was already saved.</p>}
          {actionError && <p role="alert" className="error-message list-error">{actionError}</p>}
          {state.status === 'loading' && <div className="list-state" role="status"><span className="loading-ring" aria-hidden="true" /><h2>Loading your tasks…</h2><p>Getting everything in order.</p></div>}
          {state.status === 'error' && <div className="list-state"><AlertCircle size={32} aria-hidden="true" /><h2>We couldn’t load your tasks</h2><p role="alert">{state.readError}</p><button className="button secondary" onClick={refresh}>Try again</button></div>}
          {state.status === 'ready' && (visible.length ? <ul className="task-list">{visible.map((task) => <TaskRow key={task.id} task={task} disabled={state.disabled}
            onToggle={() => { void toggle(task); }} onEdit={() => setEditing(task)} onDelete={() => setDeleting(task)} />)}</ul>
            : <div className="list-state"><span className="empty-icon"><Sparkles size={28} aria-hidden="true" /></span>
              <h2>{!state.tasks.length ? 'A fresh start' : filter === 'Active' ? 'You’re all caught up' : 'Progress starts with one task'}</h2>
              <p>{!state.tasks.length ? 'Add your first task and turn a little intention into progress.' : filter === 'Active' ? 'No active tasks. Enjoy a little breathing room.' : 'No completed tasks yet. Check one off when it’s done.'}</p>
              {state.tasks.length > 0 && <button className="button secondary" onClick={() => setFilter('All')}>Show all tasks</button>}
            </div>)}
        </section>
      </div>
      <footer className="page-footer"><span>Small steps, steady progress.</span><span>Local workspace · No account required</span></footer>
      <p className="sr-only" role="status" aria-live="polite">{state.busy ? 'Saving changes…' : state.announcement}</p>
    </main>
    {editing && <Dialog title="Edit task" id="edit-heading" busy={state.busy} onClose={() => setEditing(null)}>
      <TaskForm task={editing} disabled={state.disabled} onCancel={() => setEditing(null)} onSave={async (input) => { await state.update(editing.id, input); setEditing(null); }} />
    </Dialog>}
    {deleting && <DeleteDialog task={deleting} disabled={state.disabled} onClose={() => setDeleting(null)} onDelete={() => state.remove(deleting.id)} />}
  </>;
}
