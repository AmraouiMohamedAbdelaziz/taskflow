export class TaskNotFoundError extends Error {
  constructor() { super('Task not found.'); }
}
export class StorageError extends Error {
  constructor(cause: unknown) {
    super('Task storage is unavailable.', { cause });
  }
}
