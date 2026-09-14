# ADR 0015 — Runtime Feature Flags and Subsystem Kill Switches

**Date:** 2026-09-14
**Status:** Accepted

## Context

As the platform expanded with multiple automated subsystems (Ephemeral Streaming, Up Next recommendations, Discovery Feed, Waitlist / Watcher automated scraping, automated disk cleanup, manual and batch downloads, and Discord alerts), failure or maintenance on any external integration (Real-Debrid, Prowlarr trackers, Discord webhooks, or host storage) risked broad service disruption without a mechanism to selectively disable problematic features on the fly.

## Decision

Introduce an Admin Feature Flags management subsystem with dedicated full-stack enforcement:
1. **Dedicated Database Storage**: Persist flags in a typed eature_flags table in the primary SQLite database (pp_db), recording id, 
ame, description, category, enabled, updated_at, and updated_by_user_id.
2. **Authoritative Gateway Architecture (No Standalone Service)**: Centralize flag management inside mdm-api. Reject creating a standalone mdm-feature-flags container to avoid unnecessary container footprint, memory overhead, and network complexity.
3. **Full-Stack Enforcement**: The API strictly guards mutating endpoints with HTTP 503 FEATURE_DISABLED responses. The web client dynamically reflects flag state: dashboard shelves collapse, disabled navigation links appear greyed out, and direct navigation attempts to disabled feature views redirect users to /dashboard.
4. **Coordinated Pause**: mdm-api coordinates with background worker containers (mdm-watcher and mdm-streamer), pausing external tracker polling loops and job execution during Degraded Mode.
5. **Admin UI & Guardrails**: A dedicated "Feature Flags" tab in the Admin Panel provides status badges and toggles. High-impact flags (Automated Cleanup, Manual Torrents, Streaming) require explicit confirmation modals detailing risks before switching off. Toggles update silently without public announcement.

## Considered Options

- **Standalone mdm-feature-flags microservice** — rejected: excessive operational complexity, container footprint, and network hops for 9 boolean flags already well-served by the primary API and SQLite database.
- **Client-only feature hiding** — rejected: failing backends or malicious requests would still hit external APIs and storage systems without backend guards.
- **Generic system_config key-value pairs** — rejected: lacks audit tracking, categorization, and human-readable metadata.
