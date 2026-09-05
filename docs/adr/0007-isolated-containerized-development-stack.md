# Isolated Containerized Development Stack

Feature development, database schema migrations, and integration testing execute within an isolated Development Stack (`docker/docker-compose.dev.yml`) running parallel instances of the Fastify API, qBittorrent, and Jellyfin on non-conflicting alternate ports (`3001`, `8081`, `6882`, `8097`) and separate host HDD directories (`D:\MediaServer\dev_media_data`), completely decoupled from the live Production Stack.

## Considered Options

- **Direct feature development against the live Production Stack** — rejected: running experimental code, unfinished migrations, or new cleanup policies directly on the live stack risks corrupting `app.db`, breaking active user streams, or deleting real media.
- **Run the API directly on the host with mocked external dependencies** — rejected: mocking Jellyfin API quirks, qBittorrent session cookies, and filesystem hardlinks leads to high test divergence and fails to catch real integration regressions before deployment.
- **Run the Dev Stack inside SSD named volumes** — rejected: atomic NTFS hardlinks between `staging` and `media` folders require both directories to live on the target host filesystem (`D:\`); testing on SSD volumes does not test real NTFS hardlink moves or physical disk space checks.
- **Keep Dev Stack containers running continuously** — rejected: running duplicate Jellyfin and qBittorrent instances 24/7 wastes host system RAM; the dev environment must be spun up and torn down on-demand via root lifecycle scripts.

## Consequences

- A dedicated Compose file (`docker/docker-compose.dev.yml`) and environment configuration (`.env.dev`) isolate all ports, secrets, database paths (`dev_app_db`), and media paths.
- The Fastify API container volume-mounts `apps/api` and runs `tsx watch` for instant sub-second hot reload during feature development without image rebuilds.
- Soft memory limits (`mem_limit`) ensure active dev containers cannot starve production services or trigger host OOM conditions.
- On-demand lifecycle scripts (`pnpm run dev:up`, `pnpm run dev:down`, and `pnpm run dev:setup`) provide 1-click startup, automated fixture bootstrapping (dummy sample media and test Jellyfin credentials), and clean teardown.
- The web frontend default development configuration targets `http://localhost:3001`, with an optional script (`pnpm run dev:prod`) for inspecting live production.
