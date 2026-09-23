# Seasonal Anime Discovery with AniList GraphQL and TMDB Waitlist Bridging

We introduce a dedicated Seasonal Anime discovery tab (`/anime`) in the MDM web interface, presenting anime organized by Japanese broadcast cycles (`Trending Anime`, `Popular This Season`, and `Upcoming Next Season`). The feature leverages public AniList GraphQL queries for seasonal categorization and franchise relation mapping, correlates upcoming releases against the user's hybrid watch history (MDM requests and Jellyfin play history) to highlight an **Anticipated Sequels Shelf**, and bridges AniList titles to TMDB metadata matches via a confirmation modal to seamlessly integrate with the Watcher Service's Waitlist.

## Considered Options

- **Standalone Microservice Container (`mdm-anime`)** — rejected because querying AniList GraphQL and caching parsed schedules is lightweight; spinning up an isolated container introduces container orchestration overhead, port allocations, and inter-service authentication latency for accessing user history. An in-process service within `apps/api` with tiered in-memory caching achieves identical isolation with zero operational overhead.
- **Pure TMDB/Trakt for Seasonal Anime** — rejected because TMDB lacks anime-specific seasonal quarter groupings (`WINTER`, `SPRING`, `SUMMER`, `FALL`), air-calendar synchronization, and curated prequel/sequel relation graphs. AniList is the canonical authority for anime seasonality.
- **Rewriting Watcher Service to Support AniList IDs Directly** — rejected because Watcher's release gating, air date checks, and episodic tracking rely on TMDB API endpoints (`/tv/{id}/season/{s}`). Resolving AniList entries to TMDB metadata matches preserves the stability of the core Watcher pipeline without modifying its schema or air date logic.
- **Silent Auto-Resolution to TMDB without User Confirmation** — rejected because anime titles frequently differ between English, Romaji, and localized TMDB releases (e.g. subtitle variations, season numbering conventions). Presenting a confirmation modal guarantees user intent and prevents incorrect TMDB ID bindings on the Waitlist.
- **Global Server Library Matching instead of Personalized User History** — rejected because users want to know which sequels matter to *them* individually, not everything anyone on the server ever watched. A hybrid history checking the user's MDM requests and Jellyfin watch records delivers personalized relevance.

## Consequences

- A dedicated in-process `AnimeSeasonService` (`apps/api/src/services/animeSeasonService.ts`) interfaces with `https://graphql.anilist.co`, enforcing tiered in-memory caching (30 minutes for Trending, 6 hours for seasonal charts) to respect API rate limits (90 req/min).
- The service performs two-pass relation matching: deterministic AniList ID matching against the user's AniList-sourced requests, followed by normalized title fallback against TMDB-sourced requests and Jellyfin play history to populate the **Anticipated Sequels Shelf**.
- A dedicated route sub-module (`apps/api/src/routes/anime/seasonal.ts`) exposes endpoints for seasonal lineups, season/quarter navigation, and TMDB bridge resolution.
- The web frontend introduces `apps/web/src/views/AnimeView.vue`, decomposed into `AnticipatedSequelsShelf.vue`, `SeasonalAnimeGrid.vue`, and `AnimeDetailModal.vue` to respect file size limits (<400 lines).
- Clicking an upcoming anime opens a confirmation modal allowing the user to verify the TMDB metadata match and select between **Weekly Episodic Tracking** (`Watch for Next Episodes`) and **Complete Season Pack** waitlisting.
- Airing anime cards support an integrated action row offering **Instant Stream** (via Real-Debrid / Streamer), **Download Torrent** (via Prowlarr), and **Watch on Waitlist**.
- The feature is gated behind the `seasonal_anime` runtime feature flag in `systemConfig` and `useFeatureFlags`.
