# Architecture

## Implemented in Checkpoint 01

Two private npm workspaces keep browser and server dependencies separate. Shared
compiler rules enforce strict types, checked indexed access and exact optional
properties. The API uses Node ESM; the web uses Vite's bundler resolution.

`createApp()` does not bind a network port, so Supertest can test HTTP behavior
without booting the application entry point. `server.ts` owns configuration,
listening and bounded graceful shutdown. Zod validates startup environment values.
React renders a deliberately limited foundation shell.

## Planned for Checkpoint 02 (not implemented)

HTTP routes/controllers → task service → TaskRepository interface → JsonTaskRepository.

Controllers translate HTTP input/output. Zod validates unknown request values,
including route identifiers and strict create/update objects. The service owns
task business rules. A repository interface exposes task read/write operations
without Express or filesystem types; PostgreSQL can implement that same contract
in V2. Avoid a generic ORM-like abstraction and premature shared packages.

The JSON adapter will serialize the entire read-modify-write operation, write a
temporary file in the same directory and rename it atomically. Corrupt storage
must fail closed without resetting or overwriting the original file. Missing
storage may be initialized. Tests must cover concurrent operations, restart
persistence and malformed storage. V1 will support one API writer process; an
in-process queue alone does not make multiple processes safe.

Frontend API access and task state will be introduced in Checkpoint 03. Keep
network parsing outside presentation components. Authentication is out of scope
for V1; deployment must not imply private, per-user task isolation.
