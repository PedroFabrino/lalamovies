# Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)

## Problem Statement

Apple TV (tvOS) represents a significant living-room streaming platform. However, Apple strictly excludes `WebKit` / `WKWebView` from the tvOS SDK and prohibits web browser apps from the tvOS App Store. Consequently, MDM's web-based Leanback Client (`/tv`) cannot run directly on Apple TV as a web app or hybrid container.

Living-room users with Apple TV devices who want to browse the Up Next shelf, trigger discovery downloads, or monitor active requests directly on their TV screen currently have to rely on their phones or computers, opening Swiftfin (Jellyfin's tvOS client) only after requests finish.

## Solution

Introduce a lightweight, standalone native Apple TV companion application (`apps/tv-apple`) built with **Swift and SwiftUI for tvOS**:

1. **Native tvOS Focus Engine**: Replaces web spatial navigation with tvOS's built-in `FocusEngine`, providing natural Siri Remote trackpad flicking, smooth parallax depth effects on media cards, and native sound effects.
2. **Fastify REST API Consumer**: Reuses 100% of MDM's existing backend endpoints:
   - `POST /api/auth/pair/code` and `GET /api/auth/pair/status` for Quick Connect authentication.
   - `GET /api/requests` for active download tracking.
   - `GET /api/up-next` for episodic recommendations.
   - `GET /api/discovery` for curated release showcase.
   - `GET /api/anime/seasonal` for seasonal anime line-ups.
3. **Native Media Detail & Action Sheet**: Pressing the Siri Remote Clickpad displays a native SwiftUI detail screen with backdrop blur, metadata badges, synopsis, and action buttons (`[Stream Now]`, `[Download & Keep]`, `[Open in Swiftfin]`).
4. **Swiftfin & Jellyfin Integration**: When available, triggers the Swiftfin URL scheme (`swiftfin://`) or prompts user to switch to Swiftfin once downloads are processed.

---

## User Stories

### tvOS Native Experience & Navigation
1. As an Apple TV user, I want a native tvOS app installed on my Apple TV home screen, so that I can launch MDM alongside Netflix, YouTube, and Swiftfin.
2. As an Apple TV user, I want media cards to tilt and cast parallax drop shadows when focused using the Siri Remote, so that the interface feels completely native to tvOS.
3. As an Apple TV user, I want fluid horizontal shelf scrolling powered by SwiftUI's `ScrollView(.horizontal)`, so that browsing feels smooth at 60/120fps.
4. As an Apple TV user, I want pressing the Siri Remote "Back" (<) button to seamlessly exit detail sheets or modals back to the shelf, without leaving the application.

### Apple TV Authentication (Quick Connect)
5. As an Apple TV user opening the app for the first time, I want to see a pairing screen displaying a 6-character code and QR code, so that I do not need to use the onscreen keyboard or dictation.
6. As an Apple TV user, I want the app to securely persist the received session token in the tvOS Keychain, so that I remain authenticated across app restarts.
7. As an Apple TV user, I want to be able to sign out from an in-app settings screen, clearing stored tokens and returning to the pairing view.

### Content Discovery & Living-Room Actions
8. As an Apple TV user, I want to see my "Up Next" shelf at the top of the screen, so that I can download the next sequential episode of active shows in one click.
9. As an Apple TV user, I want to browse the "Discovery Feed" and "Seasonal Anime" shelves, so that I can find new movies and anime series from my living room.
10. As an Apple TV user, I want to view active downloads with animated progress bars, so that I know when media is ready to watch.
11. As an Apple TV user, I want clicking any card to open a detail view showing synopsis, cast/crew, genres, and release year.
12. As an Apple TV user, I want to trigger an "Instant Stream" or "Download Request" directly from the detail view.

---

## Implementation Decisions

### Architectural Shape
- **Native tvOS Target**: Built as an Xcode project under `apps/tv-apple/` targeting tvOS 17.0+ using Swift 5.10 / Swift 6.
- **Pure SwiftUI Architecture**:
  - `AppView.swift`: Root view managing authentication state (switching between `PairingView` and `DashboardView`).
  - `DashboardView.swift`: Hosts vertically stacked horizontal shelves (`ShelfView.swift`) displaying `MediaCardView.swift`.
  - `MediaDetailView.swift`: Native presentation sheet displaying synopsis and action buttons.
  - `PairingView.swift`: Renders CoreImage-generated QR code and pairing code, polling the API via `Task` async/await loop.
- **Networking Layer**: Lightweight `MDMClient.swift` actor using `URLSession` and `Codable` models. Consumes existing API endpoints without requiring any backend modifications:
  - Base URL configurable in app settings (or via `Info.plist` default).
- **Session Persistence**: Stores JWT in tvOS `UserDefaults` or `KeychainWrapper` for persistent living-room logins.

---

## Testing Decisions

- **Unit Testing (`apps/tv-apple/Tests/`)**:
  - Use `XCTest` to test `MDMClient` API decoding against fixture JSON payloads for Up Next, Discovery, and Pairing endpoints.
- **Simulator Testing**:
  - Run on Apple TV 4K Simulator in Xcode with simulated Siri Remote trackpad and click inputs.
- **Device Verification**:
  - Deploy to physical Apple TV via TestFlight or direct Xcode wireless deployment.

---

## Out of Scope

- **Video Playback**: The tvOS companion app delegates playback to Swiftfin (or the Jellyfin tvOS app) and does not embed an internal AVPlayer.
- **Administrative Settings**: All storage quota management, user roles, Whisper settings, and raw magnet inputs remain on desktop/mobile web.

---

## Further Notes

- This is a **Draft / Phase 2 Specification**. Implementation of the Web Leanback Client (`/tv`) and Android TV Shell (`apps/tv-android`) takes precedence.
- Reference ADR: [`docs/adr/0020-leanback-client-and-tv-shell.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0020-leanback-client-and-tv-shell.md).
