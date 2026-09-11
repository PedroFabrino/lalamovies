# Private Media Type & Trusted Role — Spec

## Problem Statement

All users currently see the same content on the dashboard and in Jellyfin. There is no way to download and stream content that should be invisible to the general user group — not on the dashboard, not in Jellyfin, and not in notifications. Admins have no mechanism to designate a trusted inner circle with elevated access, nor a private download category that bypasses the shared media space entirely.

## Solution

Introduce a `trusted` role (a middle tier between `user` and `admin`) and a `private` Media Type that routes completed downloads to a dedicated Jellyfin library (`/media/private`) visible only to Trusted and Admin users.

The feature has three interlocking parts:

1. **Trusted Role** — A new role baked into the Invite at creation time by an Admin. Trusted users can submit, view, and watch Private content. Regular users have zero awareness that Private content or the Trusted role exist.
2. **Private Media Type** — A fourth Media Type selectable only by Trusted and Admin users. Uses TMDB for metadata (skippable). Downloads land in `/media/private` with a flat folder structure (season/episode naming applied when metadata confirms episodic content). All Private requests are permanently Keep-flagged, making them immune to the Cleanup Policy.
3. **Jellyfin Access Control** — Jellyfin library access is managed programmatically via the Jellyfin API at invite acceptance and on role promotion. The Private Library ID is auto-discovered at startup by scanning Jellyfin's virtual folders for the `/media/private` path. Regular users are never granted access to the Private Library.

---

## User Stories

### Trusted Role & Invites

1. As an Admin, I want to choose the role (`user` or `trusted`) when generating an Invite link, so that a new member's access level is set before they ever log in.
2. As an Admin, I want invited Trusted users to automatically receive Jellyfin access to the Private Library when they accept their Invite, so I don't have to manually configure Jellyfin after each invite.
3. As an Admin, I want to promote an existing `user` to `trusted` in the admin panel, so that I can grant Private access to someone who was originally invited as a regular user.
4. As an Admin, I want Jellyfin library access to update immediately when I change a user's role, so that the Jellyfin app reflects the new permissions without requiring a re-login or manual step.
5. As an Admin, I want only Admins to be able to generate Invite links (regardless of role), so that Trusted users cannot add new members.
6. As an Admin, I want demoting a `trusted` user back to `user` to immediately revoke their Jellyfin Private Library access, so that role changes take effect at once.

### Private Download Requests — Submission

7. As a Trusted user, I want to see `Private` as a Media Type option in the submission form, so that I can submit content to the private library.
8. As a regular User, I want the submission form to show only `Movie`, `TV Show`, and `Anime`, so that I have no visibility into the existence of a Private category.
9. As a Trusted user submitting a Private request, I want TMDB metadata to be attempted automatically, so that titles and posters are enriched without extra steps.
10. As a Trusted user submitting a Private request, I want to be able to skip the TMDB metadata step and provide a title manually, so that content without a TMDB entry can still be downloaded.
11. As a Trusted user, I want Private requests to be permanently Keep-flagged at creation, so that they are never automatically cleaned up.

### Private Download Requests — Visibility

12. As a regular User, I want Private requests to be completely absent from my dashboard — no empty section, no placeholder — so that I have no awareness they exist.
13. As a Trusted user, I want to see only my own Private requests on the dashboard, so that other users' private activity remains confidential.
14. As an Admin, I want to see all Private requests on the dashboard, so that I have full oversight of the private library.
15. As a regular User, I want a direct URL to a Private request to return a 404 (not a 403), so that I cannot even confirm a Private request exists at that ID.

### File System & Jellyfin

16. As a Trusted user, I want completed Private downloads to land in `/media/private/Title (Year)/` (flat) by default, so that the folder structure is simple and uncluttered.
17. As a Trusted user submitting an episodic Private request, I want the file to be placed in `/media/private/Title (Year)/Season XX/Title SXXEXX.ext` when season and episode metadata is available, so that episodic private content is still neatly organised.
18. As an Admin, I want the `/media/private` directory to be created automatically at startup, so that there is no manual filesystem setup required beyond creating the Jellyfin library.
19. As an Admin, I want the system to automatically discover the Jellyfin Private Library ID by matching the `/media/private` path in Jellyfin's virtual folders, so that I don't have to copy-paste a library ID anywhere.
20. As an Admin, I want the system to log a clear warning at startup if the Jellyfin Private Library hasn't been configured yet, so that I know I need to create it in Jellyfin's UI.

### Notifications

21. As a Trusted user, I want to receive an email notification when my Private download completes, so that I know it is ready to watch.
22. As an Admin, I want to receive an email notification when any Private download completes (regardless of who requested it), so that I have full awareness of private library activity.
23. As a regular User, I want to receive no Discord or email notification when a Private download completes, so that I remain unaware of Private content.
24. As a Trusted user, I want Private download completions to never appear in the shared Discord webhook, so that the channel visible to all users contains no trace of Private content.

---

## Implementation Decisions

### Role Model

- The `users.role` column enum expands from `['user', 'admin']` to `['user', 'trusted', 'admin']`.
- The `invites` table gains a `role` column (`'user' | 'trusted'`, default `'user'`) persisted at invite creation time. On acceptance, the invited user is created with that role.
- Only Admins can generate Invites; Trusted users cannot.
- Role changes (user ↔ trusted ↔ admin) are performed by Admins via the existing admin panel and trigger an immediate Jellyfin policy sync.

### Private Media Type

- `download_requests.media_type` enum expands to include `'private'`.
- `metadataSource` for Private requests is always `'tmdb'`; AniList is not offered.
- All Private Download Requests are created with `keepFlag = true` and this flag cannot be unset via the UI.
- The submission form's Media Type selector is gated on role: `private` only renders for `trusted` and `admin` sessions.

### API Access Control

- Any route that reads, writes, or lists Download Requests of `mediaType = 'private'` requires `role = 'trusted'` or `role = 'admin'`. A `user`-role caller receives a 404 (not 401/403) on any private-type resource, including individual request lookups.
- The request list endpoint filters out `mediaType = 'private'` rows entirely for `user`-role callers. For `trusted`, it returns only the caller's own private rows. For `admin`, all private rows are returned.

### Jellyfin Library Access

- A new `discoverPrivateLibraryId()` method calls `GET /Library/VirtualFolders` and returns the `ItemId` of the library whose `Locations` array contains a path matching `/media/private`. The ID is cached in `system_config` as `jellyfin_private_library_id` after first discovery.
- A new `setUserLibraryAccess(jellyfinUserId, role)` method reads the user's current Jellyfin policy, then adds or removes the Private Library ID from `EnabledFolders` (with `EnableAllFolders = false` when restricting), and writes the updated policy back via `POST /Users/{userId}/Policy`.
- This method is called at two points: invite acceptance (new user) and admin role promotion (existing user).
- If `discoverPrivateLibraryId()` returns `null` (library not yet set up), `setUserLibraryAccess` is a no-op and a warning is logged. This is a soft failure.

### Filesystem

- `buildLibraryPath` gains a `'private'` branch:
  - No episode data → `/media/private/Title (Year)/Title (Year).ext`
  - Episode data present → `/media/private/Title (Year)/Season XX/Title SXXEXX.ext`
- `ensureDirectories` creates `/media/private` alongside the existing library directories at startup.
- Docker Compose volume mounts must include `/media/private` for both the API and Jellyfin containers.

### Notifications

- When a Private Download Request completes, the Discord webhook call is suppressed entirely.
- Resend email is sent to: the requester + all users with `role = 'admin'` or `role = 'trusted'` (fetched from the DB at notification time).
- Cleanup notifications (24h warning, completion) are irrelevant to Private requests because they are always Keep-flagged.

---

## Testing Decisions

Good tests verify observable external behaviour, not internal wiring. The three seams to test against are:

1. **Invite + Accept HTTP endpoints** — covers role-baking, user creation with correct role, and Jellyfin `setUserLibraryAccess` being called with the right arguments (Jellyfin HTTP mocked). A single integration test hitting both endpoints end-to-end is the right shape, following the pattern established by the existing invite flow tests.

2. **Request list + detail HTTP endpoints** — covers the "invisible to `user`" invariant. Test matrix: `user` role gets empty list and 404 on direct lookup; `trusted` gets own requests only; `admin` gets all. Prior art: the existing `requests.ts` route tests.

3. **`JellyfinService` unit tests** — covers `discoverPrivateLibraryId` (mock `GET /Library/VirtualFolders` response) and `setUserLibraryAccess` grant/revoke (mock `GET /Users/:id` policy + assert `POST /Users/:id/Policy` is called with correct `EnabledFolders` diff). Isolated from the rest of the stack. Prior art: existing `jellyfin.ts` service tests if present, otherwise new unit test file.

---

## Out of Scope

- AniList metadata for Private requests (TMDB only for now)
- Trusted users generating Invites
- Per-user whitelist for Private access (role-based only)
- Discord notifications for Private completions (email only)
- Automatic creation of the Jellyfin Private Library (must be created manually in Jellyfin UI; app auto-discovers its ID)
- Cleanup of Private requests (permanently Keep-flagged; manual admin deletion only)
- Trusted users seeing other Trusted users' Private requests

---

## Further Notes

- The first-time setup sequence is: (1) Admin creates `/media/private` library in Jellyfin's UI, (2) Restart the API (or wait for startup auto-discovery), (3) Generate Trusted invites — Jellyfin access is then configured automatically on accept. A README section should document this sequence.
- "Private" is the canonical display name for this Media Type in the UI (not "Secret" or "Restricted").
- The ADR for this feature is at `docs/adr/0010-private-media-type-and-trusted-role.md`.
