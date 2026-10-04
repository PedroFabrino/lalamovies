# Specification: Admin Playback Sessions & Resource Monitor

## Problem Statement

When users stream media from the self-hosted media stack (via smart TVs, mobile devices, or web browsers), media playback can either stream directly (Direct Play) or require on-the-fly transcoding (CPU or GPU-accelerated NVENC). Transcoding operations, especially unaccelerated or multi-stream 4K transcodes, can suddenly saturate host CPU or GPU resources, impacting server responsiveness and other concurrent viewers.

Currently, administrators within Media Download Manager have zero visibility into live playback activity. To find out who is watching, whether a stream is transcoding, or why host CPU has spiked to 800%, the administrator must either open a terminal to run `docker top` and `nvidia-smi`, or log in to a separate Jellyfin administrator dashboard. Furthermore, if a runaway transcode causes severe degradation, the administrator has no granular control to stop that specific stream from MDM and is forced to restart the entire Jellyfin container, abruptly cutting off all active users.

## Solution

A real-time **Playback Sessions & Resource Monitor** embedded directly into the Admin Panel as a dedicated "Activity" tab.

This feature provides:
1. **Global Hardware Telemetry Banner**: Real-time gauges showing Host CPU %, RAM (used vs total), and NVIDIA GPU utilization (3D compute %, NVENC video encoder engine load %, and VRAM).
2. **Active Playback Session Cards**: Live cards displaying user name and avatar, client device (e.g., "LG Smart TV"), client app (e.g., "Jellyfin for WebOS"), media poster, title, season/episode details, live playback progress bar, stream bitrate, and high-visibility play method badges (`Direct Play` [Emerald], `Direct Stream` [Sky], `NVENC Transcode` [Purple], and `CPU Transcode` [Rose]).
3. **Collapsible Technical Diagnostics**: A detail drawer on each session card exposing source vs target codecs, audio downmixing channels, transcode framerate, and specific transcode reasons (e.g., `ContainerBitrateExceedsLimit`, `AudioCodecNotSupported`).
4. **Session Kill Switch & Remote Messaging**: An admin action allowing instant termination of a rogue stream, preceded by a confirmation modal and an optional on-screen broadcast message sent to the viewer's TV or screen (e.g., "Server undergoing maintenance").
5. **Adaptive Lifecycle Poller**: A smart 3–5 second polling loop active only while the Activity tab is in view, pausing automatically when the tab is blurred or switched to eliminate unnecessary API overhead.
6. **Resilient Hardware Degradation**: If NVIDIA drivers are busy or the host lacks an NVIDIA GPU, GPU dials gracefully hide while CPU, RAM, and session telemetry continue functioning without error.

## User Stories

1. As an admin, I want a dedicated 'Activity' tab in the Admin Panel, so that I have a central place to monitor live streaming activity.
2. As an admin, I want the Activity tab header to display a live badge with the count of active sessions (e.g., "Activity (2)"), so that I can see at a glance whether anyone is streaming without clicking into the tab.
3. As an admin, I want to see a global hardware telemetry banner displaying CPU %, RAM usage, and GPU utilization, so that I can immediately assess overall system health.
4. As an admin, I want the GPU gauge to display both 3D compute utilization and dedicated NVENC video encoder load %, so that I know whether hardware transcoding is saturating the graphics card.
5. As an admin, I want GPU VRAM used and total to be visible, so that I can monitor graphics memory pressure during multiple transcodes.
6. As an admin, I want the hardware banner to degrade gracefully if GPU metrics cannot be gathered, so that CPU, RAM, and session tracking remain usable on non-GPU setups or during transient driver hiccups.
7. As an admin, I want to see a list of cards representing every active Playback Session currently streaming from the server, so that I know who is watching what.
8. As an admin, I want each session card to display the user's name and profile image, so that I can identify who initiated the stream.
9. As an admin, I want each session card to display the client app and device name (e.g., "Jellyfin for WebOS on LG Smart TV"), so that I know which client platform is being used.
10. As an admin, I want each session card to display media artwork, title, year, and season/episode numbering (for TV Shows and Anime), so that I know the exact content being consumed.
11. As an admin, I want each session card to display a live playback timeline showing current position, total duration, and pause status, so that I can track stream progress.
12. As an admin, I want each session card to display a prominent play method badge distinguishing Direct Play, Direct Stream, NVENC Transcode, and CPU Transcode, so that I can instantly detect inefficient software transcodes.
13. As an admin, I want each session card to show the stream's network bitrate (e.g., "14.5 Mbps"), so that I can monitor outbound network consumption.
14. As an admin, I want an expandable diagnostics drawer on each session card showing source vs output video/audio codecs, container format, and transcode reasons, so that I can diagnose why a file is transcoding instead of playing directly.
15. As an admin, I want to terminate an active Playback Session with a single action, so that I can immediately relieve server strain caused by an unwanted or problematic stream.
16. As an admin, I want a confirmation modal before terminating a session, so that I do not accidentally kick an active viewer.
17. As an admin, I want the termination modal to include an optional message field that broadcasts an on-screen toast to the user's client device before ending playback, so that I can courteously inform them why the stream stopped.
18. As an admin, I want to see a clear empty state card when zero users are streaming ("No active playback sessions. Server is idle."), so that I am confident the system is quiet.
19. As an admin, I want the dashboard to pause polling when I switch browser tabs or minimize the window, so that background browser tabs do not consume server bandwidth.
20. As an admin, I want an immediate manual 'Refresh' button on the Activity tab, so that I can force an instant telemetry check without waiting for the next poll interval.

## Implementation Decisions

- **Architecture & Domain Seam**:
  - All session retrieval and hardware metrics logic lives inside a new dedicated service (`SessionMonitoringService`) rather than being appended to the existing `jellyfin.ts` service, maintaining strict file size and single-responsibility boundaries.
  - Route handlers are isolated in a new admin sub-module (`apps/api/src/routes/admin/activity.ts`) guarded by standard admin role authentication.
- **Data Fetching & Jellyfin API Integration**:
  - The service queries Jellyfin's `/Sessions` endpoint using the configured server API key.
  - Active sessions are filtered to include only sessions with an active `NowPlayingItem`.
  - The payload maps Jellyfin's raw `PlayState`, `TranscodingInfo`, and `NowPlayingItem` into a clean, normalized `PlaybackSession` interface.
  - Media poster URLs and user profile images are proxied or resolved via Jellyfin image endpoints.
- **Hardware Telemetry Retrieval**:
  - Host CPU usage is computed via sampling of Node `os.cpus()` times or system load averages.
  - System memory is computed from `os.totalmem()` and `os.freemem()`.
  - NVIDIA GPU metrics (3D utilization %, NVENC encoder utilization %, VRAM used/total bytes) are gathered via a lightweight non-blocking query to `nvidia-smi` (querying `utilization.gpu`, `utilization.encoder`, `memory.used`, `memory.total`).
  - If `nvidia-smi` is not present, times out, or fails, the service catches the error silently and sets `gpu: null`, returning HTTP 200 with available CPU and RAM data.
- **API Contracts**:
  - `GET /admin/activity`: Returns `{ sessions: PlaybackSession[], system: SystemMetrics }`.
  - `POST /admin/activity/sessions/:sessionId/stop`: Accepts `{ message?: string }`. If `message` is provided, executes `POST /Sessions/{sessionId}/Message` before dispatching `POST /Sessions/{sessionId}/Playing/Stop`.
- **Frontend Architecture**:
  - A dedicated composable (`useAdminActivity.ts`, < 300 lines) manages state (`sessions`, `systemMetrics`, `isLoading`, `error`, `isStoppingSession`), the adaptive polling interval (3s, pauses on blur via `document.visibilityState`), and stop-session actions.
  - A dedicated presentation component (`AdminActivityTab.vue`, < 400 lines) displays the hardware banner, session cards, expandable diagnostics, and termination modal.
  - Integrated into `AdminView.vue` as an `Activity` tab with dynamic session count pill.

## Testing Decisions

- **External Behavior Testing**: Tests must assert external HTTP responses, data normalization contracts, and error resiliency rather than mocking private helper functions.
- **Backend API Tests**:
  - Fastify injection tests for `GET /admin/activity`: verifies that non-admin requests return 401/403, and admin requests return 200 with properly structured sessions and system metrics.
  - Verifies that when Jellyfin returns multiple sessions (DirectPlay, DirectStream, and Transcode), the API correctly categorizes play methods and maps transcode reasons.
  - Verifies graceful fallback: when GPU telemetry fails, the endpoint succeeds with `system.gpu: null`.
  - Fastify injection tests for `POST /admin/activity/sessions/:sessionId/stop`: verifies that valid session IDs trigger the stop call and returns 200.
- **Frontend Unit Tests**:
  - Composable tests verifying that polling triggers at the specified interval and halts when visibility state transitions to `hidden`.
  - Component tests verifying that sessions render correct badge styles (`Direct Play` vs `NVENC Transcode` vs `CPU Transcode`) and that the termination modal dispatches the stop event with the broadcast message.
- **Prior Art**:
  - Matches testing patterns in `apps/api/tests/routes/admin/cleanup.test.ts` and `apps/web/tests/components/admin/AdminCleanupTab.test.ts`.

## Out of Scope

- Remote media player controls beyond stopping playback (e.g., remote Play, Pause, Seek, or Next Track).
- Long-term historical viewing analytics, persistent watch logs, or user-by-user bandwidth history (Tautulli-style historical database).
- Dynamic per-user bandwidth limiting or client quality enforcement from MDM.
- Process-level CPU/GPU slicing mapping isolated `ffmpeg` PIDs to individual sessions via Docker socket hooks.

## Further Notes

- The canonical domain term **Playback Session** is formally recorded in `CONTEXT.md` under *Server Monitoring & Telemetry*.
- All new files adhere strictly to the repository's No Monoliths architecture limits (routes <= 400 lines, services <= 400 lines, components <= 400 lines, composables <= 300 lines, tests <= 500 lines).
