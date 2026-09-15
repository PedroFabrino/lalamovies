# ADR 0016 — Preferred Indexer for Downloads

**Date:** 2026-09-15
**Status:** Accepted

## Context

The operator maintains an account on a curated, high-quality private torrent tracker (BJ-Share). Releases on this tracker provide accurate naming, reliable seeding, and ratio contribution. Media downloaded to local permanent storage should originate from BJ-Share whenever a healthy release is available.

However, private trackers cannot be used with Debrid providers (Real-Debrid) for Ephemeral Streaming because sharing private passkeys risks permanent account bans. Public indexers configured in Prowlarr must remain available exclusively to serve Ephemeral Streaming. Previously, the system treated all indexers identically, risking public tracker torrents being downloaded for permanent storage or chosen by the automated Watcher service while private tracker releases existed.

## Decision

Introduce a configurable **Preferred Indexer** architecture across the API, Watcher, and Web frontend:

1. **Identity Oracle**: Configure `PREFERRED_INDEXER_REGEX` (defaults to `bj[-_ ]?share`, case-insensitive). Single identity functions `isPreferredIndexer()` and `isQualifiedPreferred()` identify preferred releases across all components. When the variable is absent or empty, the feature is disabled and all indexers are treated equally.
2. **Release Scoring Bonus**: Qualified preferred releases (matching indexer, seeders ≥ 3, non-CAM) receive a `+300` score bonus in `scoreRelease()`, ensuring preferred releases win the top rank in all realistic scenarios.
3. **Recommended Release Precedence**: In `searchReleases()`, a two-step selector evaluates qualified preferred releases first (with relaxed seeder threshold ≥ 3), falling back to healthy public releases (seeders ≥ 5) only when no qualified preferred release exists.
4. **Watcher Service Filtering**: The Watcher's Prowlarr service filters candidates to Preferred Indexer releases only. Public releases are discarded before evaluation, allowing Waitlist Entries to remain in the `checking` state indefinitely until a qualifying preferred release appears on BJ-Share.
5. **Discovery Feed Dual-Candidate Binding**: Discovery items group torrents by title. When a preferred candidate wins the group, a secondary scan binds the best healthy public candidate to `streamUrl`. The frontend routes Instant Stream actions through `streamUrl` and Download requests through the preferred `downloadUrl`.
6. **Airgap Enforcement**: A preferred tracker URL is never assigned to `streamUrl` or submitted to `POST /streams`. When a card has only a preferred release and no public alternative, the Instant Stream button is suppressed.

## Consequences

- Permanent media downloads consistently route through BJ-Share when available.
- Ephemeral Streaming remains completely airgapped from private tracker passkeys.
- The Watcher will silently wait for BJ-Share releases and will not auto-download public torrents.
- Dual-candidate cards allow users to stream immediately from public sources while preserving permanent download provenance on BJ-Share.

## Considered Options

- **Prowlarr tag-based indexer separation** — rejected: requiring separate Prowlarr profiles and tag queries adds unnecessary configuration overhead compared to application-level regex filtering over unified search queries.
- **Multi-tier preference list (tiered indexers)** — rejected: unnecessary complexity for current needs; single regex covers the primary private tracker use case.
- **Auto-downloading public releases after a timeout** — rejected: contradicts operator preference for curated private tracker storage; users can still manually request public releases if desired.
