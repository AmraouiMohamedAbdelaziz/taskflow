# TaskFlow V1.0.0 — proposed release notes

**Prepared for independent review; no release, tag or deployment has been made.**

TaskFlow is a local task manager built with React 19, Express 5 and strict TypeScript.
Create and edit tasks, toggle completion, filter active/completed work, inspect counts
and progress, and confirm deletion. Responsive layouts include light, dark and system
themes, accessible forms, native dialogs and clear loading/empty/error feedback.

The backend separates HTTP handling, task rules and a repository interface. Its JSON
adapter validates existing data, queues operations and uses atomic replacement.
A future database adapter can replace persistence without redesigning the HTTP layer.
Malformed requests, unsupported fields and damaged storage return safe JSON errors.

Validation: 126 passing unit/integration tests (88 API, 38 frontend), lint, strict type
checking and production builds. Chromium and Firefox ran real API acceptance using
disposable storage; 22 axe-core checks reported no violations. Four real screenshots
are included. See CHECKPOINT-04.md for exact scope, fixes and untested environments.

Install Node.js 24 and npm 11, then run `npm ci` and `npm run dev` from the root.
Open http://127.0.0.1:5173. `npm run check` runs the default quality gate.
Optional configuration is documented in `apps/api/.env.example`.

Limitations: no authentication or user isolation; do not expose the API publicly.
JSON storage supports one writer process, small collections and local filesystems.
Keep backups. There is no offline queue, live synchronization or pagination.
WebKit, physical devices, real browser zoom and screen readers still require review.
Automated checks do not establish WCAG or security certification.

This project uses AI assistance for planning, implementation, tests, review and
documentation, with recorded validation and independent human review before publication.
MIT licensed.

Proposed commit message (not executed):

```text
chore: prepare TaskFlow v1.0.0 for independent review
```
