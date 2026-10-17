# Checkpoint 04 — final audit and release preparation

Status: ready for independent review, **not published**. Version metadata is 1.0.0;
no commit, push, tag, release or deployment was performed. V2 was not started.
Audit date: 2026-10-17 UTC. Baseline: the provided Checkpoint 03 source archive,
with 76 backend and 30 frontend tests. No remote Git history was altered.

## Prioritized findings and corrections

| Priority | Finding | Resolution and evidence |
| --- | --- | --- |
| High, deployment boundary | Unauthenticated shared API would expose every task if published | Retain loopback default, document prohibition on public exposure. Add loopback Host/Origin checks as defense in depth, not auth; 12 API regressions cover local/hostile requests and response headers. Public hosting remains out of scope. |
| Medium | API JSON could be cached or embedded without explicit restrictions | Add no-store, nosniff, same-origin resource policy and API-only restrictive CSP; disable ETags. Existing safe error translation remains. |
| Medium | Date.parse accepted impossible normalized dates in success responses | Validate UTC syntax and actual calendar/time values; three new malformed-response regressions. Preserve uncertain-write recovery. |
| Medium | Error dictionary inherited keys such as constructor could become UI messages | Use own-property lookup and stable fallback; three regression cases. Never render raw server error messages. |
| Medium | Successful create focused an input while still disabled | Restore focus in an effect after pending becomes false; regression plus Chromium/Firefox real focus assertions. |
| Medium | Filters overflowed at 320px with doubled text | Allow filter-group wrapping; rerun both engines at seven widths and enlarged text. |
| Low | Validation updates needed explicit announcement semantics | Add polite live regions to field errors. Actual screen-reader output remains unverified. |
| Low | CI action tags were mutable | Pin reviewed v4 action commits; read-only permissions, no persisted checkout credentials, npm 11 check. Local gates pass; remote Actions execution was not performed. |

Existing React text rendering was reviewed and covered by a new untrusted-content
regression. No HTML injection API, eval or user-derived filesystem path was introduced.
No cosmetic architecture refactor or unrelated feature was added.

## Architecture and code review

HTTP controllers → TaskService → TaskRepository → JsonTaskRepository is unchanged.
Zod strict schemas enforce server-owned identifiers/timestamps, title/description
limits, types, unknown-field rejection and nonempty PATCH. Request handling retains
32 KiB limits, JSON/media-type checks and generic errors without paths or traces.

Repository reads and writes share a recoverable queue. Exclusive initialization
preserves a concurrently appearing file; temp files are flushed before rename.
Corruption never resets existing bytes. Tests cover concurrent updates, recreation,
write/rename failures and cleanup behavior. Single-process and durability limits
remain documented in ARCHITECTURE.md; these are not database transactions.

The React state hook retains cancellation/generation guards, a synchronous mutation
lock and server-confirmed updates. Tests preserve stale-read, duplicate-submit and
uncertain-write recovery cases. No optimistic retry or silent draft loss was added.
Forms, dialogs, list rendering, derived counts and theme code remain separate.

Playwright/axe-core are development-only tools. The optional script launches its own
API and Vite servers with temporary storage, fails on occupied ports, restarts its
own API for persistence checks and cleans up afterward. No personal task data was used.

## Automated validation

Environment: Node.js 24.19.0, npm 11.9.0, Linux; strict TypeScript unchanged.

| Command | Actual result |
| --- | --- |
| `npm ci` | Passed, clean lockfile install: 392 packages |
| `npm run lint` | Passed, zero ESLint warnings |
| `npm run typecheck` | Passed for both workspaces |
| `npm test` | Passed: 4 API files / 88 tests; 2 frontend files / 38 tests |
| `npm run build` | Passed: compiled API and Vite web bundle |
| `npm run check` | Passed; executes lint, typecheck, tests and build |
| `npm audit --json` | Passed: 0 vulnerabilities across all severities (462 dependency entries, including optional/platform entries) |

The final 1.0.0 `npm run check` exited 0 after clean installation. It invoked each
listed lint/typecheck/test/build command successfully. The dependency audit also
exited 0. GitHub-hosted CI itself was not run.

The original 106 tests are retained; 20 focused regressions were added. New browser
checks are separate from those 126 tests and from CI. The host emits an npm warning
about its injected http-proxy configuration; this is not an application lint warning.

## Real browser and responsive results

| Engine | Actual execution | Result |
| --- | --- | --- |
| Chromium 153.0.8010.0 | Headless packaged Chromium, real Express and Vite | Passed full acceptance; 11 axe scans, no violations |
| Firefox 153.0 | Playwright Firefox, real Express and Vite | Passed full acceptance; 11 axe scans, no violations |
| WebKit | Browser downloaded; launch failed for missing host libraries (GTK/GStreamer and others) | Untested, not passed |

The first Firefox attempt stalled in this container. A retry with the host-specific
`MOZ_DISABLE_CONTENT_SANDBOX=1` setting completed. This is a disposable QA-host workaround,
not an application requirement or recommended browser setting for users.

Both completed engines exercised:

- Empty start, invalid title, create/edit title and description, completion toggle,
  status filters, counters/progress, reload and persistence after an actual API restart.
- Delete initial Cancel focus, Tab/Shift+Tab, Escape, focus restoration, confirmed
  deletion and reload. These are real keyboard events driven by Playwright.
- Offline transport failure and recovery, actual backend 400 with retained draft,
  corrupt temporary storage returning 503 without replacing its bytes, then recovery.
- Light/dark themes and preference persistence; system light/dark emulation.
- Widths 320, 375, 390, 430, 768, 1280 and 1440 in both themes, without horizontal
  page overflow. A 320×568 dialog accepted 200-character titles and 5,000-character
  descriptions; unbroken content wrapped after saving.
- Doubled computed fonts for main headings, paragraphs, labels and buttons at 320px.
  This is a targeted text-resize simulation, not native browser zoom or every text node.
- No uncaught page runtime exceptions. Expected network/HTTP errors were deliberately
  induced; absence of all network-console messages is not claimed.

Screenshots are actual full-page Chromium captures: desktop at 1280px and mobile
at 390px, both themes, identical fictional tasks and 25% progress. Four compact PNGs
are included and were visually inspected. No fabricated UI or private tasks appear.

## Accessibility assessment

Source review covered semantic headings/landmarks, explicit form labels, checkbox
semantics, progress, error associations, live status, native modal inertness and
focus restoration. Buttons have accessible names; icon actions are 44px, task
checkboxes 24px, and edit checkbox labels enlarge the clickable area. Focus outlines
and the skip link are present. Reduced-motion CSS disables animations/transitions;
media preferences were emulated, but no perceptual motion assessment was performed.

axe-core 4.11.1 ran WCAG 2 A/AA, 2.1 AA and 2.2 AA tagged rules across empty, invalid,
edit/delete dialog, network/storage error and populated light/dark states. Both
engines produced zero detected violations across 22 scans, including automated
contrast checks where computable. This does not prove every visual/non-text contrast
pair or accessible interaction. Screenshots were reviewed for readable layout.

Not verified: actual screen-reader announcements, physical mobile keyboards/touch,
Safari itself, native 200%/400% browser zoom, all operating-system high-contrast modes
or complete WCAG conformance. Keyboard scenarios were driven through real browser
key events, not a human assistive-technology session. Independent manual checks below
remain necessary. No accessibility certification is claimed.

## Security and remaining risks

No authentication, user isolation, rate limiting or public-hosting design is included.
Any reachable client can read/change the shared collection; Host/Origin headers are
forgeable outside browser constraints. Keep loopback binding. Other untrusted local
applications are outside this boundary. No credentialed CORS is enabled. CSP protects
API responses only, not a future hosted SPA. See API.md for accepted hosts and 403s.

Validation is contextual: React displays plain text rather than trying to sanitize
HTML. The repository accepts paths only from trusted environment configuration.
Keep the data directory private and outside Git. Existing exclusions cover data,
local environment files, dependencies and builds; the review ZIP excludes them too.

The JSON adapter has one writer process/instance, no multi-process lock, no pagination,
no collection-size bound and no parent-directory fsync guarantee. Keep backups.
Atomic replacement is not protection from all power/disk failures. Cleanup is best
effort. External edits while running, network filesystems and multiple writers are
unsupported. Separate browser tabs require explicit refresh. POST lacks idempotency
keys; after an uncertain response, inspect refreshed tasks before resubmitting.

Dependency audit results are a time-specific registry report, not a security guarantee.
No production security certification or public deployment readiness is claimed.

## Created and modified files

Created:

- `apps/api/src/http/local-security.ts`
- `scripts/browser-audit.mjs`
- `docs/CHECKPOINT-04.md`
- `docs/RELEASE-NOTES-1.0.0.md`
- `docs/screenshots/desktop-light.png`, `desktop-dark.png`, `mobile-light.png`, `mobile-dark.png`

Modified:

- `.github/workflows/ci.yml`, `eslint.config.js`
- `package.json`, `package-lock.json`, `apps/api/package.json`, `apps/web/package.json`
- `apps/api/src/app.ts`, `apps/api/tests/app.test.ts`
- `apps/web/src/api/tasks.ts`, `apps/web/src/api/tasks.test.tsx`
- `apps/web/src/tasks/TaskForm.tsx`, `apps/web/src/App.test.tsx`, `apps/web/src/styles.css`
- `README.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `CHANGELOG.md`

All other Checkpoint 03 source files, including repository/business logic and MIT
license, are preserved. Version metadata agrees across root, workspaces and lockfile.

## Independent manual acceptance

1. Extract the ZIP into a new folder. Use Node 24/npm 11, run `npm ci`, then
   `npm run check`. Do not point TASKS_FILE at existing personal data.
2. Run `npm run dev`; open http://127.0.0.1:5173. This fresh extracted copy uses
   its own ignored `apps/api/data/tasks.json`. Optional settings: API `.env.example`.
3. Try blank/whitespace and over-limit fields. Create several fictional tasks, edit,
   toggle completion, inspect all filters/counts/progress, then refresh.
4. Stop and restart development servers. Confirm tasks persist. Cancel deletion with
   Cancel and Escape; then confirm deletion and check again after reload.
5. Use only Tab/Shift+Tab/Space/Enter/Escape through the page and dialogs. Verify
   visible focus, background containment, return focus and new-task focus. Test
   with your actual screen reader; listen for validation, completion and errors.
6. Check light/dark/system, reload persistence, native browser zoom at 200%/400%,
   reduced motion, and a real mobile keyboard. Repeat on installed Safari/WebKit.
7. Stop the API and refresh tasks to inspect failure/recovery. Use the optional
   automated browser script for corrupt-storage tests; it owns disposable data.
8. Confirm screenshots match the app and review API/architecture/security limits.
   Run `npm audit` again at review time. Approve publication only after this review.

Optional automation (stop your dev servers first):

```sh
npx playwright install chromium firefox
npm run test:browser
node scripts/browser-audit.mjs --browser=firefox
# On a host with WebKit dependencies installed:
node scripts/browser-audit.mjs --browser=webkit
```

Use `--screenshots` to regenerate authentic images. Custom QA hosts may supply
TASKFLOW_QA_BROWSER_PATH and TASKFLOW_QA_BROWSER_ARGS_FILE (a JSON argument array).
These are test-runner options, not application environment configuration.

## Release checklist

- [x] Preserve existing contracts, layers and tests; fix evidenced defects.
- [x] Review local threat model, failure handling and sensitive-file exclusions.
- [x] Execute local quality gates and real Chromium/Firefox acceptance.
- [x] Include authentic screenshots, AI disclosure, MIT license and documentation.
- [x] Prepare consistent 1.0.0 metadata and proposed release notes/commit message.
- [ ] Independent manual review, native zoom, screen reader and WebKit acceptance.
- [ ] Explicit user approval before commit/push/tag/GitHub Release or deployment.

Proposed commit message: `chore: prepare TaskFlow v1.0.0 for independent review`.
See RELEASE-NOTES-1.0.0.md. This checkpoint stops at delivery; no V2 work is authorized.
