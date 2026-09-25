# Per-Episode Consumption Tracking and Selective Torrent Pruning

## Context

Under ADR 0003 (Hardlink Staging File Flow) and ADR 0014 (Fully Consumed Tier in Cleanup Priority), season pack downloads are treated as a monolithic unit. Downloads land in `/downloads/staging` and are hardlinked into the Jellyfin library under `/media/shows/<Show>/Season <N>`.

This monolithic model produces two major inefficiencies:
1. **Coarse Consumption Evaluation**: In `CleanupService.refreshPlayHistory()`, if a user watched a single episode of a 24-episode season pack, `matchesLibraryPath` matched the season directory, marking the *entire* request as "Fully Consumed" and making unwatched episodes vulnerable to premature deletion under disk pressure.
2. **All-or-Nothing Storage Reclamation**: Reclaiming disk space required deleting the entire season pack and stopping the torrent. A home server running low on disk space could not reclaim the 20 GB of already-watched episodes while keeping unwatched episodes available for viewing and seeding.

## Considered Options

- **Filesystem-Only Dynamic Directory Scanning** — rejected: scanning directories on the fly during every cleanup evaluation incurs high I/O overhead, is vulnerable to scene-to-clean title mismatching, cannot reliably identify qBittorrent file indices for priority modification, and provides no audit history of pruned episodes.
- **Requiring Single-Episode Torrents Only** — rejected: many TV shows and anime are released solely as complete batch season packs. Forcing single-episode downloads restricts available release sources and increases tracker search overhead.
- **Selective Torrent Pruning via qBittorrent Priority 0 and Dual Hardlink Removal** — **chosen**: individual episodes are tracked in a child `request_episodes` table mapped to qBittorrent's internal file index. When an episode is pruned (automatically under storage pressure or manually by user/admin), its file priority in qBittorrent is set to `0` ("do not download"), and both the Library file and Staging Area file are unlinked.

## Decision

1. **Database Representation (`request_episodes`)**:
   Introduce a `request_episodes` table linked to `download_requests.id`. For each video file in an episodic download, record its `seasonNumber`, `episodeNumber`, `fileIndex` (0-based index in the torrent), `relativePath`, `jellyfinPath`, `sizeBytes`, `keepFlag`, `lastPlayedAt`, and `status` (`downloaded` | `pruned`).

2. **Episodic Pruning Execution**:
   To reclaim disk blocks for an episode without corrupting or stopping the seeding torrent:
   - Call qBittorrent WebAPI `POST /api/v2/torrents/filePrio?hash={hash}&id={fileIndex}&priority=0` to instruct the client to ignore the file and cease seeding checks.
   - Delete the episode hardlink from the Jellyfin library (`fs.unlinkSync(jellyfinPath)`).
   - Delete the episode file from qBittorrent's staging area (`fs.unlinkSync(stagingPath)`).
   - Mark the episode `status = 'pruned'` and record `prunedAt = now()`.
   - Trigger a safe Jellyfin library refresh (`jellyfin.safeRefresh()`).

3. **Torrent Lifecycle & Final Episode Completion**:
   The torrent remains actively seeding in qBittorrent for all unpruned episodes. When the final remaining episode in a pack is pruned, the entire torrent is removed from qBittorrent (`removeTorrent(hash, true)`), empty season directories are removed, and the parent `downloadRequests` record transitions to `deleted`.

4. **Hierarchical Keep Flag**:
   If the parent request has `keepFlag: true`, all episodes in the pack are immune to automatic cleanup. If the parent request is unkept, individual episodes can still carry an episode-level `keepFlag: true` to preserve specific favorite episodes.

5. **Priority Order in Cleanup Policy**:
   Under storage pressure, the Cleanup Service evaluates cleanup candidates in the following strict priority:
   - **Tier 1 (Highest Reclaim Priority)**: Consumed Episodes (`status = 'downloaded'`, all requesters have watched, `keepFlag = false`), ordered by least-recently-played.
   - **Tier 2**: Fully Consumed whole requests (where all files/episodes have been consumed), ordered by least-recently-played.
   - **Tier 3**: Remaining unconsumed requests, ordered by least-recently-played then oldest request.

6. **Automatic Startup Backfill**:
   On startup or initial migration, the service scans existing active episodic requests, correlates their library files with qBittorrent file indices and Jellyfin play history, and backfills `request_episodes` records so existing season packs immediately benefit from episodic tracking and pruning.

## Consequences

- Reclaims significant disk space on space-constrained media servers by freeing gigabytes of watched episodes while preserving un-watched episodes.
- Eliminates premature eviction of unwatched season pack episodes.
- Requires qBittorrent v4.1+ WebAPI support for `torrents/filePrio` and `torrents/files`.
- Requires dual unlinking (Library + Staging) because hardlinked files share inodes; unlinking only the Library path frees zero disk space until the Staging path is also unlinked.
