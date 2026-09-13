# ADR 0014 — Fully Consumed Tier in Cleanup Priority

**Date:** 2026-09-13
**Status:** Accepted

## Context

The Cleanup Policy previously ordered candidates by least-recently-played then oldest request. This meant content that had never been opened could be scheduled for deletion before content that every requester had already watched — media that has served its purpose and occupies space that could be freed first.

## Decision

Introduce a **Fully Consumed** tier as the first priority in automatic Cleanup. A DownloadRequest is Fully Consumed when at least one file under its `jellyfinPath` appears in the Jellyfin play history of every requester (the original `userId` plus all `requestCoRequesters`). Fully Consumed requests are scheduled for deletion before any unwatched content. Within the Fully Consumed tier, items are ordered by `lastPlayedAt ASC` (oldest fully-consumed content goes first).

The check is performed by calling `getPlayHistory(jellyfinUserId)` once per requester during `refreshPlayHistory`. If a requester's Jellyfin account no longer exists, they are treated as having watched (no account means no access, no objection to deletion).

## Considered Options

- **Per-file/episode deletion within a Season Pack** — rejected: no per-file DB tracking exists; filesystem surgery on a live torrent directory is fragile and a schema change would be significant.
- **Strict completion check (all files played by all requesters)** — rejected: requires a filesystem scan at cleanup time to enumerate files; a near-complete season pack (9/10 episodes watched) would never qualify. `Started` is a sufficient proxy for `consumed`.
- **Only the original requester's watch status** — rejected: co-requesters have equal stake in the content.
