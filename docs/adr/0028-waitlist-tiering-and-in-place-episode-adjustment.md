# 0028. Waitlist Tiering and In-Place Episode Adjustment

We partitioned the Waitlist view into five collapsible visual tiers (`Awaiting Confirmation`, `Released — Searching`, `Upcoming — Scheduled`, `Announced — Unscheduled`, and `Archive`) and introduced in-place Target Episode Adjustment via `PATCH /waitlist/:id`.

## Context & Decision

Waitlist Entries were previously rendered in an unsegmented flat list ordered solely by creation timestamp, mingling notified snatches with distant unreleased media and archived records. Furthermore, tracking sequential episodes or adapting to missing season packs forced users to cancel and recreate entries, destroying co-requester lists and Discord notification threads.

We decided to:
1. Classify entries on the frontend into five distinct tiers based on lifecycle status (`notified`, `triggered`, `pending_release`, `checking`, `completed`, `cancelled`, `rejected`) and target air date compared against current date.
2. Persist tier collapse states in `localStorage`, defaulting Tiers 1–4 to expanded and Tier 5 (Archive) to collapsed, while displaying count badges and empty tier indicators.
3. Allow primary requesters and Admins to perform in-place Target Episode Adjustment on active episodic entries. Updating the season or episode revokes any outstanding Discord notifications, clears pending candidates, synchronously refreshes TMDB air dates, resets status to `pending_release`, and dispatches a background tracker search. Archived entries remain immutable.
