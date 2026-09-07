# Direct Prowlarr Integration for Torrent Search

We integrate Prowlarr directly via its REST API as an Indexer proxy rather than adopting the full *Arr ecosystem (Radarr, Sonarr, Jellyseerr). MDM's Fastify backend queries Prowlarr for Release Candidates matching confirmed Metadata Matches, maintaining MDM's custom watch-history-based LRU Cleanup, Storage Quota enforcement, and unified Jellyfin auth while avoiding the resource overhead and configuration complexity of multiple .NET daemons.

## Considered Options

- **Full *Arr Stack (Radarr + Sonarr + Prowlarr + Jellyseerr)** — rejected because Radarr/Sonarr lack native storage quota eviction and play-history-aware LRU cleanup policies, and running 4+ additional containers introduces heavy resource overhead for a small server.
- **Direct Scraping / Custom Indexer Scrapers** — rejected because torrent tracker HTML schemas, Cloudflare challenges, and mirror domains change frequently and require continuous maintenance.

## Consequences

- Prowlarr runs as an auxiliary container in Docker Compose, requiring network connectivity and an API key configured in `.env`.
- MDM remains the sole orchestrator of the download lifecycle, metadata naming, hardlinking, and cleanup policies.
- Release ranking and quality filtering must be handled in MDM's backend service or scoring logic.
