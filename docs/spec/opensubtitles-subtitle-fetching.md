# OpenSubtitles Subtitle Fetching — Spec

## Problem Statement

Torrents frequently do not include subtitle files for non-English content. Users watching media via Jellyfin have no subtitles for Portuguese-language viewers unless the torrent happened to include them. There is no mechanism to automatically source, download, or manage external subtitle files, and no way to test whether a subtitle is correctly synced before committing to it.

## Solution

Integrate with the OpenSubtitles REST API to automatically fetch `pt-BR` subtitle files for every completed download and surface a subtitle picker on the dashboard and in the Media Library view (`/library`) so users can manually browse, select, and apply alternative subtitles when the auto-fetched one is missing, out of sync, or when browsing catalog media later.

The feature has two modes:

1. **Auto-fetch on completion** — immediately after a download is hardlinked to the Library and Jellyfin is refreshed, the system queries OpenSubtitles for the best `pt-BR` subtitle and writes a `.srt` file alongside the media file using Jellyfin's naming convention (`Title (Year).pt-BR.srt`). Silent skip if nothing is found.
2. **Manual picker (Dashboard & Library)** — subtitle action buttons on completed dashboard cards and in the Media Library view (`/library`) (for movies and series/anime episode rows) open a modal listing the top 5 OpenSubtitles results (sorted by download count). Any authenticated user can browse results and apply a specific subtitle, select multiple subtitles to download at once (providing immediate alternative tracks in Jellyfin if one is out of sync), or hit "Re-fetch best".

---

## User Stories

### Auto-fetch on Completion

1. As a User, I want subtitles to be automatically fetched when my download completes, so that content is watchable in Portuguese without any manual steps.
2. As a User, I want the subtitle file to appear in Jellyfin immediately alongside the media, so that I don't need to trigger a library rescan or any additional action.
3. As a User, I want the system to silently skip subtitle fetching when no `pt-BR` subtitle is found, so that my download is not delayed or blocked by a missing subtitle.
4. As a User, I want auto-fetch to work for Movies, TV Shows, and Anime equally, so that all my content gets subtitles automatically.

### Manual Subtitle Picker

5. As a User, I want a subtitle button on completed download cards on the dashboard, so that I can open a picker for any download that has missing or out-of-sync subtitles.
6. As a User, I want the subtitle picker to show the top 5 `pt-BR` results from OpenSubtitles sorted by download count, so that the most popular (most likely correct) subtitle appears first.
7. As a User, I want each result in the picker to show the uploader name, download count, upload date, and file size, so that I have enough context to choose the right subtitle without having to leave the dashboard.
8. As a User, I want to click an "Apply" button next to any result in the picker to download and install that specific subtitle, replacing any existing one, so that I can switch to a better-synced alternative.
9. As a User, I want to select multiple subtitles using checkboxes and download them simultaneously with an "Apply Selected" button, so that multiple alternative subtitle tracks are immediately available in Jellyfin to switch between during playback.
10. As a User, I want a "Re-fetch best" button in the picker that automatically applies the top-ranked result, so that I can quickly refresh the subtitle without manually picking from the list.
11. As a User, I want the subtitle button to be visible on every completed download card I can see, so that I can manage subtitles for content I watch regardless of who originally requested it.
12. As a User, I want the picker to show a clear "No subtitles found" state when OpenSubtitles returns no results, so that I know to look for a subtitle manually outside the app.
13. As an Admin, I want the subtitle picker to be available on all completed requests (not just my own), so that I can fix subtitle issues for any user.
14. As a User, I want to open the subtitle picker directly from the Media Library view (`/library`) for any movie card or series/anime episode row, so that I can download, replace, or add alternative subtitles at any time while browsing the catalog (even if the initial subtitle didn't work or was never fetched).

### Infrastructure & Configuration

15. As an Admin, I want to configure the OpenSubtitles API key via a single environment variable (`OPENSUBTITLES_API_KEY`), so that setup requires minimal changes to the deployment.
16. As an Admin, I want subtitle fetching to degrade gracefully when the OpenSubtitles API key is not configured, so that the app continues to function normally without the feature enabled.
17. As an Admin, I want subtitle fetch failures to be logged (not surfaced to users), so that I can diagnose API quota or network issues without affecting the user experience.

---

## Implementation Decisions

### OpenSubtitles API

- The OpenSubtitles REST API v1 (`https://api.opensubtitles.com/api/v1`) is used. Authentication via `Api-Key` header + `Authorization: Bearer <token>` from a login call.
- Language is hardcoded to `pt-BR`. No language configuration UI is needed.
- Free tier limits: 40 searches/day, 200 downloads/day. Sufficient for a small friend group; no rate-limit handling beyond logging warnings when quota is exceeded.
- The API key is stored in the `OPENSUBTITLES_API_KEY` environment variable. If absent, the service is a no-op (auto-fetch silently skipped; manual endpoints return 503).

### New Service: `OpenSubtitlesService`

A new service encapsulates all OpenSubtitles interactions:

- **`searchSubtitles(params)`** — calls `GET /subtitles` with TMDB ID (preferred) or title + year, language `pt-BR`. Returns the raw top-N results.
- **`fetchBest(params, destPath)`** — calls `searchSubtitles`, picks the result with the highest download count, calls `GET /download` to get a temporary download URL, fetches the file, and writes it to `destPath`.
- **`downloadAndWrite(fileId, destPath)`** — downloads a specific subtitle by its OpenSubtitles file ID and writes it to `destPath`.
- **`downloadAndWriteMultiple(fileIds, baseDestPath)`** — downloads multiple subtitles by file ID and writes them alongside the media file with indexed tags (e.g. `.pt-BR.srt`, `.pt-BR.2.srt`, `.pt-BR.3.srt`) so Jellyfin exposes all of them as distinct selectable tracks.

The destination path is derived from the media file's Library path:
- Single / Primary subtitle: extension is replaced and language suffix appended — e.g. `/media/movies/Inception (2010)/Inception (2010).pt-BR.srt`.
- Multiple subtitles: first subtitle uses `.pt-BR.srt`, subsequent ones use indexed suffixes — e.g. `Inception (2010).pt-BR.2.srt`, `Inception (2010).pt-BR.3.srt`. This follows Jellyfin's multi-track external subtitle naming convention; Jellyfin detects each as a distinct subtitle track.

The service is registered on the Fastify app instance alongside the existing services (`app.openSubtitles`).

### Auto-fetch Hook in DownloadPoller

After the existing hardlink and Jellyfin library refresh step in `DownloadPoller.pollOnce()`, a call to `openSubtitles.fetchBest()` is added. This is a fire-and-forget: failure (no result, API error, quota exceeded) is caught, logged, and does not affect the download's final status or the completion notification.

### API Endpoints

Two new endpoints under the existing `/requests` router:

- **`GET /requests/:id/subtitles`** — requires authentication; returns 404 for requests the caller cannot see (follows the same visibility rules as `GET /requests/:id`). Calls `openSubtitlesService.searchSubtitles()` live and returns the top 5 results with: `fileId`, `uploaderName`, `downloadCount`, `uploadDate`, `fileSizeBytes`, `releaseName`.
- **`POST /requests/:id/subtitles/fetch`** — requires authentication; same visibility scoping. Accepts an optional body with `{ fileId?: string, fileIds?: string[] }`:
  - If `fileIds` is provided: downloads all specified subtitles using indexed filenames (`.pt-BR.srt`, `.pt-BR.2.srt`, etc.).
  - If `fileId` is provided: downloads that single specific subtitle.
  - If absent: fetches the single best result (highest download count).
  Writes the `.srt` files to the Library path, triggers a single Jellyfin library refresh, and returns `{ success: true, count: number }`.

### Frontend

- **Reusable Subtitle Picker Modal (`SubtitlePickerModal.vue`)**:
  - Reusable modal shared across both the **Dashboard** and the **Media Library (`/library`)** view.
  - Props: `requestId: string` (and media/episode title for modal header context).
  - While loading results from `GET /requests/:id/subtitles`, a spinner is displayed.
  - If no subtitles are found, shows a clean empty state ("No subtitles found").
  - If API key is not configured (503), shows "Service not configured".
  - Each of the top 5 results shows: a selection checkbox, uploader name, download count (formatted, e.g. "12.4k"), upload date (relative), file size, and an individual "Apply" button.
  - An "Apply Selected" action button enables in the modal header/footer when 1 or more checkboxes are checked (e.g. "Apply Selected (2)"), calling `POST /requests/:id/subtitles/fetch` with `{ fileIds: [...] }`.
  - A "Re-fetch best" button at the top calls `POST /requests/:id/subtitles/fetch` with no `fileId` (automatically applying the top-ranked result).
  - Inline error feedback displays inside the modal if fetching or applying fails without closing the modal.
- **Dashboard Integration (`DashboardView.vue`)**:
  - Completed download cards display a subtitle icon button, opening the modal for that request.
- **Media Library Integration (`LibraryView.vue`)**:
  - **Movie Cards**: A subtitle icon button is displayed on movie cards, opening the modal using the movie's underlying request ID (`item.id`).
  - **Series / Anime Cards**: In the expanded seasons/episodes accordion, each individual episode row includes a subtitle icon button opening the modal for that specific episode's request ID (`ep.id`).
  - Subtitle management is available to all authenticated users who have visibility of that media item in the library.

---

## Testing Decisions

Good tests verify observable external behaviour, not internal wiring. The right shape is:

**Seam 1 — `OpenSubtitlesService` unit tests (primary seam)**
All business logic lives here. Tests mock the OpenSubtitles HTTP API calls (`GET /subtitles`, `POST /subtitles/download`) and the filesystem write. Cover: search returns ranked results; `fetchBest` picks the highest download-count entry; `downloadAndWrite` writes the file to the correct path with the correct name; no-op when API key is absent; graceful error on API failure.

**Seam 2 — HTTP endpoint tests**
`GET /requests/:id/subtitles` and `POST /requests/:id/subtitles/fetch` tested at the route level. Cover: auth required (401 without token); 404 for requests not visible to the caller; correct response shape from the search; file write triggered on POST. Prior art: existing `requests.ts` route tests.

The `DownloadPoller` hook is a single `try/catch` call to `openSubtitles.fetchBest()` — no dedicated test needed; Seam 1 covers the service behaviour and the poller's error-isolation is trivially verifiable by inspection.

---

## Out of Scope

- Multiple subtitle language support (pt-BR only for now)
- Subtitle sync adjustment / time-shifting in the browser
- Displaying whether a subtitle is currently installed on the download card (no "subtitle present" badge)
- Per-user language preferences
- Automatic retry when no subtitle is found on completion (the manual picker handles this)
- Subtitle fetching for `private` Media Type requests
- Paid OpenSubtitles tier configuration

---

## Further Notes

- OpenSubtitles requires a free account to obtain an API key. The README must document the registration and key setup steps.
- The `pt-BR` language code is `pb` in OpenSubtitles' internal language list but is correctly returned when querying with `language=pt-BR`. Verify against the API during implementation.
- For TV Show episodes, the OpenSubtitles search should include season and episode number in addition to the TMDB ID for precision.
- For Season Packs (directory hardlinks), subtitle fetching is skipped on auto-fetch (no single file to attach the `.srt` to); the manual picker can be used per-episode after Jellyfin processes the pack.
