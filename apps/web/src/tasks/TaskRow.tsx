import { Pencil, Trash2 } from 'lucide-react';
import type { Task } from './types';
interface Props { task: Task; disabled: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }
const date = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });
export function TaskRow({ task, disabled, onToggle, onEdit, onDelete }: Props) {
  return <li className={`task-row ${task.completed ? 'is-complete' : ''}`}>
    <input className="task-checkbox" type="checkbox" checked={task.completed} disabled={disabled}
      aria-label={`Mark ${task.title} ${task.completed ? 'active' : 'completed'}`} onChange={onToggle} />
    <div className="task-copy"><h3>{task.title}</h3>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-meta"><span className={`badge ${task.completed ? 'done' : ''}`}>{task.completed ? 'Completed' : 'Active'}</span>
        <span>Created <time dateTime={task.createdAt}>{date.format(new Date(task.createdAt))}</time></span></div>
    </div>
    <div className="task-actions"><button className="icon-button" aria-label={`Edit ${task.title}`} onClick={onEdit} disabled={disabled}><Pencil size={17} aria-hidden="true" /></button>
      <button className="icon-button delete-action" aria-label={`Delete ${task.title}`} onClick={onDelete} disabled={disabled}><Trash2 size={17} aria-hidden="true" /></button></div>
  </li>;
}
