# Seasonal Anime Discovery & Waitlist Bridging — Spec

## Problem Statement

Anime releases follow a strict, quarterly Japanese broadcast calendar (`Winter`, `Spring`, `Summer`, `Fall`). While Media Download Manager (MDM) provides general torrent searching, an automated Waitlist, and a dashboard Discovery Feed, users currently have no seasonal visibility into upcoming anime releases or currently airing community favorites. 

Users must independently check external anime databases (like AniList or MyAnimeList) to discover which series are premiering next season, figure out if an upcoming title is a sequel to an anime they previously watched on MDM or Jellyfin, and manually attempt to locate and track releases. For unreleased upcoming series, users cannot proactively commit to downloading or tracking them from an anime-native calendar.

## Solution

Introduce a dedicated **Seasonal Anime Tab** (`/anime`) in MDM, providing a rich, responsive interface powered directly by the AniList GraphQL API and connected seamlessly to MDM's Watcher and Waitlist ecosystem:

1. **Seasonal Broadcast Lineups**: Displays categorized carousels and grids for `Trending Anime`, `Popular This Season` (current quarter), and `Upcoming Next Season` (next quarter), with a season & year archive selector.
2. **Anticipated Sequels Shelf**: A personalized top shelf highlighting upcoming anime whose prequels or parent franchises appear in the user's hybrid watch history (completed MDM Download Requests + Jellyfin play history).
3. **TMDB Waitlist Bridging with Confirmation**: AniList media items resolve against TMDB to preserve the Watcher Service's air date gating and episodic schedule tracking, presenting a confirmation modal where users choose between **Weekly Episodic Auto-Advance** (`Watch for Next Episodes`) and **Complete Season Pack** waitlisting.
4. **Tri-Mode Airing Actions**: For currently airing titles, cards support **Instant Stream** (Real-Debrid via Streamer), **Download Torrent** (Prowlarr candidate search), and **Watch on Waitlist**.
5. **Tiered Caching & Feature Gating**: Tiered in-memory caching (30m Trending, 6h Seasonal) to respect AniList API rate limits, gated behind the `seasonal_anime` runtime feature flag.

---

## User Stories

### Seasonal Browsing & Navigation

1. As a User, I want a dedicated "Anime" tab in the top navigation bar, so that I can browse anime organized by Japanese broadcast seasons without cluttering the main dashboard.
2. As a User, I want to see "Trending Anime" right now, so that I can discover popular shows actively being watched and discussed by the community.
3. As a User, I want to see "Popular This Season" for the current broadcast quarter, so that I can keep up with the biggest releases currently airing.
4. As a User, I want to see "Upcoming Next Season", so that I can anticipate upcoming premieres for the next quarter.
5. As a User, I want to select past or future seasons (e.g., Summer 2025, Winter 2024), so that I can look ahead at announced projects or review past season catalogs.
6. As a User, I want to see anime cards with cover artwork, Japanese romaji title, English title, format, episode count, broadcast season, and community score, so that I can evaluate titles with authentic metadata.
7. As a User, I want adult (18+ / Hentai) content automatically filtered out from all seasonal queries, so that the browse catalog remains safe and appropriate.

### Anticipated Sequels & Personalized Priority

8. As a User, I want a dedicated "Anticipated Sequels" shelf at the top of the Anime page, so that I am immediately notified when a sequel to an anime I watched is airing next season.
9. As a User, I want the system to check both my MDM download requests and my Jellyfin watch history, so that my returning anime shelf reflects my actual viewing history.
10. As a User, I want the sequel detection to check AniList's relation tree (`PREQUEL` and `PARENT` edges), so that sequels are matched deterministically without false positives.
11. As a User, I want a fallback title normalization check for anime requested via TMDB, so that shows requested before AniList integration are still recognized.
12. As a User, I want each card in the Anticipated Sequels shelf to indicate which prequel I watched (e.g., "Sequel to Solo Leveling Season 1"), so that I have immediate context.
13. As a User, I want a quick filter toggle on the main Upcoming grid to toggle between "All Upcoming" and "From My Library", so that I can filter large seasonal lists to shows relevant to me.

### Detail Modal & Waitlist Commitment

14. As a User, I want clicking an anime card to open a detail modal with synopsis, genres, trailer link, and studio info, so that I can learn more about the show before deciding to watch.
15. As a User, I want to click "+ Waitlist" on any upcoming anime, so that MDM will automatically download it once releases appear on trackers.
16. As a User, I want a confirmation modal showing the matched TMDB show, poster, and air date before creating the waitlist entry, so that I can ensure the TMDB match is accurate.
17. As a User, I want to choose between "Weekly Episodic Tracking" and "Complete Season Pack" in the confirmation modal, so that I can decide whether to get weekly releases or wait for the full season.
18. As a User, I want airing anime to default to weekly episodic tracking starting at the next unreleased episode, so that I do not miss ongoing weekly broadcasts.

### Airing Anime Actions (Streaming & Torrent Search)

19. As a User, I want to click "Download Torrent" on currently airing or completed anime, so that MDM searches Prowlarr indexers and presents release candidates to download immediately.
20. As a User, I want to click "Instant Stream" if Real-Debrid streaming is enabled and available, so that I can watch episodes immediately without waiting for downloads or using disk space.
21. As a User, I want action buttons accessible both directly on card hover and inside the detail modal, so that I can choose between fast 1-click actions and detailed browsing.

### Performance, Reliability & Administration

22. As an Admin, I want seasonal queries cached in memory for 6 hours and trending queries for 30 minutes, so that the application never exceeds AniList's 90 requests/minute rate limit.
23. As an Admin, I want concurrent requests during cache expiration to share a single in-flight fetch promise, so that upstream GraphQL endpoints are protected from thundering herds.
24. As an Admin, I want the entire feature controllable via a `seasonal_anime` runtime feature flag, so that I can disable the tab instantly if AniList suffers downtime.
25. As a User, I want clear, friendly empty states and error notices if AniList is unreachable, so that temporary API outages do not break the web application.

---

## Implementation Decisions

### Architectural Shape
- **In-Process Service**: Built as `AnimeSeasonService` inside `apps/api/src/services/animeSeasonService.ts`, interfacing with `https://graphql.anilist.co`. Reuses existing Fastify infrastructure, authentication, database repositories, and TMDB search capabilities without requiring an additional microservice container.
- **Dedicated Route Module**: New route plugin `apps/api/src/routes/anime/seasonal.ts` registering:
  - `GET /anime/seasonal` — returns cached seasonal sections (`trending`, `popularThisSeason`, `upcomingNextSeason`, and user's `anticipatedSequels`).
  - `GET /anime/seasons` — returns paginated seasonal results for arbitrary season/year queries (`season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'`, `year: number`).
  - `POST /anime/resolve-tmdb` — searches TMDB using AniList English/Romaji titles and release year, returning ranked TMDB candidates for the waitlist confirmation modal.
- **Frontend Architecture**:
  - `apps/web/src/views/AnimeView.vue` — main view with hero banner, season switcher, and section layouts (<400 lines).
  - `apps/web/src/components/AnticipatedSequelsShelf.vue` — top horizontal carousel for personalized returning anime (<300 lines).
  - `apps/web/src/components/SeasonalAnimeGrid.vue` — responsive card grid with filter pills and pagination (<300 lines).
  - `apps/web/src/components/AnimeDetailModal.vue` — detail modal with trailer, synopsis, streaming/download buttons, and TMDB waitlist confirmation flow (<350 lines).
  - `apps/web/src/components/Navbar.vue` — updated to render the "Anime" tab when `seasonal_anime` feature flag is enabled.

### Data Contracts

#### AniList GraphQL Query Shape
```graphql
query ($season: MediaSeason, $seasonYear: Int, $sort: [MediaSort], $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(
      type: ANIME
      season: $season
      seasonYear: $seasonYear
      sort: $sort
      isAdult: false
    ) {
      id
      title { romaji english native }
      format
      status
      episodes
      season
      seasonYear
      startDate { year month day }
      coverImage { extraLarge large medium }
      bannerImage
      genres
      averageScore
      popularity
      description
      trailer { id site }
      relations {
        edges {
          relationType
          node {
            id
            title { romaji english }
            format
          }
        }
      }
    }
  }
}
```

#### TMDB Bridge Resolution Contract
`POST /anime/resolve-tmdb`
- Input: `{ anilistId: number, title: string, romajiTitle?: string, year?: number, format?: string }`
- Output: `{ candidates: MetadataCandidate[], recommended: MetadataCandidate | null }`

---

## Testing Decisions

### Testing Philosophy
Tests must exercise externally observable behaviors at the highest practical boundaries:
- **Backend Route Seam**: Fastify `app.inject()` tests verifying HTTP response schemas, auth enforcement, tiered caching, rate limit shielding, and TMDB bridge lookups with mocked upstream HTTP calls.
- **Service Unit Seam**: `AnimeSeasonService` tests verifying relation graph parsing, two-pass hybrid history correlation (MDM requests + Jellyfin history), and error resilience when upstream APIs return HTTP 429/500.
- **Frontend Component Seam**: Vitest + `@vue/test-utils` testing `AnimeView.vue` and subcomponents against mocked API fixtures, validating rendering, season switching, filter toggles, and modal action triggers.

### Prior Art
- `apps/api/tests/discovery.test.ts`: in-memory caching and upstream mock patterns.
- `apps/api/tests/upNext.test.ts`: user history correlation and grouping.
- `apps/web/tests/UpNextShelf.test.ts`: horizontal shelf rendering and fast-track actions.
- `apps/web/tests/TorrentReplacementModal.test.ts`: modal confirmation and subcomponent decomposition.

---

## Out of Scope

- Direct BitTorrent/tracker scraping inside the anime browser (tracker searching is delegated to Prowlarr release search when the user clicks Download).
- Direct anime video hosting (playback relies on Jellyfin or Real-Debrid streaming).
- Non-anime TV shows or Hollywood movie seasons in this tab (retained for generic Discovery Feed and TMDB search).
- Modifying the Watcher Service database schema or changing Watcher's native TMDB release gating queries.

---

## Further Notes

- Aligns with [ADR 0019](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0019-seasonal-anime-discovery-and-waitlist-bridging.md) and [CONTEXT.md](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/CONTEXT.md#L88-L100).
- Governed by strict file size limits (<400 lines per file) per `.agents/rules/no-monoliths.md`.
