# Waitlist Feature and Watcher Service Architecture

We needed a way for users to express intent to download media that is not yet available on torrent trackers — unreleased movies, currently-airing seasons, and future seasons of ongoing series. We implemented a **Waitlist** backed by a dedicated **Watcher Service**: an independent containerised background service (`apps/watcher/`) that polls Prowlarr on behalf of active Waitlist Entries and submits downloads to the main API autonomously.

## Considered Options

**Separate service vs. main API extension**: Embedding the Waitlist poller inside `mdm-api` was the simpler path. We rejected it in favour of a separate `apps/watcher/` container because the polling workload (6-hour Prowlarr sweeps, TMDB date checks, Discord lifecycle management) is operationally independent of request handling — coupling them inside the API would complicate restarts, scaling, and future extraction. The Watcher Service has its own SQLite database (`watcher.db`) and its own container; the main API proxies all Waitlist CRUD routes to it internally so the frontend remains unaware of the split.

**Watcher ? main API communication**: The Watcher Service submits auto-downloads by calling `POST /requests/` on the main API with an `X-Service-Key` shared secret, rather than writing directly to the main database or enqueuing into qBittorrent itself. This keeps the main API as the single authoritative gateway for all download operations and avoids the Watcher needing knowledge of the main DB schema or qBittorrent internals.

**Quality gate for auto-downloads**: The Discovery Feed uses `score > 0 AND seeders = 10`. Auto-downloads use the stricter `score = 100 AND seeders = 10`. A score of 100 is only achievable by a release that is at minimum 1080p; anything lower (720p, 480p, unknown resolution) cannot reach the threshold. This floor exists because the system is acting on the user's behalf without confirmation — a 480p rip is worse than no rip.

**Grace window and rejection**: When a qualifying release is found, the system sends a Discord notification with a signed magic-link reject URL and waits 6 hours before submitting the download. After the window closes (triggered or rejected), the Discord message is deleted via the webhook message-delete API. This avoids requiring a Discord Bot and keeps notification channels clean. An optional `WAITLIST_DISCORD_WEBHOOK_URL` routes Waitlist notifications to a dedicated channel, separate from the main notification webhook.

**Episodic tracking**: For currently-airing series, the Waitlist Entry tracks remaining episodes in the current season using TMDB''s `episode_count` and `next_episode_to_air` fields as the stop condition. When a user downloads a Season Pack and checks "auto-download future seasons", the resulting Waitlist Entry for the next season only activates once TMDB records a confirmed premiere date — preventing phantom entries for series that may never be renewed.

**Up Next suppression**: A series with an active episodic Waitlist Entry is suppressed from the Up Next Shelf to prevent the same episode from being surfaced as both an automated download and a manual 1-click recommendation simultaneously.
