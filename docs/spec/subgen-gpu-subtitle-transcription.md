# Subgen GPU Subtitle Transcription for Private Library — Spec

## Problem Statement

Foreign-language media (specifically unsubbed Japanese movies and episodes) downloaded to the Private Library are often unwatchable because they lack subtitle tracks in any language. While cloud translation APIs are costly and external trackers frequently lack fansubs for niche titles, the operator has an 8GB Nvidia RTX 3070 Ti GPU that can run OpenAI Whisper locally at zero cost. However, running AI speech translation unconstrained during the day risks saturating GPU memory (VRAM) and impacting workstation tasks and gaming.

## Solution

Deploy Subgen as an autonomous companion container configured with Nvidia CUDA GPU passthrough and Whisper `large-v3` to translate foreign audio directly into English subtitles (`.en.srt`). When a Private download completes, MDM automatically probes the media file; if and only if zero subtitles exist in any language, the item is queued. A background scheduler dispatches queued transcriptions sequentially during an operator-configured off-peak Transcription Window (evaluated in the user's local system timezone), with a single-concurrency limit and automatic VRAM purge on completion. A runtime Feature Flag acts as a kill switch in the Admin Panel, and Admins/Trusted users can manually trigger transcription on demand from the dashboard.

## User Stories

### Automated Subtitle Ingestion & Zero-Subtitle Probe
1. As a Trusted User, I want unsubbed Japanese movies added to the Private Library to be automatically detected and queued for English subtitle generation, so that I don't have to manually search for or create subtitles.
2. As a Trusted User, I want media that already has any subtitles (embedded internal streams or external files) to be skipped automatically, so that GPU time and disk writes are not wasted.
3. As a System Operator, I want the subtitle inspection to probe both container streams (via `ffprobe`) and external files (`.srt`, `.vtt`, `.sub`, `.ass`), so that releases with embedded softsubs in any language are never re-transcribed redundantly.
4. As a System Operator, I want subtitle files to be written directly alongside the media file (`Title (Year).en.srt`), so that Jellyfin automatically detects them without file moves.

### Off-Peak Scheduling & Local Timezone Window
5. As a System Operator, I want automated Whisper transcription to run only during a configured off-peak Transcription Window (e.g. 02:00 to 07:00), so that my GPU is never taxed during daytime workstation use or gaming.
6. As an Admin, I want to configure the Transcription Window start and end hours in the Admin Panel, so that I can adjust the hours as my schedule changes.
7. As an Admin, I want the Admin Panel to display and evaluate the Transcription Window in my local system timezone rather than UTC, so that I never have to mentally calculate timezone offsets.
8. As a System Operator, I want Subgen to run with single concurrency (`CONCURRENT_TRANSCRIPTIONS=1`), so that GPU VRAM usage stays strictly under 4GB on my 8GB RTX 3070 Ti.
9. As a System Operator, I want Subgen to purge its model from VRAM 30 seconds after completion, so that my GPU returns to 0% idle VRAM usage outside of active transcriptions.

### Runtime Control & Manual Trigger
10. As an Admin, I want a runtime Feature Flag (`TRANSCRIPTION_ENABLED`) in the Admin Panel, so that I can immediately pause or resume background GPU transcription without restarting containers.
11. As a Trusted User, I want a "Generate Subtitles" action on completed Private download cards, so that I can manually queue or re-run transcription on any private media even if embedded subtitles were previously detected.
12. As an Admin, I want to trigger immediate transcription from the UI, so that I can watch an unsubbed movie right away if I am not currently using the GPU.
13. As a User, I want real-time status indicators on the media card (`Pending Window`, `Transcribing...`, `Subtitles Ready`, `Failed`), so that I know whether subtitles are ready before launching playback.

### Media Server Synchronization
14. As a User, I want Subgen to notify MDM immediately upon completing a transcription, so that the status is updated in the database and the UI reflects the change via WebSockets without page refreshes.
15. As a User, I want MDM to automatically trigger a Jellyfin library rescan when subtitles finish generating, so that English subtitles appear in the Jellyfin player immediately.
16. As an Admin, I want failed transcriptions to be recorded with error diagnostics and a retry action, so that transient failures can be recovered easily.

## Implementation Decisions

### Subgen Standalone Container Architecture
- Deploy Subgen (`mccloud/subgen:latest`) as `mdm-subgen` in `docker/docker-compose.yml`.
- Configure Docker compose with Nvidia GPU reservations:
  - `runtime: nvidia` or `deploy.resources.reservations.devices` with driver `nvidia` and capabilities `[gpu]`.
- Mount `${MEDIA_DATA_PATH}:/media_data` to ensure Subgen sees the exact same file paths as MDM and Jellyfin.
- Environment configuration:
  - `TRANSCRIBE_DEVICE=cuda`
  - `WHISPER_MODEL=large-v3`
  - `TRANSCRIBE_OR_TRANSLATE=translate`
  - `SUBTITLE_LANGUAGE_NAME=en`
  - `COMPUTE_TYPE=float16`
  - `CONCURRENT_TRANSCRIPTIONS=1`
  - `CLEAR_VRAM_ON_COMPLETE=True`
  - `MODEL_CLEANUP_DELAY=30`
  - `WEBHOOK_URL_COMPLETED=http://api:3000/internal/subgen/webhook`

### Schema & Domain Modeling
- Add `transcription_status` column to `download_requests`:
  - Enum: `['none', 'pending', 'transcribing', 'completed', 'failed']`
  - Default: `'none'`
- Add `transcription_error` nullable text column to `download_requests` to store diagnostic failure messages.
- Extend `system_config` with:
  - `transcription_window_start` (default `'02:00'`)
  - `transcription_window_end` (default `'07:00'`)
  - `transcription_timezone` (default detected from browser or server env)
- Register `transcription_enabled` feature flag in `feature_flags` table with default `true`.

### Subtitle Inspection & Poller Hook
- In `DownloadPoller.ts`, after a download completes and hardlinking succeeds:
  - If `req.mediaType === 'private'`:
    - Check destination directory for external subtitle files (`.srt`, `.vtt`, `.sub`, `.ass`).
    - Run `ffprobe` on the media file to inspect stream codecs for `codec_type: 'subtitle'`.
    - If zero subtitle tracks/files are found, set `transcription_status = 'pending'`.
    - If any subtitle is found, set `transcription_status = 'none'`.

### Transcription Scheduler Job
- Create `apps/api/src/jobs/transcriptionCron.ts`:
  - Runs periodically (e.g. every 5 minutes).
  - Checks if `transcription_enabled` feature flag is active.
  - Checks if the current local time in `transcription_timezone` falls within `transcription_window_start` and `transcription_window_end`.
  - If inside the window and no other job is currently `transcribing`, selects the oldest `pending` private request.
  - Updates status to `transcribing` and dispatches an HTTP request to Subgen's `/batch?directory=<filePath>` endpoint.

### Internal Webhook & Jellyfin Refresh
- Add route `POST /internal/subgen/webhook`:
  - Payload contains `file`, `subtitle`, `language`, and `event`.
  - Matches the file path against `download_requests`.
  - Updates `transcription_status = 'completed'`.
  - Triggers `jellyfin.refreshLibrary()`.
  - Emits a WebSocket broadcast to notify connected clients.

### Frontend UI & Controls
- On the dashboard, completed Private download cards display:
  - Subtitle badge if `transcription_status` is `pending`, `transcribing`, or `failed`.
  - A "Generate Subtitles" button (with loading / retry states) allowing manual on-demand execution via `POST /requests/:id/transcribe`.
- In `AdminView.vue`:
  - Settings tab: Configuration card for "Subtitle Transcription Window" with start/end time pickers and displayed local system timezone.
  - Feature Flags tab: Toggle switch for `transcription_enabled` kill switch.

## Testing Decisions

- **Good tests verify external behavior**: Tests mock external HTTP services (Subgen API, Jellyfin API) and filesystem/ffprobe outputs, asserting observable database status transitions, API responses, and dispatched payloads.
- **Seam 1 — Subtitle Detection & SubgenService Unit Tests**:
  - Mock `ffprobe` json output and directory scans: assert correct classification (`none` when subtitle streams exist, `pending` when zero exist).
  - Mock Subgen HTTP `/batch` endpoint: assert correct URL parameters, headers, and error handling.
- **Seam 2 — Transcription Scheduler Integration Tests**:
  - Mock local clock times and timezone: assert scheduler triggers during the active window and remains dormant outside the window.
  - Assert scheduler halts immediately when `transcription_enabled` feature flag is toggled off.
  - Assert concurrency: only one job is dispatched at a time.
- **Seam 3 — API Endpoints & Webhook Route Tests (`app.inject()`)**:
  - `POST /internal/subgen/webhook`: test status transition to `completed`, Jellyfin refresh call, and WebSocket event payload.
  - `POST /requests/:id/transcribe`: test manual trigger permissions (admin/trusted allowed, unauthorized blocked, status moves to `pending` or `transcribing`).
  - `GET/PATCH /admin/config`: test reading and writing transcription window configuration.
- **Prior Art**: Follows conventions in `tests/private_requests.test.ts`, `tests/features.test.ts`, and `tests/cleanup.test.ts`.

## Out of Scope

- Multi-language subtitle generation (only English `.en.srt` is generated).
- Subtitle editing, offset re-syncing, or text styling in the browser.
- Cloud Whisper API failover.
- Auto-transcription for public libraries (`movies`, `shows`, `anime`), which continue using OpenSubtitles.
- In-browser video transcription playback previews.

## Further Notes

- Subgen requires `docker-compose` with Nvidia Container Toolkit installed on the host. Documentation should include the Docker compose syntax for GPU device reservation.
- Subgen's `large-v3` model weights (~3GB) will be downloaded automatically by the container to `/subgen/models` on first run.
