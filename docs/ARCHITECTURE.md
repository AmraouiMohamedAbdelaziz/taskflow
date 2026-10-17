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

## Frontend

The original React/Vite/Tailwind/Lucide workspace now contains the task UI. No new
runtime dependency, workspace or backend change was needed.

- `api/tasks.ts`: relative fetch requests, 15-second timeout, runtime response guards,
  stable public error messages and uncertain-mutation classification.
- `tasks/types.ts`: browser-only types matching the documented API; no server imports.
- `tasks/useTasks.ts`: collection, read state, mutation lock and success announcements.
- `tasks/TaskForm.tsx`: reusable create/edit values, client limits, pending state and
  retained drafts on failure. The backend remains authoritative for validation.
- `tasks/TaskRow.tsx`, `TaskStats.tsx`: presentation of tasks and derived statistics.
- `components/Dialog.tsx`, `tasks/DeleteDialog.tsx`: native modal behavior and confirmation.
- `theme/ThemeControl.tsx`, `public/theme.js`: system/explicit preferences and early theme setup.
- `App.tsx`: screen composition, selected filter and selected task dialogs.

Read requests have AbortControllers and generation checks. StrictMode's discarded
initial request cannot overwrite the active result. Mutations occur only in event
handlers, never effects. A synchronous ref lock prevents same-tick duplicate writes;
controls also visibly disable while one mutation is pending. V1 intentionally allows
one UI mutation at a time, a simpler rule than concurrent per-row queues.

No optimistic mutation is used: the list changes only after a valid server success
response. POST appends, PATCH replaces in place, DELETE removes in place, preserving
backend insertion order. Filters/counts/progress are derived, not separately stored.
After creation, All is selected so the new active task is visible under any previous
filter. A successful edit can move a task out of the current filter.

Network/timeout failures or malformed success responses may occur after a write was
committed. The client never retries a mutation automatically. It retains the draft,
blocks writes and asks for a successful read refresh before manual resubmission.
Confirmed HTTP failures are shown without falsely changing the task collection.
Separate tabs are not live-synchronized; Refresh tasks explicitly re-reads the server.

Theme preferences use only `taskflow-theme` in localStorage. System mode follows
`prefers-color-scheme` changes and removes that key. Storage access is guarded;
a blocked localStorage still allows an in-memory choice. A small pre-React script
sets the root theme before styles render to reduce reload flashing.

Native `<dialog>.showModal()` supplies background inertness and keyboard containment.
The wrapper restores focus to the trigger, or the task heading when the trigger was
removed. Escape/cancel are blocked only while a mutation is in flight. Semantic labels,
native checkboxes/progress, described validation messages, live status, focus outlines
and reduced-motion styling support accessible interaction. This is not a claim of
formal WCAG certification. Chromium and Firefox keyboard/axe checks passed;
screen-reader and WebKit review remains.

The current frontend expects a modern browser with native dialog, matchMedia,
AbortSignal.timeout/any and fetch support. UI strings are English. There is no offline
queue or draft persistence. Checkpoint 04 records the final quality review and
portfolio preparation; V1.0.0 has not been released.

## Checkpoint 04 decisions

The existing layers and contracts are retained. `http/local-security.ts` is a small
HTTP boundary middleware: loopback Host/Origin checks, no-store, nosniff, same-origin
resource policy and an API-only CSP. It does not belong in the domain or repository.
See API documentation for the new local-access 403 and accepted hostnames. These
headers cannot protect an unauthenticated API exposed to arbitrary network clients.

The frontend verifies UUIDs and real UTC dates before accepting server data; inherited
object properties cannot become error messages. Successful creation restores focus
after the input is enabled. Form errors are polite live regions. Filter buttons wrap
under enlarged text instead of forcing horizontal overflow. No UI redesign was needed.

Playwright and axe-core are root development dependencies only, not application runtime
dependencies. `scripts/browser-audit.mjs` builds on the actual Express API and Vite
frontend, launches its own servers, owns a disposable temporary data file and cleans
up resources. It fails on occupied ports rather than using someone's existing server.
This optional acceptance script stays outside CI; default CI remains deterministic
unit/integration tests, lint, strict type checking and builds. Actions are pinned to
reviewed v4 commit SHAs with read-only repository permissions and no persisted Git
credentials. Actual remote GitHub Actions execution requires the user's publication.
