interface Props { total: number; completed: number; available: boolean }
export function TaskStats({ total, completed, available }: Props) {
  const percent = total ? Math.round(completed / total * 100) : 0;
  return <section className="stats-panel" aria-label="Task overview">
    <dl className="stats">
      <div><dt>Total tasks</dt><dd>{available ? total : '—'}</dd></div>
      <div><dt>Active tasks</dt><dd>{available ? total - completed : '—'}</dd></div>
      <div><dt>Completed tasks</dt><dd>{available ? completed : '—'}</dd></div>
    </dl>
    <div className="progress-block"><div className="progress-caption"><span>Completion</span><strong>{available ? `${percent}%` : '—'}</strong></div>
      {available ? <progress aria-label="Task completion" max={100} value={percent}>{percent}%</progress> : <div className="progress-placeholder" />}
    </div>
  </section>;
}
