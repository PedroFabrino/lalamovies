# Multi-Use Revocable User Invites — Spec

## Problem Statement

The current invite system in Media Download Manager (MDM) is strictly single-use (1-to-1) and restricted to administrators:

1. **Single-Use Friction**: Each generated invite token can only be accepted by a single person before becoming permanently consumed (`usedAt`). To onboard a group of friends or a household, an administrator must manually generate, copy, and distribute individual invite links one by one.
2. **Artificial 48-Hour Lifespan**: Invites expire after 48 hours, causing links shared with busy friends or family to frequently expire before they complete registration.
3. **No User-Driven Referrals**: Non-admin users cannot invite their own friends or peers, requiring them to constantly petition the administrator to generate invite tokens.
4. **Lack of Attribution & Moderation**: The database does not track which user invited which new member. Administrators have zero visibility into referral lineages, making it impossible to determine who brought an abusive or unwanted account onto the server or revoke an active user's inviting privileges.

---

## Solution

Transform MDM's invite subsystem into a **Multi-Use, Long-Lived, Revocable Referral System**:

1. **Multi-Use Personal Invite Model**:
   - Each user maintains a single active personal invite link at a time that can be used by multiple friends (N-to-1).
   - Personal invites do not expire after 48 hours; they remain valid indefinitely until the creator explicitly revokes the link or generates a new one.
   - Generating a new invite link automatically invalidates/revokes the user's previous active link.
   - User-generated invites strictly grant the `'user'` role to protect private media boundaries (per ADR 0010, only administrators can grant `'trusted'`).

2. **Referral Attribution & Lineage Tracking**:
   - The `users` table records `invitedByUserId` and `inviteId` for every registered account.
   - The `invites` table tracks `revokedAt` timestamp, total successful registrations, and the list of accounts onboarded through each link.

3. **User-Facing Invite Modal**:
   - A prominent **"Invite"** button in the Navbar opens a lightweight modal (`UserInviteModal.vue`).
   - Displays the user's active personal invite URL with a one-click **"Copy Link"** button.
   - Shows the list of friends who registered using their link.
   - Features a **"Revoke / Generate New Link"** action with a confirmation prompt warning that friends using the old link will need the new one.

4. **Administrative Visibility & Moderation Controls**:
   - **Admin Users Tab**: Displays an **"Invited By"** column showing the inviter's username for all accounts.
   - **Admin Invites Tab**: Lists all server-wide invite links with their creator, usage count, active/revoked status, and onboarded users.
   - **Admin Revocation**: Administrators can revoke any user's active link directly.
   - **User Invite Ban**: An `invitesEnabled` flag (default `true`) on the `users` table allows administrators to revoke invite creation privileges from specific abusive users.

---

## User Stories

### User Referral Experience
1. As a regular user, I want an "Invite" button in the Navbar, so that I can easily find and share an invite link with my friends.
2. As a regular user, I want a single long-lived personal invite link that can be used by multiple friends, so that I do not need to request or generate a new link for every person I invite.
3. As a regular user, I want my invite link to remain active indefinitely, so that my friends can register whenever they have time without links expiring after 48 hours.
4. As a regular user, I want to see a list of friends who joined using my invite link in the Invite modal, so that I know who has successfully registered.
5. As a regular user, I want a "Revoke / Generate New Link" button in my Invite modal, so that I can immediately invalidate an old link if it was shared unintentionally and obtain a fresh one.
6. As a newly invited user visiting an invite link, I want to see a clean registration page, so that I can create my username and password and be logged in immediately.
7. As a newly invited user clicking an expired or revoked link, I want to see a clear message explaining that the invite was revoked by the creator, so that I know to ask my friend for a new link.

### Role Safety & Security
8. As a system operator, I want user-generated invites to always grant the standard `'user'` role, so that regular users cannot inadvertently grant `'trusted'` permissions or private media access to strangers.
9. As an administrator, I want to retain the ability to generate dedicated `'trusted'` single-use or multi-use invites, so that I can onboard vetted household members with elevated permissions.
10. As a system operator, I want all invite endpoints to respect the existing `user_invites` feature flag, so that invites can be globally halted in an emergency without code deployments.

### Administrative Visibility & Moderation
11. As an administrator viewing the Users table, I want to see an "Invited By" column for each user, so that I can immediately trace the referral lineage of any account.
12. As an administrator viewing the Invites tab, I want to see which user created each link and how many people registered through it, so that I have complete oversight over server growth.
13. As an administrator, I want to be able to revoke any user's invite link immediately from the Admin panel, so that I can neutralize leaked links.
14. As an administrator, I want the ability to toggle an `invitesEnabled` flag off for a specific user, so that I can permanently block abusive users from generating future invite links without banning their media playback access.

---

## Implementation Decisions

### Schema Extension (`apps/api/src/db/schema.ts`)
- Extend `users` table:
  - `invitedByUserId: text('invited_by_user_id').references(() => users.id, { onDelete: 'set null' })`
  - `inviteId: text('invite_id').references(() => invites.id, { onDelete: 'set null' })`
  - `invitesEnabled: integer('invites_enabled', { mode: 'boolean' }).notNull().default(true)`
- Extend `invites` table:
  - `revokedAt: text('revoked_at')` (nullable ISO timestamp)
  - `expiresAt: text('expires_at')` (nullable; null denotes an indefinite/permanent link)
  - Retain `usedAt` for backward compatibility with existing legacy single-use admin invites.

### Backend Endpoints (`apps/api/src/routes/invites.ts`)
- **`GET /invites/my-link`** (Authenticated):
  - Fetches the caller's active personal invite (where `createdByUserId = currentUser.id AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > now)`).
  - Returns `{ invite, url, invitedUsers: string[] }`.
- **`POST /invites`** (Authenticated, non-admin permitted, gated by `requireFeature('user_invites')`):
  - Validates `currentUser.invitesEnabled !== false` (returns `403 Forbidden` if disabled).
  - If caller is a non-admin, forces `role = 'user'`.
  - Automatically marks any previously active invite for `currentUser.id` as revoked (`revokedAt = now()`).
  - Generates a new cryptographically secure token with `expiresAt = null` (never expires).
  - Returns `201 Created` with `{ invite, url }`.
- **`POST /invites/:token/revoke`** (Authenticated):
  - Allows the creator or an admin to mark `revokedAt = new Date().toISOString()`.
- **`GET /invites/:token`** (Public):
  - Checks if invite exists, is not revoked (`revokedAt IS NULL`), and has not expired.
  - Returns `{ valid: boolean, creatorUsername, role, expiresAt }`.
- **`POST /invites/:token/accept`** (Public, gated by `requireFeature('user_invites')`):
  - Validates invite is active (`revokedAt IS NULL` and not expired).
  - For multi-use invites (where `expiresAt IS NULL`), does NOT lock or mark `usedAt`.
  - Creates Jellyfin user and local user record with `invitedByUserId: invite.createdByUserId` and `inviteId: invite.id`.
  - Returns `201 Created` with JWT session cookie.
- **`GET /invites`** (Admin only):
  - Returns all invites enriched with creator username, use count (`usageCount`), and list of registered usernames.
- **`PATCH /admin/users/:id/invites-permission`** (Admin only):
  - Toggles `invitesEnabled` for a target user.

### Web Client & UI Components
- **`UserInviteModal.vue`** (`apps/web/src/components/UserInviteModal.vue`):
  - Displays user's invite URL with one-click copy and feedback toast.
  - Displays list of invited friends who joined.
  - Offers "Revoke / Generate New Link" button with confirmation prompt.
  - Displays a warning banner if `currentUser.invitesEnabled === false`.
- **`Navbar.vue`**:
  - Adds an "Invite" action button with an icon next to the user profile area opening `UserInviteModal`.
- **`AdminUsersTab.vue`** / `AdminView.vue`:
  - Adds "Invited By" column in the Users table.
  - Adds toggle action for "Allow Invites" on user rows.
- **`AdminInvitesTab.vue`**:
  - Enriched with "Created By", "Uses Count", and "Invited Users" column, with global Revoke buttons.

---

## Testing Decisions

### Single Highest Seam: Fastify HTTP API Integration Tests
- **Module**: `apps/api/tests/user_invites_multi_use.test.ts`
- **Pattern**: Invokes endpoints via `app.inject()` against in-memory SQLite (`initDatabase(':memory:')`) with mocked Jellyfin service.
- **Coverage**:
  - Regular users can generate personal invite links; role is strictly forced to `'user'`.
  - Generating a new personal link revokes the user's previous link.
  - Multiple different accounts can register using the same invite token sequentially.
  - Both newly created accounts have `invitedByUserId` set to the inviter's user ID.
  - Registration fails with `400 Bad Request` if the token has been revoked.
  - Users with `invitesEnabled = false` receive `403 Forbidden` when attempting to generate a link.
  - Admin `GET /invites` returns usage count and invited users list.
  - Admin `GET /users` returns `invitedBy` creator attribution.

### Web Component Unit Tests
- **Module**: `apps/web/tests/UserInviteModal.test.ts`
- **Coverage**:
  - Renders active link, copies to clipboard, and renders list of invited friends.
  - Disables generation and shows alert when user has `invitesEnabled === false`.
  - Emits revoke and refresh events when user confirms link regeneration.

---

## Out of Scope

- Multi-level referral bonuses or gamification systems (simple attribution and accountability only).
- Temporary custom link aliases or personalized vanity URLs (tokens remain secure random hashes).

---

## Further Notes

- References ADR [`0001-jellyfin-as-auth-source-of-truth.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0001-jellyfin-as-auth-source-of-truth.md).
- References ADR [`0010-private-media-type-and-trusted-role.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0010-private-media-type-and-trusted-role.md).
