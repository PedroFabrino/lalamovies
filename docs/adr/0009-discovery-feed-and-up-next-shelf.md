# Discovery Feed and Up Next Shelf for Media Discovery

We introduce an intelligent media discovery layer directly on the MDM Dashboard consisting of two complementary sections: a personalized **Up Next** shelf that detects and surfaces the immediate next sequential episode for actively followed TV series and anime, and a curated **Discovery Feed** showcasing newly indexed, healthy releases across Movies, TV Shows, and Anime. Both feeds are powered by Prowlarr indexer scraping, normalized by MDM's release quality scorer, enriched with TMDB/AniList metadata, cached in-memory with a 60-minute TTL, and connected to 1-click fast-track submission to Step 3.

## Considered Options

- **TMDB / Trakt Trending API as Discovery Source** — rejected because trending lists frequently feature newly announced or in-theater titles that have zero healthy torrents available, leading to dead searches and frustrated users.
- **Client-Side Live Prowlarr Querying on Page Load** — rejected because querying multiple indexers live across categories introduces 3–6s latency per dashboard visit and triggers aggressive rate limits and Cloudflare challenge blocks from public trackers.
- **Automated Background Auto-Downloading (Sonarr/Radarr Style)** — rejected per ADR 0008 because automatic mass downloading can silently exhaust the server's Storage Quota without user intent; user-initiated 1-click submission retains explicit control over disk space.
- **Jellyfin Playback-Driven Series Tracking** — rejected because relying on Jellyfin playback sync introduces external API failure points and does not detect newly downloaded episodes that the user has not yet clicked "Play" on; querying MDM's internal download history is atomic and immediate.

## Consequences

- The Fastify backend implements an in-memory `DiscoveryService` caching parsed Prowlarr results with a 60-minute TTL and concurrency locking to protect tracker infrastructure.
- The `Up Next` shelf queries the user's non-deleted episodic requests within the last 90 days, groups by `metadataId`, calculates `E(max + 1)`, and queries Prowlarr for that specific missing episode.
- The Discovery Feed presents 10 items per category (`Movies`, `TV Shows`, `Anime`) in a horizontal slider with quality badges, ratings, and deduplication.
- Clicking any Discovery Item or Up Next Item routes directly to `/request` pre-populated at Step 3 ("Confirm Download Request"), enabling true 1-click downloads.
- If Prowlarr is offline or unconfigured, the discovery widgets hide gracefully without interrupting the core dashboard experience.
