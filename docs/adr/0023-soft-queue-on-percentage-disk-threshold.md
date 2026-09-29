# ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject

- **Status**: Accepted
- **Date**: 2026-09-29

## Context

The system enforces two disk space guards before accepting a new download request:

1. **Host disk absolute floor** (`isHostDiskSafe`): rejects with HTTP 422 if the underlying filesystem has fewer than 10 GB free. This protects Docker, the OS, and SQLite from running out of space for their own writes.
2. **Percentage threshold** (`disk_reject_threshold`, default 15%): rejects with HTTP 422 if the free percentage of the host drive is below the configured threshold.

On multi-terabyte drives the percentage threshold can trigger misleadingly early. A 1.9 TB drive with 212 GB free (11%) trips the 15% guard even though 212 GB is more than enough for any individual download. Users saw an unhelpful generic "Not enough disk space" message with no recourse.

The system already has a *queued* path (`deferredReason: 'waiting_for_space'`) that it uses when the **storage quota** (a separate media-folder byte ceiling) is nearing capacity. A queued request with `waiting_for_space` is stored in the database, displayed in the dashboard, and automatically promoted to `downloading` by `queuePromoter` once space becomes available.

## Decision

Split the two disk guards into **hard** and **soft** failure modes:

| Check | Failure mode | Result |
|---|---|---|
| `isHostDiskSafe` (< 10 GB absolute) | **Hard fail** | HTTP 422 — request is not created |
| `disk_reject_threshold` (percentage) | **Soft fail** | HTTP 201 — request is created with `status: queued`, `deferredReason: waiting_for_space` |

Additionally:
- `checkDiskSafety` returns an explicit `hardFail: boolean` so callers can distinguish the two cases without re-querying the filesystem.
- `requestCreate`, `requestBatch`, and `requestReplaceTorrent` all adhere to the same two-tier rule: hard 422 only on `hardFail`, soft deferral to `waiting_for_space` on percentage threshold or quota limits.
- `queuePromoter` (`promoteQueuedRequests`) gates every promotion cycle on both `isHostDiskSafe` (hard floor) and `isSpaceSufficient` (percentage threshold); when either is breached it skips promotion entirely and ensures all queued items remain in `waiting_for_space`.
- The frontend (`useRequestSubmit.ts`) displays the server's error message instead of a hardcoded string, so the remaining 422 (host floor) is diagnostic rather than opaque.

## Consequences

**Good**:
- Requests on large drives with plenty of absolute free space but a relatively low percentage are no longer silently rejected; they appear in the dashboard and auto-start once space is reclaimed by the nightly cleanup cycle.
- The dangerous absolute-floor case (where SQLite writes could fail) is still a hard reject — the system never creates a DB row when it might not be able to service it.
- `queuePromoter` cannot accidentally fire a torrent download into qBittorrent when the host is critically full, because the promoter itself re-checks `isHostDiskSafe` on every poll cycle.

**Trade-offs**:
- A request queued due to the percentage threshold will only auto-start once the storage quota headroom opens up (via the cleanup daemon). If the quota is not the bottleneck, the request will remain queued until an admin either cleans content manually or adjusts the `disk_reject_threshold` setting downward. This is acceptable because the threshold is admin-configurable and the dashboard makes the `waiting_for_space` state visible.
- Magnet link rot: if a queued request's magnet link becomes unavailable between queue time and promotion time, the promoter catches the qBittorrent error, logs it, and leaves the request queued. This is the same silent-fallback already in use for `waiting_for_slot` cases.
