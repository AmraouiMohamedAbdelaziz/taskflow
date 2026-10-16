# Changelog

## Unreleased — Checkpoint 03 — 2026-10-16

- Replace the foundation preview with a responsive task management interface.
- Connect create/edit/complete/delete flows to the existing REST API.
- Add filters, real counters/progress, confirmation dialogs and explicit error states.
- Add system/light/dark themes with local preference persistence.
- Add typed fetch response guards, stale-read protection and guarded mutations.
- Add frontend tests and verify Chromium flows against isolated real JSON storage.
- Preserve the Checkpoint 02 backend, API contract and dependency lockfile.
- Await independent review; Checkpoint 04 and V1.0.0 release have not started.

## Unreleased — Checkpoint 02 — 2026-10-16

- Add validated task CRUD endpoints and consistent safe error responses.
- Introduce TaskService, TaskRepository and queued atomic JSON storage.
- Configure the storage path and preserve corrupt files without automatic reset.
- Add isolated API, restart, concurrent-write and filesystem-failure tests.
- Document contracts, storage limitations, manual testing and architecture.
- Preserve the Checkpoint 01 frontend; V1.0.0 is not released.

## 0.1.0 — Foundation — 2026-10-15

- Initialize separate frontend/backend npm workspaces and strict TypeScript.
- Configure React, Vite, Tailwind CSS, Lucide, Express and Zod.
- Add health route, JSON 404 responses and validated server configuration.
- Add Vitest, React Testing Library, Supertest, ESLint and GitHub Actions.
- Document architecture, checkpoint scope and AI assistance.

Task management and persistence are not implemented in this release.
