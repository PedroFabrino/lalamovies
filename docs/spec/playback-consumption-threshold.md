# 90% Playback Consumption Threshold for Media Cleanup — Spec

## Problem Statement

In Media Download Manager (MDM), media requests (movies and episodic season packs) are marked as **Fully Consumed** when requesters and co-requesters have watched them. Fully Consumed media is categorized into the highest priority cleanup tier (Tier 1 for consumed episodes, Tier 2 for fully consumed requests) and is scheduled for eviction first whenever disk storage pressure or the 80% quota threshold is reached.

Currently, `JellyfinService.getPlayHistory()` checks:
```typescript
if (item.Path && (item.UserData?.LastPlayedDate || item.UserData?.Played)) {
  history[item.Path] = item.UserData.LastPlayedDate || '1970-01-01T00:00:00.000Z';
}
```
Because Jellyfin updates `UserData.LastPlayedDate` the instant a user starts playing or pauses a media item (even 2 minutes into a 2-hour movie), MDM records this date and treats the media as "watched" by the requester. Consequently:
1. **Premature Eviction of In-Progress Media**: A movie or episode paused midway through playback is marked as "watched" by the requester, causing unfinished media to be scheduled for deletion under disk pressure.
2. **False Completion**: The Admin Cleanup tab and episode drawers display "Watched" and "Fully Consumed" badges on items users have barely started.

---

## Solution

Introduce a unified, reusable consumption evaluation utility that enforces a **90% playback completion threshold** across MDM:

1. **Reusable Consumption Utility (`playbackConsumption.ts`)**:
   - Provide a pure function `isMediaFullyConsumed(progress, threshold = 0.9)` that evaluates:
     - `played === true` (explicitly flagged as played by Jellyfin or user), OR
     - `playbackPositionTicks / runTimeTicks >= threshold` (default `0.90` / 90%).
   - Export standard types `PlaybackProgress` and `PlayHistoryEntry` with `lastPlayedDate` and `isFullyConsumed`.

2. **Jellyfin Service Integration**:
   - Update `JellyfinService.getPlayHistory()` to include `RunTimeTicks` in query fields (`Fields=UserData,Path,RunTimeTicks`).
   - Return structured play history mapping each path to its `lastPlayedDate` and `isFullyConsumed` boolean status.
   - For backward compatibility with existing tests and mocks, accept entries that are either ISO date strings (treated as fully consumed) or structured entries.

3. **Cleanup Service Consumption Partitioning**:
   - In `CleanupService.refreshPlayHistory()`:
     - Use `lastPlayedDate` to update `lastPlayedAt` on requests and episodes so least-recently-used sorting reflects any playback activity.
     - Only consider an episode or request as **consumed by a requester** if `isFullyConsumed === true` ($\ge 90\%$ watched or `Played = true`).
     - Items paused below 90% retain their updated `lastPlayedAt` timestamp but **are not** flagged as `isFullyConsumed`.

---

## User Stories

1. As a viewer who paused a movie 20 minutes in, I want the movie to remain protected from the "Fully Consumed" deletion tier, so that my unfinished movie is not automatically deleted to free up disk space.
2. As a viewer who watched past 90% of a movie (including through credits), I want the movie to be recognized as fully consumed, so that it can be cleanly reclaimed when disk space is needed.
3. As a user watching an episode in a season pack, I want only episodes I have watched $\ge 90\%$ to be eligible for episodic pruning, while episodes I started and paused stay safely on disk.

---

## Acceptance Criteria

- [ ] A reusable function `isMediaFullyConsumed` evaluates whether an item has been watched $\ge 90\%$ or marked `Played = true`.
- [ ] Items with playback below 90% and `Played = false` return `isFullyConsumed = false`.
- [ ] `JellyfinService.getPlayHistory` requests `RunTimeTicks` and returns `isFullyConsumed` status per media file.
- [ ] `CleanupService.refreshPlayHistory` only marks items as consumed by requesters if `isFullyConsumed === true`.
- [ ] Partially watched items (< 90%) have their `lastPlayedAt` timestamp updated for activity tracking, but are not added to `fullyConsumedRequestIds`.
- [ ] Unit tests verify that 10%, 50%, and 89% playback do not trigger full consumption, while 90%+ and `Played = true` do.
