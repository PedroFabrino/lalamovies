# Specification: Runtime Feature Flags & Subsystem Kill Switches

## Problem Statement

As the Media Download Manager has grown, it has incorporated multiple automated background and user-facing subsystems, including Ephemeral Streaming (via Real-Debrid and WebDAV), Up Next episodic tracking, curated Discovery Feed, automated Waitlist scraping via Prowlarr, automated disk cleanup, manual and batch torrent downloads, and Discord webhook notifications.

When an upstream dependency fails or undergoes maintenance (for instance, Real-Debrid rate limits, Prowlarr indexers experiencing downtime, Discord webhook spam, or local disk space warnings), administrators currently have no mechanism to selectively disable problematic features on the fly. To mitigate issues, administrators must shut down entire Docker containers or manually alter environment variables and restart services, disrupting users who are actively watching or browsing unaffected features.

## Solution

A centralized, full-stack **Feature Flags & Kill Switches** management subsystem embedded directly into the Admin Panel (mdm-api and @mdm/web). Administrators can toggle 9 core application subsystems on and off with zero downtime and instant effect.

When a feature is disabled:
- The backend API hard-guards all associated endpoints, responding with HTTP 503 FEATURE_DISABLED.
- Connected browser clients dynamically update via WebSocket: dashboard shelves collapse, navigation links are greyed out, and direct URL navigation to disabled features safely redirects to the Dashboard.
- Background workers (such as the Watcher service) enter a Coordinated Pause state, avoiding unnecessary network traffic and tracker scraping.
- High-impact operational flags (Automated Cleanup, Manual Torrents, Streaming) require explicit confirmation modals explaining the risks before switching off.
- Changes are audited silently in the database without noisy public alerts.

## User Stories

1. As an admin, I want a dedicated 'Feature Flags' section in the Admin Panel, so that I have a single control room to monitor and toggle all system capabilities.
2. As an admin, I want to see flags grouped into clear categories ('Content & Discovery', 'Downloads & Torrents', 'Automation & System'), so that I can quickly locate relevant controls during an incident.
3. As an admin, I want each flag to display its operational status (Active vs Disabled), human-readable description, and last updated timestamp/user, so that I have full operational visibility.
4. As an admin, I want to disable Ephemeral Streaming if the Debrid provider is experiencing an outage, so that users do not encounter failed playback errors.
5. As an admin, I want existing ready streams to play out their natural 24-hour expiration when Streaming is disabled, so that ongoing playback sessions are not abruptly cut off.
6. As an admin, I want to disable the Discovery Feed or Up Next shelf if TMDB or tracker scrapers are slow, so that the dashboard loads smoothly without hanging.
7. As an admin, I want to disable the Waitlist if indexers are down, so that the Watcher stops flooding trackers with queries.
8. As an admin, I want to disable Manual Torrent Submissions if qBittorrent or the host storage disk is unresponsive, so that failed downloads do not pile up.
9. As an admin, I want to disable Batch Uploads independently of single downloads, so that heavy staging operations can be halted during disk pressure.
10. As an admin, I want to disable Automated Cleanup if an edge-case deletion issue is suspected, so that disk media is safeguarded while investigating.
11. As an admin, I want to disable Discord Notifications if a webhook loop occurs, so that channels are not spammed.
12. As an admin, I want to disable User Invites during maintenance windows, so that new user registrations are temporarily suspended.
13. As an admin, I want an explicit confirmation modal before disabling high-impact flags (Automated Cleanup, Manual Torrents, Streaming), so that I do not accidentally trigger severe system degradation.
14. As an admin, I want low-impact flags (Discovery Feed, Up Next) to toggle with 1-click optimistic responsiveness, so that cosmetic adjustments are effortless.
15. As an admin, I want flag state changes to be silently recorded in the database without public Discord notifications, so that operations remain confidential.
16. As a user, I want dashboard shelves (Discovery Feed, Up Next, Active Streams) to hide smoothly when their corresponding feature is disabled, so that I don't see broken widgets.
17. As a user, I want navigation links for disabled features to appear greyed out with clear tooltips, so that I understand why the page is temporarily unavailable.
18. As a user, I want direct URL visits to a disabled feature page to redirect to the Dashboard with an informative toast, so that I am not stuck on a broken route.
19. As a user, I want existing downloaded and streaming media to remain accessible even when new submissions are disabled, so that my viewing experience is uninterrupted.
20. As a developer, I want all mutating API endpoints to be protected by a reusable equireFeature guard, so that future endpoints are easily secured.

## Implementation Decisions

- **Architecture & Service Placement**: Managed entirely inside the primary API (mdm-api) and persisted in the primary SQLite database (pp.db). No standalone mdm-feature-flags microservice will be created, preventing unnecessary container overhead and network hops.
- **Database Schema**: A dedicated eature_flags table storing:
  - id (text primary key, e.g. 'streaming', 'waitlist')
  - 
ame (text, e.g. 'Ephemeral Streaming')
  - description (text)
  - category (enum: 'discovery', 'downloads', 'automation')
  - enabled (boolean, default 	rue)
  - updated_at (ISO timestamp text)
  - updated_by_user_id (foreign key to users.id)
- **Default Seeding**: On initial startup, a migration seeds all 9 flags with enabled: true.
- **API Guard**: A Fastify middleware decorator equireFeature(flagId) returning HTTP 503 FEATURE_DISABLED when an endpoint's feature is inactive.
- **Public Bootstrap Endpoint**: GET /api/features returns a public dictionary { [id: string]: boolean } consumed by client routing and bootstrap logic.
- **Real-Time Synchronization**: When an admin toggles a flag, mdm-api emits a eature_flags_updated WebSocket event containing the updated state dictionary.
- **Coordinated Pause**: mdm-watcher inspects flag state before executing Prowlarr polling loops; if waitlist is disabled, the cycle sleeps to prevent tracker load.
- **Frontend Navigation & Degradation**: Navigation bar renders disabled routes as disabled (opacity-40 cursor-not-allowed). Vue router guard intercepts direct navigation to disabled routes and redirects to /dashboard.
- **Admin UI**: Tab 4 in AdminView.vue with categorized feature cards, toggle switches, and a confirmation modal for high-impact flags.

## Testing Decisions

- **Test Quality Standard**: Tests must evaluate external system behavior, response codes, and component rendering without relying on internal function mocks.
- **Backend API Tests (pps/api/tests)**:
  - Verify eature_flags table seeding and CRUD updates via pp.inject().
  - Verify that guarded endpoints return HTTP 503 FEATURE_DISABLED when flags are toggled off, and HTTP 200/201 when enabled.
  - Verify that GET /api/features returns correct public state.
- **Worker Tests (pps/watcher/tests)**:
  - Verify that watcherPoller skips execution when waitlist is marked disabled.
- **Frontend Tests (pps/web/tests)**:
  - Verify useFeatureFlags composable reacts to WebSocket updates.
  - Verify Navbar.vue renders greyed-out links when a feature is disabled.
  - Verify router navigation guards intercept direct visits to disabled routes.
  - Verify AdminView.vue feature flag toggling and confirmation modal triggers.

## Out of Scope

- User-specific or role-specific feature gating (flags apply globally across all non-admin users).
- Percentage-based rollout or A/B testing (flags are purely binary kill switches).
- Third-party feature flag SaaS integration (LaunchDarkly, Unleash, etc.).
- Modifying Jellyfin core streaming server behavior beyond our application's virtual mount and links.

## Further Notes

- Full domain definitions recorded in CONTEXT.md under **System Control & Resilience**.
- Architectural rationale and alternatives documented in docs/adr/0015-runtime-feature-flags-and-kill-switches.md.
