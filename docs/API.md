# TaskFlow API — Checkpoint 02

Development base URL: `http://127.0.0.1:3001`. All responses are JSON.
There is one shared collection, no authentication and no user isolation.

## Task model

| Field | Rules |
| --- | --- |
| `id` | Server-generated UUID v4; route identifiers must be valid UUIDs |
| `title` | Required string; trimmed on input; 1–200 UTF-16 code units after trimming |
| `description` | Optional string, 0–5,000 UTF-16 code units; whitespace preserved |
| `completed` | Boolean, initially `false` |
| `createdAt` | Server-generated UTC ISO timestamp |
| `updatedAt` | Server-generated UTC ISO timestamp, initially equal to `createdAt` |

An omitted description stays absent. PATCH `{"description":""}` clears its text;
`null` is invalid. Unmentioned fields are preserved. Every successful PATCH updates
`updatedAt`, including a no-op value change; timestamps can coincide within one
millisecond. IDs and timestamps cannot be supplied or changed by clients.

## Endpoints

| Method | Path | Success |
| --- | --- | --- |
| GET | `/api/health` | 200, `{"data":{"status":"ok"}}` |
| GET | `/api/tasks` | 200, `{"data":[task,...]}` |
| POST | `/api/tasks` | 201, `{"data":task}` |
| PATCH | `/api/tasks/:id` | 200, `{"data":task}` |
| DELETE | `/api/tasks/:id` | 200, `{"data":{"id":"..."}}` |

GET returns tasks in insertion order. There is no pagination or server filtering.
Health checks process liveness, not storage readiness; it can return 200 while
storage operations return 503. Unknown routes retain the original JSON 404.

POST accepts only `title` and optional `description`. PATCH accepts a nonempty
subset of `title`, `description`, `completed`. Unknown fields, incorrect types,
empty updates, whitespace-only titles, and over-limit fields are rejected.
Send write requests as `Content-Type: application/json` (UTF-8 recommended).
Compressed request bodies are rejected. JSON bodies are limited to **32 KiB**;
this byte limit also applies when Unicode or escaped strings expand the payload.

Example create:

```json
{"title":"Review checkpoint 02","description":"Read the repository and run tests."}
```

Example response (illustrative server-owned values):

```json
{
  "data": {
    "title": "Review checkpoint 02",
    "description": "Read the repository and run tests.",
    "id": "0612c2fa-5fe0-4d3e-b5f4-72e9b88e9f6c",
    "completed": false,
    "createdAt": "2026-10-16T19:00:00.000Z",
    "updatedAt": "2026-10-16T19:00:00.000Z"
  }
}
```

## Errors

Every error has the shape `{"error":{"code":"...","message":"..."}}`.
Responses do not expose stack traces, filesystem paths, stored data, or Zod internals.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid fields, empty update, missing body, or invalid UUID |
| 400 | `INVALID_JSON` | Malformed JSON; scalar/null JSON rejected by the object parser |
| 400 | `INVALID_REQUEST` | Invalid URL encoding or invalid/incomplete body transport |
| 404 | `TASK_NOT_FOUND` | Valid UUID has no matching task |
| 404 | `NOT_FOUND` | Unknown route; message is `Route not found.` |
| 413 | `PAYLOAD_TOO_LARGE` | Body exceeds 32 KiB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Non-JSON write request, unsupported charset, or compression |
| 503 | `STORAGE_UNAVAILABLE` | Corrupt data or filesystem read/write failure |
| 500 | `INTERNAL_ERROR` | Unexpected internal failure |

Arrays are valid JSON but fail object validation. Validation occurs before task
lookup. Thus an invalid PATCH body returns 400 even for a nonexistent UUID.
A repeated DELETE returns 404. There is no automatic retry or idempotency key;
a client losing a POST response cannot assume that creation failed.
