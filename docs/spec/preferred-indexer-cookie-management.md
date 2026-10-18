# Preferred Indexer (BJ-Share) Cookie Management & Expired Status Warning Banner — Spec

## Problem Statement

The operator uses BJ-Share as the primary Preferred Indexer for curated, ratio-tracked releases. Access to BJ-Share requires active session cookies (`__cfbbid` and `session`) in Prowlarr. These session cookies expire periodically or when revoked. When expired, Prowlarr indexer queries fail, triggering indexer backoff/disabled states and causing searches and automated Watcher downloads on the Preferred Indexer to halt. 

Currently:
1. The operator has to access Prowlarr directly (external port/UI) to inspect or update the cookie.
2. There is no in-app visibility or proactive alerting when the session cookie expires, so failures are only discovered after intended downloads fail to snatch.

## Solution

1. **Prowlarr Preferred Indexer API & Management**:
   - Provide administrative endpoints (`GET /admin/preferred-indexer/cookie`, `PUT /admin/preferred-indexer/cookie`, `POST /admin/preferred-indexer/cookie/test`) that locate the preferred indexer via `PREFERRED_INDEXER_REGEX` (e.g. BJ-Share), retrieve its status, run verification queries (`POST /api/v1/indexer/test`), and update the cookie via Prowlarr's API (`PUT /api/v1/indexer/{id}`).
   - Prowlarr automatically validates the cookie on save and test; validation errors from Prowlarr are relayed directly to the operator.
2. **Admin Panel System Config Management**:
   - Provide a dedicated **Preferred Indexer (BJ-Share)** card inside the Admin Panel (under System Config) displaying current connection status (`Healthy`, `Expired / Failing`, `Missing Cookie`), last verified timestamp, a masked preview of the active cookie, and an input form to paste, test, and save updated cookies.
   - Decompose `AdminConfigTab.vue` (currently > 600 lines) into focused sub-components to strictly uphold the ≤ 400 lines architectural rule.
3. **Global Admin Warning Banner**:
   - In `Navbar.vue` (rendered on all pages), if an authenticated user is an Admin and the Preferred Indexer cookie is expired or failing, display an alert banner:
     "⚠️ BJ-Share cookie has expired or is invalid. Searches and auto-downloads on preferred indexer are paused." with a quick link to `Admin -> System Config` to update the cookie.
   - Provide a lightweight polling / status check mechanism so admins are promptly alerted without overloading Prowlarr.

---

## User Stories

1. As an Admin, I want to view the current status of the BJ-Share cookie in the Admin Panel without opening Prowlarr directly.
2. As an Admin, I want to paste a new cookie string in the Admin Panel and verify it immediately against BJ-Share through Prowlarr before saving.
3. As an Admin, I want clear feedback if an updated cookie is rejected by BJ-Share/Prowlarr so I can re-copy valid session headers.
4. As an Admin browsing any page in the application, I want to see a persistent warning banner if the BJ-Share cookie is expired, so I can fix it immediately before releases are missed.
5. As an Admin clicking the banner, I want to be navigated directly to the cookie configuration in the Admin Panel.
6. As a non-Admin user, I should not see the admin cookie warning banner or have access to indexer cookie endpoints.

---

## Implementation Decisions

### Architectural Seams

- **`apps/api/src/services/prowlarr/prowlarrCookie.ts`**:
  Dedicated service module encapsulating all cookie inspection, testing, and mutation logic for the preferred indexer. Keeps `prowlarr.ts` under line limits.
- **`apps/api/src/routes/admin/preferredIndexer.ts`**:
  Dedicated admin route module for `/admin/preferred-indexer/*` endpoints, registered under `/admin` with `adminGuard`.
- **`apps/web/src/components/admin/AdminPreferredIndexerCard.vue`**:
  Dedicated admin card component for viewing status, testing, and saving the cookie.
- **`apps/web/src/components/admin/AdminConfigTab.vue` Decomposition**:
  Extract `AdminJellyfinCard.vue` and `AdminTranscriptionCard.vue` to ensure all components stay well under 400 lines.
- **`apps/web/src/components/PreferredIndexerAlertBanner.vue`**:
  Admin-only banner mounted in `Navbar.vue` or `App.vue` that reacts to cookie health status.
