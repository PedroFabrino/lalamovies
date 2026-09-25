# Per-Episode Consumption Tracking and Selective Torrent Pruning — Spec

## Problem Statement

When users download TV Shows or Anime as Season Packs in Media Download Manager (MDM), the system treats the entire pack as an indivisible monolithic unit:

1. **Premature Whole-Pack Eviction**: In `CleanupService.refreshPlayHistory()`, if any requester watches a single episode of a 24-episode season pack, the path matching logic matches the top-level season directory. The system marks the *entire* season pack as "Fully Consumed", making the remaining 23 unwatched episodes prematurely vulnerable to automated deletion under disk storage pressure.
2. **Inflexible All-or-Nothing Storage Reclamation**: To free disk space, the cleanup daemon must delete the entire season pack and remove its torrent from qBittorrent. Users cannot reclaim the tens of gigabytes occupied by already-watched episodes while keeping unwatched episodes on disk for ongoing viewing.
3. **No Granular Episode Control**: Users and administrators have no way to view the status of individual episodes within a season pack, delete specific episodes they have finished watching, or protect favorite episodes with a Keep flag.

---

## Solution

Introduce a **Per-Episode Consumption Tracking and Selective Torrent Pruning** subsystem across MDM:

1. **Granular Database Representation (`request_episodes`)**:
   - Model each episode within an episodic download in a child `request_episodes` table linked to `download_requests.id`.
   - Records the season and episode number, qBittorrent 0-based `fileIndex`, relative staging path, Jellyfin library path, file size, `keepFlag`, `lastPlayedAt` timestamp, and `status` (`'downloaded' | 'pruned'`).

2. **Selective Torrent Pruning via qBittorrent File Priority 0**:
   - Pruning an individual episode safely reclaims disk space without corrupting or stopping the active seeding torrent:
     1. Set the file priority to `0` ("do not download") in qBittorrent via `POST /api/v2/torrents/filePrio?hash={hash}&id={fileIndex}&priority=0`.
     2. Delete the episode file from the Jellyfin library (`/media/shows/...`).
     3. Delete the episode file from qBittorrent's staging area (`/downloads/staging/...`).
     4. Rescan Jellyfin (`jellyfin.safeRefresh()`).
   - Because both hardlinks are removed, the filesystem immediately frees the disk blocks. Because priority is 0, qBittorrent ignores the missing file and does not attempt to re-download it.
   - The remaining unwatched episodes in the season pack continue seeding uninterrupted.

3. **Tiered Storage-Pressure Cleanup Policy**:
   - Under storage pressure, the Cleanup Service evaluates candidates in strict order:
     - **Tier 1 (Highest Priority)**: **Consumed Episodes** (`status = 'downloaded'`, all requesters have watched, `keepFlag = false`), ordered by least-recently-played.
     - **Tier 2**: **Fully Consumed whole requests** (all constituent episodes/files watched), ordered by least-recently-played.
     - **Tier 3**: Remaining unconsumed requests, ordered by least-recently-played then oldest request.

4. **Hierarchical Keep Flag & Final Episode Completion**:
   - Setting `keepFlag: true` on the parent request protects all constituent episodes from automatic cleanup.
   - Individual episodes can also be marked `keepFlag: true` to exempt specific favorite episodes even if the parent pack is unkept.
   - When the final remaining episode in a season pack is pruned, the entire torrent is removed from qBittorrent (`removeTorrent(hash, true)`), the empty season folder is cleaned up, and the parent request transitions to `status = 'deleted'`.

5. **User Interface & Expandable Accordion Drawer**:
   - In `DashboardView.vue` and `LibraryView.vue`, clicking a Season Pack card expands an inline drawer (`SeasonPackEpisodesDrawer.vue`).
   - Displays all constituent episodes with their size, play history date, individual "Keep" toggle, and an individual "Prune" action button.

6. **Automated Startup Backfill**:
   - On startup, scan existing active episodic downloads (`seeding` or `done`), match their library files with qBittorrent file indices and Jellyfin play history, and backfill `request_episodes` records so existing season packs immediately benefit.

---

## User Stories

### Granular Play History & Consumption
1. As a viewer watching episode 1 of a 24-episode season pack, I want only episode 1 to be marked as watched, so that unwatched episodes 2 through 24 are not prematurely flagged as fully consumed.
2. As a household with multiple co-requesters, I want an episode to be considered a Consumed Episode only when all requesters have watched that specific episode, so that household members can watch at their own pace without having episodes deleted prematurely.
3. As a user viewing a Season Pack on the dashboard, I want to expand an episode list to see which episodes I have watched and which remain unwatched.

### Episodic Storage Reclamation
4. As a system operator with a storage-constrained home server, I want automatic cleanup to prune the oldest watched episodes first, so that disk space is reclaimed without deleting unwatched episodes.
5. As a user who just finished an episode, I want to click "Prune Episode" to manually free its disk space immediately, without waiting for automated cleanup.
6. As a user with a season pack actively seeding in qBittorrent, I want pruning a watched episode to set its priority to 0 in qBittorrent and delete both hardlinks, so that disk space is freed immediately while remaining episodes continue seeding without torrent errors.
7. As a user, I want the underlying torrent to be automatically removed and the parent request marked deleted once the last remaining episode in a pack is pruned, so that finished downloads don't linger indefinitely.

### Protection & Keep Flags
8. As a user, I want setting the Keep Flag on a Season Pack to protect all of its episodes from automatic cleanup, so that entire beloved series can be preserved permanently.
9. As a user, I want to toggle a Keep Flag on specific individual episodes within an unkept season pack, so that I can preserve favorite episodes (e.g. pilot, finale) while allowing ordinary filler episodes to be pruned when space is tight.

### Existing Downloads Backfill
10. As a system operator upgrading MDM, I want the system to scan existing season packs on startup and populate their episode records, so that existing downloads immediately gain per-episode tracking and pruning.

---

## Implementation Decisions

### Database Schema (`apps/api/src/db/schema.ts`)
- Introduce `requestEpisodes` table:
  - `id`: `text('id').primaryKey()`
  - `requestId`: `text('request_id').notNull().references(() => downloadRequests.id, { onDelete: 'cascade' })`
  - `seasonNumber`: `integer('season_number').notNull()`
  - `episodeNumber`: `integer('episode_number').notNull()`
  - `fileIndex`: `integer('file_index').notNull()` (0-based index in torrent)
  - `relativePath`: `text('relative_path').notNull()` (path in staging)
  - `jellyfinPath`: `text('jellyfin_path').notNull()` (path in library)
  - `sizeBytes`: `integer('size_bytes').notNull()`
  - `status`: `text('status', { enum: ['downloaded', 'pruned'] }).notNull().default('downloaded')`
  - `keepFlag`: `integer('keep_flag', { mode: 'boolean' }).notNull().default(false)`
  - `lastPlayedAt`: `text('last_played_at')`
  - `prunedAt`: `text('pruned_at')`

### File Processing & Hardlinking (`apps/api/src/services/fileSystem.ts`)
- During `processAndHardlinkTorrent()`:
  - When hardlinking multi-file directories for episodic media (`tv_show` or `anime`), inspect each video file.
  - Parse `episodeNumber` and `seasonNumber` using `extractEpisodeInfo()`.
  - Correlate each file with qBittorrent's `files` list to extract `fileIndex`.
  - Insert rows into `requestEpisodes` table for each hardlinked video file.

### qBittorrent Service (`apps/api/src/services/qbittorrent.ts`)
- Add `setFilePriority(hash: string, fileIndex: number, priority: number): Promise<void>`:
  - Calls `POST /api/v2/torrents/filePrio` with params `hash`, `id: String(fileIndex)`, `priority: String(priority)`.

### Cleanup Service (`apps/api/src/services/cleanup.ts`)
- In `refreshPlayHistory()`:
  - Correlate Jellyfin per-user play histories against individual `requestEpisodes.jellyfinPath`.
  - Update `lastPlayedAt` per episode.
  - Mark an episode as a "Consumed Episode" when all active requesters have played that episode file.
  - Evaluate whole-request "Fully Consumed" status only when *all* episodes in the pack have been consumed or pruned.
- In `checkDiskAndClean()`:
  - Prioritize pruning Consumed Episodes (Tier 1) before scheduling deletion of whole requests (Tier 2/3).
- In `pruneEpisode(episodeId: string)`:
  - Sets qBittorrent file priority to `0` via `qbittorrent.setFilePriority`.
  - Deletes `/media/shows/...` library hardlink.
  - Deletes `/downloads/staging/...` staging file.
  - Updates episode `status = 'pruned'` and `prunedAt = now()`.
  - Refreshes Jellyfin library.
  - Checks remaining unpruned episodes: if 0 remain, removes torrent from qBittorrent, removes empty season folder, and transitions parent request to `deleted`.

### API Routes (`apps/api/src/routes/requests/episodes.ts`)
- `GET /requests/:id/episodes`: Returns list of episodes for a request.
- `DELETE /requests/:id/episodes/:episodeId`: Prunes an individual episode (accessible to owner or admin).
- `PATCH /requests/:id/episodes/:episodeId/keep`: Toggles `keepFlag` on an individual episode.

### Frontend UI (`apps/web/src/components/requests/SeasonPackEpisodesDrawer.vue`)
- Expandable drawer rendered inside the Season Pack row/card in `DashboardView.vue` and `LibraryView.vue`.
- Displays episode badge, title, size, play history status, Keep toggle, and Prune action.

---

## Testing Decisions

### Single Highest Seam: Fastify API Integration Tests
- **Module**: `apps/api/tests/episodic_pruning.test.ts`
- **Pattern**: Invokes endpoints and service methods via `app.inject()` against in-memory SQLite (`initDatabase(':memory:')`) with mocked qBittorrent and Jellyfin services.
- **Coverage**:
  - `processAndHardlinkTorrent` inserts `requestEpisodes` rows with accurate `fileIndex`.
  - `refreshPlayHistory` updates `lastPlayedAt` on specific episode without marking the whole season pack as consumed.
  - `pruneEpisode` sets priority 0 in qBittorrent, unlinks both library and staging files, marks episode `pruned`, and triggers Jellyfin refresh.
  - Pruning the last remaining episode in a pack stops the torrent and marks request `deleted`.
  - Tier 1 cleanup prunes consumed episodes to satisfy storage deficit without evicting unwatched requests.
  - Parent and individual `keepFlag` enforce immunity from automatic pruning.
  - Startup backfill accurately scans existing active season packs on disk and populates `requestEpisodes`.

### Web Component Unit Tests
- **Module**: `apps/web/tests/SeasonPackEpisodesDrawer.test.ts`
- **Coverage**:
  - Renders episode list with watched dates and sizes.
  - Toggles per-episode Keep flag.
  - Emits episode prune action on button click.

---

## Out of Scope

- Merging separate single-episode torrents into a retroactive season pack.
- Transcoding or re-encoding individual episodes during pruning.

---

## Further Notes

- References ADR [`0003-hardlink-staging-file-flow.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0003-hardlink-staging-file-flow.md).
- References ADR [`0014-fully-consumed-tier-in-cleanup-priority.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0014-fully-consumed-tier-in-cleanup-priority.md).
- References ADR [`0021-per-episode-consumption-and-selective-torrent-pruning.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0021-per-episode-consumption-and-selective-torrent-pruning.md).
- Adheres strictly to `no-monoliths.md` file-size limits.
