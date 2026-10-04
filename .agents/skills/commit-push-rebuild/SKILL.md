---
name: commit-push-rebuild
description: >-
  Verifies changes are committed and pushed to git remote, identifies modified Docker services,
  rebuilds and restarts relevant containers, and checks health logs.
  Trigger when the user asks "Commited, pushed and relevant containers rebuilt?", "commit push rebuild",
  "rebuild relevant containers", "rebuild containers", or "/commit-push-rebuild".
---

# Commit, Push & Rebuild Relevant Containers

Standard operating procedure to ensure working code is safely tracked, synchronized with remote, and deployed to running Docker containers without rebuilding unaffected services.

## Workflow

### 1. Verify Git Status & Commit
Check whether working tree has uncommitted modifications or untracked files:
```bash
git status --short
```
- If clean, note the current commit hash:
  ```bash
  git rev-parse --short HEAD
  ```
- If uncommitted changes exist:
  1. Verify pre-commit checks pass (`pnpm test`, `pnpm lint` or repo equivalent).
  2. Stage modified files (`git add ...`).
  3. Create a Conventional Commit describing the change:
     ```bash
     git commit -m "<type>(<scope>): <summary>"
     ```

### 2. Verify Push Status
Check if local branch has commits not yet pushed to origin:
```bash
git status
git log origin/$(git branch --show-current)..HEAD --oneline
```
- If ahead of remote, push immediately:
  ```bash
  git push origin $(git branch --show-current)
  ```
- Verify local and remote branches match:
  ```bash
  git rev-parse --short HEAD
  git rev-parse --short origin/$(git branch --show-current)
  ```

### 3. Identify Affected Containers
Inspect changes between running image base (or recent commits) and current HEAD:
```bash
git diff origin/$(git branch --show-current)~1 HEAD --name-only
```
Map changed file paths to Docker Compose service names:
- `apps/api/` or `packages/api/` -> `api`
- `apps/watcher/` -> `watcher`
- `apps/streamer/` -> `streamer`
- `apps/web/` -> `web` (or static frontend builder/server)
- `docker/docker-compose.yml` -> any modified service definition or global infra

If only docs/markdown or unrelated files changed, inform user and confirm if a forced rebuild is desired before proceeding.

### 4. Rebuild & Restart Relevant Containers
Locate the docker-compose file (e.g. `docker/docker-compose.yml` or root `docker-compose.yml`).
Build and recreate *only* the identified relevant services with zero unnecessary downtime for unaffected services:
```bash
docker compose -f docker/docker-compose.yml up -d --build <service-1> <service-2>
```

### 5. Verify Container Health & Logs
Confirm containers are running and healthy:
```bash
docker compose -f docker/docker-compose.yml ps <service-1> <service-2>
```
Inspect recent logs for crash loops, exit codes, or startup exceptions:
```bash
docker compose -f docker/docker-compose.yml logs --tail 30 <service-1> <service-2>
```

### 6. Report Summary
Provide a concise, factual confirmation:
- **Git Commit**: SHA & message.
- **Git Push**: Pushed to `origin/<branch>`.
- **Rebuilt Containers**: List of updated services and container status (`Up <seconds>`, health check result).
- **Startup Verification**: Clean boot confirmation from recent logs.
