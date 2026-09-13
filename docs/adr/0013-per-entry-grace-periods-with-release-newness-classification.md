# ADR 0013 — Per-Entry Grace Periods with Release Newness Classification

**Date:** 2026-09-12
**Status:** Accepted

## Context

The Waitlist auto-download system uses a single global `NOTIFY_GRACE_HOURS` (default 6h) applied uniformly to every entry — movies, episodes, old releases, and new premieres alike. This produces two pain points:

1. A brand-new movie benefits from the 6h grace window (user can vet the torrent quality), but a back-catalogue anime episode downloaded automatically after two years of being on someone's watchlist is held up for 6 hours unnecessarily.
2. The grace period is configured once at Watcher startup via env var. There is no way to express different behaviour for different content categories without redeploying.

## Decision

Replace the single global grace period with **per-entry grace period computation**, governed by three env vars on the Watcher:

| Env Var | Default | Meaning |
|---|---|---|
| `MOVIE_GRACE_HOURS` | `6` | Grace applied to a "new" movie release |
| `EPISODE_GRACE_HOURS` | `0` | Grace applied to all episodic releases (TV Show, Anime) |
| `NEW_RELEASE_THRESHOLD_DAYS` | `30` | A release is "new" if its TMDB release/air date is within this many days of today |

**Classification rule** (applied at Waitlist Entry creation, and re-evaluated at notify time for entries whose air date was unknown at creation):

`
if mediaType === 'movie' AND daysSince(tmdbReleaseDate) <= NEW_RELEASE_THRESHOLD_DAYS:
  graceOverrideHours = MOVIE_GRACE_HOURS     (default 6h)
else:
  graceOverrideHours = EPISODE_GRACE_HOURS   (default 0h)
`

A new `graceOverrideHours` integer column is added to `watch_requests`. The `AutoDownloadSubmitter` uses `entry.graceOverrideHours ?? globalGraceHours` when computing fire time, preserving backward compatibility with entries created before this migration.

**Re-evaluation at notify time** is required for entries where `tmdbReleaseDate` was `null` at creation (future episodes not yet scheduled on TMDB). When the `WatcherPoller` transitions such an entry to `notified`, it re-fetches the now-known air date from TMDB and stamps the appropriate `graceOverrideHours` before writing `notifyAt`.

Configuration remains exclusively in env vars / `docker-compose.yml`. No Admin UI is required — these values change rarely and belong alongside Watcher startup configuration.

## Consequences

**Benefits:**
- Old series episodes and back-catalogue content fire instantly — no unnecessary 6h hold.
- New movie releases retain the 6h human review window.
- Rules are testable at creation/notify time independently of the submitter.
- Backward-compatible: the `?? globalGraceHours` fallback means existing entries continue to work.

**Costs/Risks:**
- Schema migration required on the Watcher SQLite database.
- Re-evaluation in `WatcherPoller` adds a TMDB fetch at notify time; this pattern is already established for unconfirmed season date resolution.
- If TMDB air date cannot be fetched at notify time (API error), the entry defaults to `EPISODE_GRACE_HOURS` (0h) — silent auto-download. Failure-safe: the user gets the content rather than being silently blocked.
