# ADR-0027: Jellyfin SyncPlay Token Authentication, Canonical Handoff & Cross-Platform TV Bridge

- **Status**: Accepted
- **Date**: 2026-10-01

## Context

During production verification of the Watch Party feature (ADR-0025, #202), three critical runtime discrepancies were identified:

1. **Jellyfin SyncPlay Authorization Failure**: Calling Jellyfin Server's `POST /SyncPlay/New` with a server API key crashes with `System.ArgumentException: Guid can't be empty (Parameter 'id') at Jellyfin.Server.Implementations.Users.UserManager.GetUserById`. Jellyfin's `SyncPlayAccessPolicy` strictly requires a real user identity issued from user authentication (`/Users/AuthenticateByName`), not a headless server API key.
2. **Relative URL Routing Defect**: The web client launched Jellyfin using relative hash paths (`#!/details?id=<itemId>`), navigating to `https://lalamovies.stream/dashboard#!/details` on the MDM domain instead of the canonical Jellyfin Web instance (`https://watch.lalamovies.stream/web/index.html#!/details?id=<itemId>`).
3. **Missing Deep-Link Route (`/party/:id`)**: Discord announcements generated shareable URLs to `${FRONTEND_URL}/party/${roomId}`, but Vue Router lacked a matching route, silently falling through to the dashboard catch-all.
4. **Cross-Platform TV SyncPlay Reality**: Active Jellyfin session inspection confirmed the user's TV client is **Swiftfin on Apple TV (tvOS)**. Swiftfin lacks SyncPlay client capabilities and reports `SupportsRemoteControl: false`. Other TV platforms (Roku, older Android TVs) similarly lack native SyncPlay group discovery.

## Decision

### 1. Authenticated User Token Storage for SyncPlay
- Add `jellyfin_access_token` column to the `users` SQLite table.
- When users authenticate via `POST /auth/login` using their Jellyfin credentials, capture and store the returned `AccessToken`.
- When provisioning a SyncPlay group in `POST /watch-parties`, retrieve the Party Host's `jellyfin_access_token` and supply it as `X-Emby-Token` to Jellyfin's `/SyncPlay/New`.
- If a Party Host lacks a stored token (e.g. session established prior to this update), present a 1-field seamless password prompt to refresh their Jellyfin token without terminating their MDM session.

### 2. Canonical Backend-Driven Jellyfin Launch URL
- The API includes `jellyfinWebUrl` on every `WatchParty` response:
  `${JELLYFIN_PUBLIC_URL}/web/index.html#!/details?id=${party.jellyfinItemId}`
- All frontend launch actions (`SyncPlayBridgeModal`, `WatchPartyLobbyModal`, stream cards) consume `party.jellyfinWebUrl` directly rather than constructing relative URLs.

### 3. Dedicated `/party/:id` Route & Auto-Lobby State
- Register `/party/:id` in `apps/web/src/router/index.ts`.
- When navigated:
  - If the room is **active**: Loads the application and immediately opens `WatchPartyLobbyModal` for that room.
  - If the room is **ended** or missing: Redirects to `/dashboard` with an informative toast: *"This watch party has ended. You can start a new party from the dashboard."*
  - If unauthenticated: Redirects to `/login?redirect=/party/:id`.

### 4. Cross-Platform TV Guidance & AirPlay Launch Bridge
- In `WatchPartyLobbyModal` and `SyncPlayBridgeModal`, incorporate a dedicated **"Watching on TV?"** section.
- For Apple TV / Swiftfin and non-SyncPlay devices, provide a 1-click **"Open Web & AirPlay"** action with clear instructions to open Jellyfin Web on phone, tablet, or laptop and tap AirPlay/Cast to mirror the synchronized stream to the television.

## Consequences

**Good**:
- Fixes the root-cause 400 error in Jellyfin SyncPlay group creation, establishing legitimate server-side SyncPlay rooms.
- Eliminates 404s and domain confusion by standardizing canonical Jellyfin URLs at the API layer.
- Enables shareable Discord links to work end-to-end.
- Provides a realistic, verified path for Apple TV and smart TV users to participate in synchronized sessions.

**Trade-offs**:
- Requires a database migration to add `jellyfin_access_token` to `users`.
- Users must AirPlay from a secondary device when using Apple TV / Swiftfin due to upstream client limitations.
