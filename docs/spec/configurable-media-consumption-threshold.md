# Configurable Media Playback Consumption Threshold in Admin Panel — Spec

## Problem Statement

Media Download Manager (MDM) determines whether a movie or episode is "Fully Consumed" using a completion threshold (by default, 90% of playback or `Played = true`). Fully Consumed media is prioritized for cleanup whenever storage pressure or the 80% quota threshold is reached.

Currently, this 90% threshold is hardcoded in the backend utility (`DEFAULT_CONSUMPTION_THRESHOLD = 0.9`). Different administrators have different preferences:
- Some prefer a lower threshold (e.g. 75%–80%) to treat items as watched before extended end credits, epilogues, or recap segments.
- Others prefer a higher threshold (e.g. 95%–99%) or stricter completion before media becomes eligible for eviction.

Without an administrative setting, users cannot adjust this behavior without changing application source code.

---

## Solution

Expose a **Media Consumption Threshold (%)** setting in the MDM Admin Panel that dynamically governs when media is marked as fully consumed across cleanup cycles:

1. **System Configuration Setting (`system_config`)**:
   - Store setting key: `media_consumption_threshold`.
   - Type: Integer percentage between 1 and 100.
   - Default: `90`.

2. **Admin API Validation & Persistence (`apps/api/src/routes/admin/config.ts`)**:
   - In `PUT /admin/config`, validate that `media_consumption_threshold` is an integer between 1 and 100.
   - Return updated configuration map in `GET /admin/config`.

3. **Admin Panel UI (`AdminConfigTab.vue` & `useAdminConfig.ts`)**:
   - In `AdminConfigTab.vue`, add a numeric input field in the System Settings grid:
     - Field: `Media Consumption Threshold (%)`
     - Range: `1` to `100`
     - Helper text: *Minimum percentage of playback required to mark a movie or episode as Fully Consumed.*
   - In `useAdminConfig.ts`, initialize `media_consumption_threshold: 90`, populate it on `loadConfig()`, and include it when saving settings.

4. **Dynamic Consumption Evaluation (`CleanupService` & `JellyfinService`)**:
   - In `CleanupService.refreshPlayHistory()`, read `media_consumption_threshold` from `system_config` (falling back to 90 if unset).
   - Pass threshold fraction ($T = \frac{\text{value}}{100}$) to `JellyfinService.getPlayHistory(userId, threshold)` and `isMediaFullyConsumed(progress, threshold)`.

---

## User Stories

1. As an administrator who dislikes waiting through 15-minute credit rolls, I want to set the consumption threshold to 80% in the Admin Panel, so that movies I finished watching before the credits are recognized as fully consumed.
2. As an administrator with strict viewing habits, I want to increase the consumption threshold to 95%, so that media is only eligible for deletion when essentially 100% watched.
3. As an administrator opening the Admin Panel, I want to see the current configured consumption percentage and receive validation feedback if an invalid number (<1 or >100) is submitted.

---

## Acceptance Criteria

- [ ] `media_consumption_threshold` is stored and retrieved in `system_config` table (default 90).
- [ ] `PUT /admin/config` validates `media_consumption_threshold` as an integer between 1 and 100.
- [ ] Admin panel UI (`AdminConfigTab.vue`) displays a numeric input for Media Consumption Threshold (%) with helper text.
- [ ] `useAdminConfig.ts` loads and saves `media_consumption_threshold`.
- [ ] `CleanupService.refreshPlayHistory()` dynamically queries the configured threshold from `system_config` and applies it when evaluating consumption.
- [ ] Automated tests verify input validation, admin UI rendering/saving, and dynamic threshold consumption in cleanup candidate evaluation.
