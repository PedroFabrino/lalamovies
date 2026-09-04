# SQLite for Application State

The web app''s own state (Users, Download Requests, Cleanup history, Invite tokens) is stored in a single SQLite file rather than a standalone database server. At the expected scale (fewer than 20 users, hundreds of Download Requests) SQLite is sufficient and eliminates an entire infrastructure dependency.

## Considered Options

- **PostgreSQL (self-hosted)** — rejected: adds a second Docker service, connection pooling concerns, and backup complexity for no meaningful benefit at this scale.
- **Supabase (hosted Postgres)** — rejected: introduces a cloud dependency and a free-tier ceiling for what is a trivial data volume.

## Consequences

- SQLite does not support multiple concurrent writers. The Fastify app must be run as a single process (no horizontal scaling). Acceptable: this is a single-server deployment.
- Backup is a file copy. A nightly ``cp`` or volume snapshot is sufficient.
- Migrating to Postgres later is straightforward with any Node ORM (Drizzle, Prisma) since the schema is simple.
