import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage, taskApi } from '../api/tasks';
import type { Task, TaskInput, TaskUpdate } from './types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [readError, setReadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const lock = useRef(false);
  const alive = useRef(false);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);

  const load = useCallback(() => {
    if (lock.current) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const version = ++generation.current;
    void taskApi.list(controller.signal).then((next) => {
      if (!alive.current || controller.signal.aborted || version !== generation.current) return;
      setTasks(next); setStatus('ready'); setUncertain(false);
    }, (error: unknown) => {
      if (!alive.current || controller.signal.aborted || version !== generation.current) return;
      setReadError(errorMessage(error)); setStatus('error');
    });
  }, []);
  useEffect(() => {
    alive.current = true;
    void load();
    return () => { alive.current = false; request.current?.abort(); };
  }, [load]);

  function refresh() {
    if (lock.current) return;
    setStatus('loading'); setReadError(''); void load();
  }

  async function mutate(operation: () => Promise<void>, message: string): Promise<void> {
    if (lock.current || status !== 'ready' || uncertain) throw new ApiError('Wait for the current operation or refresh tasks first.');
    lock.current = true; setBusy(true); setAnnouncement('');
    try {
      await operation();
      if (alive.current) setAnnouncement(message);
    } catch (error: unknown) {
      if (alive.current && error instanceof ApiError && error.uncertain) setUncertain(true);
      throw error;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const create = (input: TaskInput) => mutate(async () => {
    const saved = await taskApi.create(input);
    if (alive.current) setTasks((current) => [...current, saved]);
  }, 'Task created.');
  const update = (id: string, input: TaskUpdate) => mutate(async () => {
    const saved = await taskApi.update(id, input);
    if (alive.current) setTasks((current) => current.map((task) => task.id === id ? saved : task));
  }, 'Task updated.');
  const remove = (id: string) => mutate(async () => {
    await taskApi.remove(id);
    if (alive.current) setTasks((current) => current.filter((task) => task.id !== id));
  }, 'Task deleted.');
  return { tasks, status, readError, busy, uncertain, announcement, refresh, create, update, remove,
    disabled: busy || uncertain || status !== 'ready' };
}
