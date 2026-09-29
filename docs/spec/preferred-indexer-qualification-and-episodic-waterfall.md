# Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec

## Problem Statement

When users track episodic series (TV Shows and Anime) whose episodes are already released but lack an all-in-one Season Pack torrent on trackers (such as *Trapped in a Dating Sim S02*), the user experience breaks down in two critical ways:

1. **Private Tracker Seeder and Resolution Gating Failure**:
   When indexers return torrents from the operator's configured Preferred Indexer (BJ-Share), candidate evaluation frequently rejects healthy torrents with messages such as `"Found 40 releases (18 matched S02E01), 0 met seed/quality criteria"`. This occurs because:
   - The diagnostic evaluator hardcodes a minimum requirement of 10 seeders, ignoring the private tracker flag. On private trackers, a single dedicated seeder saturates high-speed connections, making 1–9 seeders completely valid.
   - 4K (2160p) releases only receive 20 points, failing the 100-point threshold required for auto-downloading.
   - When 1080p is unavailable, 720p releases are never considered as fallbacks, leaving the entry stuck in `checking` indefinitely.

2. **Dormant Episodic Progression (Lack of Chaining)**:
   When an episode is successfully snatched or manually picked, the system advances the waitlist entry in-place to target episode $N+1$ and resets the status to `checking`. However, the entry then sits dormant until the next scheduled 6-hour poller cron runs (or until the user manually clicks "Check Now"). For a 12-episode anime season, downloading the released backlog takes days of passive waiting or tedious manual clicking episode by episode, instead of cascading through all available episodes automatically.

---

## Solution

Implement configurable Preferred Indexer qualification thresholds, resolution tier gating with a 24-hour priority window, and an immediate Episodic Waterfall chaining engine in the Watcher service:

1. **Configurable Preferred Indexer Seeder Threshold**:
   - Introduce `PREFERRED_INDEXER_MIN_SEEDERS` environment variable (default: `1`).
   - If a release candidate matches `isPreferredIndexer()`, it qualifies for auto-download with `seeders >= PREFERRED_INDEXER_MIN_SEEDERS` (non-CAM). Public indexer torrents continue to require `seeders >= 10`.

2. **Resolution Gating & 720p Fallback Hierarchy**:
   - **1080p**: Top priority for series (+100 score).
   - **2160p (4K)**: Qualifies for auto-download (+100 score), ranked after 1080p to conserve disk quota.
   - **720p Fallback**:
     - *Backlog episodes* (air date > 24 hours ago, or air date unknown): Qualifies with score 100 if no 1080p/2160p candidate is found.
     - *New releases* (air date $\le$ 24 hours ago): Held during a 24-Hour Priority Window, waiting for 1080p encodes before accepting 720p.
   - **480p and CAM**: Strictly disqualified.

3. **Immediate Episodic Waterfall Chaining Engine**:
   - When an episodic Waitlist Entry is advanced (after snatch or manual pick) or created with single-episode tracking enabled:
   - The system immediately triggers `executeEpisodicWaterfall`:
     - Queries Prowlarr for the current `targetEpisode`.
     - If a Preferred Indexer release qualifies: bypasses Grace Period (0h), immediately creates a download request via `POST /requests`, advances `targetEpisode` in-place on HTTP 201, and repeats the loop.
     - If only a public tracker release qualifies: halts the waterfall at that episode, transitions status to `notified`, sends a Discord notification with Approve/Reject actions, and applies the standard Grace Period.
     - If no release qualifies: updates `lastCheckResult` diagnostic, remains in `checking`, and halts the waterfall.
     - If `targetEpisode > maxEpisodes`: transitions status to `completed` and halts.
     - If episode `airDate > now`: transitions status to `pending_release` and halts.
     - **Safety Guard**: Bounded by a maximum limit of **30 iterations** per waterfall run to prevent runaway cascades.

---

## User Stories

### Preferred Indexer Health & Seeder Qualification
1. As an anime viewer tracking a series on BJ-Share, I want releases with 1 to 9 seeders to qualify for auto-download, so that low-seeder private tracker torrents are not discarded.
2. As a system operator, I want to configure `PREFERRED_INDEXER_MIN_SEEDERS` via environment variable (defaulting to 1), so that I can adjust the seeder threshold for my tracker.
3. As a user downloading from public indexers, I want the system to continue enforcing at least 10 seeders, so that slow, unhealthy public torrents are avoided.

### Resolution Gating & Fallback
4. As a user downloading episodic series, I want 1080p releases to be preferred over 4K releases, so that my storage quota is conserved for long seasons.
5. As a user tracking an episode where only 4K is available on BJ-Share, I want the 4K release to qualify for auto-download, so that I do not miss episodes that lack 1080p encodes.
6. As a user tracking older backlog episodes (> 24h old), I want 720p releases to qualify if no 1080p/4K release exists, so that older series without 1080p encodes are not stuck forever.
7. As a user tracking newly aired episodes on release day ($\le 24$h old), I want the system to wait up to 24 hours for 1080p before accepting 720p, so that I do not get lower-quality rips prematurely.
8. As a user, I never want 480p or CAM releases to be auto-downloaded, so that my media library maintains high quality standards.

### Episodic Waterfall Automation
9. As a user adding episode 1 of a completed anime season without a season pack, I want the system to download episode 1, advance to episode 2, download episode 2, and continue down the season automatically, so that I don't have to trigger each episode manually.
10. As a user manually picking an episode from the waitlist, I want subsequent episodes to immediately waterfall if available on BJ-Share, so that manual intervention on one episode unblocks the rest of the season.
11. As a user, I want the waterfall to snatch from BJ-Share silently with 0-hour grace period, so that the cascade proceeds rapidly without waiting for manual approval.
12. As a user, if an episode in the waterfall is missing on BJ-Share but exists on a public tracker, I want the waterfall to halt and notify me via Discord, so that I can decide whether to approve the public release or wait.
13. As a user, once I approve a public release notification, I want the waterfall to resume checking sequential episodes on BJ-Share.
14. As an operator, I want the waterfall bounded by a safety cap of 30 iterations, so that any unexpected indexer loop is prevented from creating hundreds of requests.
15. As a user whose show finishes its season finale during a waterfall, I want the waitlist entry marked `completed`, so that finished shows stop querying trackers.
16. As a user whose show hits an episode that has not yet aired during a waterfall, I want the waitlist entry transitioned to `pending_release`, so that future episodes are checked only when released.
17. As an administrator reviewing logs, I want each step of the waterfall logged with iteration count, episode number, snatched title, and exit reason, so that automation behavior is completely transparent.

---

## Implementation Decisions

### 1. Seeder & Resolution Diagnostics (`apps/watcher` & `apps/api`)
- In `preferredIndexer.ts` (API and Watcher):
  - Read `PREFERRED_INDEXER_MIN_SEEDERS` from `process.env` (default `1`).
  - Update `isQualifiedPreferred(candidate)` to check `candidate.seeders >= PREFERRED_INDEXER_MIN_SEEDERS` instead of hardcoded `>= 3`.
- In `prowlarrScoring.ts` (API) and `prowlarr.ts` (Watcher):
  - In `scoreRelease`:
    - For 2160p: award 100 points for episodic media type (qualifying it for `score >= 100`).
    - For 1080p: award 100 points, but sort ahead of 2160p when scores are tied or apply a +5 resolution precedence bonus for 1080p on series.
- In `candidateDiagnostics.ts` (Watcher):
  - Accept `airDate` (optional string or Date) in the entry context.
  - Update qualification filter:
    - If `isQualifiedPreferred(c)`: requires `seeders >= PREFERRED_INDEXER_MIN_SEEDERS`, non-cam, non-CAM regex.
    - If non-preferred: requires `seeders >= 10`, `score >= 100`, non-cam, non-CAM regex.
    - Resolution filter:
      - 1080p and 2160p always pass.
      - 720p passes if no 1080p or 2160p candidates exist AND (either `airDate` is null or `Date.now() - airDate > 24 hours`).
      - 480p and unknown never pass.
  - If preferred releases qualify, pick the top scored preferred release; otherwise, if healthy public releases qualify, pick top scored public release.

### 2. Episodic Waterfall Chaining Engine (`apps/watcher`)
- Implement `executeEpisodicWaterfall(entryId: string, maxIterations = 30)` in `WaitlistCheckService` / `episodicTracking.ts`:
  - Fetch fresh entry state by ID.
  - Maintain `iterationCount = 0`.
  - While `iterationCount < maxIterations`:
    - Check if entry is `completed`, `cancelled`, or non-episodic: break loop.
    - Check if `targetEpisode > maxEpisodeNumber` (using TMDB metadata): mark `completed`, break loop.
    - Check if `airDate > now`: set status `pending_release`, update `nextAirDate`, break loop.
    - Query Prowlarr for `targetEpisode`.
    - Run `evaluateCandidatesDiagnostic`:
      - **Case 1: Qualifying Preferred Candidate**:
        - Create request payload with `waitlistId`, `downloadUrl`, metadata, season, episode.
        - Submit to API `POST /requests`.
        - If response is HTTP 201:
          - Advance entry in-place (`targetEpisode++`, recalculate air dates, status `checking`).
          - Increment `iterationCount++`.
          - Continue loop for next episode.
        - If response is HTTP 422 or error (e.g. disk threshold):
          - Log warning, update entry diagnostic, break loop.
      - **Case 2: Qualifying Public Candidate Only**:
        - Halt waterfall loop.
        - Transition entry status to `notified` with standard grace period.
        - Send Discord notification with magic link Approve/Reject buttons.
        - Break loop.
      - **Case 3: No Qualifying Candidate**:
        - Update `lastCheckResult` with diagnostic string.
        - Ensure status is `checking`.
        - Break loop.
- Hook `executeEpisodicWaterfall` into:
  - `POST /waitlist/:id/advance` (invoked when a request is created for a waitlisted episode).
  - Manual check on episodic entries when triggered.

---

## Testing Decisions

### Good Test Principles
- Test external system observable behavior at the domain and service seams, never internal implementation details.
- Mock network I/O (Prowlarr search, API HTTP client, Discord webhooks).

### Test Coverage Plan
1. **Candidate Diagnostics Unit Tests** (`apps/watcher/tests/candidate_diagnostics.test.ts`):
   - Private tracker candidates with 1–9 seeders qualify and report `"Found K qualifying releases; selecting top scored"`.
   - 2160p releases qualify for auto-download.
   - 720p qualifies for backlog episodes (> 24h old) when 1080p is absent.
   - 720p is rejected for new episodes ($\le 24$h old) during the 24-hour priority window.
   - 480p and CAM are rejected regardless of indexer.
2. **Preferred Indexer Seeder Threshold Tests** (`apps/api/tests/preferred_indexer.test.ts`, `apps/watcher/tests/preferred_indexer.test.ts`):
   - Respects custom `PREFERRED_INDEXER_MIN_SEEDERS` environment variable.
3. **Episodic Waterfall Integration Tests** (`apps/watcher/tests/episodic_waterfall.test.ts`):
   - Cascades through multi-episode backlogs (e.g. E01 $\rightarrow$ E02 $\rightarrow$ E03) in a single run when BJ-Share has qualifying releases.
   - Enforces the 30-iteration recursion cap.
   - Halts and transitions to `notified` with Discord notification when only public indexers match.
   - Halts and sets `pending_release` when next episode air date is in the future.
   - Halts and marks `completed` when the season finale is reached.

---

## Out of Scope

- Auto-downloading from public trackers without user notification and grace period.
- Multi-season waterfall (jumping across seasons automatically without explicit season selection).
- Support for 480p or CAM auto-downloads.
- UI layout modifications to the waitlist cards.

---

## Further Notes

- Cross-references: [ADR-0024](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0024-preferred-indexer-qualification-and-episodic-waterfall.md), [ADR-0016](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/docs/adr/0016-preferred-indexer-for-downloads.md), [`CONTEXT.md`](file:///c:/Users/pfabr/Documents/Git/Plex-auto-download/CONTEXT.md).
