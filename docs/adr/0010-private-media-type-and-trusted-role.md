# Private Media Type and Trusted Role

We needed a way for admins and a designated group to download and stream sensitive content that is completely invisible to regular users — on both the web dashboard and in Jellyfin. We introduced a `trusted` role (between `user` and `admin`) and a `private` Media Type that routes to a dedicated `/media/private` Jellyfin library restricted to `trusted` and `admin` users.

## Considered Options

**Role model**: A per-user whitelist was considered but rejected in favour of a named role (`trusted`) because it composes cleanly with the existing invite flow — the role is baked into the invite link at creation time, with no extra access-control table needed.

**Jellyfin library ID discovery**: Storing the ID in an env var or admin settings panel was rejected in favour of auto-discovery (`GET /Library/VirtualFolders` filtered by `/media/private` path) so that no copy-paste step is needed after creating the library in Jellyfin's UI.

**Cleanup**: Private requests always receive `keepFlag = true` at creation. Auto-expiring sensitive content that may never be "played" by the wider group would be a footgun; permanent immunity is the safer default.

**Notifications**: Private download completions are suppressed from the Discord webhook (a shared, public channel) and sent via email only to Admin and Trusted users. This preserves the invariant that regular users have zero awareness of Private content.
