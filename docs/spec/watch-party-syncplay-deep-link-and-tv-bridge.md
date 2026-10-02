# Specification: Watch Party SyncPlay Token Auth, Deep Link & Cross-Platform TV Bridge

## Background & Problem Statement
During deployment and verification of the initial Watch Party feature (#202), three key operational gaps were identified:
1. **SyncPlay Server Rejection**: Jellyfin Server crashes when `/SyncPlay/New` is invoked using a headless server API key (`System.ArgumentException: Guid can't be empty (Parameter 'id') at UserManager.GetUserById`). Jellyfin requires a real user access token issued from user authentication.
2. **Relative URL Routing Defect**: The web client launched Jellyfin using relative hash paths (`#!/details?id=<itemId>`), navigating to `https://lalamovies.stream/dashboard#!/details` instead of the canonical Jellyfin Web instance (`https://watch.lalamovies.stream/web/index.html#!/details?id=<itemId>`).
3. **Missing Shareable Link Route**: Discord messages link to `https://lalamovies.stream/party/:id`, but Vue Router lacked a matching route, silently redirecting users to `/dashboard` without opening the lobby modal.
4. **Unsupported TV Client Sync**: The user's TV is an Apple TV running Swiftfin, which does not support SyncPlay and reports `SupportsRemoteControl: false`. TV users need a reliable AirPlay/casting workflow from Jellyfin Web.

## User Stories & Behavioral Requirements

### Jellyfin User Token & SyncPlay Provisioning
1. As a Party Host, when I create a Watch Party, MDM provisions a genuine SyncPlay group on Jellyfin using my authenticated user credentials so that the room appears on the Jellyfin server.
2. As an existing logged-in user whose session predates token storage, when I attempt to host a party without a stored token, MDM presents a quick password re-auth dialog rather than failing silently or kicking me out.
3. As a client consuming `/watch-parties`, I receive the canonical `jellyfinWebUrl` (`https://watch.lalamovies.stream/web/index.html#!/details?id=<itemId>`) directly on the party model.

### Deep Link & Discord Routing
4. As a participant clicking a Discord announcement link (`/party/:id`), I am directed to the MDM Dashboard with the `WatchPartyLobbyModal` automatically open for that room.
5. As a participant visiting an expired or ended party link, I am smoothly redirected to `/dashboard` with an informative toast stating the party has ended.
6. As an unauthenticated user clicking a party link, I am prompted to log in and subsequently returned to `/party/:id`.

### Cross-Platform TV Participation & Canonical Handoff
7. As a participant watching on desktop/mobile, clicking "Launch in Jellyfin" opens the canonical `https://watch.lalamovies.stream/web/index.html#!/details?id=<itemId>` in a new tab with the floating 2-step SyncPlay bridge guide open in MDM.
8. As a participant watching on an Apple TV (Swiftfin) or TV without native SyncPlay, I can click "Watch on TV (AirPlay)" to launch Jellyfin Web on my personal device and cast/AirPlay the synchronized stream to my TV.

## Implementation Architecture

### Slice 1: Backend Jellyfin User Token Storage, Migration, SyncPlay Provisioning & Canonical Launch URL
- **Schema & Migration**: Add column `jellyfin_access_token` (`text`) to `users` table in `apps/api/src/db/schema.ts` and generate migration.
- **Authentication**: Update `apps/api/src/routes/auth.ts` to save `authResult.accessToken` on `users` record.
- **SyncPlay Service**: Update `JellyfinSyncPlayService` to accept and use user access token for `/SyncPlay/New`, `/SyncPlay/List`, and `/SyncPlay/SetNewQueue`.
- **API Model**: Include `jellyfinWebUrl` on all `WatchParty` responses generated from `${JELLYFIN_PUBLIC_URL}/web/index.html#!/details?id=${jellyfinItemId}`.
- **Re-Auth Endpoint**: Add `POST /auth/jellyfin-token` to allow logged-in users to supply their password and store their Jellyfin token without full re-login.

### Slice 2: Shareable Discord Deep Link `/party/:id` & Auto-Lobby Routing
- **Vue Router**: Register `/party/:id` route in `apps/web/src/router/index.ts`.
- **Party Route Handling**: Introduce `PartyView.vue` (or handle in router/composable) to load room state by ID:
  - If active: open `WatchPartyLobbyModal`.
  - If ended or 404: redirect to `/dashboard` with toast *"This watch party has ended. You can start a new party from the dashboard."*
  - Handle `requiresAuth` with `redirect` query parameter.

### Slice 3: Canonical Jellyfin Web URL Handoff & AirPlay / Apple TV Cross-Platform Guidance
- **Web Launch Handoff**: Update `SyncPlayBridgeModal.vue`, `WatchPartyLobbyModal.vue`, `ActiveStreamsShelf.vue`, and `ActiveWatchPartiesShelf.vue` to use `party.jellyfinWebUrl`.
- **AirPlay & TV Guidance**: In `WatchPartyLobbyModal.vue` and `SyncPlayBridgeModal.vue`, add an expandable "Watching on Apple TV / Smart TV?" panel explaining the AirPlay workflow with a 1-click launch button.
- **Host Re-Auth Prompt**: In `CreateWatchPartyModal.vue`, detect missing Jellyfin token error (`JELLYFIN_TOKEN_REQUIRED`) and show seamless password prompt.

## Acceptance Criteria
- [ ] Jellyfin `/SyncPlay/New` successfully receives user access token and creates native group without Guid errors.
- [ ] `WatchParty` objects expose canonical `jellyfinWebUrl`.
- [ ] Visiting `/party/:id` opens `WatchPartyLobbyModal` for active parties and redirects with toast for ended ones.
- [ ] "Launch in Jellyfin" navigates to `https://watch.lalamovies.stream/web/index.html#!/details?id=<itemId>`.
- [ ] Modal presents clear AirPlay guidance for Apple TV / Swiftfin users.
- [ ] All unit and component tests pass; strict line count limits observed.
