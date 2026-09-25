# Waitlist Unconfirmed Release Dates and TBA Gating — Spec

## Problem Statement

When users add media to the Waitlist that does not currently have a confirmed release or air date (such as an announced future sequel like *From Old Country Bumpkin to Master Swordsman Season 3*), the system exhibits three critical failures:

1. **Stale Date Leakage in UI**: In `WaitlistView.vue`, selecting a candidate initializes `targetAirDate` with the candidate's base release date (typically Season 1). When the user subsequently adjusts the target season or episode to a future unannounced season, the series progress endpoint returns `airDate: null`. The frontend conditional (`if (data?.airDate) targetAirDate.value = data.airDate`) skips updating, leaving the previous season's release date locked in state and submitting that stale date to the backend.
2. **Premature Tracker Polling**: Because the stale release date was historically in the past, the Watcher service immediately evaluates the entry's initial status as `checking` ("Released • Actively checking trackers") instead of `pending_release`. As a consequence, the background poller begins querying torrent indexers (via Prowlarr) for nonexistent episodes, wasting network bandwidth, polluting tracker search logs, and displaying misleading status messages to the user.
3. **Missing Metadata Updates & AniList Support**: The Watcher service's background unconfirmed release poller only queries TMDB and runs only on an infrequent daily cron schedule without self-healing. For anime entries added with AniList metadata, TMDB season lookups fail or return incorrect metadata. Furthermore, clicking the manual "Check Now" button on an unconfirmed entry forces its status directly into `checking` without querying metadata APIs to determine whether an air date was actually announced.

---

## Solution

Introduce end-to-end handling for unannounced and undated media across the Waitlist frontend and Watcher service:

1. **Frontend Modal State Reset & TBA Display**:
   - In `WaitlistView.vue`, cleanly reset `targetAirDate.value` to `data?.airDate || null` whenever the selected candidate, target season, or target episode changes.
   - When `targetAirDate` is null, the confirmation step displays `Episode Air Date: 📅 Date TBA`.
   - Submit the entry with `tmdbReleaseDate: null` (or omitted) when no air date exists.

2. **Pending Release Gating for Undated Media**:
   - The Watcher service routes and `releaseGating.ts` evaluate any entry lacking a confirmed air date (`tmdbReleaseDate == null`) into `status: 'pending_release'`.
   - Torrent tracker searches (Prowlarr) remain strictly disabled while an entry is in `pending_release`.
   - The entry only transitions to `status: 'checking'` once an official release date has been confirmed and reached.

3. **Waitlist Card UI Redesign for Undated Items**:
   - **Header Badge**: When `entry.tmdbReleaseDate` is null, display a `📅 Date TBA` badge in place of the missing date.
   - **Status Badge**: Display `• Pending Release` (amber badge).
   - **Status Subtext**: Display `No release date announced as of yet • Checking APIs for updates`.

4. **Dual Metadata API Polling (TMDB + AniList)**:
   - Expand `ReleaseGatingService.pollUnconfirmedFutureSeasons()` to support both TMDB and AniList:
     - For `metadataSource === 'tmdb'`, query TMDB season and show details.
     - For `metadataSource === 'anilist'`, query public AniList GraphQL (`https://graphql.anilist.co`) for airing schedule updates.
   - When a release date is detected:
     - If the date is in the future, retain `pending_release`, update `tmdbReleaseDate`, and display the countdown.
     - If the date has arrived or passed, transition status to `checking` and begin tracker polling.

5. **Self-Healing & "Check Now" Behavior**:
   - When clicking "Check Now" on an item in `pending_release` (or with `Date TBA`), immediately query TMDB or AniList for that specific season's air date.
   - If an air date is found, update the entry and transition status if reached.
   - If still unannounced, retain `pending_release` and toast: `"Checked APIs — still no confirmed release date announced."`
   - Automatically heal existing bugged database entries that have stale Season 1 dates on higher seasons by resetting them to `pending_release` with `tmdbReleaseDate: null` if the upstream API confirms no air date exists for that season.

---

## User Stories

### Adding Undated Media
1. As a user adding a newly announced anime sequel (e.g., Season 3) to the waitlist, I want the modal to show "Episode Air Date: 📅 Date TBA", so that I know the system acknowledges the season has no confirmed air date.
2. As a user switching between seasons in the waitlist modal, I want the air date display to immediately update to that specific season's date (or clear to Date TBA), so that previous seasons' dates never leak into future seasons.
3. As a user, I want the waitlist submission to record `tmdbReleaseDate: null` when no air date exists, so that the backend does not treat the show as already released.

### Waitlist Card & Status Browsing
4. As a user viewing my waitlist, I want undated entries to show a "📅 Date TBA" badge in the card header, so that I can see at a glance which items are awaiting air dates.
5. As a user, I want undated entries to show an amber "• Pending Release" status badge, so that they are not confused with items actively downloading or checking trackers.
6. As a user, I want undated entries to display subtext stating "No release date announced as of yet • Checking APIs for updates", so that I understand what the system is waiting for.
7. As a user, I want tracker searches to remain idle for undated media, so that system resources and tracker search quotas are not wasted on unreleased content.

### Metadata Synchronization & Polling
8. As a user with an AniList-sourced anime entry, I want the system to check AniList's airing calendar for updates, so that anime release dates are detected accurately even if TMDB has not updated.
9. As a user with a TMDB-sourced TV show entry, I want the system to check TMDB season air dates for updates, so that western and international show schedules are detected accurately.
10. As a user, I want the system to automatically transition an entry to "Checking Trackers" on the day an announced release airs, so that torrent searching begins as soon as the media is released.

### Manual Verification & Self-Healing
11. As a user clicking "Check Now" on a Date TBA entry, I want the system to immediately check TMDB/AniList and toast the result, so that I can verify whether a release date was announced without waiting for the nightly cron.
12. As a user with an existing bugged waitlist entry displaying a past release date on an unreleased season, I want clicking "Check Now" (or the background poller) to detect that the season has no air date and heal the card back to "Date TBA" and "Pending Release".

---

## Implementation Decisions

### Frontend State Management (`apps/web/src/views/WaitlistView.vue`)
- In `checkCandidateGuards()`:
  - Update `targetAirDate.value = data?.airDate || null` (replacing the conditional `if (data?.airDate)`).
- In `selectCandidate(candidate)`:
  - Initialize `targetAirDate.value = candidate.releaseDate || null`.
- In the confirmation modal template:
  - When `targetAirDate` is present, display `formatDateOnly(targetAirDate)`.
  - When `targetAirDate` is null, display `📅 Date TBA`.
- In card rendering:
  - Header date badge: If `entry.tmdbReleaseDate` is null, render `<span>📅 Date TBA</span>`.
  - Status subtext: When `entry.status === 'pending_release'` and `!entry.tmdbReleaseDate`, display `No release date announced as of yet • Checking APIs for updates`.

### Watcher Service Gating (`apps/watcher/src/services/releaseGating.ts`)
- Update `evaluateInitialStatus(releaseDate, today, isNextSeason)`:
  - When `releaseDate` is null/empty, always evaluate to `{ status: 'pending_release', tmdbReleaseDate: null }` regardless of `isNextSeason`.
- Expand `fetchReleaseDate()` and `pollUnconfirmedFutureSeasons()`:
  - Support `metadataSource === 'anilist'`:
    - Issue GraphQL query to `https://graphql.anilist.co` for `Media(id: $id) { startDate { year month day } nextAiringEpisode { airingAt timeUntilAiring episode } status }`.
    - If `startDate` or `nextAiringEpisode` yields an ISO air date, return it; otherwise return `null`.
  - For `metadataSource === 'tmdb'`:
    - Query `/tv/{id}/season/{seasonNumber}` and fallback to `/tv/{id}` `next_episode_to_air`.
- Self-Healing Logic:
  - In `pollUnconfirmedFutureSeasons()` and `validateEntrySeasonAirDate()`:
    - If a season entry has `seasonNumber > 1` and its recorded `tmdbReleaseDate` is verified to have no upstream air date for that specific season, reset `tmdbReleaseDate = null` and `status = 'pending_release'`.

### Watcher Routes (`apps/watcher/src/routes/waitlist.ts`)
- In `POST /waitlist`:
  - When `body.tmdbReleaseDate` is missing or null, ensure `initialStatus = 'pending_release'` and `tmdbReleaseDate = null`.
- In `POST /waitlist/:id/check`:
  - If `entry.status === 'pending_release'` or `!entry.tmdbReleaseDate`:
    - Do NOT immediately mutate `status: 'checking'`.
    - Call `releaseGating.fetchReleaseDate()` for the specific season/episode.
    - If a date is found:
      - Update `tmdbReleaseDate: foundDate`.
      - If `foundDate <= currentDay`, set `status = 'checking'` and invoke tracker poll.
      - If `foundDate > currentDay`, retain `status = 'pending_release'`.
    - If still no date found:
      - Retain `status = 'pending_release'`, set `tmdbReleaseDate = null`.
      - Return `{ ok: true, message: 'Checked APIs — still no confirmed release date announced', entry }`.

---

## Testing Decisions

### Single Highest Seam: Watcher HTTP API Integration Tests
- **Module**: `apps/watcher/tests/unconfirmed_release_dates.test.ts`
- **Pattern**: Invokes Fastify routes using `app.inject()` against in-memory SQLite (`WatcherDatabase`).
- **Coverage**:
  - `POST /waitlist` with undated season entry results in `status: 'pending_release'` and `tmdbReleaseDate: null`.
  - `watcherPoller.pollOnce()` skips entries in `pending_release`.
  - `POST /waitlist/:id/check` on undated entry queries metadata API; keeps `pending_release` if still unannounced.
  - `POST /waitlist/:id/check` transitions entry to `checking` and queries trackers when an air date $\le$ today is discovered.
  - AniList GraphQL query mock returns air date for `metadataSource: 'anilist'`.
  - Self-healing resets bugged entries with non-existent season dates to `Date TBA` and `pending_release`.

### Web Component Unit Tests
- **Module**: `apps/web/tests/WaitlistDateGating.test.ts`
- **Coverage**:
  - Modal resets `targetAirDate` to null when changing from Season 1 to Season 3.
  - Confirmation modal displays `📅 Date TBA`.
  - Card displays `📅 Date TBA` header badge and `No release date announced as of yet • Checking APIs for updates` subtext when `tmdbReleaseDate` is null.

---

## Out of Scope

- Scraping unofficial fan blogs or unverified leaks for rumored air dates (only official TMDB and AniList APIs are queried).
- Modifying qBittorrent or downloader pipelines (this feature strictly governs the waitlist intake and release-gating loop).

---

## Further Notes

- References ADR [`0011-waitlist-and-watcher-service.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0011-waitlist-and-watcher-service.md).
- References ADR [`0019-seasonal-anime-discovery-and-waitlist-bridging.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0019-seasonal-anime-discovery-and-waitlist-bridging.md).
