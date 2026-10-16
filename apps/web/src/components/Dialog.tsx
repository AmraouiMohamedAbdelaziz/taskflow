import { useEffect, useRef, type ReactNode } from 'react';
interface Props { title: string; id: string; busy: boolean; onClose: () => void; children: ReactNode }
export function Dialog({ title, id, busy, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected && !previous.matches(':disabled')) previous.focus();
      else document.getElementById('tasks-heading')?.focus();
    };
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby={id} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id={id}>{title}</h2>{children}
  </dialog>;
}
