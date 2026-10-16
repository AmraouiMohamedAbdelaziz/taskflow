# Checkpoint 02 — Backend CRUD and persistent storage

Status: implementation and automated validation complete; awaiting independent
manual review and approval. Checkpoint 03 has not started. No commits, pushes,
releases or frontend changes were made.

## Implemented

- GET/POST/PATCH/DELETE task routes, preserving health and standardized unknown-route 404.
- Server-generated UUIDs and UTC timestamps, trimmed titles and initial completion state.
- Strict Zod input and persisted-data validation, documented field/body limits.
- Safe JSON errors for malformed requests, missing tasks, corruption and I/O failures.
- Configurable JSON storage, safe first-use initialization and atomic replacement.
- Serialized read-modify-write operations and a queue that recovers after failures.
- Isolated tests, architecture/API documentation and a manual testing walkthrough.

## Architecture decisions

Keep the existing npm workspace structure. `createApp(repository)` injects the
persistence dependency; the server owns the single shared JSON adapter. HTTP
handlers validate requests, TaskService owns IDs/defaults/timestamps and not-found
rules, and TaskRepository defines a small persistence contract. PostgreSQL can
replace this adapter in V2 without coupling SQL to HTTP handlers.

Queue the whole operation, not just the write: otherwise concurrent requests could
read the same old collection and overwrite each other's updates. Validate existing
data on every read rather than silently repairing it. Flush and close a unique
same-directory temporary file before rename. Initialization uses an exclusive hard
link, avoiding accidental replacement if a file appears after the missing-file check.

Storage schema errors become a storage error (503), not a client validation error
(400). Public errors never contain paths, raw stored content or stack traces. Causes
remain available in Error objects for future server-side diagnostics.

## Actual validation results

Executed with Node.js 24 and the existing installed lockfile dependencies:

| Command/check | Actual result |
| --- | --- |
| `npm run lint` (through `npm run check`) | Passed, zero lint warnings |
| `npm run typecheck` (through `npm run check`) | Passed, both workspaces |
| `npm test` (through `npm run check`) | 76 backend + 1 frontend tests passed |
| `npm run build` (through `npm run check`) | API compilation and Vite bundle passed |
| `npm run check` | Exit code 0 |
| Compiled-server smoke test | POST, graceful stop, actual process restart, persisted GET and health passed |
| Baseline archive comparison | All frontend files byte-identical; no existing files removed |

Four backend test files and one frontend test file passed. Tests use isolated OS
temporary directories and remove them afterwards; they never use local task data.
The process smoke test also used a temporary data path. No new dependency was added.
GitHub Actions was not run remotely; the local CI command passed.

Coverage includes 30 concurrent HTTP creates; 40 concurrent repository creates
followed by partial updates/deletes; recreated repositories/apps; corrupt syntax,
invalid records, duplicate IDs; permission/read/open/write/sync/rename/link failures;
initialization races; queue recovery; malformed JSON/URLs; field types/limits;
unknown fields; missing tasks; unsupported content; and oversized bodies.

## Bugs discovered and fixed

- The old unknown-route test used `/api/tasks`; changed it to `/api/unknown` because
  `/api/tasks` is now implemented. Health and 404 assertions remain covered.
- Initial lint found an unused Express error-handler argument and ambiguous test
  line breaking. Added headers-sent forwarding and corrected formatting.
- Strict TypeScript rejected mocks of overloaded filesystem functions. Replaced
  them with compatible narrow mocks without type escapes or `any`.
- Review identified invalid URL decoding as a possible generic 500; added safe
  URIError handling with an integration test verifying HTTP 400.

## Known limitations

No unresolved failure in the executed gates. This is a small local backend, not a
production multi-user service. One shared repository instance and one API writer
process per file are required. No multi-process locking, optimistic concurrency,
authentication, pagination, rate limiting or structured error logging is included.

Safe initialization requires hard links on a local filesystem. The parent directory
is not fsynced, so file flushing/atomic rename is not a complete power-loss guarantee.
Cleanup failures or a crash can leave unused temporary files. No automatic corrupt
file recovery or backup creation is performed. See ARCHITECTURE.md for recovery.

npm reports a host-provided `http-proxy` configuration warning; it did not prevent
validation. No Windows execution or visual browser review was performed here.
The PowerShell commands below are supplied for independent local testing.

## Manual API testing — PowerShell

Extract the ZIP into a separate review folder first. When copying changes into an
existing checkout, preserve your `.git`, `.env` and local data directory. Do not
commit local task data. The ZIP contains source, not installed dependencies.

From the extracted `taskflow` directory, run:

```powershell
npm ci
npm run check
npm run dev
```

In a second PowerShell terminal:

```powershell
$base = 'http://127.0.0.1:3001'
Invoke-RestMethod "$base/api/health"
Invoke-RestMethod "$base/api/tasks"

$body = @{ title = '  Review backend  '; description = 'Read the repository code' } | ConvertTo-Json
$created = Invoke-RestMethod "$base/api/tasks" -Method Post -ContentType 'application/json' -Body $body
$taskId = $created.data.id
$created.data | Format-List

$patch = @{ completed = $true; title = 'Review checkpoint 02' } | ConvertTo-Json
Invoke-RestMethod "$base/api/tasks/$taskId" -Method Patch -ContentType 'application/json' -Body $patch
Invoke-RestMethod "$base/api/tasks"
```

Expect the title to be trimmed at creation, a generated UUID, `completed=false`
initially and UTC timestamps. PATCH must preserve ID/creation time and change the
requested fields. Stop the first terminal with Ctrl+C, rerun `npm run dev`, then
repeat GET: the task must still exist. Health remains available throughout normal use.

Use `curl.exe` to see raw status codes for invalid requests (avoid PowerShell's
`curl` alias). A malformed body needs no shell-dependent embedded quote escaping:

```powershell
curl.exe -i -X POST "$base/api/tasks" -H 'Content-Type: application/json' --data-binary '{'
curl.exe -i -X PATCH "$base/api/tasks/$taskId" -H 'Content-Type: application/json' --data-binary '{}'
curl.exe -i -X DELETE "$base/api/tasks/not-a-uuid"
curl.exe -i "$base/api/unknown"
```

Expected: 400 INVALID_JSON, 400 VALIDATION_ERROR, 400 VALIDATION_ERROR and 404
NOT_FOUND, respectively. Try whitespace-only titles, unexpected fields and incorrect
types via `Invoke-RestMethod`; PowerShell throws on these expected non-2xx responses.

Delete and verify absence:

```powershell
Invoke-RestMethod "$base/api/tasks/$taskId" -Method Delete
Invoke-RestMethod "$base/api/tasks"
curl.exe -i -X DELETE "$base/api/tasks/$taskId"
```

Expected: 200 with deleted ID, collection without the task, then 404 TASK_NOT_FOUND.
Restart once more to verify the deletion persisted. For corruption/failure testing,
use the automated isolated tests; do not corrupt your real data file.

## Suggested code review order

1. Read API.md and the task schemas to understand accepted inputs and outputs.
2. Follow a POST through task-routes.ts → TaskService → TaskRepository.
3. Read the JSON adapter's queue, read, initialization and write functions.
4. Inspect storage tests to see how corruption and write failures are simulated.
5. Run the commands above, inspect the JSON file, then review the changed files.

## Remaining scope — Checkpoint 03 (not started)

Task creation/editing/completion/deletion UI, delete confirmation, filters/counts,
frontend API client, loading/empty/error states, responsive layout, accessible
interactions and light/dark themes. Await the user's manual review and explicit
approval before implementing any of this.

## Files created or modified

Created:

- `apps/api/src/errors.ts`
- `apps/api/src/http/error-handler.ts`
- `apps/api/src/http/task-routes.ts`
- `apps/api/src/storage/json-task-repository.ts`
- `apps/api/src/tasks/task-repository.ts`
- `apps/api/src/tasks/task-service.ts`
- `apps/api/src/tasks/task.ts`
- `apps/api/tests/helpers.ts`
- `apps/api/tests/storage.test.ts`
- `apps/api/tests/tasks.test.ts`
- `docs/CHECKPOINT-02.md`

Modified:

- `CHANGELOG.md`
- `README.md`
- `apps/api/.env.example`
- `apps/api/src/app.ts`
- `apps/api/src/config.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/app.test.ts`
- `apps/api/tests/config.test.ts`
- `docs/API.md`
- `docs/ARCHITECTURE.md`

