# Watch Party SyncPlay Integration and In-Place Party Timeline — Spec

## Problem Statement

Users of the Media Download Manager currently watch media independently. When a group of friends wishes to watch a movie or binge an anime/TV season together, they face several friction points:
1. **Unsynchronized Playback**: Users must manually count down in chat ("3, 2, 1, play") and manually communicate every pause, seek, or buffer hiccup, frequently drifting out of sync.
2. **Duplicative Player Infrastructure**: Rebuilding a custom browser-based video player inside the web application introduces severe maintenance overhead around audio track switching, complex ASS/SSA subtitle rendering, and video transcode profile negotiation.
3. **Marathon Disruption**: Existing sync solutions force groups to disband after a single video file finishes, requiring friends to re-create the room and re-distribute invite links for every episode of an anime or TV series.
4. **Noisy Discord Notifications**: All system events (downloads, waitlist additions, and potential watch parties) share a single monolithic Discord webhook URL, cluttering community chat channels.

---

## Solution

Integrate a **Watch Party Launch Bridge** backed by Jellyfin Server's native **SyncPlay** subsystem, paired with **In-Place Media Switching** and **Context-Specific Discord Channel Routing**:

1. **Jellyfin SyncPlay Launch Bridge**:
   - MDM acts as the Watch Party coordinator: users create and join Watch Party Rooms from the web dashboard.
   - For each party, MDM provisions a named SyncPlay group on the Jellyfin server (e.g. `🎉 Watch Party: <Title>`) and establishes the room's playback control policy (Democratic vs Host-Only).
   - When users click "Join Watch Party", MDM launches their Jellyfin client directly to the media item (`#!/details?id=<itemId>`) and renders an in-app popover guiding them to select the room from Jellyfin's SyncPlay menu (👥).
   - Jellyfin server synchronizes playback timeline (play, pause, seek) and locks buffering across all connected players.

2. **Eligible Media Scope**:
   - Supports both **Permanent Library Media** (Movies, TV Shows, Anime) and **Active Ephemeral Streams** (24-hour instant streams registered in Jellyfin's `Stream` library).

3. **In-Place Media Switching & Discord Party Timeline**:
   - A single persistent Watch Party Room can transition between multiple media items without disbanding the group or requiring members to re-join.
   - For TV Shows and Anime, a 1-click **"Play Next Episode"** button advances the room to $E+1$.
   - For Movies and new shows, a **"Change Media"** library search modal allows the host to pick another item anytime.
   - In Discord, media changes update the existing party card, marking previous items as `[Finished]` and appending a follow-up card below for the `[Now Playing]` item, maintaining a clean chronological marathon timeline.

4. **Context-Specific Discord Channel Routing**:
   - Introduces hierarchical environment variables:
     - `DISCORD_WEBHOOK_URL_WATCH_PARTY`: Dedicated watch party channel.
     - `WAITLIST_DISCORD_WEBHOOK_URL`: Dedicated waitlist/tracker channel.
     - `DISCORD_WEBHOOK_URL`: Global fallback for any context lacking a dedicated webhook.

5. **Room Persistence & Automated Teardown**:
   - Rooms are persisted in SQLite (`watch_party_rooms`) to survive container restarts and manage Discord messages.
   - Rooms automatically clean up after 30 minutes of inactivity (zero active viewers) or upon explicit closure by the Party Host.

---

## User Stories

### Party Creation & Discovery
1. As a user, I want to create a Watch Party from any Movie, TV Show, Anime, or active Ephemeral Stream, so that I can easily host viewing sessions for my friends.
2. As a user, I want to see an "Active Watch Parties" shelf on the main dashboard showing live rooms, current title, poster, host, and viewer count, so that I can see what my friends are watching.
3. As a user, I want each Watch Party to have a 1-click shareable direct link (`/party/:id`), so that I can invite friends directly via instant messaging.
4. As a user, I want to configure whether playback control is democratic (everyone can pause/play) or restricted to the Party Host when creating a room, so that I can match the format to my group's size.

### Playback & Jellyfin Handoff
5. As a participant clicking "Join Watch Party", I want MDM to open Jellyfin directly to the target movie or episode, so that I don't have to search for the media manually.
6. As a participant joining a party, I want an in-app guidance modal clearly displaying the group name and instructing me to tap the SyncPlay icon in Jellyfin, so that I know exactly how to link my player.
7. As a participant in a democratic room, I want hitting pause or play in my Jellyfin player to pause or resume playback for everyone in the group, so that we remain synchronized when someone steps away.
8. As a participant in a host-only room, I want only the Party Host's pause/play/seek actions to affect the group timeline, so that accidental button presses from viewers do not interrupt the movie.
9. As a participant, I want to select my own preferred audio language and subtitle tracks independently in Jellyfin without altering other viewers' tracks, so that everyone can enjoy their personal accessibility settings.
10. As a participant with a slower internet connection, I want Jellyfin to automatically pause or nudge other participants when my player buffers, so that I never miss scenes due to network lag.

### In-Place Media Switching & Binge-Watching
11. As a Party Host watching an episodic anime or TV show, I want a 1-click "Play Next Episode" button in the party lobby, so that we can binge consecutive episodes without closing the room.
12. As a Party Host hosting a movie marathon, I want a "Change Media" search modal to select a new movie from the library or stream list, so that we can transition to another film seamlessly.
13. As a participant in a Watch Party, I want the room to stay open and keep all members connected when the host switches media, so that I don't have to find and join a new link.

### Discord Social Integration & Channel Routing
14. As an operator, I want to route Watch Party announcements to a dedicated Discord channel via `DISCORD_WEBHOOK_URL_WATCH_PARTY`, so that movie night chatter does not spam general download channels.
15. As an operator, I want specialized webhooks to fall back to `DISCORD_WEBHOOK_URL` if unset, so that single-channel setups work out of the box without extra configuration.
16. As a Discord community member, I want to see a rich announcement embed when a Watch Party starts showing the title, poster, host, control mode, and a direct "Join Watch Party" button.
17. As a Discord community member watching a marathon, I want the Discord message to mark the first movie as finished and post a follow-up card for the next movie, so that I can see the timeline of what was watched.
18. As a Discord community member, I want the Discord announcement card to update to "Party Ended" when the session finishes, so that I know the party is no longer active.

### Lifecycle & Teardown
19. As a Party Host, I want an "End Party" button to immediately close the room and delete the associated SyncPlay group on Jellyfin, so that I have full control over the session.
20. As a system operator, I want rooms that have had zero active participants for over 30 minutes to be automatically closed and cleaned up, so that stale rooms do not permanently linger on the dashboard.
21. As an administrator, I want Watch Party rooms to survive container restarts via SQLite storage, so that running viewing sessions and Discord message IDs are not orphaned.

---

## Implementation Decisions

### 1. Database Schema (`apps/api`)
- Introduce a new table `watch_party_rooms` in `apps/api/src/db/schema.ts`:
  - `id`: `text('id').primaryKey()` (UUID)
  - `hostUserId`: `text('host_user_id').notNull().references(() => users.id)`
  - `jellyfinGroupId`: `text('jellyfin_group_id').notNull()`
  - `jellyfinGroupName`: `text('jellyfin_group_name').notNull()`
  - `mediaType`: `text('media_type').notNull()`
  - `metadataId`: `text('metadata_id')`
  - `jellyfinItemId`: `text('jellyfin_item_id').notNull()`
  - `title`: `text('title').notNull()`
  - `seasonNumber`: `integer('season_number')`
  - `episodeNumber`: `integer('episode_number')`
  - `posterUrl`: `text('poster_url')`
  - `controlMode`: `text('control_mode', { enum: ['everyone', 'host_only'] }).notNull().default('everyone')`
  - `status`: `text('status', { enum: ['active', 'ended'] }).notNull().default('active')`
  - `discordMessageId`: `text('discord_message_id')`
  - `discordChannelId`: `text('discord_channel_id')`
  - `historyJson`: `text('history_json')` (JSON array of finished items with title, season, episode, completedAt)
  - `createdAt`: `text('created_at').notNull()`
  - `updatedAt`: `text('updated_at').notNull()`
  - `endedAt`: `text('ended_at')`

### 2. Jellyfin Service SyncPlay Extension (`apps/api`)
- Extend `IJellyfinService` and `JellyfinService` in `apps/api/src/services/jellyfin.ts`:
  - `createSyncPlayGroup(groupName: string, itemId: string, hostUserId: string): Promise<{ groupId: string }>`
  - `getSyncPlayGroup(groupId: string): Promise<SyncPlayGroupDetails | null>`
  - `setSyncPlayItem(groupId: string, itemId: string): Promise<void>`
  - `deleteSyncPlayGroup(groupId: string): Promise<void>`

### 3. Notification Service Channel Router (`apps/api`)
- Refactor `DiscordNotifier` / `NotificationService` in `apps/api/src/services/notifications.ts`:
  - Introduce `resolveDiscordWebhookUrl(context: 'default' | 'waitlist' | 'watch_party'): string | undefined`
  - Priority order:
    - Context `watch_party`: `process.env.DISCORD_WEBHOOK_URL_WATCH_PARTY || process.env.DISCORD_WEBHOOK_URL`
    - Context `waitlist`: `process.env.WAITLIST_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL`
    - Context `default`: `process.env.DISCORD_WEBHOOK_URL`
  - Add `sendWatchPartyAnnouncement(...)`, `updateWatchPartyTimeline(...)`, and `endWatchPartyNotification(...)`.

### 4. Watch Party API Routes (`apps/api/src/routes/watchParties.ts`)
- `POST /watch-parties`: Create a new party (provisions Jellyfin group, creates room, broadcasts to Discord).
- `GET /watch-parties`: List active watch parties for the dashboard shelf.
- `GET /watch-parties/:id`: Get full room state and media details.
- `POST /watch-parties/:id/switch-media`: Host switches media or advances episode; updates Jellyfin group, updates Discord timeline, emits WebSocket event.
- `POST /watch-parties/:id/end`: Host ends party; deletes Jellyfin group, marks Discord card ended, cleans up room.

### 5. Frontend Components & Views (`apps/web`)
- **`ActiveWatchPartiesShelf.vue`**: Top-priority shelf on `DashboardView.vue` displaying active parties with poster, title, host, member count, and "Join Party" button.
- **`CreateWatchPartyModal.vue`**: Modal to launch a party from any media card, library item, or active stream with control mode toggle.
- **`WatchPartyLobbyModal.vue`**: Modal opened when joining or viewing a room:
  - Displays party details, current item, and Party Timeline history.
  - "Launch in Jellyfin" primary CTA with guidance popover (👥 SyncPlay icon helper).
  - For host: "Play Next Episode" button and "Change Media" picker button, plus "End Party".

### 6. Background Teardown Job (`apps/api/src/jobs/watchPartyCleanup.ts`)
- Periodic job (running every 5 minutes) checking active rooms with 0 active viewers for > 30 minutes, or older than 12 hours, automatically transitioning them to `ended` and closing associated SyncPlay groups.

---

## Testing Decisions

### Good Test Principles
- Test observable behavior at the API and service boundaries without coupling tests to internal database structure or mock noise.
- External I/O (Jellyfin server REST endpoints, Discord webhook requests) mocked at HTTP transport boundaries.

### Test Coverage Plan
1. **Channel Router Tests** (`apps/api/tests/discord_channel_routing.test.ts`):
   - Resolves dedicated webhook for `watch_party` when configured.
   - Falls back to `DISCORD_WEBHOOK_URL` when dedicated webhook is unset.
   - Suppresses dispatch gracefully when no webhook is configured.
2. **Watch Party Lifecycle Integration Tests** (`apps/api/tests/watch_parties.test.ts`):
   - `POST /watch-parties` provisions room, records host, and calls Jellyfin SyncPlay API.
   - Host-only vs Democratic permissions enforced properly.
   - `POST /watch-parties/:id/switch-media` updates active media, appends to `historyJson`, and updates Discord timeline embed.
   - Non-hosts attempting to switch media receive HTTP 403 Forbidden.
   - `POST /watch-parties/:id/end` deletes SyncPlay group and marks room ended.
3. **Web Component Tests** (`apps/web/tests/ActiveWatchPartiesShelf.test.ts`, `apps/web/tests/WatchPartyLobbyModal.test.ts`):
   - Renders active rooms with host badge and control mode icon.
   - Generates correct Jellyfin launch URL with media ID.
   - Shows host management controls (Play Next Episode, Change Media, End Party) only to the host.

---

## Out of Scope
- Custom in-browser video player development (delegated to native Jellyfin client).
- In-app text chat or voice call rooms (delegated to Discord / external voice).
- Cross-server federation (all participants must reside on the same Jellyfin host).

---

## UI Creation & Launch Bridge Addendum

### 1. UI Entry Points & Discoverability
- **Active Ephemeral Streams Shelf (`ActiveStreamsShelf.vue`)**:
  - Each ready stream card (`stream.status === 'ready'`) includes a `"🎉 Party"` button alongside `"▶ Watch"` and `"💾 Promote"`.
  - Clicking pre-populates `CreateWatchPartyModal` with the stream's title, Jellyfin item ID, and poster URL.
- **Active Watch Parties Shelf (`ActiveWatchPartiesShelf.vue`)**:
  - When `parties.length === 0`: Displays a slim purple call-to-action banner:
    `"🎉 Watch Parties: Watch movies & series in real-time sync with friends. [Host a Watch Party]"`
  - When `parties.length > 0`: Displays the active parties grid with a `"+ Host Party"` button in the shelf header.
- **Dashboard Top Action Bar (`DashboardView.vue`)**:
  - A primary `"🎉 Host Watch Party"` button next to `"Add Request"` when `featureFlags.isEnabled('watch_parties')`.

### 2. Media Selection & Creation Modal (`CreateWatchPartyModal.vue`)
- **Pre-Selected Media Mode**:
  - Displays media poster, title, and metadata preview card when triggered with an item.
- **Generic Launch Mode**:
  - Automatically loads and displays a selection dropdown of currently **Ready Ephemeral Streams** (`GET /streams`) and **Recent Completed Downloads** (`GET /requests` with completed status and Jellyfin items).
  - Includes a **Manual Item ID** fallback mode allowing manual entry of any Jellyfin Item ID/URL, Title, and Media Type.
- **Playback Control Mode**: Radio selection between **Democratic (👥)** and **Host Only (👑)**.

### 3. Immediate Post-Creation Player Handoff
- Submitting `"Launch Party"`:
  1. Calls `POST /watch-parties`.
  2. Opens Jellyfin in a new browser tab directly to the synchronized media (`/web/index.html#!/item?id=<jellyfinItemId>`).
  3. Displays the **SyncPlay Guidance Modal** showing the room name (`🎉 Watch Party: <Title>`) and instructing the host to tap the 👥 SyncPlay icon.
  4. Triggers shelf refresh so other users see the room immediately.

---

## Further Notes
- Users already authenticate via Jellyfin credentials (`/login`), ensuring 1:1 mapping between MDM user identities and Jellyfin user sessions.
