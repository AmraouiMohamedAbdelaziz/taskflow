import { useState } from 'react';
import { Dialog } from '../components/Dialog';
import { errorMessage } from '../api/tasks';
import type { Task } from './types';
interface Props { task: Task; disabled: boolean; onClose: () => void; onDelete: () => Promise<void> }
export function DeleteDialog({ task, disabled, onClose, onDelete }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    if (pending || disabled) return;
    setPending(true); setError('');
    try { await onDelete(); onClose(); }
    catch (failure: unknown) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }
  return <Dialog title="Delete this task?" id="delete-heading" busy={pending} onClose={onClose}>
    <p className="dialog-description">“{task.title}” will be permanently removed. This cannot be undone.</p>
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="form-actions"><button className="button secondary" autoFocus onClick={onClose} disabled={pending}>Cancel</button>
      <button className="button danger" onClick={() => { void confirm(); }} disabled={pending || disabled}>{pending ? 'Deleting…' : 'Delete task'}</button></div>
  </Dialog>;
}
