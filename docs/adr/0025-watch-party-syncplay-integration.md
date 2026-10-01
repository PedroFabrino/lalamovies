# ADR-0025: Watch Party SyncPlay Integration & In-Place Timeline Progression

- **Status**: Accepted
- **Date**: 2026-10-01

## Context

Users want a shared "Watch Party" feature where friends can watch movies and episodic series together with synchronized playback (play, pause, seek, and buffering lock across all participants).

Two core technical approaches were evaluated:
1. **Custom Embedded Web Player in MDM**: Developing an embedded HLS/HTML5 video player inside `apps/web` with custom WebSockets for playback synchronization.
2. **Jellyfin SyncPlay Launch Bridge**: Leveraging Jellyfin Server's native `SyncPlay` engine to coordinate playback timestamps and buffer state, while MDM manages party discovery, room lifecycle, Discord announcements, and launch coordination.

Additionally, standard Watch Party implementations often force rooms to disband after a single video ends. For movie marathons or binge-watching episodic seasons, users require the ability to transition to the next movie or episode in-place without creating a new room or requiring participants to re-join.

Furthermore, Discord notifications across MDM (downloads, waitlist, watch parties) previously converged on a single webhook URL, creating noise in general community channels.

## Decision

### 1. Native Jellyfin SyncPlay Launch Bridge
- Utilize Jellyfin's built-in **SyncPlay** server subsystem as the authoritative referee for playback synchronization.
- MDM manages the application-level **Watch Party Room**, persists room state, handles user presence, and creates a designated SyncPlay group on Jellyfin (e.g. `🎉 Watch Party: <Title>`).
- When users click **"Join Watch Party"**, MDM launches Jellyfin directly to the target media item (`#!/details?id=<itemId>`) and presents a persistent guidance modal instructing them to select the named group from Jellyfin's SyncPlay menu (👥).
- Playback control defaults to **Democratic (Everyone)**, allowing any member to pause/resume/seek for the room, with an option for the Party Host to restrict controls to **Host Only**.

### 2. Eligible Media Scope
- Both **Permanent Library Media** (Movies, TV Shows, Anime) and **Active Ephemeral Streams** (24-hour cloud streams registered in Jellyfin's `Stream` library) are eligible for Watch Party sessions.

### 3. In-Place Media Switching & Discord Party Timeline
- A Watch Party Room supports **Party Timeline Progression**:
  - The Party Host can switch the active media at any time without disbanding the room.
  - For TV Shows and Anime, a 1-click **"Play Next Episode"** action advances the room to $E+1$.
  - For Movies, a **"Change Media"** library picker allows searching and selecting a new item.
- In Discord:
  - When media transitions, MDM updates the original announcement embed, marking the prior item as `[Finished]` with a timestamp.
  - A follow-up embed or message is appended directly below it showing `[Now Playing]` with the new poster and direct join link.
  - When the party ends, the active item is marked finished and the room status updates to `[Party Ended]`.

### 4. Context-Specific Discord Channel Routing
- Introduce hierarchical webhook routing for Discord notifications:
  - `DISCORD_WEBHOOK_URL_WATCH_PARTY`: Dedicated channel for Watch Party room announcements and timeline updates.
  - `WAITLIST_DISCORD_WEBHOOK_URL`: Dedicated channel for Waitlist and tracker discovery notifications.
  - `DISCORD_WEBHOOK_URL`: Global fallback for any category lacking an explicit channel webhook.

### 5. Room Persistence & Automated Cleanup
- Persist rooms in SQLite table `watch_party_rooms` in `apps/api/src/db/schema.ts` to survive server restarts and reliably manage Discord message updates.
- Rooms automatically close and clean up when empty (zero active participants) for 30 minutes, or when the Party Host explicitly ends the session.

## Consequences

**Good**:
- Eliminates the need to build and maintain a complex in-browser video player with audio track switching, subtitle rendering, and transcode profile negotiation.
- Works natively across Desktop, Mobile, and Smart TV / Leanback clients running Jellyfin.
- In-place media switching provides a frictionless marathon experience without link re-sharing.
- Discord channels remain organized through context-specific webhook routing.

**Trade-offs & Mitigations**:
- Jellyfin Web does not support direct URL query parameters to auto-join a SyncPlay group without user interaction; mitigated via clear in-app popovers and distinct named groups (`🎉 Watch Party: <Title>`).
