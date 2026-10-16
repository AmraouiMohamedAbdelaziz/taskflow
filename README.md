# TaskFlow

A focused task management application built with React, Express, and strict TypeScript.

**Status: Checkpoint 01 — Foundation. This is not the finished V1 application.**
Task creation, persistence, editing, filtering, deletion, and themes are intentionally deferred.

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

Vite preview is a local bundle preview, not a production server. Production hosting
and same-origin `/api` reverse proxy configuration are not included yet.

## Structure and architecture

```text
apps/
  api/
    src/           Express app factory, configuration and process entry point
    tests/         HTTP and environment validation tests
    data/          Reserved for V1 runtime storage (gitignored)
  web/
    src/           React foundation shell, CSS and component tests
.github/workflows/ CI quality gate
 docs/             Architecture, API contract and checkpoint report
```

See [architecture](docs/ARCHITECTURE.md) for the planned repository boundary and
[API documentation](docs/API.md) for current and planned endpoints.

## Roadmap

1. **Foundation:** workspaces, strict TypeScript, React/Express scaffolding, tooling.
2. **Backend:** repository abstraction, serialized atomic JSON persistence, validation,
   task service/controllers and failure-path integration tests.
3. **Frontend:** full task UI, API integration, themes, responsive states and accessibility.
4. **Quality:** complete validation, security/accessibility review, screenshots and portfolio polish.

Each checkpoint must pass its gates before the next begins. The project will be
released as V1.0.0 only when all four checkpoints are complete.

## Screenshots

Final desktop, mobile, light and dark screenshots will be added in Checkpoint 04.
The current page is explicitly a foundation preview, not a completed task interface.

## AI assistance

This project is developed with AI assistance for planning, code generation,
documentation, and review. It does not claim to be manually coded without AI.
Validation performed at each checkpoint is recorded in `docs/`; passing checks
are evidence of those checks, not a guarantee of defect-free software.

## License

MIT — see [LICENSE](LICENSE).
