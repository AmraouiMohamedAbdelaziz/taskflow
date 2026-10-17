import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Save } from 'lucide-react';
import { errorMessage } from '../api/tasks';
import type { Task, TaskInput, TaskUpdate } from './types';
interface Props {
  task?: Task;
  disabled: boolean;
  onSave: (input: TaskInput & TaskUpdate) => Promise<void>;
  onCancel?: () => void;
}
export function TaskForm({ task, disabled, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [completed, setCompleted] = useState(task?.completed ?? false);
  const [errors, setErrors] = useState({ title: '', description: '' });
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);
  const submitted = useRef(false);
  const restoreFocus = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const prefix = task ? 'edit' : 'create';
  useEffect(() => {
    if (!pending && restoreFocus.current) {
      restoreFocus.current = false;
      titleRef.current?.focus();
    }
  }, [pending]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted.current || disabled) return;
    const normalized = title.trim();
    const validation = {
      title: !normalized ? 'Enter a task title.' : normalized.length > 200 ? 'Use 200 characters or fewer.' : '',
      description: description.length > 5000 ? 'Use 5,000 characters or fewer.' : '',
    };
    setErrors(validation); setFailure('');
    if (validation.title || validation.description) {
      (validation.title ? titleRef.current : descriptionRef.current)?.focus(); return;
    }
    submitted.current = true; setPending(true);
    try {
      await onSave({ title: normalized, ...(description || task?.description !== undefined ? { description } : {}),
        ...(task ? { completed } : {}) });
      if (!task) { setTitle(''); setDescription(''); restoreFocus.current = true; }
    } catch (error: unknown) { setFailure(errorMessage(error)); }
    finally { submitted.current = false; setPending(false); }
  }
  return <form onSubmit={(event) => { void submit(event); }} noValidate aria-label={task ? 'Edit task' : 'Create task'}>
    <div className="field"><label htmlFor={`${prefix}-title`}>Title <span aria-hidden="true">*</span></label>
      <input ref={titleRef} id={`${prefix}-title`} value={title} required disabled={pending}
        aria-invalid={Boolean(errors.title)} aria-describedby={`${prefix}-title-hint ${prefix}-title-error`}
        placeholder="What needs to get done?" onChange={(event) => setTitle(event.target.value)} />
      <span id={`${prefix}-title-hint`} className="field-hint">200 characters maximum</span>
      <span id={`${prefix}-title-error`} className="field-error" aria-live="polite">{errors.title}</span></div>
    <div className="field"><label htmlFor={`${prefix}-description`}>Description <span className="optional">Optional</span></label>
      <textarea ref={descriptionRef} id={`${prefix}-description`} value={description} rows={4} disabled={pending}
        aria-invalid={Boolean(errors.description)} aria-describedby={`${prefix}-description-hint ${prefix}-description-error`}
        placeholder="Add a little context…" onChange={(event) => setDescription(event.target.value)} />
      <span id={`${prefix}-description-hint`} className="field-hint">{description.length.toLocaleString()} / 5,000 characters</span>
      <span id={`${prefix}-description-error`} className="field-error" aria-live="polite">{errors.description}</span></div>
    {task && <label className="check-label"><input type="checkbox" checked={completed} disabled={pending}
      onChange={(event) => setCompleted(event.target.checked)} /> Completed</label>}
    {failure && <p role="alert" className="error-message">{failure}</p>}
    <div className="form-actions">
      {onCancel && <button type="button" className="button secondary" onClick={onCancel} disabled={pending}>Cancel</button>}
      <button className="button primary" type="submit" disabled={disabled || pending}>
        {task ? <Save size={17} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        {pending ? 'Saving…' : task ? 'Save changes' : 'Add task'}
      </button>
    </div>
  </form>;
}
