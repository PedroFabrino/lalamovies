# Media Download Manager — Spec

## Problem Statement

A small group of friends wants to watch movies, TV shows, and anime together without juggling multiple streaming subscriptions. Currently there is no shared place to request content, no visibility into what is being downloaded, and no automatic way to keep disk space under control. Content that has been watched sits on disk indefinitely, crowding out new requests.

## Solution

A self-hosted web application where trusted Users submit magnet links. The system downloads the content via qBittorrent, renames files using TMDB (movies/TV shows) or AniList (anime) metadata to match Jellyfin's naming conventions, surfaces the content in Jellyfin for streaming, and enforces a disk-space-based Cleanup Policy to remove unused content automatically. An Admin manages Users via Invite links and configures system behaviour. Real-time download progress is visible in a shared dashboard.

---

## User Stories

### Authentication & Onboarding

1. As an Admin, I want to generate a time-limited Invite link, so that I can give a friend access without creating their account manually.
2. As a prospective User, I want to open an Invite link and set my own password, so that I can create my account in one step.
3. As a User, I want to log in with my username and password, so that I can access the system.
4. As a User, I want my session to be remembered across browser restarts, so that I do not have to log in repeatedly.
5. As a User, I want to be automatically redirected to the login page when my session expires, so that I know I need to re-authenticate.
6. As an Admin, I want my Jellyfin account to be the same account I use in the web app, so that I manage one set of credentials.
7. As an Admin, I want to promote any User to Admin, so that I can delegate management responsibilities.
8. As an Admin, I want to deactivate a User, so that they can no longer submit Download Requests or log in.

### Submitting a Download Request

9. As a User, I want to paste a magnet link and select a Media Type (Movie, TV Show, or Anime), so that the system knows how to categorise and name the content.
10. As a User, I want the system to search for the title automatically from the magnet name, so that I do not have to type it manually.
11. As a User, I want to see the top 5 Metadata Match candidates with poster, title, and year, so that I can confirm the correct one.
12. As a User, I want to select the correct Metadata Match before the download starts, so that the file is named correctly for Jellyfin.
13. As a User, I want to be told immediately if there is not enough disk space to accept my request, so that I understand why it was rejected.
14. As a User, I want to know when my Download Request has been queued (but not yet started) because the concurrent download limit is reached, so that I know it will start automatically when a slot opens.
15. As a User, I want to submit a Season Pack as a single Download Request, so that all episodes move to the Library together without manual intervention.

### Tracking Download Progress

16. As a User, I want to see a live dashboard of all Download Requests with their current status, so that I know what is being downloaded.
17. As a User, I want to see the download percentage, speed, and estimated time remaining for active downloads, so that I can plan when content will be available.
18. As a User, I want Download Request statuses to update in real time without refreshing the page, so that I always see the current state.
19. As a User, I want to see a status badge for each Download Request (queued, downloading, seeding, done, error, deleted), so that the state is immediately clear at a glance.
20. As a User, I want to receive a Discord notification when my Download Request finishes downloading, so that I know content is ready to watch without checking the dashboard.

### Watching Content

21. As a User, I want downloaded Movies to appear in Jellyfin's Movies library automatically after the download completes, so that I can watch them without any manual setup.
22. As a User, I want downloaded TV Show seasons to appear in Jellyfin under the correct show and season, so that episodes are organised correctly.
23. As a User, I want downloaded Anime to appear in Jellyfin's Anime library with correct episode numbering, so that I can watch in order.
24. As a User, I want the content to be available in Jellyfin as soon as the download completes, without waiting for a manual library scan.

### Cleanup & Disk Management

25. As an Admin, I want the system to warn me via Discord when a Download Request is scheduled for automatic deletion 24 hours in advance, so that I can intervene if the content should be kept.
26. As an Admin, I want the system to automatically delete the least-recently-played content first when disk space falls below 20%, so that new requests can keep being accepted without me manually managing disk space.
27. As an Admin, I want new Download Requests to be rejected automatically when disk space is below 15%, so that the system never runs completely out of space.
28. As an Admin, I want to mark any Download Request with a Keep Flag, so that it is never automatically deleted.
29. As an Admin, I want to manually trigger a Cleanup for any individual Download Request, so that I can free up space immediately without waiting for the nightly policy.
30. As a User, I want to be notified via Discord when content I requested has been cleaned up, so that I know it is no longer available.
31. As an Admin, I want to see which Download Requests are Cleanup candidates (below the disk threshold, not Keep-flagged), sorted by Cleanup priority, so that I can make informed manual decisions.

### Admin Controls

32. As an Admin, I want to configure the concurrent download limit (default: 2), so that I can tune bandwidth usage.
33. As an Admin, I want to set the disk free-space thresholds (default: warn at 20%, reject at 15%), so that I can adapt to my server's capacity.
34. As an Admin, I want to configure the Discord webhook URL, so that notifications are sent to our shared channel.
35. As an Admin, I want to configure the TMDB API key, so that movie and TV show metadata lookups work.
36. As an Admin, I want to see a list of all Users with their roles and registration date, so that I can manage the group.
37. As an Admin, I want to revoke any outstanding Invite link that has not yet been used, so that I can rescind access if plans change.

---

## Implementation Decisions

### System Shape

- The system is a monorepo with two deployable units: a **Fastify** (Node.js/TypeScript) backend and a **Vue 3 + Vite** frontend. They communicate over a REST API and a WebSocket connection.
- The backend runs on a local machine or home server inside Docker Compose, alongside qBittorrent, Jellyfin, and a Cloudflare Tunnel container.
- The frontend is deployed to Vercel and reaches the backend exclusively via the Cloudflare Tunnel URL.

### Auth

- Jellyfin is the identity provider. The backend proxies login credentials to Jellyfin's `AuthenticateByName` endpoint and issues its own short-lived JWT (httpOnly cookie) on success. No passwords are stored in the app database.
- The Invite flow calls the Jellyfin `Users/New` API atomically with creating the local User record. If the Jellyfin call fails, the local record is not persisted (and vice versa via rollback).
- The first User to log in after the Invite is accepted is automatically assigned the `admin` role if no admin exists yet.
- Role (`user` | `admin`) is stored in the app's SQLite database, not in Jellyfin.

### Download Request State Machine

```
queued -> downloading -> hardlinking -> seeding -> [manual or auto cleanup] -> deleted
                                                 \-> error
```

- `queued`: torrent not yet added to qBittorrent (concurrent slot unavailable).
- `downloading`: torrent active in qBittorrent.
- `hardlinking`: download complete, Hardlink Move in progress.
- `seeding`: Hardlink Move done, content visible in Jellyfin, qBittorrent still seeding.
- `deleted`: files removed from Library and Staging Area, torrent removed from qBittorrent.
- `error`: any unrecoverable failure (stored with an error message).

### File System

- The Staging Area and all Library paths must reside on the same filesystem volume so that hardlinks work. Docker Compose mounts a single host volume covering all of `/downloads/staging` and `/media`.
- Naming conventions:
  - Movie: `{title} ({year})/{title} ({year}).{ext}`  under `/media/movies`
  - TV Show: `{show}/{Season XX}/{show} S{XX}E{XX}.{ext}` under `/media/shows`
  - Anime: `{title}/{Season XX}/{title} S{XX}E{XX}.{ext}` under `/media/anime`
- Season Packs: the entire season folder is moved as a unit.

### Metadata

- TMDB API is used for Movie and TV Show Metadata Matches. The API key is stored in `system_config`.
- AniList GraphQL API is used for Anime Metadata Matches. No API key required.
- The backend guesses a search title from the magnet display name by stripping release-group patterns, resolution tags, and codec suffixes.
- The user must confirm a Metadata Match before the Download Request is created; there is no automatic match acceptance.

### Cleanup Policy

- A nightly cron job (2 AM) checks disk usage. If free space is below 20%, it selects Cleanup candidates in priority order: least-recently-played first (last-played timestamp sourced from Jellyfin's play history API), then oldest Download Request first. Keep-flagged items are excluded.
- For each candidate, a 24-hour Discord Notification is sent. After 24 hours the Cleanup executes: files removed, torrent stopped and deleted, Jellyfin library rescanned, record status set to `deleted`.
- On any new Download Request, disk is checked before queueing. If below 15% free, the request is rejected with a user-visible error message.

### Notifications

- A `NotificationService` interface defines a single `send(event, payload)` method.
- The Discord implementation POSTs an embed to the configured webhook URL.
- A Resend email implementation is stubbed (logs to console) and is ready to activate by providing a `RESEND_API_KEY`. Notification events: `download.completed`, `cleanup.scheduled` (24h warning), `cleanup.done`.

### Database

- SQLite via Drizzle ORM. Single file at a configurable `DATABASE_PATH`.
- Four tables: `users`, `invites`, `download_requests`, `system_config`.
- The app runs as a single process (no horizontal scaling) to avoid SQLite concurrent-writer limits.

### Real-time Progress

- The backend polls qBittorrent every 2 seconds for active torrent status and broadcasts updates to all connected WebSocket clients.
- The frontend subscribes on the dashboard page and updates progress bars without a page refresh.

---

## Testing Decisions

### What makes a good test

Tests verify **external behaviour** — what the API returns, what state changes in the database, what calls are made to external services — not internal implementation. Tests must not depend on specific file paths, class names, or private methods.

### Seams

- **API routes** (Fastify test injection): the highest and most valuable seam. Tests POST/GET to route handlers with mocked `JellyfinService`, `QBittorrentService`, `MetadataService`, `FileSystemService`, and `NotificationService`. Assert on HTTP status, response body, and DB state.
- **CleanupService** (unit, pure-ish): inject a fake disk-usage reporter and a pre-seeded DB. Assert on which items are selected for cleanup, in what order, and what calls are made to the notification and qBittorrent mocks.
- **FileSystemService** — `buildLibraryPath` (pure unit): test all three Media Types and the Season Pack variant. No filesystem interaction; the function is pure.
- **MetadataService** — `extractTitleFromMagnet` (pure unit): table-driven tests with real-world magnet name examples.

### Prior art

This is a greenfield project. Use Fastify's built-in `inject` method for route-level tests. Use `vitest` as the test runner across both packages.

---

## Out of Scope

- Email notifications (interface is stubbed but not active)
- Per-user download quotas
- Automatic torrent discovery (RSS feeds, Sonarr/Radarr integration)
- Subtitle downloading
- Transcoding configuration
- Multiple simultaneous media servers
- Mobile native app
- Torrent search (user must provide the magnet link themselves)
- Multiple admin approval tiers
- Usage analytics or watch-history reporting
