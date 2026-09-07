# Torrent Search & Direct Prowlarr Integration — Spec

## Problem Statement

Currently, Users must independently search external torrent websites, copy magnet links or download `.torrent` files, and paste or upload them into the Media Download Manager (MDM) web interface. This creates friction, exposes users to intrusive tracker advertising, and frequently results in poor download performance when users unknowingly select low-seeded, dead, or low-quality releases. Furthermore, users requesting TV shows or Anime struggle to distinguish between full Season Packs and individual episodes.

## Solution

Directly integrate Prowlarr into MDM as an Indexer proxy. Users search for media titles directly in the MDM dashboard against TMDB and AniList. Upon confirming a Metadata Match, MDM queries Prowlarr across all configured Indexers, parses release titles for resolution and codec, and applies a Release Scoring engine to automatically select the healthiest, best-quality Release Candidate (preferring 1080p within defined Storage Quota ceilings and minimum seeder thresholds). Users can confirm the recommended release with one click or manually choose from an expanded list of candidate releases. If healthy releases are unavailable, the interface gracefully degrades to display lower-seeded releases with warnings or offers a direct fallback to manual magnet/file entry with the Metadata Match preserved.

---

## User Stories

### Torrent Search & Metadata-First Discovery

1. As a User, I want to search for content by typing its title into a search bar, so that I do not have to leave the application to find torrents.
2. As a User, I want the search tab to be selected by default when I navigate to the request page, so that I can immediately start looking for media.
3. As a User, I want to search across Movies, TV Shows, and Anime from a single intuitive search interface, so that I can request any supported Media Type.
4. As a User, I want to see the top Metadata Match candidates with posters, release years, and overviews, so that I can confirm I am downloading the exact title I intended.
5. As a User, I want the system to search Indexers only after I confirm the Metadata Match, so that tracker queries are properly targeted with canonical title, year, and category filters.

### Automated Release Scoring & Recommendation

6. As a User, I want the system to automatically analyze all available torrent releases and recommend the single best candidate, so that I don't have to decipher complex release naming strings.
7. As a User, I want the recommendation engine to prioritize 1080p resolution, so that I get sharp video quality without unnecessarily consuming excessive bandwidth or storage.
8. As a User, I want the recommendation engine to avoid excessively large files (e.g., > 10 GB for movies, > 2 GB for single episodes, > 25 GB for season packs), so that my download does not rapidly exhaust the server's Storage Quota.
9. As a User, I want the recommendation engine to require at least 5 seeders for the top pick, so that I am not assigned a dead or stalled torrent.
10. As a User, I want to see key details on the recommended Release Candidate card (resolution badge, file size, seeder count, video codec, tracker source), so that I understand why it was chosen.
11. As a User, I want to submit the recommended release with a single click, so that requesting content is fast and effortless.

### Manual Release Candidate Selection

12. As a User, I want to expand a list of all available Release Candidates, so that I can pick a specific release if I prefer 4K, 720p, or a specific audio/subtitle encoding.
13. As a User, I want each candidate in the list to clearly show its title, resolution, size, seeder count, and Indexer, so that I can make an informed choice.
14. As a User, I want candidates sorted by release score (health and quality) by default, so that the best alternatives appear at the top.
15. As a User, I want to select an alternative candidate from the list and immediately have it update my pending submission, so that I can proceed to confirmation.

### Episodic Media & Season Packs

16. As a User requesting a TV Show, I want the search to default to finding Season Packs for Season 1, so that I can binge the complete season without submitting individual episode requests.
17. As a User requesting a TV Show, I want to change the selected season number, so that I can request later seasons (e.g. Season 2, Season 3).
18. As a User requesting a TV Show, I want to toggle between "Full Season" and "Single Episode", so that I can request just the specific episode I need.
19. As a User requesting an episode, I want to specify the season and episode number, so that Prowlarr searches specifically for episode-formatted releases (e.g., `S02E05`).
20. As a User requesting Anime, I want the system to query indexers using both the Romaji and English titles, so that releases are found regardless of whether the tracker indexes Japanese or localized names.
21. As a User requesting Anime, I want clickable chips for Romaji and English title variants, so that I can manually re-trigger the tracker search if the default query yielded poor results.

### Graceful Fallbacks & Edge Cases

22. As a User, I want to be informed clearly when no releases meet the minimum health threshold (≥ 5 seeders), so that I know why an automatic recommendation was not made.
23. As a User, I want the option to view low-health releases anyway, so that I can still download niche or older content if I am willing to wait for slow peers.
24. As a User, I want a direct button to "Paste Magnet Link or Upload Torrent File" when tracker search yields no results, so that I can supply my own source without losing the Metadata Match I already confirmed.
25. As a User, I want the manual upload tabs (`📄 Torrent File` and `🧲 Magnet Link`) to remain available at all times, so that I can bypass tracker search entirely whenever desired.
26. As an Admin, I want to be informed if Prowlarr is unreachable or if the API key is missing/invalid, so that I can correct the configuration without breaking the rest of MDM.

### Administration & Infrastructure

27. As an Admin, I want Prowlarr deployed as a managed companion container in the Docker Compose stack, so that indexer proxying runs reliably alongside qBittorrent and Jellyfin.
28. As an Admin, I want to configure indexers, FlareSolverr, and proxies in Prowlarr's native Web UI on port 9696, so that I have complete control over tracker health and credentials.
29. As an Admin, I want MDM to communicate with Prowlarr over the internal Docker network, so that tracker API traffic does not require public egress or additional proxy setup.

---

## Implementation Decisions

### Architectural Shape
- Direct integration between MDM Fastify backend and Prowlarr via Prowlarr's Torznab REST API, bypassing Radarr and Sonarr entirely (as documented in ADR 0008).
- Prowlarr runs in the Docker Compose stack on port `9696` with persistent storage for its database and tracker configs.
- Fastify backend exposes a dedicated endpoint for querying and scoring releases, while the existing request creation endpoint consumes the chosen candidate's download URL without breaking backward compatibility.

### Module Boundaries & Interfaces
- **Metadata Module**: Enriched to return both Romaji and English titles for Anime candidates to facilitate multi-variant tracker searching.
- **Prowlarr Client Module**: Encapsulates all communication with Prowlarr's `/api/v1/search` endpoint, mapping MDM Media Types to Torznab categories (2000 for Movies, 5000 for TV, 5070 for Anime). Formulates title query strings based on media granularity (Movies: `Title Year`; Season Packs: `Title S01`; Episodes: `Title S01E01`).
- **Release Scoring Engine**: Pure ranking function that evaluates candidate release strings against predefined heuristics:
  - Resolution: 1080p (+100), 720p (+50), 2160p (+20).
  - Codec: x265/HEVC (+15), x264 (+10).
  - Size safety penalties: File size exceeding 10 GB for movies, 2 GB for episodes, or 25 GB for season packs incurs heavy score reduction.
  - Seeder threshold: Minimum 5 seeders required for recommended status; candidates below threshold are flagged as low-health.
- **Request Creation Interface**: Existing endpoint accepts the magnet link or torrent URL extracted from the selected Release Candidate, reusing the existing qBittorrent enqueue, DownloadPoller, hardlinking, Jellyfin rescan, and LRU cleanup mechanisms unchanged.

---

## Testing Decisions

### Good Test Principles
- Tests must verify observable behavior rather than internal implementation details.
- Scoring tests verify that given an array of raw release candidates with varying seeders, resolutions, and sizes, the algorithm deterministically selects the expected recommendation and properly flags low-health items.
- API tests verify HTTP request validation, status codes, and the payload contract under authenticated conditions.
- Network calls to external Prowlarr instances must be mocked at the HTTP/service boundary to ensure tests run fast and offline.

### Modules Tested
- `ProwlarrService` unit tests: Torznab category mapping, release title tokenization, scoring weights, size caps, and anime fallback logic.
- `requests` route integration tests: Authenticated `POST /requests/search-releases` endpoint returning recommended candidate, sorted candidates array, and graceful error responses when Prowlarr is unconfigured or unreachable.

### Prior Art
- `apps/api/tests/metadata.test.ts` (mocks external TMDB and AniList APIs, tests title cleaning and parsing).
- `apps/api/tests/download_requests.test.ts` (tests authenticated Fastify route handlers using `app.inject`).

---

## Out of Scope

- Building a custom Indexer management UI within MDM (Admin uses Prowlarr's native Web UI on port 9696).
- Automated recurring background search/upgrading of media releases (MDM only searches on user demand).
- Integration with Radarr or Sonarr daemons (intentionally avoided per ADR 0008).
- Multi-indexer download client routing (all downloads route exclusively through MDM's qBittorrent container).

---

## Further Notes

- Prowlarr requires an initial setup step by the Admin: navigating to `http://localhost:9696`, retrieving the generated API key under *Settings > General*, and pasting it into the host `.env` file as `PROWLARR_API_KEY`.
- Trackers configured in Prowlarr should include a healthy mix of general public trackers (e.g. 1337x, TorrentGalaxy, YTS) and specialized anime trackers (e.g. Nyaa) for optimal coverage.
