# API

Base URL during development: `http://127.0.0.1:3001`.

## Available now

### GET /api/health

HTTP 200, `application/json`:

```json
{ "data": { "status": "ok" } }
```

This is a process liveness check, not a storage readiness check.

Unknown routes return HTTP 404:

```json
{ "error": { "code": "NOT_FOUND", "message": "Route not found." } }
```

## Planned contract — Checkpoint 02

These routes are not implemented yet and currently return 404.

| Method | Route | Planned success |
| --- | --- | --- |
| GET | `/api/tasks` | 200 with `{ "data": [tasks] }` |
| POST | `/api/tasks` | 201 with `{ "data": task }` |
| PATCH | `/api/tasks/:id` | 200 with `{ "data": task }` |
| DELETE | `/api/tasks/:id` | 200 with `{ "data": { "id": "..." } }` |

The `:id` segment identifies the task for update/delete. Create accepts `title`
and optional `description`; patch accepts a nonempty subset of `title`,
`description`, and `completed`. Field limits, task representation, validation
errors, invalid JSON handling and storage errors will be finalized and tested
at Checkpoint 02. No task persistence exists at Checkpoint 01.
