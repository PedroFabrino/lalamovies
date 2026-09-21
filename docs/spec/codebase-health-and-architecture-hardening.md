# Spec: Codebase Health, Architecture Hardening & Residual Refactoring

## Problem Statement

Following recent architectural improvements (including the introduction of `RequestsRepository`, `RequestStateMachine`, and centralized hardlinking/unarchiving pipelines), several residual code smells, edge cases, and systemic architectural issues remain in the codebase. 

Specifically:
- State transitions are bypassed in startup recovery and retry routes, resulting in raw SQL writes that miss WebSocket and notification side effects.
- The `RequestsRepository` pattern was introduced but is only used in one place, leaving dozens of direct database queries across controllers and jobs.
- The filesystem service is tightly coupled to the database schema by executing SQL queries inside file path resolution routines.
- Two massive frontend view components (`RequestView.vue` and `AdminView.vue`) exceed 2,000–3,000 lines of code each with all modals, forms, and validation logic bundled inline, making UI fixes and feature additions prone to regressions.
- The backend request routing controller (`routes/requests.ts`) exceeds 1,700 lines, bundling discovery search, media download creation, batch uploads, subtitle management, and transcription controls into a single file.
- The project test suite contains over 20 duplicate definitions of service mocks (`MockJellyfin`, `MockQBittorrent`), requiring shotgun surgery across 10+ test files whenever service interfaces evolve.
- The project linter fails with 150+ errors across `api` and `web`, and the `watcher` and `streamer` services lack linter scripts completely.
- Media storage footprint calculations synchronously traverse directories on the Node.js event loop, risking blocking API responses on cold disk lookups.
- Hardcoded production incident data (a specific movie title and path from the `xb` incident) runs filesystem scans and `fs.rmSync` calls on every boot, posing a data-destruction risk on any deployment that happens to have a matching folder name.
- Requests that crash mid-`HARDLINKING` are permanently orphaned — no daemon or startup hook recovers them — and 67 empty `catch {}` blocks across the API silently hide pipeline failures in production.
- `JWT_SECRET` has a hardcoded public fallback (`'super-secret-jwt-key-for-development-32chars'`) used when the env var is absent; the server starts with zero env vars configured and only fails at request time.
- `RequestStateMachine.transition()` commits the status write to the DB then calls Jellyfin and the notification service sequentially with no retry — a transient Jellyfin failure silently drops the user's "ready" notification.
- `CleanupService` has a 10-positional-argument constructor with three consecutive `undefined` placeholders at the `app.ts` call site; two of the optional parameters share the same type, making a silent swap undetectable by the compiler.

Addressing these issues will ensure the codebase remains maintainable, modular, resilient to regressions, secure, and compliant with clean architecture principles.

## Solution

A targeted hardening initiative that resolves residual refactoring gaps, eliminates monolithic files, standardizes testing mocks, enforces lint cleanliness, decouples data access, and hardens operational correctness:

1. **Complete State Machine & Directory Utility Adoption**: Ensure all status transitions (including startup recovery and failure fallbacks) pass through the centralized `RequestStateMachine`, standardize all directory creation through `ensureDirectory`, and remove hardcoded incident data from the startup path.
2. **Decouple Filesystem from Database**: Move series folder database queries out of `FileSystemService` and into `RequestsRepository`, restoring strict single-responsibility boundaries.
3. **Expand Repository Adoption**: Migrate raw download request database queries in routes and background pollers to methods on `RequestsRepository`.
4. **Consolidate Test Fixtures**: Provide shared mock implementations for core external integrations (`IJellyfinService`, `IQBittorrentService`) to eradicate mock duplication across tests.
5. **Monorepo Lint Uniformity**: Repair all ESLint errors across the API and Web applications, and establish linting configurations for the Watcher and Streamer services so the entire monorepo can be validated with a single green `pnpm -r lint` pass.
6. **Decompose Backend God-Route**: Break down `routes/requests.ts` into cohesive submodules grouped by domain capability (Search, Subtitles, Transcription, Lifecycle) while preserving the existing HTTP contract.
7. **Decompose Frontend View Monoliths**: Modularize `RequestView.vue` and `AdminView.vue` into focused, testable child components for each step, tab, and modal.
8. **Asynchronous Footprint Scanning**: Transition synchronous directory scanning in storage footprint computation to asynchronous non-blocking traversal.
9. **Startup Env-Var Validation**: Add a fail-fast config validation pass on boot that rejects missing or default-valued critical secrets before the server binds to any port.
10. **HARDLINKING Orphan Recovery**: Add a startup recovery hook for requests stuck in `HARDLINKING` status, and replace dangerous silent `catch {}` blocks with logged errors across the pipeline.
11. **CleanupService Constructor Hardening**: Replace the 10-positional-argument constructor with a typed options object, eliminating silent argument-swap bugs.
12. **Post-Transition Side-Effect Retry**: Retry Jellyfin refresh and notification delivery once on transient failure after a status transition, logging structured errors instead of silently dropping them.

## User Stories

1. As an operator, I want startup compressed download recovery to execute status transitions through the central state machine, so that restored media events trigger proper notifications, Jellyfin library refreshes, and dashboard updates.
2. As a developer, I want the filesystem service to operate purely on paths and files without dependencies on the database, so that filesystem logic can be tested and reused without mocking database instances.
3. As a developer, I want all download request database queries to go through `RequestsRepository`, so that query logic, filters, and schema bindings are maintained in a single location.
4. As a developer, I want to use standard shared mock fixtures for Jellyfin and qBittorrent in tests, so that changing a service interface does not require updating mock classes across 14 independent test files.
5. As a developer, I want `pnpm -r lint` to pass with zero errors and warnings across all four packages in the monorepo, so that regressions in code quality and unsafe `any` types are caught automatically in CI.
6. As a developer, I want all monorepo packages (`api`, `web`, `watcher`, `streamer`) to have linter enforcement, so that no service can accumulate undetected static analysis issues.
7. As a maintainer, I want backend request routes to be separated into focused modules for lifecycle, search, subtitles, and transcription, so that route files are concise, easy to audit, and simple to modify.
8. As a frontend developer, I want the request submission wizard to be split into discrete Step 1, Step 2, and Step 3 components, so that modifying metadata selection or torrent input does not risk breaking unrelated steps.
9. As a frontend developer, I want admin tabs (Users, Invites, Config, Cleanup) to be independent components, so that UI maintenance is isolated and components stay under a reasonable file size.
10. As a user, I want background storage footprint recalculations to occur asynchronously without blocking the server event loop, so that API response times and stream playback responsiveness remain instantaneous even on large media collections.
11. As a developer, I want consistent directory creation permissions across all media and staging folders, so that file permission mismatches between containers and host processes are prevented.
12. As a developer, I want unarchive service test mocks to satisfy the full interface contract without resorting to prototype binding fallbacks at runtime, ensuring complete type safety and predictable execution.
13. As an operator, I want the server to refuse to start if `JWT_SECRET` is missing or set to the public development default, so that a misconfigured production deploy is caught immediately rather than silently creating forgeable tokens.
14. As an operator, I want requests stuck in `HARDLINKING` after a crash to be automatically recovered or marked as errors on the next boot, so that no request is silently orphaned without operator visibility.
15. As a user, I want my "download ready" notification to be delivered reliably even if Jellyfin or the notification service experiences a brief transient error at the exact moment my request finishes processing.
16. As a developer, I want `CleanupService` to accept a named options object rather than ten positional arguments, so that adding or reordering optional providers is a type-safe operation caught by the compiler.

## Implementation Decisions

- **State Machine Exclusivity**: Remove raw SQL fallback branches in `unarchiveRecovery` and `cleanup`. Startup recovery will receive the injected `stateMachine` instance directly from `buildApp`.
- **Incident Data Removal**: Strip the `xb`-specific query clauses and `fs.rmSync` calls from `runCompressedDownloadsRecovery`, rename it to `runCorruptedArchiveRecovery`, and preserve a one-time script in `scripts/one-time/` for audit trail.
- **Repository-Driven Series Lookup**: Introduce a dedicated lookup method on `RequestsRepository` (e.g. for retrieving established show folders for series matching) and inject the repository or resolved directory name into `processAndHardlinkTorrent`, removing database schema imports from `fileSystem.ts`.
- **Repository Migration Strategy**: Expand `RequestsRepository` methods incrementally to support `findById`, `findByStatus`, `findMatchingExistingSeries`, and `updateDeferredReason`. Migrate route handlers and background jobs to these methods.
- **Shared Test Fixtures Package**: Create a centralized test fixture module (`tests/fixtures/`) exporting canonical `MockJellyfinService` and `MockQBittorrentService` implementations with configurable spies and return values. Migrate existing test suites to consume these fixtures.
- **Linter Rule Alignment**: Resolve TypeScript `any` assertions, eliminate useless regex escape characters, clean up unused imports, and handle empty catch blocks with explicit intentional comments. Configure ESLint in `watcher` and `streamer` sharing the project base ESLint configuration.
- **Sub-routing Modularization**: Retain the exact public HTTP interface and route endpoints under `/requests`, but split the controller implementation across domain sub-routers:
  - `requests.lifecycle`: Handles creation, batch submission, status retrieval, retry, keep flag toggling, and deletion.
  - `requests.search`: Handles Prowlarr indexer status, release searches, metadata searches, existence checks, and infringing-mark actions.
  - `requests.subtitles`: Handles subtitle listing, manual fetching, and language configuration.
  - `requests.transcription`: Handles triggering and status updates for Subgen audio transcription.
- **Component Decomposition**: Break large Vue views into composable components with typed `defineProps` and `defineEmits`:
  - `RequestView.vue` will delegate to `RequestStep1Input.vue`, `RequestStep2Candidates.vue`, `RequestStep3Confirmation.vue`, and `BatchUploadModal.vue`.
  - `AdminView.vue` will delegate to `AdminUsersTab.vue`, `AdminInvitesTab.vue`, `AdminConfigTab.vue`, and `AdminCleanupTab.vue`.
- **Asynchronous Disk Walking**: Replace recursive `fs.readdirSync` and `fs.lstatSync` in `getStorageFootprintBytes` with `fs.promises` asynchronous iteration or streaming directory walkers, preserving the 60-second TTL cache.
- **Config Module**: A single `apps/api/src/config.ts` reads and validates all env vars at import time. Critical vars missing or equal to known development defaults in production cause `process.exit(1)` before the Fastify instance is created.
- **HARDLINKING Recovery**: A new `hardlinkRecovery.ts` service wired in `app.ts` `onReady` re-attempts hardlinking for requests stuck in `HARDLINKING`, or transitions them to `ERROR` if the source torrent is no longer present.
- **Empty-Catch Audit**: The highest-risk `catch {}` blocks (downloadPoller staging path, fileSystem hardlink operations, cleanup disk operations, metadata enrichment) receive at minimum a `logger.warn` with the error message. Intentional fire-and-forget catches (e.g. `chmodSync`, `auth.ts` JWT fallthrough) are annotated with a comment.
- **CleanupService Options Object**: A `CleanupServiceOptions` interface groups all current parameters. The internal default `RequestStateMachine` construction path (which silently omitted `broadcastFn`) is removed; the injected instance is always used.
- **Side-Effect Retry**: `RequestStateMachine.transition()` wraps `jellyfin.safeRefresh()` and `notifications.send()` in individual try/catch blocks with one retry at a fixed 2 s delay. The `broadcastFn` (WebSocket) remains fire-and-forget with a comment. Failures after retry are logged with structured context (`requestId`, `toStatus`, error message) and not rethrown.
- No database migrations or schema alterations are required. Public API contracts and client behavior remain identical.

## Testing Decisions

- **External Behavior Verification**: Tests will continue to assert HTTP response codes, database states, and external service interactions through public interfaces rather than asserting private class internals.
- **Regression Safety Gate**: The full test suite across all four packages (`pnpm test`) and full type checking (`pnpm -r typecheck`) must stay green before and after every ticket.
- **Zero-Lint CI Enforcement**: `pnpm -r lint` must exit with code 0 across the entire workspace upon completion of the linter ticket and remain clean across subsequent tickets.
- **Existing Prior Art**:
  - State machine tests: `apps/api/tests/requestStateMachine.test.ts`
  - Repository tests: `apps/api/tests/requestsRepository.test.ts`
  - Hardlink/filesystem tests: `apps/api/tests/fileSystem_processAndHardlinkTorrent.test.ts`
  - Vue component tests: `apps/web/tests/*.test.ts`

## Out of Scope

- Introducing new end-user features or altering existing UX behavior.
- Replacing Drizzle ORM or changing database engines.
- Changing the public HTTP REST API paths, payload contracts, or WebSocket schemas.
- Full microservice consolidation (Watcher and Streamer remain independent microservices).
- Full outbox/job-queue persistence for post-transition side-effects (retry-once-then-log is the chosen scope).
- Generating a typed API client from the backend schema (tracked as a future type-drift risk; not in scope here).

## Recommended Implementation Order

All ticket files live under `.scratch/codebase-health/issues/` in this repository. Each file contains the full acceptance criteria for that ticket.

The 12 tickets have the following dependency structure. Tickets within the same wave have no dependencies on each other and **can be implemented in parallel**.

**To implement a wave:** read each linked ticket file, implement its acceptance criteria in order, then run the verification commands listed in the ticket before moving on.

---

### Wave 1 — Foundation (no blockers; implement first)

| # | GH Issue | Ticket file | Rationale |
|---|----------|-------------|-----------|
| **09** | [#122](https://github.com/PedroFabrino/lalamovies/issues/122) | `.scratch/codebase-health/issues/09-startup-env-validation-and-jwt-security.md` | Highest security blast radius. Zero deps, quick to land. |
| **01** | [#123](https://github.com/PedroFabrino/lalamovies/issues/123) | `.scratch/codebase-health/issues/01-fix-startup-recovery-and-ensuredirectory.md` | Removes data-destruction risk on boot; closes the raw SQL bypass in the startup path. |
| **12** | [#124](https://github.com/PedroFabrino/lalamovies/issues/124) | `.scratch/codebase-health/issues/12-cleanup-service-options-object.md` | Eliminates the silent argument-swap trap before anyone else touches `CleanupService`. Mechanical 2-file change. |
| **03** | [#125](https://github.com/PedroFabrino/lalamovies/issues/125) | `.scratch/codebase-health/issues/03-consolidate-test-mocks.md` | Velocity multiplier: shared fixtures make every subsequent ticket's tests faster to write. |
| **04** | [#126](https://github.com/PedroFabrino/lalamovies/issues/126) | `.scratch/codebase-health/issues/04-monorepo-eslint-reparation.md` | Unblocks ticket 06; establishes a green lint baseline across the workspace. |
| **02** | [#127](https://github.com/PedroFabrino/lalamovies/issues/127) | `.scratch/codebase-health/issues/02-decouple-db-from-filesystem-and-expand-repository.md` | Unblocks tickets 06 and 13; removes the most egregious SRP violation. |

---

### Wave 2 — Build on the foundation (start after Wave 1 blockers are complete)

| # | GH Issue | Ticket file | Blocked by |
|---|----------|-------------|-----------|
| **10** | [#128](https://github.com/PedroFabrino/lalamovies/issues/128) | `.scratch/codebase-health/issues/10-hardlinking-recovery-and-empty-catch-audit.md` | #123 (01) |
| **13** | [#129](https://github.com/PedroFabrino/lalamovies/issues/129) | `.scratch/codebase-health/issues/13-post-transition-side-effect-retry.md` | #123 (01), #127 (02) |
| **05** | [#130](https://github.com/PedroFabrino/lalamovies/issues/130) | `.scratch/codebase-health/issues/05-async-storage-footprint-calculation.md` | #123 (01) |
| **06** | [#131](https://github.com/PedroFabrino/lalamovies/issues/131) | `.scratch/codebase-health/issues/06-decompose-backend-requests-route.md` | #127 (02), #126 (04) |

---

### Wave 3 — Decomposition (start after 04 is complete)

| # | GH Issue | Ticket file | Blocked by |
|---|----------|-------------|-----------|
| **07** | [#132](https://github.com/PedroFabrino/lalamovies/issues/132) | `.scratch/codebase-health/issues/07-decompose-frontend-requestview.md` | #126 (04) |
| **08** | [#133](https://github.com/PedroFabrino/lalamovies/issues/133) | `.scratch/codebase-health/issues/08-decompose-frontend-adminview.md` | #126 (04) |

---

### Dependency diagram

```
#122 (09) ──────────────────────────────────────── (no deps)
#123 (01) ───────────────────► #128 (10)
#123 (01) + #127 (02) ───────► #129 (13)
#127 (02) + #126 (04) ───────► #131 (06)
#126 (04) ───────────────────► #132 (07), #133 (08)
#125 (03), #124 (12), #130 (05) ─ (no deps)
```

> **Suggested first sprint**: land **#122 (09) → #123 (01) → #124 (12)** in that order on a single branch (they touch separate files and have no cross-deps), while **#125 (03)** and **#126 (04)** land in parallel on separate branches.



