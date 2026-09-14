# Preferred Indexer (BJ-Share) — Spec

## Problem Statement

The operator runs a private torrent tracker account on BJ-Share, a high-quality, curated private tracker. All media downloaded to local permanent storage should come from BJ-Share whenever possible, because its releases are consistently well-named, properly seeded, and carry the operator's ratio. However, BJ-Share is incompatible with Real-Debrid streaming (passkey leakage would ban the account), so public indexers must remain available in Prowlarr exclusively to serve the Ephemeral Streaming tier. Currently the system treats all indexers equally — there is no way to guarantee BJ-Share is preferred for downloads, and there is no mechanism to prevent the Watcher Service from auto-downloading a Waitlist Entry from a random public tracker just because it scored higher on the day.

## Solution

Introduce a configurable **Preferred Indexer** concept, identified by an environment variable regex (`PREFERRED_INDEXER_REGEX`, defaulting to a BJ-Share pattern). Releases from the Preferred Indexer receive a large Release Scoring bonus (+300 points) so they nearly always win the Recommended Release slot in Step 3. A secondary override ensures the Preferred Indexer always holds the Recommended slot as long as it has a healthy-enough release (≥ 3 seeders, non-CAM, positive score), even if score arithmetic alone would not produce that result. The Watcher Service is restricted to auto-downloading only from the Preferred Indexer, keeping automated downloads on BJ-Share exclusively. The Discovery Feed is upgraded to carry a secondary public Release Candidate per card, so the Instant Stream action uses a public release's magnet while the Download action uses the Preferred Indexer release — the Private Tracker Airgap strictly prevents any Preferred Indexer URL from being forwarded to Real-Debrid. The UI gains a "⭐ Preferred" badge to communicate tracker provenance to users.

---

## User Stories

### Preferred Release Recommendation

1. As a User searching for a Movie, I want the system to automatically select a BJ-Share release as the Recommended Release whenever one is available and healthy, so that I am always downloading from the tracker the operator trusts most.
2. As a User searching for a TV Show or Anime, I want BJ-Share releases to appear at the top of the Release Candidate explorer and be pre-selected, so that I rarely need to scroll to find the preferred option.
3. As a User, I want to see a "⭐ Preferred" badge on any Release Candidate that comes from the configured Preferred Indexer, so that I can immediately identify which releases are operator-endorsed.
4. As a User, I want the Preferred Indexer release to remain the Recommended Release even if a public tracker has slightly more seeders, so that I am not misled into choosing an inferior source.
5. As a User, I want the system to fall back to the best healthy public release as Recommended if no Preferred Indexer release qualifies (e.g. BJ-Share has zero seeders or only a CAM), so that my download is never blocked indefinitely.
6. As a User, I want to see a low-seeder warning on a Preferred Indexer release (e.g. 3–4 seeders) so I understand the download may be slower, while still having it pre-selected as Recommended.

### Scoring & Release Explorer

7. As a User browsing the Release Candidate explorer, I want Preferred Indexer releases to be ranked first within the explorer, so that I can confirm the preferred choice or compare it directly against the next-best public alternative.
8. As a User, I want the existing sort options (Score, Seeders, Size) to continue working across all candidates including Preferred Indexer ones, so that I retain full control over my selection if I choose to override the recommendation.
9. As a User, I want to be able to manually select a public tracker release instead of the Preferred Indexer one, so that I am not hard-locked into the preferred source if I have a specific reason to choose otherwise.

### Watcher Service & Waitlist Automation

10. As an Admin, I want the Watcher Service to auto-download Waitlist Entries exclusively from the Preferred Indexer, so that the automated library never pulls from unknown or lower-quality public sources.
11. As an Admin, I want Waitlist Entries to remain in the `checking` state indefinitely when only public tracker releases exist, so that the system waits patiently for BJ-Share to index the content rather than downloading an inferior copy.
12. As an Admin, I want the existing quality gate (score ≥ 100, seeders ≥ 10, non-CAM, correct episode match) to still apply to Preferred Indexer releases before auto-download is triggered, so that bad or wrongly-matched BJ-Share releases are not pulled automatically.

### Discovery Feed — Dual-Candidate Binding

13. As a User browsing the Discovery Feed, I want a card whose primary candidate is from BJ-Share to still show an "⚡ Instant Stream" button when a public release for the same title is available in the cache, so that I can choose to stream immediately without losing the option to download from BJ-Share later.
14. As a User clicking "⚡ Instant Stream" on a Discovery Feed card where the download source is BJ-Share, I want the stream to use the public tracker's release — not the BJ-Share one — so that my private tracker passkey is never sent to Real-Debrid.
15. As a User clicking "Request" on a Discovery Feed card with a BJ-Share primary candidate, I want the Download Request to use the BJ-Share magnet link, so that the permanent local copy comes from the preferred tracker.
16. As an Admin, I want the system to guarantee at the backend that no BJ-Share magnet URL is ever included in a stream creation payload, so that even a malicious or buggy frontend client cannot trigger a passkey leak.
17. As a User browsing the Discovery Feed, I want a "⭐ Preferred" badge on the indexer label of cards where BJ-Share is the primary source, so that I can see which content is already available on my preferred tracker.
18. As a User viewing a Discovery Feed card where BJ-Share is the only available source and no public release exists, I want the "⚡ Instant Stream" button to be absent, so that I am not tempted to stream from a source that would violate the Private Tracker Airgap.

### Administration & Configuration

19. As an Admin, I want to configure the Preferred Indexer by setting a single environment variable (`PREFERRED_INDEXER_REGEX`), so that I can change the preferred tracker without modifying application code.
20. As an Admin, I want the environment variable to use a case-insensitive regex so that minor variations in the Prowlarr indexer display name (e.g. "BJ-Share", "bjshare", "BJ Share") all match correctly.
21. As an Admin, I want the Preferred Indexer behaviour to be entirely disabled (all indexers treated equally) when `PREFERRED_INDEXER_REGEX` is unset or empty, so that the feature is opt-in and does not affect installations without a private tracker.

---

## Implementation Decisions

### Architectural Seams

- **`isPreferredIndexer(indexerName)`**: A small utility function reading `PREFERRED_INDEXER_REGEX` from the environment. Returns `true` when the indexer name matches the pattern. This function is the single identity oracle for preferred status and is called everywhere preferred logic is needed (scoring, recommendation override, Watcher filtering, Discovery binding).
- **`isQualifiedPreferred(candidate)`**: A composed guard combining `isPreferredIndexer`, seeders ≥ 3 threshold, and non-CAM source check. This is the gatekeeper used wherever a preferred release must actually be healthy enough to act on.
- **`isPreferred: boolean` on `ReleaseCandidate`**: The existing `ReleaseCandidate` type is extended with this field, set during Prowlarr search result processing. The field propagates through all downstream consumers (API search results, Discovery items, Watcher candidates) so no layer needs to re-derive it.

### Release Scoring Bonus

- The `scoreRelease()` function awards **+300 points** to any `ReleaseCandidate` where `isQualifiedPreferred()` is true.
- This bonus is large enough to overcome resolution, codec, source, and seeder differentials in all practical cases, without guaranteeing victory for completely dead (< 3 seeder) or CAM preferred releases.

### Recommended Release Precedence

- `searchReleases()` produces a `recommended` field. The current selection logic (`candidates.find(c => !c.isLowHealth && c.score > 0)`) is replaced with:
  1. First candidate that is `isQualifiedPreferred` and has `score > 0` (BJ-Share with ≥ 3 seeders wins here).
  2. Else, first candidate with `!isLowHealth && score > 0` (public tracker fallback with ≥ 5 seeders).
  3. Else `null`.
- This ensures a BJ-Share release with 3–4 seeders (technically `isLowHealth`) can still be Recommended, while the standard health threshold applies for public fallbacks.

### Watcher Service — Preferred-Only Filtering

- `WatcherProwlarrService.searchForEntry()` tags each candidate with `isPreferred` during result processing (using the same `isPreferredIndexer` logic).
- Before returning candidates to `WatcherPoller`, all non-preferred candidates are discarded.
- The existing quality gate (`score ≥ 100`, `seeders ≥ 10`, non-CAM, episode match) in `WatcherPoller.pollOnce()` continues to apply unchanged on top of the preferred filter. This means BJ-Share releases must still be healthy and correctly matched before auto-download triggers.

### Discovery Feed — Dual-Candidate Binding

- `DiscoveryItem` gains two optional fields: `streamUrl` and `streamIndexer`. These are populated with the best public (non-preferred, non-private) release found for the same deduplication group, if one exists.
- The deduplication and enrichment loop in `DiscoveryService` is extended: for groups where the winner is a preferred candidate, a secondary pass scans the group for the highest-scoring public candidate and attaches its URL as `streamUrl`.
- **Airgap enforcement at the backend**: `streamUrl` is only ever populated from candidates where `isPrivateTracker === false` AND `isPreferred === false`. The preferred candidate's `downloadUrl` is never assigned to `streamUrl` under any code path.
- The frontend `DiscoveryFeed` reads `streamUrl` exclusively when constructing the payload for Instant Stream actions on dual-candidate cards. The existing `assertPublicTracker` middleware on `POST /streams` provides a final server-side backstop against any magnet with a passkey or `isPrivateTracker: true`.

### Environment Variable

- `PREFERRED_INDEXER_REGEX` — case-insensitive regex string. Default: `bj[-_ ]?share` (with `(?i)` flag applied at runtime). When absent or empty, `isPreferredIndexer()` returns `false` for all indexers, disabling the feature entirely.

### Domain Glossary Addition

- **Preferred Indexer**: A private torrent tracker configured as the operator's preferred download source via `PREFERRED_INDEXER_REGEX`. Release Candidates from the Preferred Indexer receive a Release Scoring bonus and are always favoured as the Recommended Release when they meet the minimum health threshold (≥ 3 seeders, non-CAM). Preferred Indexer releases are excluded from Debrid Provider ingestion by the Private Tracker Airgap. The Watcher Service will only auto-download Waitlist Entries from the Preferred Indexer.

---

## Testing Decisions

### What Makes a Good Test

Tests must assert observable, external behaviour across module boundaries — not internal implementation details. For this feature, that means:

- Assert on the `recommended` field of `searchReleases()` responses, not on internal score variables.
- Assert on the list of candidates returned by `WatcherProwlarrService.searchForEntry()` (only preferred ones come out), not on the internal filter step.
- Assert that `DiscoveryItem.streamUrl` is always a public URL or absent — never a preferred-tracker URL.
- Assert that `POST /streams` returns 400 when a preferred-tracker magnet is submitted, testing the middleware boundary.

### Modules Under Test

| Module | Test focus |
|---|---|
| `ProwlarrService.scoreRelease()` | Preferred candidate scores ≥ 300 points higher than an equivalent public candidate |
| `ProwlarrService.searchReleases()` — `recommended` field | Preferred candidate (≥ 3 seeders) wins over healthy public candidate; dead preferred (< 3 seeders) does not win; CAM preferred does not win |
| `ProwlarrService.searchReleases()` — `isPreferred` flag | Set correctly for preferred-indexer candidates; `false` for public candidates |
| `WatcherProwlarrService.searchForEntry()` | Returns only preferred candidates; returns empty array when no preferred candidates exist |
| `WatcherPoller.pollOnce()` | Does not notify/trigger when only public candidates exist; does notify when preferred candidate passes quality gate |
| `DiscoveryService.getFeed()` | `streamUrl` populated only from public candidate; absent when no public alternative; `downloadUrl` never appears as `streamUrl` |
| `assertPublicTracker` middleware | Rejects preferred-tracker magnets (passkey) and `isPrivateTracker: true` payloads at `POST /streams` boundary |

### Prior Art in the Codebase

- `apps/api/tests/prowlarr_privacy.test.ts` — existing pattern for asserting `isPrivateTracker` flag propagation through search results; extend this file for `isPreferred`.
- `apps/api/tests/prowlarr.test.ts` — existing scoring tests using `scoreRelease()` directly; extend for preferred bonus.
- `apps/watcher/tests/watcher_poller.test.ts` — existing pattern for mocking Prowlarr search results and asserting notification/no-notification outcomes.
- `apps/api/tests/discovery.test.ts` — existing pattern for asserting `DiscoveryItem` shape; extend for `streamUrl`/`isPreferred` fields.

---

## Out of Scope

- **Prowlarr tag-based indexer targeting** (querying BJ-Share separately from public indexers) — decided against for now; application-level filtering over a unified query is sufficient and simpler.
- **Waitlist dashboard alert for public-only availability** — items silently wait in `checking`; no UI signal planned in this spec.
- **Dedicated "New Stream" entry point** in the top navigation — planned as a future enhancement; not part of this spec.
- **Multi-tier preference** (BJ-Share first, then other private trackers, then public) — single PREFERRED_INDEXER_REGEX is sufficient for current needs.
- **Preferred Indexer ratio tracking or seeding management** — out of scope; qBittorrent handles seeding independently.

---

## Further Notes

- The `PREFERRED_INDEXER_REGEX` is matched against the indexer's display name as returned by Prowlarr's `/api/v1/indexer` endpoint (the `name` field) and against the `indexer` field in search results. Operators should verify the exact name Prowlarr uses for their BJ-Share indexer and confirm it matches the regex on first setup.
- The +300 scoring bonus was chosen to overcome the maximum possible seeder bonus (capped at +50) plus a full resolution+codec+source score (≤ +135), meaning BJ-Share will win in all realistic scenarios without making the score meaninglessly large.
- The ≥ 3 seeder threshold for preferred candidates (vs. ≥ 5 for public fallback) reflects the reality that BJ-Share is a curated tracker where even low-seeded releases are trustworthy and will eventually seed up, unlike random public trackers where low seeds often indicate abandonware.
