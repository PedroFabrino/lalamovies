# Ephemeral Streaming & Real-Debrid Integration — Spec

## Problem Statement

When Users want to watch content immediately ("in the moment"), they are forced to wait for multi-gigabyte peer-to-peer torrent downloads to complete, parse, and move across the physical disk. Furthermore, spontaneous, one-off media consumption rapidly saturates the server's finite 150 GB Storage Quota, triggering premature automatic Cleanup of other media. While debrid caching services such as Real-Debrid offer instant HTTP streaming, their strict terms of service prohibit simultaneous access from multiple public IP addresses on a single account, making direct client-side debrid streaming across distributed friend households impossible without account bans. Finally, users with private trackers configured in Prowlarr risk permanent tracker bans and leaked passkeys if private torrents are mistakenly ingested into commercial multi-hoster cloud platforms.

## Solution

Implement a Dual-Tier Media System within Media Download Manager. Permanent, scheduled, and curated content (such as Up Next episodic releases, Waitlist items, and pinned titles) continues downloading to local physical storage via qBittorrent under existing Storage Quota rules. Concurrently, an Ephemeral Streaming tier resolves spontaneous viewing requests through Real-Debrid's global cache, mounting video streams into a dedicated `Stream` library in Jellyfin via containerized WebDAV services (`zurg` and `rclone`) without consuming local disk space. All client streams proxy through Jellyfin across the server host's 1 Gbps connection, ensuring Real-Debrid only ever observes the server's single public IP. Ephemeral streams automatically evict 24 hours after creation—deferred safely if a user is actively watching—and can be promoted at any time to permanent local downloads via high-speed direct HTTP ingestion. Releases from private trackers are strictly airgapped and excluded from debrid ingestion.

---

## User Stories

### Instant Streaming & Playback

1. As a User browsing media in search or the Discovery Feed, I want to see an "Instant Stream" option next to pre-cached releases, so that I can begin watching immediately without waiting for a download.
2. As a User selecting "Instant Stream", I want the media to mount to Jellyfin within seconds, so that I experience near-zero latency between request and availability.
3. As a User on my Smart TV or mobile app, I want to see a single dedicated "Stream" library on my Jellyfin home screen, so that I can easily find and play temporary watches separate from the permanent library.
4. As a User requesting episodic media for instant streaming, I want to select a specific episode or full season, so that I can stream individual episodes on a whim.
5. As a User requesting an instant stream that is not yet globally cached on Real-Debrid, I want the system to submit the torrent to cloud caching and notify me when it is mounted, so that I am kept informed without staring at a loading screen.
6. As a User watching an ephemeral stream, I want smooth playback without stuttering or buffering freezes, so that the viewing experience matches that of local files.

### Private Tracker Airgap & Safety

7. As an Admin with private trackers configured in Prowlarr, I want the system to detect private indexers automatically, so that private tracker releases are never forwarded to Real-Debrid.
8. As a User viewing Release Candidates, I want releases originating from private trackers to display only the "Download" button and disable or hide the "Instant Stream" button, so that I cannot inadvertently expose private torrents to cloud caching.
9. As an Admin, I want backend validation to hard-reject any debrid streaming request containing private tracker announce URLs or metadata, so that passkeys and tracker accounts are protected even if client validation is bypassed.

### 24-Hour Lifecycle & Playback Guard

10. As an Admin, I want Ephemeral Streams to automatically expire and unmount 24 hours after creation, so that the Debrid mount and Stream library remain uncluttered by stale one-off watches.
11. As a User actively watching a movie 23.5 hours after requesting it, I want the system to verify active Jellyfin playback sessions before evicting, so that my stream is never abruptly terminated while I am watching.
12. As a User whose active stream is deferred from eviction due to active playback, I want the system to clean up the stream shortly after playback concludes, so that resources are freed promptly.
13. As an Admin, I want to see a list of active Ephemeral Streams in the dashboard with their time-to-live and current playback status, so that I have visibility into what is mounted.
14. As an Admin, I want the ability to manually evict an Ephemeral Stream immediately from the dashboard, so that I can free up cloud torrent slots or remove erroneous requests on demand.

### Stream Promotion to Permanent Storage

15. As a User who loved an ephemeral movie or episode, I want to click "Promote to Download" from the dashboard, so that it is permanently saved to the local server storage.
16. As a User promoting an ephemeral stream, I want a promotion dialog in the dashboard to select or verify the Media Type (Movie, TV Show, Anime), confirm the canonical Metadata Match (TMDB/AniList), and specify Season/Episode numbers if episodic, so that the permanent library receives correctly named and structured files.
17. As a User promoting an ephemeral stream, I want the file downloaded via direct high-speed HTTP from Real-Debrid rather than P2P swarm, so that it downloads at full line speed without relying on seeders.
18. As an Admin, I want promoted streams to move into the standard staging and hardlinking pipeline, so that files are correctly renamed, placed in the permanent Library (`/media/movies`, `/media/shows`, etc.), and governed by standard Storage Quota and Cleanup Policies.
19. As a User, I want the promoted item to transition cleanly from the "Stream" library to the permanent library in Jellyfin, so that duplicate entries are avoided.

### Discovery & Real-Debrid Cache Visibility

19. As a User exploring the Discovery Feed, I want items with instant debrid cache availability to be highlighted with a distinctive badge, so that I can prioritize content ready for immediate playback.
20. As a User searching for titles, I want search candidate releases to display their Real-Debrid cache status, so that I know which releases will mount instantly.
21. As a User, I want the system to handle Real-Debrid API transient errors gracefully, so that search and local download capabilities remain operational even if debrid services experience downtime.

### Infrastructure & Administration

22. As an Admin, I want `zurg` and `rclone` deployed as companion Docker containers in the compose stack, so that the WebDAV mount runs reliably without manual host configuration.
23. As an Admin, I want the Real-Debrid API key configured via environment variables and injected securely into containers, so that sensitive credentials remain protected.
24. As an Admin, I want all outgoing debrid requests to originate from the server's single public IP, so that friends streaming concurrently across multiple households never trigger multi-IP account violations with the provider.

---

## Implementation Decisions

### Architectural Seams & Modules

- **Debrid Service (`IDebridService`)**: A dedicated interface encapsulating interactions with the Real-Debrid REST API:
  - Checking instant cache availability for one or more infohashes (`/torrents/instantAvailability`).
  - Adding magnet links and selecting all files (`/torrents/addMagnet`, `/torrents/selectFiles`).
  - Polling cloud torrent status and resolving unrestricted direct download links (`/torrents/info`, `/unrestrict/link`).
  - Deleting cloud torrents upon expiration (`/torrents/delete`).
- **Ephemeral Stream Manager (`IEphemeralStreamService`)**: Coordinates the lifecycle of ephemeral streams:
  - Adding an ephemeral stream entry in the database.
  - Interacting with `DebridService` to mount the torrent.
  - Triggering targeted Jellyfin library scans for the `Stream` library path.
  - Running scheduled 24-hour eviction evaluations with active Jellyfin session checks.
- **Prowlarr Privacy Enrichment**: Enhance `ProwlarrService` to query indexer privacy metadata from `/api/v1/indexer` and tag each `ReleaseCandidate` with `isPrivateTracker: boolean`.
- **Stream Promotion Pipeline**: Orchestrates converting an ephemeral stream to a standard download:
  - **Promotion Confirmation Modal**: When a user triggers promotion in the dashboard, the UI displays a modal to select the target `Media Type` (`Movie`, `TV Show`, or `Anime`), confirm or adjust the canonical `Metadata Match` (TMDB/AniList), and specify `Season` / `Episode` numbers (for episodic series).
  - **Direct HTTP Ingestion**: Streams files directly via HTTPS from Real-Debrid into the Staging Area (`/media_data/downloads/staging`), followed by standard renaming and `Hardlink Move` into the permanent `/media` library paths.
- **Docker Compose Topology**:
  - `zurg`: Acts as a WebDAV proxy connecting to Real-Debrid.
  - `rclone`: Mounts the WebDAV share into `${MEDIA_DATA_PATH}/stream`.
  - `jellyfin`: Reads from `/media_data/stream` to serve the `Stream` library.

### Database Schema Changes

A new table `ephemeral_streams` tracks active and past streaming requests:

```typescript
// Conceptual schema shape
export const ephemeralStreams = sqliteTable('ephemeral_streams', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  mediaType: text('media_type').notNull(), // 'movie' | 'tv_show' | 'anime'
  tmdbId: integer('tmdb_id'),
  seasonNumber: integer('season_number'),
  episodeNumber: integer('episode_number'),
  torrentHash: text('torrent_hash').notNull(),
  debridTorrentId: text('debrid_torrent_id'),
  streamPath: text('stream_path'),
  status: text('status').notNull(), // 'mounting' | 'ready' | 'downloading_cloud' | 'expired' | 'promoted' | 'failed'
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### API Contracts

- `POST /api/streams`: Body `{ releaseCandidate: ReleaseCandidate, mediaType: string, tmdbId?: number, seasonNumber?: number, episodeNumber?: number }`. Validates private tracker airgap, queries RD cache, adds to RD, records stream, and returns stream status.
- `GET /api/streams`: Returns list of currently active ephemeral streams with time remaining and playback status.
- `DELETE /api/streams/:id`: Manually unmounts and removes the stream from Real-Debrid.
- `POST /api/streams/:id/promote`: Initiates direct HTTP download into local storage, transitioning status to `promoted` and creating a standard `downloadRequests` record.
- `GET /api/streams/cache-check?hashes=hash1,hash2`: Checks instant availability for a list of torrent hashes.

---

## Testing Decisions

### What Makes a Good Test

Tests must verify external, observable behavior across boundaries rather than private implementation details. A good test asserts that:
- Given a cached public release candidate, invoking the streaming endpoint creates a database record, interacts with the debrid API, initiates a Jellyfin refresh, and returns a ready status.
- Given a release from a private indexer, the streaming endpoint rejects the request with HTTP 400 and preserves passkey security.
- The eviction job purges streams whose `expiresAt` is in the past, except when Jellyfin reports an active session for that media.
- Stream promotion downloads the remote stream, creates a valid staging payload, and triggers hardlinking.

### Modules to Test

1. **API Streaming Routes (`apps/api/tests/streams.test.ts`)**: Integration tests using Fastify `app.inject()` with mock Debrid, Prowlarr, and Jellyfin services.
2. **Prowlarr Privacy Enrichment (`apps/api/tests/prowlarr_privacy.test.ts`)**: Verifying indexer classification and private release filtering.
3. **Ephemeral Eviction & Session Guard (`apps/api/tests/ephemeral_eviction.test.ts`)**: Verifying TTL expiration and Jellyfin session protection.
4. **Stream Promotion (`apps/api/tests/stream_promotion.test.ts`)**: Verifying HTTP ingestion into staging and handoff to the file system service.
5. **Web UI Components (`apps/web/tests/StreamButtons.test.ts`)**: Verifying rendering of "Stream Now" vs "Download" based on cache status and private tracker flags.

### Prior Art in Codebase

- `apps/api/tests/discovery.test.ts`: Fastify injection testing for external provider aggregation.
- `apps/api/tests/cleanup.test.ts`: Time-based eviction testing against storage policies.
- `apps/api/tests/prowlarr.test.ts`: Indexer query mocking and scoring verification.

---

## Out of Scope

- Standalone Stremio Web UI deployment (`stream.lalamovies.stream` as a third-party app).
- Ephemeral streaming for the `Private` media type (strictly airgapped to local qBittorrent).
- Ingesting private tracker torrents into Real-Debrid.
- Multi-tenant Real-Debrid API keys (single centralized key used; clients proxy through Jellyfin).
- P2P torrent seeding for files promoted via debrid HTTP ingest.

---

## Further Notes

- Guided by **ADR 0012** (`docs/adr/0012-dual-tier-ephemeral-streaming-with-real-debrid.md`).
- Domain terms defined in [CONTEXT.md](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/CONTEXT.md): `Ephemeral Stream`, `Stream Library`, `Stream Promotion`, `Debrid Provider`, `Private Tracker Airgap`.
