# ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining

- **Status**: Accepted
- **Date**: 2026-09-29

## Context

The operator frequently tracks episodic series (TV Shows and Anime) that have concluded their broadcast or have multiple released episodes in sequence, but lack an all-in-one Season Pack torrent on trackers.

Under the previous implementation:
1. **Private Tracker Seeder Gate Bug**: `candidateDiagnostics.ts` hardcoded `if (c.seeders < 10) return false`, ignoring `isQualifiedPreferred(c)`. Healthy private tracker releases on BJ-Share with 1–9 seeders were disqualified and marked as "0 met seed/quality criteria", despite private tracker seeders being capable of saturating full bandwidth.
2. **Resolution Scoring & Fallback**: `scoreRelease()` awarded 2160p only 20 points, failing the `score >= 100` auto-download threshold. Furthermore, no fallback existed for 720p when 1080p/4K releases were unavailable.
3. **Decoupled / Dormant Advancement**: When an episode was snatched and the Waitlist Entry advanced (`POST /waitlist/:id/advance`), `targetEpisode` incremented to `N + 1` and reset to `checking`. The entry then sat dormant until either the next scheduled 6-hour poller cron ran or the user clicked "Check Now". For a 12-episode anime season, automated downloading took days unless manually triggered episode by episode.

## Decision

Introduce **Preferred Indexer Seeder Configuration**, **Resolution Tier Gating**, and an **Immediate Episodic Waterfall Engine**:

### 1. Preferred Indexer Qualification
- Introduce `PREFERRED_INDEXER_MIN_SEEDERS` environment variable (default: `1`).
- When a candidate matches the Preferred Indexer (`isPreferredIndexer(c.indexer)`):
  - Qualifies with `seeders >= PREFERRED_INDEXER_MIN_SEEDERS` (non-CAM).
  - Public indexer candidates continue to require `seeders >= 10`.

### 2. Resolution Gating & 720p Fallback
- **1080p**: Primary resolution target for episodic series (score 100).
- **2160p (4K)**: Qualifies with score 100 for auto-download, but sorted/ranked below 1080p to conserve storage quota for series.
- **720p Fallback**:
  - **Backlog episodes** (air date > 24 hours ago, or no air date known): 720p qualifies immediately with score 100 if no 1080p or 2160p candidate exists.
  - **New episodes** (air date <= 24 hours ago): Held during a 24-hour priority window to give release groups time to post 1080p encodes before accepting 720p.
- **480p and CAM**: Strictly disqualified from auto-download.

### 3. Episodic Waterfall Chaining Engine
When an episodic Waitlist Entry is advanced (via automated request creation or manual selection) or created with single-episode tracking:
1. **Recursion Safety Cap**: Bounded by a maximum limit of **30 iterations** per waterfall invocation to prevent runaway loops.
2. **Immediate Loop**:
   - Check if `targetEpisode > maxEpisodes` (or season concluded without future episodes): mark entry `completed` and stop waterfall.
   - Check if episode `airDate > now`: transition entry to `pending_release` and stop waterfall.
   - Query Prowlarr for the current `targetEpisode`.
   - **Preferred Indexer Match**: Bypass Grace Period (0h), immediately submit `POST /requests`. On HTTP 201 response, advance `targetEpisode` in-place and proceed to the next iteration.
   - **Public Tracker Match**: Halt waterfall. Transition entry to `notified` with configured Grace Period and send Discord notification with Approve/Reject actions, requiring operator confirmation before taking public releases.
   - **No Qualifying Candidate**: Persist diagnostic summary in `lastCheckResult`, retain status `checking`, and stop waterfall.
   - **Disk Space / API Error**: If the API returns HTTP 422 or error, halt the waterfall safely without advancing further.

## Consequences

**Good**:
- Backlog seasons without season packs automatically download in a single rapid waterfall without operator intervention.
- BJ-Share releases with low seed counts (1–9 seeds) are correctly recognized and snatched.
- Public trackers remain airgapped from silent auto-downloads; any public match halts the waterfall and triggers explicit Discord notification.
- 24-hour priority window prevents premature 720p grabs on release day while never blocking binge downloads for older content.

**Trade-offs & Mitigations**:
- Rapid sequential requests generate multiple torrent additions in qBittorrent in short order; the 30-iteration guard ensures runaway cascades are strictly bounded.
