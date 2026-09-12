# Dual-Tier Media Architecture: Local Storage vs. Ephemeral Debrid Streams

We adopt a dual-tier media model: permanent and scheduled episodic media (TV, anime, keep-flagged movies) continue downloading to local disk storage managed by storage quotas and qBittorrent, while on-the-moment viewing requests mount instantly as zero-disk Ephemeral Streams in a dedicated `Stream` library via Real-Debrid, Zurg, and Rclone.

## Context

Users frequently desire immediate playback without waiting for multi-gigabyte torrent downloads, yet local disk space on the home server is strictly capped (150 GB quota). Furthermore, Real-Debrid strictly prohibits simultaneous streaming from multiple public IP addresses on a single account, precluding direct client-side debrid streaming from distributed friend households.

## Decision

1. **Dual-Tier Separation**:
   - **Tier 1 (Permanent / Curated)**: Scheduled series (Up Next, Waitlist) and flagged media download to local disk (`/media_data/media`) via qBittorrent, subject to Storage Quota and Cleanup Policies.
   - **Tier 2 (Ephemeral / Instant)**: On-the-moment requests are resolved through Real-Debrid's global cache and mounted via containerized `zurg` + `rclone` into `/media_data/stream`.
2. **Centralized Jellyfin Proxying**: All client streams route through Jellyfin (`watch.lalamovies.stream`) on the host's 1 Gbps connection. Real-Debrid only ever interacts with the server's single public IP, eliminating multi-IP account ban risks for friends.
3. **24-Hour Eviction with Session Guard**: Ephemeral streams are automatically unmounted and deleted from the Debrid account 24 hours after creation, guarded by a Jellyfin active playback check to avoid interrupting active viewers.
4. **Stream Promotion**: Users can promote any active Ephemeral Stream to a standard Download Request from the web dashboard, pulling the file to local permanent storage.

## Consequences

- The `Stream` library in Jellyfin requires containerized `zurg` and `rclone` WebDAV mounts in `docker-compose.yml`.
- Real-Debrid API keys are stored server-side in system configuration; clients never see or interact directly with the Debrid provider.
- `Private` media type (when implemented) is strictly airgapped to local qBittorrent downloads and forbidden from cloud debrid ingestion.
- **Private Tracker Airgap**: Releases originating from private indexers configured in Prowlarr are strictly forbidden from Debrid ingestion to prevent passkey leakage and tracker account bans. Ephemeral Streams are strictly limited to public indexer releases.
