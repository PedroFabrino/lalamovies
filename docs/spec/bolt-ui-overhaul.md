# Spec: Modern Cinema UI Overhaul (Bolt Prototype Adoption)

## Problem Statement

The current Media Download Manager frontend (`apps/web`) has grown organically over multiple feature expansions (ephemeral streaming, waitlist tiering, watch parties, subtitle picking, seasonal anime, and admin telemetry). While functional and covered by an extensive automated test suite, the interface uses an older single top-navbar layout, fragmented telemetry styles, inconsistent spacing, and lacks the visual polish of contemporary cinema streaming platforms (such as high-density metrics gauges, cohesive status pill treatments, unified dark cinema backdrops, collapsible sidebar navigation, and fluid responsive drawers).

The Bolt prototype (`PedroFabrino/lalamovies-bolt-prototype`) proved an upgraded user experience: an ultra-dark cinema theme (`#020617`), a collapsible primary navigation sidebar, a dedicated header with live feed and telemetry indicators, unified card treatments with subtle borders, and improved mobile navigation via a slide-over drawer. However, the prototype is implemented in React with in-memory mock data, whereas the production application requires Vue 3, Pinia state stores, real-time WebSocket subscriptions, and adherence to strict architectural file limits (no files > 400 lines).

## Solution

Port the comprehensive UI/UX overhaul from the Bolt prototype into the Vue 3 application while maintaining complete fidelity to existing backend APIs, Pinia stores, WebSocket streams, and testing seams:

1. **App Shell**: Replace the monolithic top navbar with a collapsible left Sidebar and a sticky Top Header containing live feed connection status, system health indicators, user account controls, and a responsive slide-over drawer for mobile devices (< 768px).
2. **Dashboard**: Reorganize the dashboard into high-density metrics cards, feature shelves (Active Watch Parties, Up Next, Discovery Feed, Active Streams), and a redesigned download queue table with animated progress bars, transfer speeds, ETA counters, and contextual action menus.
3. **Request Flow**: Redesign the 3-step manual request wizard into clean visual cards for media search, indexer candidate evaluation with resolution/codec tags, and storage tier selection (Ephemeral Stream vs. Permanent Library).
4. **Media Library & Watch Party**: Upgrade media cards with cinema posters, backdrop modals, subtitle selection sheets, and deep SyncPlay bridge lobbies for shared viewing.
5. **Waitlist & Seasonal Anime**: Unify release countdowns, episode batch tracking, and tier badges into the updated cinema theme.
6. **Admin Dashboard**: Structure system telemetry (Real-Debrid account limits, storage pool vs. ephemeral cache, indexer ping latency) into responsive diagnostic cards.

## User Stories

1. As a user, I want a collapsible left sidebar navigation so that I can quickly switch between sections while maximizing screen real estate for media content.
2. As a user on a mobile device, I want a slide-over navigation drawer accessible via a hamburger icon so that I can easily navigate the platform on small screens.
3. As a user, I want a persistent top header displaying the real-time WebSocket status so that I immediately know whether live download updates are streaming.
4. As a user on the dashboard, I want an overview metrics bar showing active downloads, aggregate transfer speed, storage usage, and completed requests so that I can assess system activity at a glance.
5. As a user, I want active watch parties and ephemeral streams prominently displayed in hero shelves so that I can resume playback or join friends with one click.
6. As a user tracking downloads, I want real-time progress bars with animated transfer speeds, remaining ETA, and peer counts so that I understand exactly when media will be ready.
7. As a user, I want status badges (Queued, Downloading, Extracting, Syncing, Completed, Failed) with distinct color coding so that I can scan download states without reading details.
8. As a user, I want an action menu on each download card allowing me to retry failed torrents, replace candidates, or open ready items in Jellyfin.
9. As a user searching for media to request, I want visual movie and show cards with TMDB artwork, release years, synopsis, and genres so that I identify the correct title.
10. As a user picking releases, I want candidate cards that clearly highlight 4K HDR, 1080p WebRip, Remux, audio formats, file size, and seed count so that I choose the highest-quality release.
11. As a user submitting a request, I want a clear choice between instant ephemeral streaming and permanent library storage with transparent explanations of retention rules.
12. As a user browsing the library, I want a cinema-style poster grid with genre and resolution filtering so that I can browse available media easily.
13. As a user selecting a library title, I want a modal displaying backdrop imagery, stream quality options, subtitle selection, and a direct launch button to Jellyfin.
14. As a participant in a watch party, I want a synchronized lobby modal with host status, presence indicators, chat room, and TV/AirPlay pairing instructions.
15. As an anime fan, I want a seasonal schedule view displaying airing dates and episode countdowns with one-click automated subscriptions.
16. As a user monitoring waitlisted titles, I want visual countdown badges and automated torrent release alerts.
17. As an administrator, I want diagnostic telemetry cards displaying Real-Debrid subscription validity, storage cache allocation, and indexer health.
18. As an administrator, I want an interactive feature flag switchboard to toggle capabilities safely without redeploying.
19. As an administrator, I want an invite token generator to create and manage revocable guest access codes.

## Implementation Decisions

1. **Framework & State Architecture**:
   - Retain **Vue 3** (Composition API, `<script setup>`, TypeScript) and **Pinia** stores.
   - Retain **Vue Router 4** with browser history so all existing URL deep links (`/dashboard`, `/request`, `/library`, `/party/:id`, `/waitlist`, `/anime`, `/admin`, `/login`, `/invite/:token`) continue working.
   - Do NOT rewrite to React; port all visual components and layouts into Vue 3 Single File Components.

2. **Styling & Design Tokens**:
   - Use Tailwind CSS with dark cinema foundations (`zinc-950` / `#020617` background, `zinc-900` elevated surfaces, `zinc-800` borders).
   - Use `lucide-vue-next` for all iconography, matching the icon set used in the Bolt prototype.
   - Employ consistent color semantics: Emerald for active downloads/success, Amber for processing/syncing, Red for errors/failures, Violet/Indigo for brand accents.

3. **Layout Deconstruction**:
   - `AppLayout`: New root authenticated layout featuring the collapsible `Sidebar`, sticky `Header`, mobile drawer overlay, and main content view slot.
   - Guest layouts (Login, Public Invite) render without the sidebar.

4. **Architectural Guardrails (No Monoliths)**:
   - Adhere strictly to the project rule of maximum 400 lines per Vue component/view and maximum 300 lines per composable.
   - Decompose views into focused sub-components (e.g. Dashboard splits into `DashboardMetricsBar`, `DownloadQueueTable`, `DownloadQueueCard`, `DownloadQueueFilters`).

5. **API & Real-time Integration**:
   - Connect all redesigned components directly to existing Pinia stores (`useRequestsStore`, `useAuthStore`, `useWaitlistStore`).
   - Wire download progress and transfer speeds to existing WebSocket event listeners (`useProgressSocket`).

## Testing Decisions

1. **Test Strategy**:
   - Preserve all existing 52 test suites (259 Vitest unit and component tests).
   - Test only user-observable external behavior: button interactions, text display, route transitions, modal openings, and state emissions.
   - Update component test mounts to accommodate the new layout and sub-component hierarchy where props or DOM selectors change.
2. **Prior Art**:
   - Follow existing patterns in `apps/web/tests/DashboardView.test.ts`, `apps/web/tests/RequestView.test.ts`, and `apps/web/tests/ActiveWatchPartiesShelf.test.ts`.

## Out of Scope

- Backend database schema or API endpoint modifications (frontend visual overhaul only).
- Rewriting backend services or Docker configurations.
- Changing authentication mechanisms or session storage contracts.

## Further Notes

- The prototype repository at `.scratch/bolt-prototype` serves as the primary visual and CSS reference during implementation.
- All code changes will be verified with `pnpm --filter @mdm/web lint`, `pnpm --filter @mdm/web typecheck`, and `pnpm --filter @mdm/web test`.

## Slices & Implementation Issues

| # | Issue | Title | Blocked by | Status |
|---|---|---|---|---|
| **01** | [#246](https://github.com/PedroFabrino/lalamovies/issues/246) | App Shell with Collapsible Sidebar, Header, and Mobile Drawer | *None* | **Frontier (Ready to start)** |
| **02** | [#247](https://github.com/PedroFabrino/lalamovies/issues/247) | Cinema Redesign of Main Dashboard and Download Queue | #246 | Blocked |
| **03** | [#248](https://github.com/PedroFabrino/lalamovies/issues/248) | Redesigned 3-Step Media Request Wizard | #246 | Blocked |
| **04** | [#249](https://github.com/PedroFabrino/lalamovies/issues/249) | Redesigned Media Library and SyncPlay Watch Party Views | #246 | Blocked |
| **05** | [#250](https://github.com/PedroFabrino/lalamovies/issues/250) | Redesigned Seasonal Anime and Waitlist Views | #246 | Blocked |
| **06** | [#251](https://github.com/PedroFabrino/lalamovies/issues/251) | Redesigned Admin Diagnostics and Unified Modal Suite | #247, #248 | Blocked |

