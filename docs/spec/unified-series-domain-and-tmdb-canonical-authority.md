# Unified Series Domain and TMDB Canonical Authority — Spec

## Problem Statement

Users of Media Download Manager encounter subtle, disruptive failures when managing episodic media because the system treats TV shows and anime as two separate, disconnected domain models:

1. **Deduplication Failures Across Views**: When an anime is discovered and waitlisted via the Seasonal Anime tab, and later requested via the standard Search bar or Discovery Feed as a TV show (or vice versa), the system fails to recognize them as the same show. This results in duplicate database entries, simultaneous duplicate torrent downloads, wasted bandwidth, and disk space collisions.
2. **Broken Air-Date Gating and Episodic Tracking**: When an upcoming anime cannot be automatically resolved to TMDB during seasonal browsing, users are offered a bypass to waitlist the entry directly using raw AniList metadata. Because the automated Watcher Service strictly depends on TMDB API endpoints (`/tv/{id}/season/{s}`) to monitor air dates and episode progression, these AniList-backed waitlist entries stall with missing air dates and never trigger downloads when episodes air.
3. **Missed Releases Across Tracker Types**: Asian anime releases (Japanese, Korean, Chinese) are posted to specialized anime trackers using categories `5070` or `2070` with absolute episode numbering (e.g., `Title - 01`), whereas Western releases are posted to TV trackers using category `5000` with standard season/episode numbering (e.g., `Title S01E01`). Because search queries currently diverge based on media type classification, anime searches miss Western TV tracker releases, and TV show searches miss anime tracker releases.

From the user's perspective, whether an episodic story is hand-drawn animation from Tokyo, 3D donghua from Shanghai, or live-action from London, it represents a series that airs episodes sequentially. Differentiating them into disconnected operational silos creates bugs with no user benefit, while users still desire physical library separation on disk (`/media/anime` vs `/media/shows`) so Jellyfin can apply appropriate scrapers and UI organization.

## Solution

Unify TV shows and anime into a cohesive **Series** domain model while establishing **TMDB as the single canonical metadata authority**:

1. **Physical Library Separation, Unified Domain Logic**: Maintain `mediaType: 'anime'` and `mediaType: 'tv_show'` strictly for routing completed files on disk to their dedicated Jellyfin library folders (`/media/anime` vs `/media/shows`). Across all business logic—including deduplication, waitlisting, Up Next shelf generation, and episodic progression—both types are treated identically as Series.
2. **Canonical TMDB Ingestion**: All persistent records in the database (`download_requests` and `watch_requests`) must reference canonical TMDB identifiers. AniList is restricted to a read-only presentation catalog for populating seasonal browse feeds on the Seasonal Anime tab (`/anime`).
3. **Strict TMDB Matching in UI**: In the anime detail modal, the bypass allowing submission of raw AniList metadata to the waitlist is eliminated. Every waitlist or download action requires a confirmed TMDB match. When automated title matching returns no candidates, the modal provides an integrated manual TMDB search input, allowing users to search, pick, and confirm the correct TMDB series before submitting.
4. **Prowlarr Dual-Query Execution**: When searching for releases or polling indexers for any Series (regardless of whether classified as `anime` or `tv_show`), the system performs parallel queries across combined categories `[5000, 5070, 2070]` using both standard TV numbering (`Title S01E01`) and anime absolute numbering (`Title - 01` / `Title 01`), with English and Romaji title variants. Candidates from all sources are merged, deduplicated, and ranked using standard Release Scoring.
5. **Cross-Media-Type Deduplication**: Deduplication across active download requests, co-requester attachments, and waitlist entries is indexed strictly by TMDB ID. Submitting a series with an existing TMDB ID attaches to or updates the existing entry, preserving whichever library destination was previously chosen.
6. **Legacy Record Migration**: A startup database migration inspects existing records with `metadata_source = 'anilist'`, resolves their titles and air dates to TMDB, updates their metadata IDs and sets `metadata_source = 'tmdb'`.

---

## User Stories

### Seasonal Anime Browsing & Strict Metadata Ingestion

1. As a User browsing the Seasonal Anime tab, I want every show card to open a detail modal that automatically resolves the show to its canonical TMDB entry, so that my waitlist and download actions always link to authoritative air dates.
2. As a User, I want to see the matched TMDB poster, title, and air date inside the detail modal before committing, so that I can verify the metadata match is accurate.
3. As a User, when automated TMDB matching finds multiple candidates, I want to see a list of ranked alternatives to select from, so that I can correct an imperfect match immediately.
4. As a User, when automated TMDB matching finds no candidates, I want an inline TMDB search field within the modal, so that I can type an alternate title or TMDB ID and select the correct series without leaving the page.
5. As a User, I want the system to prohibit adding an anime to the waitlist or download queue until a valid TMDB series is selected, so that my waitlist never contains unresolvable entries.
6. As a User, I do not want to see any button to bypass TMDB resolution, so that broken AniList-only records are never created in the database.
7. As a User, I want the modal to clearly display whether the matched TMDB series is currently airing, upcoming, or concluded, so that I know what release tracking behavior to expect.

### Unified Series Deduplication & Co-Requesters

8. As a User requesting a show from the main Search page, I want the system to detect if the same TMDB series was already added from the Seasonal Anime tab, so that duplicate torrents are not downloaded simultaneously.
9. As a User waitlisting an anime from the Seasonal Anime tab, I want the system to detect if that TMDB series is already on the waitlist or currently downloading as a TV show, so that my request attaches me as a co-requester rather than duplicating the entry.
10. As a User, when cross-type deduplication matches an existing series, I want the established disk library location (`/media/anime` or `/media/shows`) to be preserved, so that existing file paths and Jellyfin library indices are not broken.
11. As a User who co-requested a series that was originally added with a different media type, I want to receive notifications and see the series in my active requests dashboard, so that I have full visibility of its progress.
12. As a User attempting to add a Season Pack for a series where another user requested individual episodes, I want the system to deduplicate gracefully across media types, so that duplicate full-season and episodic downloads do not collide.

### Prowlarr Dual-Query Release Discovery

13. As a User downloading an ongoing anime series, I want the search to check both specialized anime indexers (categories 5070, 2070) and general TV indexers (category 5000), so that I do not miss releases that appear only on general trackers.
14. As a User downloading an animated or live-action TV show, I want the search to check anime indexers if absolute-number releases exist, so that non-Western or crossover releases (such as donghua, aeni, or co-productions) are successfully located.
15. As a User searching for an episode of a series, I want the query engine to send both standard syntax (`Title S01E01`) and absolute numbering (`Title - 01` / `Title 01`) in parallel, so that indexers formatting titles in either convention return valid release candidates.
16. As a User searching for a Series with distinct Japanese Romaji and English titles, I want queries to execute in parallel across both title variants, so that trackers indexing only one language title still yield results.
17. As a User, I want results from all parallel queries to be deduplicated by info hash and ranked by Release Scoring (seeders, resolution, Preferred Indexer status), so that the highest quality release is recommended regardless of syntax or category.
18. As an Operator, I want failed or empty responses from one query syntax or indexer category not to block results from other successful queries, so that partial tracker outages do not disrupt release candidate discovery.

### Automated Waitlist Monitoring & Up Next Tracking

19. As a User with an anime on the waitlist, I want the Watcher Service to check its release schedule against TMDB episodic air dates, so that the waitlist poll begins searching trackers on the exact day each episode airs.
20. As a User with an anime on the waitlist, I want the Watcher Service to execute dual-syntax searches (`S01E01` and `- 01`) during scheduled background polling, so that weekly episode releases are caught as soon as uploaded.
21. As a User watching series, I want the Up Next shelf on the dashboard to evaluate both `tv_show` and `anime` using identical progression logic, so that next unconsumed episodes for anime appear alongside TV shows seamlessly.
22. As a User, I want my Jellyfin watch progress for anime to update the series state identically to TV shows, so that consumed anime episodes are eligible for automatic cleanup according to disk retention policies.

### Legacy Data Migration & System Health

23. As an Operator upgrading MDM, I want any pre-existing database records with `metadata_source = 'anilist'` to be automatically migrated to their canonical TMDB IDs upon application startup, so that existing waitlist entries and requests resume working without manual intervention.
24. As an Operator, I want a detailed log of all migrated records showing the original AniList ID and title alongside the newly mapped TMDB ID, so that I can audit migration accuracy.
25. As an Operator, if an existing AniList record cannot be resolved automatically to TMDB during migration, I want the record safely flagged for administrator review without crashing the application startup process.
26. As an Operator, I want all database indexes and uniqueness constraints to enforce TMDB ID canonical uniqueness across the unified Series domain, so that future regressions are structurally prevented.

---

## Implementation Decisions

### Architectural Shape

- **Unified Series Domain Abstraction**:
  - The domain logic layer introduces a unified Series abstraction representing any episodic content.
  - The persistent `mediaType` field (`'tv_show'` | `'anime'`) is retained strictly as a storage and routing discriminator (`/media/shows` vs `/media/anime`).
  - All scheduling, status transitions, deduplication, co-requester mapping, and Up Next evaluation consume the unified Series abstraction.

- **Metadata Authority Boundary**:
  - AniList GraphQL client is strictly scoped as a presentation provider for seasonal feed queries and character/staff enrichment in the UI.
  - The TMDB client is the sole canonical metadata authority for persistence, file naming templates, air-date schedules, and season/episode layouts.
  - The API service layer rejects any create or update operation for download requests or waitlist entries that does not supply a valid TMDB metadata match.

- **Strict Ingestion UI Workflow**:
  - The seasonal anime detail modal removes the direct AniList waitlist submission bypass button.
  - The modal enforces a state machine with three states:
    1. *Resolving*: Initial automatic resolution against TMDB.
    2. *Resolved*: Matched TMDB item confirmed; user can select tracking mode (Episodic vs Season Pack) and submit. User can also trigger alternative selection or manual search.
    3. *Manual Search Required*: Displayed if automatic resolution yields no results or user clicks "Search manually". Provides an inline search input querying the TMDB multi/tv search API, showing candidate cards with posters and release years. Selecting a card transitions back to *Resolved*.
  - Submission buttons remain disabled until the state machine is in *Resolved*.

- **Prowlarr Dual-Query Orchestrator**:
  - A query generation helper produces search parameter sets for any Series search:
    - Set A: Standard format (`<Title> S<SS>E<EE>`) targeted at category `[5000, 5070, 2070]`.
    - Set B: Absolute format (`<Title> - <EE>` and `<Title> <EE>`) targeted at category `[5000, 5070, 2070]`.
    - Variants are generated for both the primary canonical title and any known alternate/romaji title.
  - Queries are executed concurrently against the Prowlarr client with an aggregate timeout.
  - Release candidates returned from all executions are combined into a single set, deduplicated by torrent info hash, and scored using existing Release Scoring logic (prioritizing Preferred Indexers, resolution, seeders, and release group reputation).

- **Unified Cross-Type Deduplication**:
  - The request repository and waitlist repository queries for duplicates query strictly by `metadataId` (TMDB ID) and `seasonNumber` (and `targetEpisode` where applicable), omitting `mediaType` from the `WHERE` matching clause for Series types (`tv_show` and `anime`).
  - When an incoming submission matches an existing entry with the alternate Series `mediaType`, the existing entry's `mediaType` and library path are preserved, while the new user is recorded in the co-requesters table.

- **Database Migration Pipeline**:
  - A dedicated migration step executes on API and Watcher startup.
  - It selects all rows in `download_requests` and `watch_requests` where `metadata_source = 'anilist'`.
  - For each row, it invokes the TMDB search service with the stored title and year.
  - If a high-confidence match is found, it updates `metadata_id = <tmdb_id>`, `metadata_source = 'tmdb'`, and updates any corresponding season/episode IDs.
  - If no match is found, it marks the record with a review flag and logs a warning, ensuring no crashing or data corruption.

---

## Testing Decisions

- **Definition of a Good Test**:
  - Tests must verify observable domain behavior through public interfaces (HTTP routes, service contracts, and UI components) rather than testing private implementation details.
  - Tests must assert that given valid Series inputs with either `tv_show` or `anime` media types, identical deduplication and scheduling behavior occurs.
  - Tests must assert that bypassing TMDB resolution is impossible from both the API and UI boundaries.

- **Modules and Seams to Test**:
  1. **API Route Seam (`app.inject`)**:
     - Test that submitting a download request for an existing TMDB ID returns a duplicate conflict or co-requester attachment even when one request has `mediaType: 'anime'` and the other has `mediaType: 'tv_show'`.
     - Test that attempting to submit a waitlist entry or download request with `metadataSource: 'anilist'` is rejected with a validation error (`400 Bad Request`).
  2. **Watcher Waitlist Seam (`buildWatcherApp().inject`)**:
     - Test that waitlist deduplication matches identically across `anime` and `tv_show` for the same TMDB ID.
     - Test that episodic air-date polling correctly evaluates TMDB season schedules for both media types.
  3. **Prowlarr Search Seam**:
     - Test that searching for a series produces parallel calls across categories `[5000, 5070, 2070]` with both `S01E01` and `- 01` query variants.
     - Test that results containing identical info hashes across parallel searches are deduplicated without duplicate scoring entries.
  4. **Frontend Component Seam (`@vue/test-utils`)**:
     - Test that the anime detail modal does not render any AniList bypass button.
     - Test that when automated TMDB resolution fails, the manual search input is rendered, searching TMDB displays selectable results, and selecting one unlocks the waitlist submission button.
  5. **Migration Seam**:
     - Test running the startup migration against a mock SQLite database containing legacy `metadata_source = 'anilist'` rows, asserting they are rewritten to `metadata_source = 'tmdb'` with valid TMDB IDs.

- **Prior Art**:
  - `apps/api/tests/request_dedup.test.ts` (API route-level deduplication tests with `app.inject`).
  - `apps/watcher/tests/waitlist_dedup.test.ts` (Watcher waitlist route-level deduplication tests).
  - `apps/api/tests/prowlarr.test.ts` (Prowlarr query mocking and release candidate scoring).
  - `apps/web/tests/AnimeView_waitlist.test.ts` (Anime view and modal interaction tests).

---

## Out of Scope

- **Merging Physical Library Folders**: Collapsing `/media/anime` into `/media/shows` is explicitly out of scope. Physical separation is preserved for Jellyfin server scrapers and library filtering.
- **Bi-directional AniList Sync**: Syncing watch progress or statuses back to personal AniList accounts is out of scope.
- **Manga or Light Novel Tracking**: Tracking non-animated source material remains out of scope.
- **Custom Tracker Category Overrides**: Dynamic per-indexer category mappings beyond `[5000, 5070, 2070]` are out of scope.

---

## Further Notes

- **Line Count Safeguards**:
  - Modifying `AnimeDetailModal.vue` must strictly adhere to the hard limit of 400 lines (currently at 388 lines). The manual search UI and state machine logic will be factored into a dedicated subcomponent (`TmdbManualMatchInput.vue` or composable `useTmdbResolver.ts`) to prevent breaching the line limit.
  - Route handlers and services will remain strictly modular under their 400-line hard limits.
- **ADR Reference**:
  - See ADR 0022 (`docs/adr/0022-unified-series-domain-and-tmdb-canonical-authority.md`) for architectural context and trade-offs.
