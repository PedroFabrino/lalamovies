# Deleted Requests History and Redownload — Spec

## Problem Statement

In Media Download Manager (MDM), download requests can be deleted in two scenarios:
1. **Automatic Storage Cleanup**: When disk space drops below configured safety thresholds or storage quota warnings trigger, the cleanup daemon deletes older or fully-consumed media files and removes their torrents from qBittorrent to reclaim space.
2. **Manual Deletion**: Users or administrators delete completed or erroneous requests directly.

Under the current architecture, deleting a request transitions its status to `deleted` in SQLite, but this data becomes completely invisible:
- **Zero Visibility**: Deleted requests are excluded from all active listings (`status != 'deleted'`), leaving users and administrators with no record of what was previously downloaded and subsequently cleaned up.
- **Missing Audit Metadata**: The database does not track *when* an item was deleted (`deletedAt`) or *why* (`deletionReason`), making chronological sorting or forensic auditing impossible.
- **High Re-download Friction**: If a user wishes to re-watch a movie or TV show that was purged to save space, they must search for the title again from scratch, locate a viable torrent, and re-submit a new request manually.
- **Active State Ambiguity**: A user browsing their past history cannot easily tell whether a previously deleted item has already been re-requested by another household member or is currently present in the Jellyfin library.

---

## Solution

Introduce a **Deleted Requests History and Redownload** capability across MDM:

1. **Audit Schema Extension**:
   - Add `deletedAt` (ISO text timestamp) and `deletionReason` (`'cleanup' | 'manual'`) to the `downloadRequests` SQLite schema.
   - Automatically populate these fields whenever a request is transitioned to `deleted` (via background cleanup or manual deletion).
   - Maintain a strictly permanent audit trail—deleted rows are never hard-deleted from SQLite.

2. **Deleted Requests View & API**:
   - Provide a dedicated **"Deleted"** tab in the Dashboard request view.
   - Standard users see items they originally requested (or co-requested); administrators see all deleted requests across the entire system.
   - Each entry displays media title, artwork, release year, season/episode information, original requester, deletion date, and deletion reason badge (*"Space Cleanup"* vs *"Manual"*).
   - Each entry is cross-referenced with the active catalog: if the title is currently downloading or already present in the Jellyfin library, an **"Active / In Library"** badge is displayed.

3. **One-Click Quick Redownload & Alternative Selection**:
   - Eligible deleted items feature a **"Redownload"** button (disabled if already active or present in the library).
   - Clicking "Redownload" opens a split action dialog:
     - **"Use Original Source"**: Instantly re-queues a new download request reusing the saved magnet link.
     - **"Search / Choose New Source"**: Opens the request search pre-filled with the media metadata so the user can pick an alternate release or paste a new magnet.
   - Redownloading creates a **fresh new request record** through the standard `createRequest()` pipeline (honoring storage quotas and triggering qBittorrent download), preserving the original deleted row untouched in the audit trail.

4. **Modular Architecture (No Monoliths)**:
   - Dedicated backend routes (`apps/api/src/routes/requests/deleted.ts` and `apps/api/src/routes/requests/redownload.ts`) keeping file sizes strictly under 400 lines.
   - Extracted frontend components (`apps/web/src/components/requests/DeletedRequestsList.vue` and `RedownloadModal.vue`).
   - **DashboardView Decomposition (Subtask #04)**: Decompose monolithic `DashboardView.vue` (~1,332 lines) into focused components (`ActiveRequestsTable.vue`, `PrivateRequestsTable.vue`, `DeleteRequestModal.vue`, `DeletedRequestsList.vue`), bringing `DashboardView.vue` to under 400 lines in strict compliance with `no-monoliths.md`.

---

## User Stories

### Deletion Tracking & Audit Trail
1. As an administrator, I want automatic space cleanups to record `deletedAt` and `deletionReason: 'cleanup'`, so that I have a clear audit trail of which files were removed to reclaim disk space.
2. As an administrator, I want manual user and admin deletions to record `deletedAt` and `deletionReason: 'manual'`, so that I can differentiate user-initiated removals from automated disk cleanups.
3. As a user, I want my past deleted requests to remain stored in the database, so that my download history is never permanently lost.
4. As a system operator, I want existing legacy deleted records (where `deletedAt` is null) to safely fallback to `requestedAt`, so that legacy records display cleanly without database migration errors.

### Visibility & History Browsing
5. As a user, I want to see a "Deleted" tab on the Dashboard requests table, so that I can inspect all items I previously requested that have since been deleted.
6. As a user, I want to see the exact date and time each item was deleted, so that I understand how recently it was removed from the server.
7. As a user, I want to see why an item was deleted (e.g., "Cleaned up for space" badge), so that I know whether it was removed automatically to free up disk space.
8. As a user, I want deleted items ordered chronologically with the most recently deleted items first, so that recent activity is immediately visible.
9. As an administrator, I want to view all deleted requests from all users across the server, so that I have full administrative visibility into storage turnover.
10. As a user with trusted role, I want private media requests to respect privacy boundaries in the Deleted tab, so that untrusted users never see private deleted titles.

### Active Media Detection & Guardrails
11. As a user viewing the Deleted tab, I want to see an "Active / In Library" badge if a previously deleted title is currently downloading or present in Jellyfin, so that I don't attempt to redownload something we already have.
12. As a user viewing the Deleted tab, I want the "Redownload" button to be disabled for items already active or present in the library, so that duplicate torrents and storage waste are prevented.
13. As a user, I want episodic TV shows and anime to accurately detect whether the specific season or episode is active, so that deleting episode 1 does not block redownloading episode 1 just because episode 2 exists.

### Redownload Workflow
14. As a user, I want to click "Redownload" on a deleted item to open a clear choice dialog, so that I can choose whether to reuse the original release or search for a new one.
15. As a user, I want to click "Use Original Source" to immediately start downloading with the previously saved magnet link with one click, so that I don't waste time searching for torrents again.
16. As a user, I want to click "Search / Choose New Source" to open the request search drawer pre-filled with the title, media type, and season/episode, so that I can pick an updated or higher-seed torrent if the original is dead.
17. As a user, I want redownloading to check disk quota thresholds before queuing, so that redownloads do not accidentally fill the hard drive past safe limits.
18. As a user, I want redownloading to create a fresh new request in the active queue, so that I can track its download progress and Jellyfin import in real time.
19. As an auditor or administrator, I want the historical deleted record to remain untouched when a redownload occurs, so that the timeline of previous deletions is preserved.

---

## Implementation Decisions

### Schema Extension
- Extend `downloadRequests` in `apps/api/src/db/schema.ts`:
  - `deletedAt`: `text('deleted_at')` (nullable ISO 8601 string)
  - `deletionReason`: `text('deletion_reason', { enum: ['cleanup', 'manual'] })` (nullable)

### Deletion Services
- **Automated Cleanup**: In `apps/api/src/services/cleanup.ts` (`executePendingCleanups`):
  - Transition status to `deleted` with `extraFields: { deletedAt: new Date().toISOString(), deletionReason: 'cleanup', scheduledDeleteAt: null }`.
- **Manual Cleanup**: In `apps/api/src/services/cleanup.ts` (`cleanItem`):
  - Transition status to `deleted` with `extraFields: { deletedAt: new Date().toISOString(), deletionReason: 'manual', scheduledDeleteAt: null }`.

### Repository & Query Layer
- Extend `IRequestsRepository` and `RequestsRepository`:
  - `findDeleted(userId: string, isAdmin: boolean)`:
    - Queries `download_requests` where `status = 'deleted'`.
    - Filters by `userId` unless `isAdmin === true`.
    - Handles private media privacy filtering (trusted / admin check).
    - Sorts by `sql`COALESCE(deleted_at, requested_at) DESC``.
    - Joins or cross-checks non-deleted requests on `(metadataId, metadataSource, seasonNumber, episodeNumber)` to compute `isActiveOrPresent: boolean`.

### API Routes
- **`GET /requests?status=deleted`**:
  - Handled in `apps/api/src/routes/requests/list.ts` (or delegated to `apps/api/src/routes/requests/deleted.ts`).
  - Returns `{ requests: DeletedRequestListItem[] }`.
- **`POST /requests/:id/redownload`**:
  - Located in `apps/api/src/routes/requests/redownload.ts`.
  - Validates caller permissions (owner of deleted request or admin).
  - Checks if an active request already exists; if so, returns 409 Conflict with message indicating item is already active.
  - Accepts optional body `{ magnetLink?: string, torrentFileBase64?: string }`. Defaults to `deletedRequest.magnetLink`.
  - Invokes `app.requestService.createRequest(...)` with parameters from the deleted request.
  - Returns `201 Created` with `{ request: newDownloadRequest }`.

### Web Client & UI Components
- **`DeletedRequestsList.vue`** (`apps/web/src/components/requests/DeletedRequestsList.vue`):
  - Displays cards/rows for deleted items: poster image, title, season/episode, requester username, deletion timestamp (relative and absolute), deletion reason badge.
  - Badge for `isActiveOrPresent` ("In Library / Downloading").
  - "Redownload" action button (disabled if `isActiveOrPresent`).
- **`RedownloadModal.vue`** (`apps/web/src/components/requests/RedownloadModal.vue`):
  - Modal displaying media summary, original torrent/magnet snippet, and two action buttons:
    - `[Use Original Source]` (calls `POST /requests/:id/redownload`)
    - `[Choose / Search New Source]` (redirects to search/request flow pre-filled)
- **`DashboardView.vue` Decomposition**:
  - Add "Active Requests" / "Deleted History" tab filter buttons.
  - Extract public downloads table to `ActiveRequestsTable.vue` (< 400 lines).
  - Extract private downloads table to `PrivateRequestsTable.vue` (< 400 lines).
  - Extract delete confirmation dialog to `DeleteRequestModal.vue` (< 400 lines).
  - Keeps `DashboardView.vue` strictly under 400 lines as a thin orchestrator.

---

## Testing Decisions

### Single Highest Seam: Fastify HTTP API Integration Tests
- **Module**: `apps/api/tests/deleted_requests.test.ts`
- **Pattern**: Invokes Fastify routes using `app.inject()` with an in-memory SQLite database (`initDatabase(':memory:')`) and mock services.
- **Coverage**:
  - Automated cleanup marks `deletedAt` and `deletionReason: 'cleanup'`.
  - Manual deletion via `DELETE /requests/:id` marks `deletedAt` and `deletionReason: 'manual'`.
  - `GET /requests?status=deleted` returns deleted requests for regular users (only their own) and admins (all).
  - `isActiveOrPresent` computes `true` when another request with the same metadata is active or seeding, and `false` when none exists.
  - `POST /requests/:id/redownload` successfully creates a fresh request with status `queued` using the original magnet, while keeping the old deleted row intact.
  - `POST /requests/:id/redownload` rejects with 409 Conflict if the item is already active.
  - Non-owners (non-admin) cannot redownload another user's deleted request.

### Component Unit Tests
- **Module**: `apps/web/tests/DeletedRequestsList.test.ts`
- **Coverage**:
  - Renders list of deleted items with reason badges and timestamps.
  - Disables Redownload button when `isActiveOrPresent` is true.
  - Emits redownload action when button clicked.
- **Prior Art**: Follows existing Vitest patterns in `apps/api/tests/cleanup.test.ts` and `apps/web/tests/`.

---

## Out of Scope

- Hard-deleting or purging deleted request records from SQLite (audit trail is strictly permanent).
- Mutating or resurrecting the original deleted row in-place (a new request is created instead).
- Streaming directly from deleted requests without redownloading.

---

## Further Notes

- References ADR [`0005-storage-quota-and-deferred-queueing.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0005-storage-quota-and-deferred-queueing.md).
- References ADR [`0014-fully-consumed-tier-in-cleanup-priority.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0014-fully-consumed-tier-in-cleanup-priority.md).
- Adheres to `no-monoliths.md` architectural limits.
