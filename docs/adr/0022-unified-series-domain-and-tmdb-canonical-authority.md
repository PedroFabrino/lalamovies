# Unified Series Domain and TMDB Canonical Authority

## Context

Previously, `tv_show` and `anime` were treated as distinct, disjoint `mediaType` classifications across the system. This produced recurring synchronization failures:
1. **Deduplication Collisions**: A show added as `tv_show` from the Discovery Feed or Search did not deduplicate against the same show added as `anime` from the Seasonal Anime tab, leading to duplicate database records and simultaneous downloads.
2. **Metadata Divergence & Air Date Failures**: The Seasonal Anime tab occasionally bypassed TMDB and saved raw AniList IDs (`metadataSource: 'anilist'`). Because the Watcher Service's air-date gating, season/episode checks, and episodic progression rely strictly on TMDB endpoints (`/tv/{id}/season/{s}`), AniList-sourced entries lacked reliable release dates and failed automated tracking.
3. **Indexer Inconsistencies**: Strict category separation caused releases on Japanese, Korean, and Chinese trackers (using absolute numbering ` - 01` and categories `5070`/`2070`) to be missed when requested as `tv_show`, while Western releases (`S01E01` on category `5000`) were missed when requested as `anime`.

## Considered Options

- **Complete Elimination of `anime` from `mediaType` Enum** — rejected: collapsed all series into `/media/shows/`. While structurally simple, it forced the destruction of separate Jellyfin library folders (`/media/anime` vs `/media/shows`) and broke existing multi-library Jellyfin configurations.
- **Bi-directional Mapping Table Between AniList and TMDB IDs** — rejected: maintaining an ongoing synchronization cache between AniList and TMDB IDs added significant complexity, schema overhead, and failure points without improving download outcomes.
- **Unified Series Domain with TMDB Canonical Authority and Dual-Query Execution** — **chosen**: retain `mediaType: 'anime'` purely for routing files to `/media/anime` on disk, while unifying 100% of internal application logic under a common `Series` domain model with TMDB as the single source of truth.

## Decision

1. **Unified Series Domain Concept**:
   All episodic content (`tv_show` and `anime`) shares identical lifecycle logic. In deduplication, Waitlist management, Up Next shelf evaluation, and episodic tracking, `tv_show` and `anime` are treated as interchangeable series.

2. **TMDB as Sole Canonical Metadata Authority**:
   Every persistent record in `download_requests` and `watch_requests` must have `metadataSource: 'tmdb'` and a valid TMDB ID. AniList is restricted to a read-only presentation catalog for populating the Seasonal Anime view (`/anime`).

3. **Strict TMDB Resolution at Ingestion**:
   In `AnimeDetailModal`, the bypass button permitting direct submission of AniList IDs is removed. Adding an anime to the Waitlist or download queue strictly requires a confirmed TMDB match. If automated title matching fails, the UI provides an integrated TMDB search input so the user can select the correct TMDB series before submission.

4. **Prowlarr Dual-Query Execution**:
   For any series request or waitlist poll, Prowlarr queries combined categories `[5000, 5070, 2070]` using both standard TV syntax (`Title S01E01`) and anime absolute syntax (`Title - 01` / `Title 01`), with English and Romaji title variants in parallel. Results are merged and scored into a unified candidate pool.

5. **Cross-Type Deduplication & Storage Reconciliation**:
   Deduplication across requests and waitlist entries is strictly keyed on TMDB ID, completely agnostic of `mediaType`. An incoming series request for TMDB ID `X` will match an existing entry for TMDB ID `X` regardless of whether one was submitted as `tv_show` and the other as `anime`. The established library destination path is preserved.

6. **Automated Migration of Legacy Records**:
   A one-time database migration converts any existing rows in `watcher.db` and `app.db` with `metadata_source = 'anilist'` to their corresponding TMDB ID and sets `metadata_source = 'tmdb'`.

## Consequences

- Completely eliminates cross-type duplicate downloads and orphaned waitlist entries.
- Preserves `/media/anime` and `/media/shows` library separation for Jellyfin users.
- Guarantees 100% data integrity for Watcher Service air-date gating and episodic tracking.
- Maximizes tracker hit rates across Japanese, Korean, Chinese, and Western releases by querying both `S01E01` and `- 01` formats across all tracker categories.
