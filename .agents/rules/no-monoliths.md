---
trigger: always_on
description: File-size limits and decomposition rules to prevent monolith/god-file creep in backend routes, services, jobs, and frontend components.
---

## No Monoliths / No God Files

This project has explicit file-size limits. Before creating or significantly modifying a file, check its current line count and stop if the result would breach the limit for that category.

### Hard Limits

| Category | Path pattern | Limit |
|---|---|---|
| Backend route sub-module | `apps/api/src/routes/**/*.ts` | **400 lines** |
| Backend service | `apps/api/src/services/**/*.ts` | **400 lines** |
| Backend job / cron | `apps/api/src/jobs/**/*.ts` | **350 lines** |
| `app.ts` (composition root) | `apps/api/src/app.ts` | **400 lines** |
| Vue component | `apps/web/src/components/**/*.vue` | **400 lines** |
| Vue view | `apps/web/src/views/**/*.vue` | **400 lines** |
| Vue composable | `apps/web/src/composables/**/*.ts` | **300 lines** |
| Test file | `apps/*/tests/**/*.test.ts` | **500 lines** |

> These are **stop conditions**, not style guidelines. If implementing a feature would push a file past its limit, the file must be split _before_ the feature is added.

### Rules for Agents

1. **Check before writing.** Before adding more than ~20 lines to any existing file, read its current line count. If the post-edit result would exceed the limit, decompose first.

2. **One responsibility per file.** Each route file handles one domain action group (e.g., `create.ts`, `list.ts`, `retry.ts`). Each service exposes one capability boundary. Each Vue component owns one visual concern.

3. **Route files are not controllers.** A route handler should validate input, call a service or repository method, and return a response. Orchestration logic (multi-step workflows, cross-service coordination) belongs in a dedicated service, not a route.

4. **Composables are not views.** A Vue composable must not own state for more than one step or page section. Split by step (`useRequestStep1`, `useRequestStep2`) or by concern (`useRequestSubmit`, `useMetadataSearch`).

5. **The repository is the only place for ORM queries.** Never write `eq(downloadRequests…)` or any `drizzle-orm` import outside `apps/api/src/services/requestsRepository.ts`. If a query is needed in a new place, add a method to `IRequestsRepository` first.

6. **Facades are allowed, re-aggregation is not.** An `index.ts` that re-exports sub-routers or an `app.ts` that wires dependencies is fine. A file that *implements* multiple route handlers just to keep the file count low is not.

7. **After splitting, verify.** Confirm `pnpm --filter <pkg> test` and `pnpm --filter <pkg> lint` pass before marking work complete.

### When you discover a file already over the limit

Do not add more code to it. File an issue (or note in your task list) referencing the over-limit file and its current size, then either:
- Propose a decomposition plan and get it approved before touching the file, or
- If the task is urgent, implement only the minimal change and immediately open a follow-up ticket for the split.
