# Discovery Feed & Up Next Shelf — Spec

## Problem Statement

Currently, Users only interact with Media Download Manager (MDM) when they already have a specific title in mind to search and download. There is no visibility into newly released, high-quality media available across configured Indexers, nor is there any awareness of when new sequential episodes of actively followed TV shows or Anime become available. 

Users must independently check external release trackers or television schedules to see if the next episode of a series has aired, manually initiate a search, review release candidates, and confirm the download. Furthermore, users looking for content inspiration have no way to browse newly indexed, healthy releases directly on the dashboard, leading to underutilized indexers and unnecessary friction.

## Solution

Introduce a dual-component discovery experience directly on the MDM Dashboard:

1. **Up Next Shelf**: A personalized shelf prominently positioned at the top of the dashboard (labeled `"Up Next"`) that monitors episodic series (TV Shows and Anime) requested by the user within the last 90 days. The system automatically determines the immediate next un-downloaded episode ($E_{\text{max}} + 1$) or season pack, queries Prowlarr for that specific missing release, and surfaces exactly one high-health candidate card per active show.
2. **Discovery Feed**: A curated, tabbed showcase featuring newly indexed, quality-filtered releases across three categories (`Movies`, `TV Shows`, and `Anime`). Releases are retrieved from Prowlarr, quality-scored (requiring $\ge 10$ seeders, score $> 0$, and excluding CAM/Telesync rips), deduplicated, enriched with TMDB/AniList metadata and ratings, and cached in-memory with a 60-minute TTL to protect tracker infrastructure.
3. **1-Click Fast-Track Ingestion**: Clicking any Discovery Item or Up Next Item navigates directly to `/request` pre-hydrated at Step 3 ("Confirm Download Request") with metadata, season/episode granularity, and the specific Release Candidate pre-selected, allowing users to initiate downloads with a single confirmation click.

---

## User Stories

### Up Next Shelf & Episodic Tracking

1. As a User, I want to see an "Up Next" shelf at the top of my dashboard, so that I immediately know when new episodes of shows I am watching are available to download.
2. As a User, I want the Up Next shelf to only track shows I have requested within the last 90 days, so that abandoned or finished series do not clutter my dashboard.
3. As a User, I want the system to show only the immediate next sequential episode ($E_{\text{max}} + 1$), so that my dashboard stays clean and uncluttered even if multiple new episodes have aired.
4. As a User, I want the system to recognize when I downloaded a full Season Pack, so that it looks for the next season pack (or episode 1 of the next season) rather than re-requesting individual episodes of the completed season.
5. As a User, I want deleted requests to be excluded from episodic history calculations, so that shows I intentionally purged do not reappear in "Up Next".
6. As a User, I want each Up Next card to display the show title, season and episode badge (e.g., `S02E05`), poster image, release health, and file size, so that I have complete context before downloading.
7. As a User, I want clicking an Up Next card to take me directly to Step 3 of the request workflow with that episode's torrent pre-selected, so that I can download it with a single click.
8. As a User, I want the Up Next shelf to automatically hide itself when there are no new episodes available or when Prowlarr is offline, so that empty cards never occupy dashboard space.

### Curated Discovery Feed

9. As a User, I want to browse newly indexed, healthy releases directly on the dashboard, so that I can find new movies, TV shows, and anime to watch without thinking of search terms in advance.
10. As a User, I want the Discovery Feed to provide category tabs for Movies, TV Shows, and Anime, so that I can quickly switch between media types.
11. As a User, I want to see up to 10 releases per category arranged in a smooth horizontal slider, so that I can easily scan trending releases without overwhelming vertical page length.
12. As a User, I want every item in the Discovery Feed to have at least 10 seeders, so that I am never recommended dead, stalled, or unviable torrents.
13. As a User, I want low-quality releases (such as CAM, Telesync, or Workprint rips) to be automatically excluded from the Discovery Feed, so that only clean watchable releases appear.
14. As a User, I want releases deduplicated by clean media title, so that I do not see duplicate cards for the exact same movie or episode across different indexers.
15. As a User, I want Discovery Items to show TMDB or AniList poster artwork and ratings (if available), so that I can evaluate titles with authentic visual and critical metadata.
16. As a User, I want to be able to collapse or expand the Discovery Feed section, so that I can maximize dashboard space for active downloads when desired.
17. As a User, I want my collapse/expand preference to persist across page reloads and browser sessions, so that the dashboard remembers my layout preference.
18. As a User, I want clicking any Discovery Item to open the request page directly at Step 3 with the candidate pre-selected, so that requesting recommended media requires only one confirmation click.
19. As a User, I want the Discovery Feed to automatically hide if Prowlarr is unconfigured or unreachable, so that tracker outages do not disrupt normal dashboard usage.

### Performance & System Health

20. As an Admin, I want discovery results cached in memory for 60 minutes, so that public indexers are not bombarded with repetitive queries every time a user visits the dashboard.
21. As an Admin, I want concurrent requests during a cache refresh to share a single background fetch (mutex/in-flight promise deduplication), so that tracker rate limits are strictly respected.
22. As an Admin, I want anime discovery to search both anime category IDs (5070 and 2070), so that anime movies and episodic series are both captured.

---

## Implementation Decisions

### Architectural Shape
- Direct backend ingestion: The MDM Fastify backend acts as the sole consumer of Prowlarr for discovery, caching responses in-memory and transforming raw Torznab results into standardized Discovery and Up Next items.
- Dedicated Route Endpoints:
  - `GET /discovery/feed?category=movies|tv|anime` (returns cached, quality-filtered, metadata-enriched items).
  - `GET /discovery/up-next` (returns personalized next-episode candidates based on authenticated user history).
- Pure In-Memory Cache: Discovery feeds are cached in Node.js process memory with a 60-minute TTL (`Map<string, { timestamp: number, data: DiscoveryItem[] }>`) accompanied by an in-flight promise deduplicator.
- Fast-Track Routing Contract: `/request` accepts optional query parameters (`metadataId`, `mediaType`, `title`, `year`, `seasonNumber`, `episodeNumber`, `downloadUrl`, `releaseTitle`, `sizeBytes`, `seeders`, `resolution`, `indexer`) to hydrate state directly into Step 3 ("Confirm Download Request").

### Episodic Gap Algorithm (`UpNextService`)
1. Query `downloadRequests` where `status != 'deleted'` and `mediaType IN ('tv', 'anime')` and `createdAt >= NOW() - 90 DAYS`.
2. Group records by `metadataId` (or canonical `title` + `mediaType`).
3. Determine highest requested state:
   - If highest record is a full season pack (where `episodeNumber IS NULL` for season $S$):
     - Check if season $S+1$ exists; if so, target season $S+1$ pack or $S+1, E1$.
   - If records are individual episodes for season $S$:
     - Let $E_{\text{max}}$ be the maximum `episodeNumber` requested for season $S$.
     - Target season $S$, episode $E_{\text{max}} + 1$.
4. Query Prowlarr for targeted missing episode (e.g. `"<Title> S02E05"`).
5. If a release meeting the $\ge 10$ seeder threshold is found, return the top-scored candidate as an `UpNextItem`. Limit to exactly 1 candidate per show.

### Quality Filtering & Deduplication (`DiscoveryService`)
- Category Mapping:
  - `movies` $\to$ Torznab category `2000`
  - `tv` $\to$ Torznab category `5000`
  - `anime` $\to$ Torznab categories `5070` & `2070` (passed as repeated query parameters: `categories=5070&categories=2070`)
- Quality Filter Pipeline:
  - `seeders >= 10`
  - `score > 0` (evaluated via MDM release scoring heuristics)
  - Negative regex matching: excludes `\b(CAM|CAMRip|TS|TELESYNC|TeleSync|HDCAM|HDTS|WORKPRINT|WP)\b`
- Title Normalization & Deduplication:
  - Raw torrent titles are cleaned using `cleanTorrentTitle` to extract canonical title and release year.
  - Releases sharing the same canonical title and season/episode are deduplicated, retaining the single highest-scoring Release Candidate.
- Metadata Enrichment:
  - Canonical titles are matched against TMDB (or AniList for anime) to retrieve poster images, release overviews, and ratings.

### Frontend Presentation (`DashboardView.vue`)
- Position:
  - "Up Next" shelf renders at the very top of the dashboard, above the active download requests table.
  - "Discovery Feed" renders immediately below Up Next (or top of page if Up Next is empty), above the download requests table.
- Discovery Feed UI:
  - Three category tabs: `Movies`, `TV Shows`, `Anime`.
  - Header actions: collapse/expand chevron toggle button.
  - Persistence: `localStorage.getItem('mdm_discovery_collapsed')` (`'true'` / `'false'`).
  - Layout: Horizontal scroll container displaying up to 10 cards per category with poster, title, year/episode, seeder count, resolution badge, and rating.
  - Fast-Track Action: Clicking any card navigates to `/request` with all candidate parameters populated, rendering Step 3 immediately.
- Resiliency: If Prowlarr is unconfigured or backend endpoints return errors / empty items, both sections hide automatically without user-facing error banners.

---

## Testing Decisions

### Good Test Principles
- Test observable external behavior across HTTP routes and component renders; never assert private service variables or internal caching timers directly.
- API tests verify contract compliance, status codes, seeder filtering, 60-minute cache deduplication, and graceful degradation when upstream indexers are unreachable.
- UI tests verify that cards render when data is present, hide when empty, switch category tabs, persist collapse state, and pass accurate route parameters on click.

### Modules Tested
- `DiscoveryService` & `UpNextService` (Unit / Integration):
  - Torznab query parameter formatting (especially multi-category array serialization).
  - Seeder cutoff ($\ge 10$) and CAM filtering.
  - Deduplication logic across identical releases.
  - In-memory cache hit vs miss behavior.
  - Episodic gap detection ($E_{\text{max}} + 1$, season pack transitions, 90-day filter, exclusion of deleted requests).
- API Route Integration (`GET /discovery/feed`, `GET /discovery/up-next`):
  - Authenticated Fastify route handlers tested via `app.inject`.
  - Graceful fallback when Prowlarr is disabled (`{ available: false, items: [] }`).
- Frontend Component & Routing (`RequestView.vue`, `DashboardView.vue`):
  - Direct deep-link handling to Step 3 in `RequestView.vue`.
  - Category tab switching and carousel rendering in `DashboardView.vue`.
  - LocalStorage toggle synchronization.

### Prior Art
- `apps/api/tests/prowlarr.test.ts` (Fastify route testing via `app.inject`, mock fetch responses for Prowlarr Torznab API).
- `apps/api/tests/download_requests.test.ts` (Database fixtures for download requests and status transitions).
- `apps/web/tests/RequestView.test.ts` (Vitest + `@vue/test-utils` for multi-step request workflow and mock API calls).

---

## Out of Scope

- Automated background downloading without user approval (mass auto-downloading risks silent Storage Quota exhaustion per ADR 0008).
- Synchronization with Jellyfin user playback progress (playback API tracking is out of band; MDM relies strictly on internal atomic download history).
- Distributed or persistent Redis caching (in-memory caching in the Fastify container is sufficient for single-instance MDM).
- Direct indexer scraping bypassing Prowlarr.

---

## Further Notes

- Architecture codified in ADR 0009 (`docs/adr/0009-discovery-feed-and-up-next-shelf.md`).
- Domain terminology strictly aligned with `CONTEXT.md` (`Discovery Feed`, `Discovery Item`, `Up Next Shelf`, `Up Next Item`, `Release Candidate`, `Release Scoring`).
