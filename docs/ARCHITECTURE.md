# Architecture

## Workspace foundation

The existing private npm workspaces separate browser and server dependencies.
Shared TypeScript settings enforce strict types, checked indexed access and exact
optional properties. API uses Node ESM; web uses Vite bundler resolution. No new
workspace, framework or dependency was added in Checkpoint 02.

## Backend dependency flow

HTTP router/controllers → TaskService → TaskRepository → JsonTaskRepository.

- `http/task-routes.ts`: HTTP controller functions, Zod request parsing and status codes.
- `tasks/task.ts`: input schemas, persisted task schema and inferred domain types.
- `tasks/task-service.ts`: UUIDs, timestamps, initial completion and missing-task rules.
- `tasks/task-repository.ts`: asynchronous, domain-oriented persistence contract.
- `storage/json-task-repository.ts`: filesystem details, collection integrity and serialization.
- `http/error-handler.ts`: centralized public error translation; no internal error disclosure.
- `app.ts`: dependency composition without opening a listening port.
- `server.ts`: creates exactly one JSON repository and handles process lifecycle.

`createApp(repository)` requires explicit injection. Tests use temporary directories,
never the configured local data file. The repository interface exposes neither HTTP
nor filesystem objects. V2 can provide a PostgreSQL implementation with atomic
mutations and the same missing-task semantics without replacing the service/router.
No generic repository framework or separate controller class is needed.

## Persistence and concurrency

The default file is `apps/api/data/tasks.json`, resolved relative to the API module
so source and compiled entry points use the same location. `TASKS_FILE` overrides
it; relative overrides resolve from the process working directory. Keep custom
paths outside Git or add them to `.gitignore`.

Use **one shared repository instance per file in one API writer process**. Every
read or mutation enters a promise queue. A mutation reads the latest file, validates
it, changes it and completes the write before releasing the queue. Failure resets
the queue's settled tail, so later requests can recover after the underlying fault
is resolved. Reads are serialized too, avoiding partial initialization visibility.

On first access, missing parent directories are created. The initial empty JSON
array is written to a unique same-directory temporary file, flushed and closed,
then published using an exclusive hard link. If the target appeared in the meantime,
it is read and validated rather than replaced. Existing empty or invalid files
are errors, not new storage.

Updates use exclusive temporary-file creation (`wx`, mode 0600), a complete write,
file sync, close, then same-directory rename. This provides atomic replacement on
supported local filesystems. A failure before replacement leaves the old bytes
unchanged. Temporary cleanup is best-effort: cleanup failure must not falsely report
an already committed operation as failed. A crash or cleanup failure may leave an
unused `.tmp` file; it is never automatically promoted to real task data.

Each read validates the complete array, strict task fields and unique identifiers.
Corruption is never silently reset or repaired. Errors become StorageError and HTTP
503. To recover, stop the API, preserve the damaged file for investigation, restore
a known-good backup (or deliberately move it aside to start empty), then restart.

## Limits and security boundaries

- This is not multi-process locking: separate repository instances, external edits,
  clustered workers and multiple server processes are unsupported for one file.
- A hard-link-capable local filesystem is required for safe initialization. Network
  filesystems may not provide the same semantics and are not supported.
- File contents are flushed, but the parent directory is not fsynced. This is not a
  guarantee against power loss, disk failure or filesystem corruption; keep backups.
- No optimistic version check: simultaneous updates to the same field use queue order.
- Every operation reads the full collection; there is no pagination or file-size cap.
  Appropriate for a small local V1 project, not large datasets or hostile public traffic.
- No auth, rate limit, per-user isolation or public deployment hardening. Server binds
  loopback by default. Storage paths are trusted operator configuration, never input
  from an HTTP request; the data directory must be writable only by trusted users.
- Error responses are intentionally generic. StorageError preserves its cause for
  server-side debugging; structured logging/observability is not implemented yet.

The frontend remains the original Checkpoint 01 shell. Task UI, API integration,
loading/error states and light/dark themes remain Checkpoint 03 scope.
