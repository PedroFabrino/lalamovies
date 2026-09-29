# Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec

## Problem Statement

Users actively track media releases using the Waitlist feature. However, when an anticipated episode or movie has aired and is available on torrent indexers, users frequently encounter two major pain points:

1. **Tracker Diagnostic Blindspot**:
   When a user clicks "Check Now" or when the background poller runs, the entry often remains in `checking` ("Released • Actively checking trackers") or returns a generic "Still waiting" notification. Even if Prowlarr returns dozens of candidate releases (for example, 52 releases for an anime episode), if all releases fail strict title regex matching or minimum seed/score thresholds, the system provides zero diagnostic feedback. The user cannot tell whether the indexers returned zero results, whether episode regex matching failed, or whether releases had insufficient seeds or low quality scores.

2. **Friction in Manual Fallback**:
   When automated tracking cannot snatch a release automatically, the user must navigate away from the Waitlist to the "New Request" page, manually re-type the title, search metadata, re-select the candidate, re-specify the season and episode, run a torrent search, select the release, and then return to the Waitlist to manually delete or adjust the existing entry. There is no direct bridge to fast-track a waitlisted item into manual torrent selection, and no automated mechanism to advance the waitlisted episode once a manual request is submitted.

---

## Solution

Introduce a unified, seamless workflow connecting the Waitlist to the Manual Request flow, paired with transparent tracker diagnostics:

1. **Granular Tracker Diagnostics**:
   - Persist diagnostic check summaries (`lastCheckResult`) on waitlist entries.
   - During automated poller cycles or manual "Check Now" actions, analyze Prowlarr candidate results:
     - If no releases are returned: report that indexers returned 0 results.
     - If releases are found but none qualify: report candidate counts, target episode match counts, and specific rejection reasons (e.g., *"Found 52 releases (20 matched S02E02), 0 met seed/quality criteria"* or *"Found 52 releases, 0 matched S02E02"*).
   - Display this diagnostic summary in the Waitlist card status subtext and in the "Check Now" response toast.

2. **Waitlist-to-Request Manual Shortcut**:
   - Add a dedicated "Manual Pick" action button to the Waitlist card footer, and allow tapping/clicking the card body to trigger the shortcut.
   - Fast-track directly into **Step 3 (Release/Torrent Selection)** of `RequestView.vue` with candidate metadata, media type, season, and episode preloaded.
   - Automatically trigger the Prowlarr release search immediately upon landing on Step 3, eliminating manual re-searching.
   - Retain full backward navigation to Step 2 if the user desires to adjust candidate metadata.

3. **Episodic Scope Preselection**:
   - For episodic media (`tv_show` and `anime`), preselect `watchForNextEpisodes = true` on Step 3 to preserve the user's ongoing interest in tracking the rest of the series.

4. **In-Place Waitlist Lifecycle Advancement**:
   - Carry the originating `waitlistId` through the download request payload.
   - Upon successful request creation (`HTTP 201`), the main API instructs the Watcher service to advance the waitlist entry in-place (`POST /waitlist/:id/advance`).
   - For series, increment `targetEpisode` ($N \rightarrow N+1$), recalculate air dates, and reset status to `checking` (or `pending_release` if the next air date is future), preserving entry ID, requester identity, and subscriber history.
   - For movies, mark the waitlist entry as `completed`.

5. **Architectural Decomposition (No-Monoliths Compliance)**:
   - Extract the card rendering and action handlers from `WaitlistView.vue` (currently 1,406 lines) into an isolated `WaitlistCard.vue` component (< 400 lines) before adding new shortcut and diagnostic UI features.

---

## User Stories

### Tracker Diagnostics
1. As a user checking a waitlisted episode that has aired, I want to see why no release was snatched, so that I know whether indexers have results or if quality criteria failed.
2. As a user clicking "Check Now" on a waitlist card, I want a toast notification showing the exact diagnostic result (e.g., *"Found 52 releases, 0 met seed/quality criteria"*), so that I get immediate actionable feedback.
3. As a user viewing my waitlist cards, I want the card status subtext to display the latest tracker check summary, so that I can diagnose tracking status without repeatedly clicking "Check Now".
4. As an administrator reviewing watcher logs, I want structured diagnostic summaries recorded on each poll cycle, so that tracker query health can be monitored.

### Manual Request Shortcut
5. As a user viewing a waitlisted item, I want a "Manual Pick" button on the card, so that I can immediately choose a torrent myself when automated matching is strict.
6. As a user browsing my waitlist, I want clicking the card body to launch the manual selection flow, so that navigating to releases feels intuitive.
7. As a user launching manual pick, I want to land directly on Step 3 (Torrent Selection) with metadata and episode preloaded, so that I don't have to repeat Steps 1 and 2.
8. As a user arriving at Step 3 from the waitlist, I want the torrent search to begin automatically, so that available releases appear without extra clicks.
9. As a user on Step 3, I want the option to click "Back" to Step 2, so that I can correct season, episode, or metadata if necessary.

### Episodic Scope & Lifecycle
10. As a user manually picking an episode for a waitlisted TV show or anime, I want `watchForNextEpisodes` to be preselected, so that future episodes continue to be tracked automatically.
11. As a user submitting a manual request for a waitlisted episode, I want the waitlist entry's target episode to advance to the next episode ($N+1$), so that I do not have to update the waitlist manually.
12. As a user submitting a manual request for the final episode of a season, I want the waitlist entry to mark itself completed, so that finished series do not continue checking indexers.
13. As a user submitting a manual request for a waitlisted movie, I want the waitlist entry to mark itself completed, so that the movie is not downloaded a second time.
14. As a co-requester on a waitlist item, I want my subscription to persist when the entry advances to the next episode, so that I receive notifications for subsequent releases.

---

## Implementation Decisions

### 1. Watcher Schema & Diagnostics (`apps/watcher`)
- Extend the `watch_requests` table schema with a `last_check_result` nullable text column.
- In `WatcherPoller` and `POST /waitlist/:id/check`:
  - When Prowlarr search completes:
    - Count total candidates returned.
    - For episodic entries, count how many candidates pass `matchesTarget(title, season, episode)`.
    - If total candidates is 0: set `lastCheckResult = "0 releases found on indexers"`.
    - If candidates exist but episode matching yields 0: set `lastCheckResult = `Found ${candidates.length} releases, 0 matched S${s}E${e}``.
    - If candidates match episode but quality criteria (seeds >= 10, score >= 100, non-cam) filter all out: set `lastCheckResult = `Found ${candidates.length} releases (${epMatches.length} matched S${s}E${e}), 0 met seed/quality criteria``.
    - If qualifying candidates exist: set `lastCheckResult = `Found ${qualifying.length} qualifying releases; selecting top scored``.
  - Update `last_check_result` and `updated_at` on the entry in the database.
- Update `POST /waitlist/:id/check` response to return `{ ok: true, message: lastCheckResult, entry: updated }`.

### 2. Watcher Advance Endpoint (`apps/watcher`)
- Introduce route `POST /waitlist/:id/advance`:
  - Validates entry existence and caller authentication (service key or session).
  - For `mediaType === 'tv_show' || mediaType === 'anime'`: calls `EpisodicTrackingService.advanceEntry(id)`.
  - For `mediaType === 'movie'`: updates status to `'completed'`, clears release/notification fields, and timestamps `updatedAt`.
  - Clears any pending Discord release notification message for that entry.
  - Returns `{ ok: true, entry: updated }`.

### 3. Main API Request Integration (`apps/api`)
- In `createRequestSchema`:
  - Add optional field `waitlistId: z.string().optional()`.
- In `requestCreate.ts` / `RequestService.createRequest`:
  - When a request is successfully created (`HTTP 201`) and `waitlistId` is provided:
  - Asynchronously trigger `POST ${watcherUrl}/waitlist/${waitlistId}/advance` with service credentials.
  - Log warning on network failure without blocking the request creation response.

### 4. Frontend Decomposition & Waitlist UI (`apps/web`)
- Decompose `WaitlistView.vue` by extracting `WaitlistCard.vue` into `apps/web/src/components/waitlist/WaitlistCard.vue`:
  - `WaitlistCard.vue` receives the entry, active tab, and action callbacks as props.
  - Displays `entry.lastCheckResult` in the status subtext area when available.
  - Adds a "Manual Pick" action button in the card footer with an explicit title/tooltip.
  - Emits `@manual-pick` when the card body or "Manual Pick" button is clicked.
- In `WaitlistView.vue`:
  - Handle `@manual-pick` by navigating to `/request` with router push:
    ```ts
    router.push({
      path: '/request',
      query: {
        fromWaitlist: 'true',
        waitlistId: entry.id,
        mediaType: entry.mediaType,
        metadataId: entry.metadataId,
        metadataSource: entry.metadataSource,
        title: entry.title,
        year: entry.year?.toString(),
        seasonNumber: entry.seasonNumber?.toString(),
        episodeNumber: entry.targetEpisode?.toString(),
        posterUrl: entry.posterUrl || undefined,
      },
    });
    ```
  - When clicking "Check Now", display `res.message` in the toast notification.

### 5. Fast-Track Request Step 3 Initialization (`apps/web`)
- In `useRequestData.ts` and `requestFastTrack.ts`:
  - Add support for `fromWaitlist === 'true'`.
  - Pre-populate `selectedCandidate` with the metadata from the route parameters.
  - Set `seasonNumber`, `episodeNumber`, and configure `downloadGranularity = 'episode'`.
  - Preselect `watchForNextEpisodes = true` for series (`anime`, `tv_show`).
  - Set `currentStep = 3`.
  - Store `waitlistId` for submission.
  - Immediately invoke `searchReleases()` to query Prowlarr without requiring user clicks.
  - On Step 3 submission, include `waitlistId` in `createRequest` payload.

---

## Testing Decisions

- **Good Test Principle**: Tests must verify externally observable behavior (API responses, database side effects, UI rendering, user navigation) without asserting against internal private variables.
- **Watcher Diagnostics & Poller Tests**:
  - Integration test for `WatcherPoller` and `POST /waitlist/:id/check`:
    - Mock Prowlarr returning zero results -> assert `lastCheckResult` contains `"0 releases found"`.
    - Mock Prowlarr returning 10 results with wrong episode numbers -> assert `lastCheckResult` indicates episode mismatch.
    - Mock Prowlarr returning 10 results with low seeders (< 10) -> assert `lastCheckResult` indicates seed/quality filtering.
- **Watcher Advance Route Tests**:
  - `POST /waitlist/:id/advance` on episodic entry advances `targetEpisode` to $N+1$ and status to `checking`.
  - `POST /waitlist/:id/advance` on movie entry sets status to `completed`.
- **Main API Request Creation Tests**:
  - `POST /requests` with `waitlistId` invokes Watcher advance endpoint and succeeds with HTTP 201.
- **Frontend Component & Composable Tests**:
  - `WaitlistCard.vue` component test: renders diagnostic message, fires `@manual-pick` on card and button clicks.
  - `useRequestData.test.ts`: test `fromWaitlist` initializes Step 3, sets `watchForNextEpisodes = true`, and attaches `waitlistId` on submit.

---

## Out of Scope

- Modifying the underlying torrent title cleaner regex or Prowlarr indexer configurations.
- Altering the minimum quality scoring formula or seed threshold constants.
- Batch multi-select download shortcuts for multiple waitlist cards at once.
- Direct torrent download without user review from Step 3.

---

## Further Notes

- `WaitlistView.vue` is currently 1,406 lines (exceeding the 400-line hard limit). Extracting `WaitlistCard.vue` begins reducing this file while complying with `no-monoliths.md`.
- `EpisodicTrackingService.advanceEntry` in `apps/watcher` is already robust and tested; exposing it through `POST /waitlist/:id/advance` reuses battle-tested logic.
