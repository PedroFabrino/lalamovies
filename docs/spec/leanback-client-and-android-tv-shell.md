# Leanback Client and Android TV Shell — Spec

## Problem Statement

Media Download Manager (MDM) is designed for desktop and mobile web browsers. Living-room users who access their home media stack via televisions (Chromecast with Google TV, Smart TVs, and Apple TV) currently have no ergonomic way to browse recommendations, track next episodes, or view download progress from their sofa.

Using desktop-oriented web interfaces on a television fails due to three fundamental obstacles:
1. **Remote Control Incompatibility**: TV remotes rely on a 4-way directional pad (D-Pad: Up, Down, Left, Right, Select, Back). The existing desktop interface relies on mouse hover states, fine-grained tables, small buttons, and text input boxes that cannot be navigated with a remote control.
2. **Authentication Friction**: Entering long usernames and passwords with an on-screen D-Pad virtual keyboard is tedious, error-prone, and frustrating for friends and household members.
3. **App Switching & Platform Walls**: Media downloaded on MDM is watched in Jellyfin. Switching between MDM and Jellyfin on a TV requires manual home-screen navigation unless MDM provides a direct launch bridge. Furthermore, Apple TV (tvOS) strictly bans web views (`WKWebView`), while Smart TVs run packaged web engines.

## Solution

Introduce a dedicated **Leanback Client** (`/tv`) inside MDM, accompanied by a **Quick Connect** phone pairing flow and a lightweight **Android TV Shell** (`apps/tv-android`), while keeping the existing web interface completely untouched:

1. **Dedicated `/tv` Route (Leanback Client)**: A high-contrast, 10-foot television interface rendered with horizontal carousel shelves (`Up Next`, `Discovery Feed`, `Seasonal Anime`, `Active Downloads & Streams`) designed for TV viewing distances (overscan-safe padding, large typography, glowing focus rings).
2. **D-Pad Spatial Navigation (`useTvFocus`)**: A lightweight 2D grid focus engine that maps arrow keys to row/shelf and column/card movements, smoothly scrolling active elements into viewport center and trapping Back button presses to close modals before exiting.
3. **10-Foot Media Detail Modal**: Highlighting any card and pressing **Enter** opens an overview modal showing high-resolution artwork, title, release year, season/episode, and synopsis, with large action buttons below: `[Instant Stream]`, `[Permanent Download]`, `[Watch in Jellyfin]`, and `[Close]`.
4. **Quick Connect Pairing (`/tv/pair` & `/pair`)**: Avoids all password typing on TV. The TV displays a 6-character code and QR code. The user opens the link on their phone (or scans the QR code), taps "Authorize", and the TV receives a persistent JWT session immediately.
5. **Native Android TV Shell (`apps/tv-android`)**: A minimalist (~120-line Kotlin) container embedding a full-screen hardware-accelerated `WebView`, registered as a `LEANBACK_LAUNCHER` on the Android TV home screen, and exposing a native bridge (`MDMNative.openJellyfin()`) that launches `org.jellyfin.androidtv`. On web browsers (LG/Samsung TVs), it falls back to opening the configured public Jellyfin web URL.

---

## User Stories

### Television Browsing & Ergonomics
1. As a TV viewer, I want to access MDM at `/tv`, so that I see an interface optimized for viewing from a 10-foot couch distance.
2. As a TV viewer, I want to navigate the entire interface using only the Up, Down, Left, Right, Enter, and Back buttons on my remote control, so that I never need a mouse or pointer.
3. As a TV viewer, I want the currently focused card to have a clear, glowing focus ring and scale slightly, so that I always know where focus is on the TV screen.
4. As a TV viewer, I want horizontal shelves to automatically scroll horizontally as I press Left/Right, so that off-screen items are brought into view smoothly.
5. As a TV viewer, I want pressing Down/Up to move directly to the adjacent shelf above or below, so that navigation feels intuitive and fast.
6. As a TV viewer, I want overscan-safe margins around the entire screen, so that TV bezel borders do not clip interface elements.

### Authentication & Pairing (Quick Connect)
7. As a TV viewer opening `/tv` unauthenticated, I want to see a clean pairing screen (`/tv/pair`) with a large 6-character code and a QR code, so that I do not have to type passwords with a remote control.
8. As a user on my phone, I want to scan the TV's QR code to open `/pair?code=...` with the pairing code pre-filled, so that I can authorize the TV in one tap.
9. As an authenticated user on my phone, I want to see a confirmation prompt ("Authorize Android TV device (ABC-123)? [Approve] [Cancel]"), so that I have control over which TV gains access.
10. As a TV viewer, I want the TV screen to automatically log in and transition to the TV dashboard within 2 seconds of phone approval, so that the pairing feels instantaneous.
11. As a TV viewer, I want the TV session to remain permanently logged in until explicitly revoked, so that family members do not need to re-pair the TV periodically.
12. As a user, I want the pairing code to expire after 10 minutes if unused, so that abandoned codes do not leave a security risk.
13. As a TV viewer using a TV browser (such as Samsung Internet or LG webOS), I want to see a clear visual prompt explaining how to add the page to "Quick Access" / Bookmarks, so that I can re-launch MDM with one click without typing the address again.

### Content Shelves & Media Actions
14. As a TV viewer, I want to see an "Up Next" shelf containing episodes ready for download for series I am currently watching, so that I can grab the next episode with one click.
15. As a TV viewer, I want to see a "Discovery Feed" shelf showing trending, high-quality releases, so that I can discover new movies and shows from the couch.
16. As a TV viewer, I want to see a "Seasonal Anime" shelf displaying popular airing anime, so that I can track current season broadcasts.
17. As a TV viewer, I want to see an "Active Downloads & Streams" shelf displaying real-time download progress bars, so that I can monitor in-progress media.
18. As a TV viewer, I want pressing Enter on any media card to open a 10-foot Media Detail modal showing the full synopsis, backdrop, and metadata, so that I can decide whether to watch it before downloading.
19. As a TV viewer in the Media Detail modal, I want to select "Instant Stream" (when Real-Debrid is enabled), so that I can begin watching immediately without waiting for disk downloads.
20. As a TV viewer in the Media Detail modal, I want to select "Download & Keep", so that the media is downloaded permanently to the local library.
21. As a TV viewer, I want pressing Back/Escape while a modal is open to close the modal and return focus to the underlying card, without exiting the screen.

### Jellyfin Integration & Android TV Shell
22. As a TV viewer on Chromecast, I want to launch MDM directly from the Android TV / Google TV home screen banner row, so that it behaves like a native TV app.
23. As a TV viewer with a completed download or active stream, I want selecting "Watch in Jellyfin" to automatically launch the Jellyfin Android TV app (`org.jellyfin.androidtv`), so that I don't have to manually exit MDM and search for Jellyfin on my home screen.
24. As a TV viewer using a web browser on LG webOS or Samsung Tizen, I want selecting "Watch in Jellyfin" to open the public Jellyfin web player in a new tab, so that playback works seamlessly across all TV operating systems.
25. As a TV viewer, I want the Android TV shell to properly handle hardware Back button presses, navigating backwards through web history or closing modals before prompting to exit the app.

---

## Implementation Decisions

### Architectural Shape
- **Isolated Route Namespace**: All TV-specific components and logic are isolated under `/tv` (main dashboard), `/tv/pair` (TV code display), and `/pair` (mobile approval view). The standard desktop and mobile views (`/dashboard`, `/library`, `/request`, `/admin`) are 100% untouched.
- **Store & Client Reuse**: Reuses 100% of existing Pinia stores (`useRequestsStore`, `useAuthStore`, `useFeatureFlags`) and API clients (`src/api/client.ts`).
- **TV Browser Onboarding Banner**: On `/tv/pair`, detect Smart TV browsers (`/Tizen|Web0S|SMART-TV/i.test(navigator.userAgent)`) and display an on-screen visual guide showing users how to press the Star (★) / Menu icon in Samsung Internet or LG browser to "Add to Quick Access", ensuring 1-click re-entry without retyping URLs.

- **2D Spatial Navigation Composable (`useTvFocus`)**: A lightweight composable managing active focus indices (`activeRow`, `activeCol`, `modalIndex`, `activeContext`) listening to window `keydown` events (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Escape`/`Backspace`). Focus applies Tailwind glow rings and scales active cards (`scale-105 transition-transform`).
- **Quick Connect Service (`apps/api/src/services/pairingService.ts`)**: In-memory ephemeral code store holding `{ code, deviceId, status, userId, token, expiresAt }` with 10-minute TTL.
- **Pairing Endpoints (`apps/api/src/routes/auth/pair.ts`)**:
  - `POST /api/auth/pair/code`: Generates an uppercase 6-character code (e.g. `K7B-9X2`).
  - `GET /api/auth/pair/status?code=...`: Polled by TV every 2 seconds. Returns `{ status: 'pending' | 'approved' | 'expired', token?: string }`.
  - `POST /api/auth/pair/approve`: Authenticated endpoint called from user's phone with `{ code }`. Authorizes code and signs persistent TV JWT.
- **Android TV Shell (`apps/tv-android/`)**: Minimal Gradle project containing `MainActivity.kt` with a full-screen `WebView`. Configured with `LEANBACK_LAUNCHER` and injecting `MDMNative.openJellyfin()`.

---

## Testing Decisions

- **Pairing Flow Integration Tests (`apps/api/tests/pairing.test.ts`)**:
  - Test code generation returns a valid 6-character string and expiration timestamp.
  - Test polling returns `pending` before authorization.
  - Test approving with valid user session transitions code to `approved` and issues valid JWT.
  - Test unauthorized approval returns 401.
  - Test expired codes return `expired` status.
- **Spatial Navigation Unit Tests (`apps/web/tests/TvFocus.test.ts`)**:
  - Test 2D navigation: ArrowRight increments column, ArrowLeft decrements column.
  - Test row navigation: ArrowDown increments row, ArrowUp decrements row.
  - Test boundary constraints: cannot navigate past start or end of shelf.
  - Test modal focus trapping: when modal is active, arrow keys navigate modal action buttons, and Escape triggers modal close callback.
- **Prior Art**: Follows existing Vitest testing patterns in `apps/api/tests/` and `apps/web/tests/`.

---

## Out of Scope

- **Direct In-App Video Playback**: MDM is a request and discovery manager; actual video decoding and media streaming is handled by Jellyfin.
- **Native Apple TV App**: Apple TV tvOS cannot run WebViews and is deferred to an optional future native SwiftUI client (see draft spec `docs/spec/apple-tv-companion-draft.md`).
- **Administrative Operations on TV**: Admin settings, storage quotas, manual magnet inputs, invite links, and GPU Whisper configuration remain exclusively on desktop/mobile web.

---

## Further Notes

- References ADR [`docs/adr/0020-leanback-client-and-tv-shell.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0020-leanback-client-and-tv-shell.md).
- References Domain Glossary [`CONTEXT.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/CONTEXT.md#L239-L253).
