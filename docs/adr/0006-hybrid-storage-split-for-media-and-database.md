# Hybrid Storage Split for Media and Database

The Staging Area (`/downloads/staging`) and Library (`/media`) are mapped to host-mounted mechanical HDD storage (`D:\`), while the application SQLite database (`app.db`), Jellyfin configuration, and temporary transcode caches remain on high-IOPS NVMe SSD storage (`C:\`).

## Considered Options

- **Keep everything inside the Docker WSL2 named volume on SSD** — rejected: video downloads rapidly exhaust expensive SSD capacity and cause flash wear from heavy continuous torrent writes, while video streaming requires only sequential read speeds well within mechanical HDD capabilities.
- **Move the entire Docker WSL2 installation to HDD** — rejected: mechanical disk latency slows down SQLite queries, Jellyfin UI thumbnail browsing, and Docker build cycles.
- **Store the SQLite database on the HDD host mount** — rejected: SQLite WAL mode and cross-OS locking over Windows NTFS drvfs translation degrade responsiveness under concurrent torrent I/O.

## Consequences

- The host directory (`MEDIA_DATA_PATH`, defaulting to `D:/MediaServer/media_data`) houses both `downloads/staging` and `media/` on the same NTFS filesystem, ensuring atomic hardlinks continue to function without disk duplication.
- The SQLite database lives in a dedicated Docker named volume (`app_db`) on the SSD, ensuring sub-millisecond database queries.
- Host disk free space checks in `CleanupService` automatically measure the physical free blocks of the `D:\` drive mount.
