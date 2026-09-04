# Jellyfin as Auth Source of Truth

The web app authenticates users by proxying credentials to Jellyfin''s ``POST /Users/AuthenticateByName`` endpoint rather than maintaining a separate identity provider (e.g. Firebase, Supabase Auth). Since every User must have a Jellyfin account to use the media server anyway, Jellyfin is the single account store. The web app holds no passwords; it uses the returned Jellyfin access token to issue its own short-lived JWT for API calls.

## Considered Options

- **Firebase / Supabase Auth** — rejected because it would require two separate account systems with no native bridge to Jellyfin user management. Friends would need separate credentials for the web app and Jellyfin.
- **Jellyfin SSO plugin (OIDC)** — valid upgrade path, but adds operational complexity (plugin installation, OIDC provider config) that is not justified at current scale.

## Consequences

- The Invite flow must call Jellyfin''s ``POST /Users/New`` API to create the account before the web app user record is persisted. If the Jellyfin call fails, the invite is rolled back.
- Admins are Jellyfin admins. Role elevation in the web app must mirror Jellyfin''s admin flag, or be tracked separately in the app''s SQLite DB.
- Migrating to a standalone IdP later requires a user-migration script to move credentials out of Jellyfin.
