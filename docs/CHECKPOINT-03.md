# Checkpoint 03 — Complete React frontend

**Status: implemented and validated locally; ready for independent review.**
V1 is not released. Checkpoint 04 has not started. No commit, push, release,
backend change or application version increment was performed.

## Features and UI decisions

The foundation preview is replaced by a working productivity interface. A compact
header provides the TaskFlow brand and theme selector. The task heading, real
collection statistics and completion progress sit above a two-column workspace:
create form on the left, filterable task list on the right. Mobile uses a single
column. Neutral surfaces, restrained indigo accents, explicit completion badges and
readable crossed-out titles communicate hierarchy without relying on color alone.

Users can create, edit title/description/completion, toggle completion directly,
confirm/cancel deletion, filter All/Active/Completed and refresh from the API.
Descriptions retain line breaks and long text wraps without horizontal overflow.
Rows retain insertion order; creation switches to All so the new task is visible.
Counts and progress always derive from the full confirmed collection.

Distinct states cover initial loading, empty collection, empty filtered list,
submitting, saving, deleting, network failure, storage failure and unexpected
responses. Failed edits retain their values; failed mutations never display a
success or remove the task. A lost mutation response blocks further writes until
refresh, because the server might already have committed it.

## Component structure and state

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Screen composition, filter selection, selected edit/delete task |
| `src/api/tasks.ts` | Relative fetch requests, response guards, timeout and normalized errors |
| `src/tasks/types.ts` | Browser-only API model and input types |
| `src/tasks/useTasks.ts` | Collection, read cancellation, mutation guard, announcements |
| `src/tasks/TaskForm.tsx` | Shared create/edit fields, validation and draft retention |
| `src/tasks/TaskRow.tsx` | Checkbox, text, metadata and task actions |
| `src/tasks/TaskStats.tsx` | Derived counts and native progress |
| `src/components/Dialog.tsx` | Native modal lifecycle and focus restoration |
| `src/tasks/DeleteDialog.tsx` | Confirmation and deletion error state |
| `src/theme/ThemeControl.tsx` | System/light/dark choice and persistence |
| `public/theme.js` | Early theme initialization before React/styles |

Paths above are relative to `apps/web`. The API client does not import server code.
There is no added UI framework, global state package or production dependency.
The existing Vite proxy and npm workspaces are unchanged. Tailwind remains installed
and configured; the visual system is expressed in scoped class names and CSS tokens.

## API integration and asynchronous behavior

The client uses only `/api/tasks` and `/api/tasks/:id`, with the existing verbs,
success statuses and JSON envelopes. Runtime guards validate essential response
fields and reject malformed payloads, duplicate list IDs and mismatched mutation
IDs. Errors use controlled messages; arbitrary server content/stacks are not rendered.

Initial GET runs in an effect. AbortControllers plus generation checks reject stale
results, including StrictMode's discarded first request. Mutations run only from
user actions. A ref lock prevents same-tick duplicate submissions, while pending
controls disable and status text explains that saving is in progress. One UI mutation
at a time is deliberate for V1. The backend remains the source of truth; there is no
optimistic update or automatic POST retry. Requests have a 15-second timeout.

Client-side limits match the API: trimmed title 1–200 UTF-16 code units, description
0–5,000. Editing an absent description without entering text keeps it absent; clearing
an existing description sends an empty string. IDs/timestamps are never editable.

## Accessibility and themes

- Semantic headings, sections, forms, associated labels and accessible icon-button names.
- Native checkboxes, progress and select; visible focus indicators and skip link.
- Described field errors with focus moved to the first invalid field.
- Live success/pending messages and error alerts.
- Native modal background inertness, Tab/Shift+Tab behavior, Escape cancellation and
  return focus. Delete initially focuses Cancel. During submission, closing is disabled
  until the request settles, bounded by the request timeout.
- Long text wrapping, 24px completion checkboxes and 44px row action buttons.
- Reduced-motion styling; no external fonts or animation dependency.
- System preference is followed until explicitly overridden. Only `taskflow-theme` is
  saved to localStorage; System removes it. Storage failures fall back to in-memory use.
- Early theme script reduces reload flashing; both themes were visually inspected.

Selected computed contrast checks: muted text on white 5.34:1, muted text on the light
page 4.94:1, dark muted text on its surface 8.01:1, white on the primary button 6.74:1.
Input boundary contrast is 3.17:1 light and 4.08:1 dark. These checks and semantic
review support WCAG 2.2 AA principles, but are not a full conformance certification.

## Automated test results — actually executed

Final `npm run check` exited 0 and executed every requested subcommand:

| Command | Result |
| --- | --- |
| `npm run lint` | Passed, zero lint warnings |
| `npm run typecheck` | Passed, both workspaces |
| `npm test` | 76 backend + 30 frontend tests passed (106 total) |
| `npm run build` | API TypeScript compilation and Vite production bundle passed |
| `npm run check` | Passed |

Frontend tests use deterministic fetch mocks and jsdom, never real local task data.
They cover loading, render/empty states, create/validation/limits, edit/save/cancel,
completion, delete confirmation/cancellation, filtering/counters/progress, network
retry, HTTP 400/503/404 failures, retained drafts, uncertain POST/duplicate protection,
stale reads in StrictMode, theme persistence and unexpected API payloads. jsdom's
small dialog shim supports component tests; actual native behavior was separately
checked in Chromium. Backend tests and their source remain unchanged.

No remote GitHub Actions execution is claimed. npm still emits the environment's
`http-proxy` configuration warning; it did not prevent the checks.

## Browser acceptance — actually executed, not just instructions

Playwright controlled headless Chromium 153 on Linux against the real Express API
and Vite development server. The API used a fresh temporary JSON file, removed after
validation. All task creation/edit/deletion in this acceptance flow used the interface.
The browser tool was installed only in scratch tooling, not as a project dependency.

| Flow/check | Actual result |
| --- | --- |
| Start API + Vite; load empty collection | Passed |
| Create through form | Passed |
| Edit title and description through dialog | Passed |
| Toggle completed from row | Passed, awaiting server-confirmed state |
| Active/Completed filters | Passed |
| Browser reload | Task and completion persisted |
| Actual API process stop/restart, then reload | Task and completion persisted |
| Delete dialog Cancel focus, Tab, Shift+Tab, Escape and trigger focus restoration | Passed |
| Confirm delete, then reload | Task absent; empty state displayed |
| Explicit theme selection and reload | Dark preference retained |
| System mode reacting to simulated system color changes | Passed |
| Both themes at 320, 390, 768 and 1280px widths | No document horizontal overflow |
| 200-character unbroken title and 5,000-character description | Saved through UI; no page/dialog horizontal overflow |
| Edit dialog at 320 × 568 viewport | Controls usable; viewport capture visually inspected |
| Browser runtime errors during acceptance | None |

Desktop light/dark, mobile light/dark and small-dialog captures were inspected.
QA screenshots are not included as final portfolio artwork; that remains Checkpoint 04.
These are automated browser flows plus visual inspection, **not** a claim that the
user has completed manual acceptance or that Safari/Firefox/real phones were tested.

## Defects found and resolved

- Lint detected browser globals in the pre-render theme script; scoped browser globals
  to `public/*.js` without weakening the global lint configuration.
- React effect lint flagged state paths inside a request helper. Reworked read handling
  to promise completion callbacks; no synchronous effect state reset is needed.
- Filter labels and counts lacked a separating space in accessible names. Added it;
  the filtering tests now verify discoverable accessible buttons.
- Visual review found light input boundaries too faint and mobile statistic baselines
  uneven when labels wrapped. Added distinct control-border tokens and aligned labels.
- Browser test initially assumed a checkbox changes synchronously. Corrected the test
  to click and await the confirmed response, preserving the intended non-optimistic UI.
- The default browser download failed in the environment; a scratch-only Chromium
  binary was used successfully. This did not alter project dependencies.

## Independent manual review instructions

Extract into a separate review folder, or copy source changes into the existing
checkout while preserving `.git`, `.env` and your local `apps/api/data` files.
Do not delete personal tasks to reproduce these checks. Use an isolated file instead.

PowerShell from the project root:

```powershell
npm ci
npm run check
$env:TASKS_FILE = Join-Path $env:TEMP ("taskflow-review-" + [guid]::NewGuid().ToString() + ".json")
npm run dev
```

Open `http://127.0.0.1:5173` and use this checklist:

1. Verify the empty collection; try a blank/whitespace title and inspect validation.
2. Create two tasks, one with a multiline description. Check counts and progress.
3. Edit a title/description, cancel once, reopen and save. Toggle completion both ways.
4. Use All/Active/Completed, including an empty filtered result.
5. Reload the page. Stop and restart `npm run dev` in the same terminal so the same
   `TASKS_FILE` environment value is retained. Verify tasks and changes persist.
6. Open delete, cancel with Escape, then confirm deletion. Reload to verify absence.
7. Choose Light and Dark, reload, then choose System. Test keyboard focus and dialogs.
8. Use browser device emulation at 320, 390, 768 and 1280px; inspect long text and dialogs.
9. Use the browser's offline mode and click Refresh tasks. Confirm an error, not an
   empty list. Disable offline mode and retry. A failed mutation may need a refresh
   before manual resubmission; check for an already saved task to avoid duplicates.

When finished, stop the app with Ctrl+C. Optionally delete only the isolated review
file, then clear the override in that terminal:

```powershell
Remove-Item -LiteralPath $env:TASKS_FILE -ErrorAction SilentlyContinue
Remove-Item Env:TASKS_FILE
```

`npm run dev` is the full-stack review entry point. Vite preview alone does not
configure the existing development `/api` proxy. The default server binds loopback.

## Known limitations and remaining Checkpoint 04 scope

No unresolved defect in the executed checks. Browser coverage is limited to one
headless Chromium build and emulated viewport sizes. Screen-reader testing, Safari,
Firefox, real mobile browsers and a full accessibility/security audit remain open.

The app requires modern native dialog, fetch and AbortSignal timeout/any support.
There is no offline queue, draft persistence, cross-tab live synchronization or
pagination. Refresh is explicit; a simultaneous update from another client can be
stale until refresh. The entire collection is loaded. One shared backend writer
process/file remains the V1 persistence limitation; there is no authentication.

Checkpoint 04 will perform the final quality review, cross-browser/accessibility
follow-up, final portfolio screenshots and documentation polish. It has not started.
Do not release V1.0.0 or advance until the user independently reviews and approves.

## File inventory versus Checkpoint 02

Created:

- `apps/web/public/theme.js`
- `apps/web/src/api/tasks.test.tsx`
- `apps/web/src/api/tasks.ts`
- `apps/web/src/components/Dialog.tsx`
- `apps/web/src/tasks/DeleteDialog.tsx`
- `apps/web/src/tasks/TaskForm.tsx`
- `apps/web/src/tasks/TaskRow.tsx`
- `apps/web/src/tasks/TaskStats.tsx`
- `apps/web/src/tasks/types.ts`
- `apps/web/src/tasks/useTasks.ts`
- `apps/web/src/test/mockApi.ts`
- `apps/web/src/theme/ThemeControl.tsx`
- `docs/CHECKPOINT-03.md`

Modified:

- `CHANGELOG.md`
- `README.md`
- `apps/web/index.html`
- `apps/web/src/App.test.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/test/setup.ts`
- `docs/ARCHITECTURE.md`
- `eslint.config.js`

No files removed. All backend files, docs/API.md, package manifests, dependency lockfile, Vite configuration and version numbers are unchanged.
