# Local GPU Subtitle Transcription with Subgen for Private Library

We integrate Subgen as a standalone container running OpenAI Whisper locally on the host's Nvidia GPU to auto-generate English subtitles for unsubbed foreign media in the Private Library. Background transcription is throttled to a configurable off-peak time window (evaluated in local system time) with single concurrency to prevent GPU contention, while allowing manual on-demand triggers and runtime kill switch control.

## Considered Options

- **Full *Arr Stack with Bazarr (Radarr + Sonarr + Bazarr)** — rejected because Bazarr cannot run standalone without Radarr and Sonarr managing its library, which directly violates ADR-0008 and adds significant daemon bloat.
- **Cloud Translation APIs (OpenAI Whisper Cloud / DeepL)** — rejected due to recurring per-minute audio transcription costs, external network exposure of private media filenames, and unnecessary latency when an 8GB Nvidia RTX 3070 Ti GPU is locally available at zero cost.
- **Continuous Background Folder Monitoring** — rejected in favor of explicit MDM orchestration and scheduled off-peak processing, avoiding host GPU saturation during waking hours or gaming sessions.

## Consequences

- A new `subgen` container is added to `docker-compose.yml` with Nvidia GPU runtime passthrough, using `faster-whisper` `large-v3` with `float16` precision and automatic VRAM purging.
- `download_requests` gains an orthogonal `transcription_status` state (`none`, `pending`, `transcribing`, `completed`, `failed`), keeping download seeding lifecycles independent.
- `DownloadPoller` probes completed Private media via `ffprobe`; if zero external or embedded subtitle tracks exist, the item is enqueued for transcription.
- A scheduled background job processes the `Transcription Queue` during the operator's configured `Transcription Window`, posting to Subgen's `/batch` endpoint.
- Subgen reports completion back to MDM via `WEBHOOK_URL_COMPLETED`, updating the status, notifying Jellyfin, and emitting WebSocket updates.
- A runtime Feature Flag (`TRANSCRIPTION_ENABLED`) provides an immediate kill switch in the Admin Panel to halt GPU jobs on demand.
