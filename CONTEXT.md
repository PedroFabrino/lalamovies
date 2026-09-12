# Media Download Manager

A self-hosted web application that lets a small trusted group of friends submit torrent magnet links, tracks the download lifecycle, integrates with a Jellyfin media server, and enforces disk-space-based cleanup policies.

## Language

### Requests & Lifecycle

**Download Request**:
A user-submitted magnet link paired with a confirmed Metadata Match and a Media Type. The unit of work tracked from submission through download, seeding, and eventual cleanup.
_Avoid_: job, task, item

**Metadata Match**:
The confirmed pairing of a Download Request with a canonical entry from TMDB (for Movies and TV Shows) or AniList (for Anime). Provides the title, year, and season/episode data used to rename files correctly. The user must confirm the match before the download begins.
_Avoid_: metadata lookup, search result

**Media Type**:
The classification a user assigns to a Download Request at submission time: ``Movie``, ``TV Show``, ``Anime``, or ``Private``. Determines the metadata source, destination Library path, and the Jellyfin library to which the content is added. Only Trusted and Admin users may submit or see requests of the ``Private`` type.
_Avoid_: content type, category

**Season Pack**:
A Download Request whose torrent contains multiple files for an entire season of a TV Show or Anime. Treated as a single request; all files move together to a season subdirectory under the Library.
_Avoid_: bulk download, multi-file torrent

**Episode Selection**:
A mode of Download Request for episodic media specifying an exact season and episode number, as an alternative to a Season Pack.
_Avoid_: single episode request, episode item

**Batch Submission**:
The submission of multiple torrent files simultaneously, parsed into individual Download Requests sharing a common Metadata Match or individually assigned metadata, confirmed together through a batch staging queue.
_Avoid_: multi-upload, bulk add

**Indexer**:
A torrent tracker or provider configured in Prowlarr queried for media releases.
_Avoid_: torrent site, tracker, provider

**Release Candidate**:
A torrent release entry returned by an Indexer for a Metadata Match, evaluated before selection into a Download Request.
_Avoid_: torrent match, search hit, result

**Release Scoring**:
The automated ranking applied to Release Candidates based on resolution, file size, and seeders to determine the default recommendation.
_Avoid_: sorting, filtering, ranking

**Discovery Feed**:
A curated, auto-refreshed dashboard showcase presenting newly released, healthy Release Candidates across Movies, TV Shows, and Anime paired with enriched Metadata Matches for 1-click submission.
_Avoid_: recommendations widget, trending list, suggestions

**Discovery Item**:
An individual entry within the Discovery Feed representing a high-health Release Candidate and its verified Metadata Match, eligible for fast-track submission directly to Step 3.
_Avoid_: recommendation card, trending item, suggestion

**Up Next Shelf**:
A personalized, top-priority dashboard section (labeled "Up Next" in the UI) that monitors episodic series (TV Shows and Anime) requested by the user within the last 90 days and surfaces the immediate next sequential episode or season pack once indexed on trackers.
_Avoid_: continue watching, episode tracker, watchlist

**Up Next Item**:
An entry within the Up Next Shelf representing a confirmed release for the immediate next un-downloaded episode (`E(max + 1)`) or next season of an active series in the user's history, configured for 1-click download.
_Avoid_: next episode card, upcoming episode

**Waitlist**:
A user's collection of Waitlist Entries for media that has not yet been released or is not yet available on trackers. Distinct from the Up Next Shelf: the Waitlist is a proactive, automated commitment made before any content has been downloaded, whereas the Up Next Shelf is a reactive recommendation derived from existing download history.
_Avoid_: watchlist, pre-order list, download queue

**Waitlist Entry**:
A single item in the Waitlist representing a user's intent to auto-download a specific Movie, TV Show season, or Anime season once a qualifying release appears. Progresses through lifecycle states (`pending_release`, `checking`, `notified`, `triggered`, `completed`, `rejected`, `cancelled`). Auto-download requires `score ≥ 100` and `seeders ≥ 10` — a stricter bar than the Discovery Feed — because the system acts autonomously on the user's behalf.
_Avoid_: watchlist item, queued download, anticipated release


### File System

**Staging Area**:
The filesystem directory (``/downloads/staging``) where qBittorrent writes active downloads. Files here are not visible to Jellyfin. The torrent client remains pointed at this directory while seeding.
_Avoid_: download folder, incomplete folder

**Library**:
A Jellyfin-managed filesystem directory organized by Media Type (``/media/movies``, ``/media/shows``, ``/media/anime``, ``/media/private``). Contains only completed, correctly-named media files. The source of truth for what Jellyfin serves.
_Avoid_: media folder, Plex library, collection

**Private Library**:
The Jellyfin library backed by ``/media/private``, visible only to Trusted and Admin users. Its Jellyfin library ID is auto-discovered at startup by scanning ``/Library/VirtualFolders`` for the entry whose path contains ``/media/private``. Regular users have no access to this library in Jellyfin and no awareness of it in the web app.
_Avoid_: secret folder, hidden library, restricted collection

**Hardlink Move**:
The operation that promotes a completed download from the Staging Area to the Library by creating a filesystem hardlink. Allows qBittorrent to continue seeding from the Staging Area path while Jellyfin reads the Library path with no disk duplication.
_Avoid_: copy, transfer, move

**Storage Quota**:
The configured maximum disk storage capacity (in gigabytes) allocated to the entire media stack (Staging Area + Library). Governs download scheduling and cleanup triggers independently of physical disk size.
_Avoid_: disk cap, hard drive limit, container size

### Users & Access

**User**:
An authenticated individual with a Jellyfin account provisioned via the Invite flow. Can submit Download Requests of type Movie, TV Show, or Anime, and view their status. Has no knowledge of or access to Private requests or the Private Library.
_Avoid_: member, account, viewer

**Trusted**:
A User with the ``trusted`` role. Can submit and view Private Download Requests in addition to all capabilities of a regular User. Sees only their own Private requests on the dashboard. Has access to the Private Library in Jellyfin. Cannot manage other users or generate Invites.
_Avoid_: power user, elevated user, moderator

**Admin**:
A User with the ``admin`` role. Can manage Users (including promoting roles), configure system settings, trigger manual Cleanup, modify the concurrent download limit, and generate Invites for any role. Sees all Private requests on the dashboard. Has access to the Private Library in Jellyfin.
_Avoid_: owner, moderator, superuser

**Invite**:
A time-limited, single-use link generated by an Admin. Carries a designated role (``user`` or ``trusted``) chosen at creation time. When accepted, it simultaneously creates a User record in the web app with that role and a corresponding Jellyfin account via the Jellyfin API, with Jellyfin library access configured to match the role.
_Avoid_: registration link, signup link

### Cleanup

**Cleanup**:
The process of removing media from disk, stopping the associated torrent in qBittorrent, and triggering a Jellyfin library rescan. Can be triggered manually by an Admin or automatically by the Cleanup Policy.
_Avoid_: deletion, purge, removal

**Cleanup Policy**:
The rules governing automatic Cleanup. Evaluated against the Storage Quota (with a secondary safety check on the host disk). Triggers automatic Cleanup when free quota falls below 20%. When free quota falls below 15%, incoming Download Requests are deferred in the ``queued`` state until space is freed. Priority: least-recently-played first, then oldest Download Request first. Items marked Keep are immune. A 24-hour Notification precedes any automatic deletion.
_Avoid_: retention policy, eviction policy

**Keep Flag**:
A marker an Admin can set on a Download Request to exempt it permanently from automatic Cleanup.
_Avoid_: pin, lock, favorite

### Notifications

**Notification**:
An alert dispatched via Discord webhook (and optionally Resend email) to inform users of significant events: download completion, impending automatic Cleanup (24 h before), and Cleanup completion. Notifications display enriched media headers (release year for Movies, season/episode for TV Shows/Anime) and direct users to content via the public Jellyfin streaming URL. **Exception**: Private download completions are never sent to Discord; they are dispatched via email only to the requester and all Admin/Trusted users.
_Avoid_: alert, message, event

### Environments & Infrastructure

**Production Stack**:
The primary, live Docker Compose deployment serving active users, downloading media to the host HDD Library, and persisting application state to the dedicated SSD volume.
_Avoid_: live container, host server, prod

**Development Stack**:
An isolated, secondary Docker Compose environment running parallel, non-conflicting instances of the core services (Fastify API, qBittorrent, Jellyfin) on dedicated alternate ports, with source code volume mounts and isolated host storage, used for safe feature development and integration testing without impacting the Production Stack.
_Avoid_: test container, local docker, staging container

**Watcher Service**:
A dedicated containerised background service (`apps/watcher/`) responsible for polling Prowlarr on behalf of active Waitlist Entries, evaluating release quality, dispatching auto-download requests to the main API, and sending grace-period notifications. Runs independently of the main API and persists its own state in a separate SQLite database. The main API proxies all Waitlist CRUD routes to the Watcher Service; the frontend is unaware of its existence.
_Avoid_: cron job, background worker, scheduler

### Ephemeral Streaming & Debrid

**Ephemeral Stream**:
A user-requested, zero-disk media item resolved via a Debrid Provider and mounted instantly to Jellyfin. Automatically evicted after 24 hours unless explicitly converted via Stream Promotion.
_Avoid_: instant watch, temporary download, stream item

**Stream Library**:
The dedicated Jellyfin library backed by the virtual WebDAV mount (`/media/stream`), separate from Movies, TV Shows, Anime, and Private. Houses only active Ephemeral Streams.
_Avoid_: ephemeral folder, zurg library, instant shelf

**Stream Promotion**:
The action of converting an active Ephemeral Stream into a standard Download Request, causing the media to be downloaded to local physical storage and hardlinked into a permanent Library.
_Avoid_: keep stream, save to disk, convert to download

**Debrid Provider**:
The external unrestricted multi-hoster/caching service (Real-Debrid) queried for instant torrent availability and WebDAV media streaming.
_Avoid_: stream host, multihoster, RD service

**Private Tracker Airgap**:
The security boundary enforcing that Release Candidates from private indexers configured in Prowlarr are strictly excluded from Debrid Provider ingestion and can only be downloaded via local qBittorrent, preventing passkey leakage and tracker account bans.
_Avoid_: tracker exclusion, private filter, debrid blocker

