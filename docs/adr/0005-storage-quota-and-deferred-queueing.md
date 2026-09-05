# Application Software Storage Quota and Deferred Queueing

The system enforces a configurable Storage Quota (defaulting to e.g. 150 GB, set via `STORAGE_QUOTA_GB` or Admin UI) calculated by measuring the physical disk footprint of `/media_data`. When quota usage reaches 80%, automatic cleanup warnings and routines are initiated. When quota usage exceeds 85%, new incoming Download Requests are deferred into the `queued` state instead of being rejected. As disk space is reclaimed, the download poller promotes queued requests using a greedy best-fit FIFO strategy.

## Considered Options

- **Docker / OS-level VHDX or loopback quota** — rejected: on Windows/WSL2 and Linux Docker setups, loopback files and hard container size limits cause qBittorrent and SQLite to experience abrupt `ENOSPC` I/O crashes and require complex filesystem image management.
- **Strict hard rejection of new requests at 85%** — rejected: frustrates users when storage is full. Accepting requests into a deferred queue allows users to submit requests anytime and have them automatically download as soon as space is freed.
- **Strict FIFO queue promotion** — rejected: if the oldest request in queue is a large 50 GB season pack and only 5 GB was freed, strict FIFO blocks all subsequent smaller requests (like 300 MB anime episodes) from downloading even though space is available.

## Consequences

- The Fastify backend periodically samples unique disk usage in `/media_data` (handling hardlinks accurately) to track quota consumption.
- Download requests can safely accumulate in `queued` status without consuming bandwidth or disk space before storage is ready.
- The UI surfaces a distinct `Queued (Waiting for Space)` status when an item is paused due to quota constraints rather than concurrent slot limits.
