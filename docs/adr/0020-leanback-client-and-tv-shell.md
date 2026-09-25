# Leanback Client and Android TV Shell

We decided to support television environments (Chromecast with Google TV, Smart TVs) by building a dedicated 10-foot interface under the `/tv` route in `@mdm/web` and wrapping it in a minimalist native Android TV shell (`apps/tv-android`), while deferring Apple TV to an optional future native SwiftUI client.

## Context
Users requested living-room access to MDM from TV devices (Chromecast with Google TV, Apple TV, Smart TVs) with direct jumping to Jellyfin. 

Key technical constraints discovered during research:
1. **Apple tvOS bans WebViews**: Apple deliberately excluded `WebKit` from tvOS SDK. Standard web wrappers (Capacitor/Cordova) cannot produce an `.ipa` for Apple TV. Because our existing web stack is Vue 3 (not React), there is no React Native code reuse path without a ground-up rewrite.
2. **Jellyfin Deep-Linking Limitation**: Neither official Jellyfin Android TV nor Swiftfin (Apple TV) registers external URL schemes (e.g. `jellyfin://`) to jump directly to specific media item pages.
3. **10-Foot Ergonomics**: Desktop-first layouts (nested tables, raw magnet inputs, slider configurations) are unusable with a 4-way D-Pad remote.

## Decision
1. **Dedicated `/tv` Route (Leanback Client)**: Keep the existing desktop/mobile web views untouched. Implement a high-contrast, horizontal-shelf interface at `/tv` optimized for remote controls using a 2D grid focus composable (`useTvFocus`).
2. **10-Foot Media Detail Modal**: Selecting any card displays an overview sheet featuring high-res backdrop/poster, title, synopsis, and metadata, with remote-navigable action buttons below (`[Instant Stream]`, `[Permanent Download]`, `[Watch in Jellyfin]`, `[Close]`).
3. **Minimalist Android TV Shell (`apps/tv-android`)**: House a ~120-line Kotlin Android TV container directly in the monorepo embedding a full-screen `WebView`, registered as a `LEANBACK_LAUNCHER`, handling remote Back navigation, and injecting a JavaScript bridge (`MDMNative.openJellyfin()`) that launches `org.jellyfin.androidtv`. On web browsers (LG/Samsung TVs), the button falls back to opening the configured public Jellyfin web URL.
4. **Quick-Connect Pairing (`/pair`)**: Avoid remote password entry by introducing a 6-character/QR code device pairing flow. The TV displays a code, and the user approves the device from their authenticated phone or browser. Paired TV sessions receive persistent, long-lived tokens stored in the TV client until explicitly revoked.
5. **Scope Boundary**: The Leanback Client is strictly restricted to media consumption and 1-click requests (Up Next, Discovery Feed, Seasonal Anime, and active Request/Stream status). Administration, quota management, and manual magnet input remain exclusively on desktop/mobile.
6. **Apple TV Strategy**: Apple TV remains a playback-only endpoint via Swiftfin for Phase 1. If a TV interface is needed on Apple TV in Phase 2, a lightweight native SwiftUI companion client will be built against the existing Fastify REST endpoints.

