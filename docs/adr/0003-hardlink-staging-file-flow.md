# Hardlink Staging for File Flow

Downloads land in a Staging Area (``/downloads/staging``) managed by qBittorrent. On completion, the app creates a filesystem hardlink in the appropriate Library path (``/media/movies``, ``/media/shows``, or ``/media/anime``) and triggers a Jellyfin library rescan. qBittorrent continues seeding from the Staging Area path. No data is duplicated on disk.

## Considered Options

- **Download directly into the Library** — rejected: torrent file names are typically unusable by Jellyfin (scene names, release group suffixes). Direct-to-library would require renaming while the file is still being written, which risks corruption and breaks seeding.
- **Copy then delete** — rejected: temporarily doubles disk usage, which is the opposite of the goal for a space-constrained home server.

## Consequences

- Hardlinks only work within the same filesystem/mount. The Staging Area and all Library paths must live on the same volume. Docker Compose must mount a single host volume covering all paths.
- When a Cleanup removes an item, the app must remove both the Library hardlink and the Staging Area entry (and instruct qBittorrent to remove the torrent) to fully free the inode.
