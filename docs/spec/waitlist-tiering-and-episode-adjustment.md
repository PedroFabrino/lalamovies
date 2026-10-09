# Spec: Waitlist Tiering and In-Place Target Episode Adjustment

## Problem Statement

Users monitoring upcoming or unreleased media on the Waitlist face an unorganized, flat list of entries ordered solely by creation timestamp. This mixes actionable items (such as releases found during a grace period awaiting user confirmation) with active tracker searches, future releases months away, and completed or cancelled history. Additionally, when a user wants to advance an episodic series to the next episode (e.g., advancing from S06E03 to S06E04) or pivot from waiting for a full season pack to an individual episode, there is no way to adjust the target episode in-place. Users are forced to cancel the entire entry and create a new one from scratch, which destroys the entry history, removes co-requesters, and breaks notification continuity.

## Solution

1. **Five Collapsible Waitlist Tiers**:
   Organize the Waitlist view into five visually distinct, collapsible sections sorted by urgency and release status:
   - **Tier 1: Awaiting Confirmation** — Entries with a found candidate in `notified` status during an active grace period awaiting user decision, plus in-flight `triggered` entries being dispatched for download.
   - **Tier 2: Released — Searching** — Active entries (`pending_release` or `checking`) whose target episode or movie air date has already passed ($\le$ current date), currently being polled across trackers.
   - **Tier 3: Upcoming — Scheduled** — Active entries with a confirmed future TMDB air date ($>$ current date).
   - **Tier 4: Announced — Unscheduled** — Active entries without a confirmed air date on TMDB (`tmdbReleaseDate` is null or empty).
   - **Tier 5: Archive** — Completed, cancelled, and rejected entries. Collapsed by default.

2. **Section Controls & Persistence**:
   - Each tier displays an icon, section title, counter badge, and collapse/expand toggle.
   - Section collapse states persist across browser sessions in `localStorage`.
   - Empty tiers display a subtle empty placeholder when expanded rather than disappearing, ensuring users understand the system state.
   - A global "Expand All / Collapse All" toggle in the top toolbar controls all tiers at once.

3. **In-Place Target Episode Adjustment**:
   - An inline stepper/popover on active episodic cards allows the primary requester or an Admin to adjust the target `seasonNumber` and `targetEpisode` (including switching between a single episode and a full season pack).
   - Updating the target episode revokes any active Discord notification, clears stale candidates, synchronously queries TMDB for the new episode's air date, resets status to `pending_release`, and triggers an immediate background tracker check.
   - Archived entries (`completed`, `cancelled`, `rejected`) remain immutable.

## User Stories

1. As a user, I want entries awaiting my confirmation to appear at the very top of the Waitlist, so that I immediately see releases requiring my approval without scrolling through dozens of pending titles.
2. As a user, I want to see releases currently in-flight to download in the top section with a visual submitting indicator, so that I know my approval was accepted and the download is starting.
3. As a user, I want titles that have already aired but haven't been snatched yet grouped together under "Released — Searching", so that I can monitor which available media is still being searched on trackers.
4. As a user, I want future releases with confirmed air dates grouped together under "Upcoming — Scheduled", so that I can see what will air soon along with their premiere dates.
5. As a user, I want media without air dates grouped separately under "Announced — Unscheduled", so that I can distinguish confirmed schedules from unannounced productions.
6. As a user, I want past completed, cancelled, and rejected entries grouped in an "Archive" section that is collapsed by default, so that historical clutter does not distract from active entries.
7. As a user, I want to collapse or expand any of the five tier sections individually, so that I can focus only on the tiers relevant to me.
8. As a user, I want my section collapse preferences remembered across browser reloads, so that I don't have to re-collapse sections every time I visit the page.
9. As a user, I want to see count badges on each section header, so that I immediately know how many items reside in each tier even when sections are collapsed.
10. As a user, I want an empty tier section to display a helpful placeholder message when expanded, so that I know the tier exists and currently has zero entries.
11. As a user, I want a global "Expand All / Collapse All" action button, so that I can quickly view or hide all tiers with a single click.
12. As a user, I want to manually update the target season or episode of my active series waitlist entry, so that I can track the next episode without deleting and recreating the entry.
13. As a user, I want to switch an active series entry between a full season pack and a single episode, so that I can track weekly releases if a season pack is unavailable.
14. As a user, I want adjusting the target episode to automatically update the release date from TMDB for the new episode, so that the entry automatically re-categorizes into the correct tier.
15. As a user, I want adjusting the target episode on a notified entry to automatically cancel the old Discord approval notification and clear the old torrent candidate, so that obsolete releases are not mistakenly downloaded.
16. As an Admin, I want to adjust the season and episode on any user's active waitlist entry, so that I can assist users or correct bad tracking targets.
17. As a co-requester, I want episode adjustment controls to be disabled for me, so that only the primary requester or an Admin can alter what media is being tracked.
18. As a user, I want episode adjustment controls disabled on completed or cancelled entries, so that historical records remain immutable.

## Implementation Decisions

1. **Waitlist Tier Partitioning**:
   - Categorization logic lives in a dedicated composable or helper (`useWaitlistTiers`), evaluating entries reactively into five arrays:
     - `awaitingConfirmation`: `status === 'notified'` or `status === 'triggered'`
     - `releasedSearching`: `(status === 'pending_release' || status === 'checking') && isReleased(entry)` where `isReleased` checks whether the target episode air date (or movie release date) is $\le$ today.
     - `upcomingScheduled`: `(status === 'pending_release' || status === 'checking') && hasFutureAirDate(entry)` where `airDate > today`.
     - `announcedUnscheduled`: `(status === 'pending_release' || status === 'checking') && !hasAirDate(entry)` where air date is null or empty.
     - `archive`: `status === 'completed' || status === 'cancelled' || status === 'rejected'`.
   - Episodic entries evaluate the specific air date of the target episode via TMDB season details, falling back to season air date.

2. **Persistence and Empty Tiers**:
   - Section expansion state is stored in `localStorage` under key `mdm_waitlist_tier_collapse` as an object `{ awaiting: boolean, released: boolean, upcoming: boolean, unscheduled: boolean, archive: boolean }`.
   - Default state: `{ awaiting: true, released: true, upcoming: true, unscheduled: true, archive: false }`.
   - Empty tiers render a styled empty state card with tier-appropriate contextual messaging (e.g., "No releases awaiting confirmation", "No released media currently searching").

3. **In-Place Target Episode Adjustment Seam**:
   - New endpoint: `PATCH /waitlist/:id` on the Watcher Service, exposed through the Main API proxy at `PATCH /waitlist/:id`.
   - Request payload: `{ seasonNumber?: number, targetEpisode?: number | null }`.
   - Access control: Validates caller is the primary requester (`entry.userId === callerId`) or an Admin (`callerRole === 'admin'`). Rejects unauthorized edits with HTTP 403.
   - Status validation: Rejects edits on entries with status `completed`, `cancelled`, or `rejected` with HTTP 400.
   - State reset sequence:
     1. If `entry.status === 'notified'` and `entry.discordMessageId` exists, deletes the Discord notification message.
     2. Clears candidate release fields (`prowlarrReleaseTitle = null`, `prowlarrReleaseMagnet = null`, `prowlarrReleaseScore = null`, `notifyAt = null`, `discordMessageId = null`).
     3. Synchronously queries TMDB for the new episode's air date (`tmdbReleaseDate`).
     4. Updates `seasonNumber`, `targetEpisode`, `tmdbReleaseDate`, `status = 'pending_release'`, and `updatedAt`.
     5. Asynchronously triggers a tracker check (`checkWaitlistEntry`) for the new target.
     6. Returns the updated entry with HTTP 200.

4. **UI Card Component & Popover**:
   - Add an edit trigger button next to the season/episode tag on active series cards.
   - Displays a popover with Season input, Episode input, and a "Season Pack" toggle.
   - Disables submission if season is $< 1$ or episode is $< 1$ (when not season pack).
   - Loading indicator on save with immediate local store update on success.

## Testing Decisions

- **Seam**: HTTP API tests for `PATCH /waitlist/:id` verifying permission guards, state reset, candidate clearing, Discord message deletion, and TMDB air date updates.
- **Frontend Unit Tests**: Unit tests for tier categorization logic verifying that all combinations of statuses and dates place items into the correct tier.
- **Regression Protection**: Ensures existing auto-snatch and episodic waterfall mechanics are unaffected by in-place target updates.

## Out of Scope

- Auto-updating completed entries into subsequent seasons without user action (handled by existing Watch for Next Episodes / Episodic Waterfall when enabled).
- Re-activating cancelled or completed entries through episode adjustment (users must create a new entry for new media commitments).
- Bulk editing target episodes across multiple entries simultaneously.

## Further Notes

- Architecture respects line count limits: UI additions will be extracted into dedicated components (`WaitlistTierSection.vue`, `WaitlistEpisodeAdjustPopover.vue`) to keep `WaitlistView.vue` well under 400 lines.
