# TaskFlow

A focused task management application built with React, Express, and strict TypeScript.

**Status: Checkpoint 03 — Complete frontend, ready for independent review. V1 is not yet released.**

Create, edit, complete and delete tasks through a responsive React interface connected
to the existing Express API. Filter by status, track real counts/progress, and choose
light, dark or system appearance. JSON persistence remains on the local backend.
No account is required; this is one shared local task collection.

## Quick start

Requires Node.js 24.x and npm 11.x. From the repository root:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The API runs at http://127.0.0.1:3001.
Vite proxies `/api` to the backend, avoiding unnecessary development CORS configuration.
Both development processes stop together when interrupted or when one exits.

Optional: copy `apps/api/.env.example` to `apps/api/.env` to override backend settings.
If you change the API port, update the proxy target in `apps/web/vite.config.ts` too.
The frontend has no environment variables at this checkpoint.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start frontend and backend with reload |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run typecheck` | Check both workspaces, tests and configuration |
| `npm test` | Run Vitest, RTL and Supertest tests |
| `npm run build` | Compile API and bundle web |
| `npm run check` | Run all quality gates |
| `npm start -w @taskflow/api` | Run compiled API after building |
| `npm run preview -w @taskflow/web` | Preview built frontend locally |

Use `npm run dev` for the complete local application. The existing Vite development
proxy connects relative `/api` requests to Express. `vite preview` only previews the
built frontend and does not configure the development API proxy; it is not the
full-stack acceptance command or a production server. Production hosting and
same-origin `/api` reverse proxy configuration are not included yet.

## Structure and architecture

```text
apps/
  api/
    src/           HTTP routes, task service, repository contract and JSON adapter
    tests/         Isolated API, storage, concurrency and failure-path tests
    data/          Runtime JSON storage (gitignored)
  web/
    src/           API client, task state/components, themes and UI tests
.github/workflows/ CI quality gate
docs/             Architecture, API contract and checkpoint report
```

See [architecture](docs/ARCHITECTURE.md) for the repository boundary and
[API documentation](docs/API.md) for the implemented endpoints.

## Roadmap

1. **Foundation:** workspaces, strict TypeScript, React/Express scaffolding, tooling.
2. **Backend:** repository abstraction, serialized atomic JSON persistence, validation,
   task service/controllers and failure-path integration tests.
3. **Frontend:** full task UI, API integration, themes, responsive states and accessibility.
4. **Quality:** complete validation, security/accessibility review, screenshots and portfolio polish.

Each checkpoint must pass its gates before the next begins. The project will be
released as V1.0.0 only when all four checkpoints are complete.

## Using TaskFlow

- Add a title and optional description in **New task**. Adding a task selects **All**
  so the server-confirmed result is visible.
- Use a task checkbox to change completion. The UI waits for server confirmation.
- Edit through the pencil button. Save or cancel; Escape closes idle dialogs.
- Delete through the trash button and confirm. Cancel receives initial focus.
- Filter with **All**, **Active**, **Completed**. Counts always describe the full collection.
- Choose **System**, **Light** or **Dark** in the header. Only an explicit theme choice
  is stored in the browser; tasks remain on the server.
- Use **Refresh tasks** to pick up changes from another tab or recover after errors.
  An uncertain mutation blocks further writes until a successful refresh. Check the
  refreshed collection before manually resubmitting: POST has no idempotency keys.

## Local storage

Tasks are saved automatically to `apps/api/data/tasks.json` on first access.
Use `TASKS_FILE` in the API environment file for an alternative path. Relative
overrides resolve from the API process working directory. Keep custom data paths
outside Git or explicitly ignore them. Use one API process and one repository
instance per file; this adapter does not provide multi-process transactions.
Corrupt files return HTTP 503 and are never automatically reset. See the architecture
document for recovery steps and durability limitations.

See [Checkpoint 03](docs/CHECKPOINT-03.md) for current validation results, browser
acceptance steps and the file change inventory. [Checkpoint 02](docs/CHECKPOINT-02.md)
retains the backend PowerShell walkthrough and historical results.

## Screenshots

Final desktop, mobile, light and dark screenshots will be added in Checkpoint 04.
Checkpoint 03 was visually checked in both themes on desktop and mobile; final
portfolio screenshots remain Checkpoint 04 scope.

## AI assistance

This project is developed with AI assistance for planning, code generation,
documentation, and review. It does not claim to be manually coded without AI.
Validation performed at each checkpoint is recorded in `docs/`; passing checks
are evidence of those checks, not a guarantee of defect-free software.

## License

MIT — see [LICENSE](LICENSE).
