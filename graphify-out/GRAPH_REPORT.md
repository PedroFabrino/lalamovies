# Graph Report - Plex-auto-download  (2026-11-01)

## Corpus Check
- 600 files · ~375,596 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 9, .example 3, .css 1)

## Summary
- 3793 nodes · 9197 edges · 193 communities (156 shown, 37 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 395 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `87339072`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TelegramBotClient
- SymlinkManager
- watcherPoller.ts
- useFeatureFlags
- formatters.ts
- ref_drizzle_orm
- ref_fastify
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- Spec: Telegram Bot Client with Intent Parsing
- ref_vitest
- useAdminActivity.ts
- DashboardView.vue
- devDependencies
- dev-setup.mjs
- WaitlistCard.vue
- Recommended Implementation Order
- WaitlistView.vue
- IEpisodesRepository
- DiscoveryFeed.vue
- api/package.json
- AnimeCard.vue
- telegram-bot/package.json
- Context Domain Model Document
- WatchRequest
- serviceContainer.ts
- web/package.json
- PromotionModal.vue
- useRequestStep1
- Header.vue
- internal.ts
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- useWaitlistMatching.ts
- compilerOptions
- animeSeasonal.test.ts
- WaitlistAddModal.vue
- unarchive.ts
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- .refreshPlayHistory
- SubtitlePickerModal.vue
- useAdminData
- TelegramPairingService
- compilerOptions
- JellyfinService
- dependencies
- TorrentReplacementModal.vue
- scripts
- discovery.test.ts
- SnatchHandler
- releaseGating.ts
- AnimeView.vue
- User Role
- Waitlist Entry
- Leanback Client and Android TV Shell — Spec
- sessionMonitoringService.ts
- Media Download Manager Architecture Spec
- scripts
- Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)
- watchParties.ts
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- candidateDiagnostics.ts
- Workflow
- Indexer
- Ephemeral Stream
- IRequestsRepository
- WatcherPoller
- ActiveStreamsShelf.vue
- Leanback Client and Android TV Shell
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- requestService.ts
- IJellyfinService
- IProwlarrService
- SeasonPackEpisodesDrawer.vue
- AnimeDetailModal.vue
- Multi-Use Revocable User Invites — Spec
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- QBittorrentService
- WatcherDatabase
- websocket.test.ts
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- telegram-bot/tsconfig.json
- UserSettingsModal.vue
- extractEpisodeInfo
- vercel.json
- pnpm-workspace.yaml
- Favicon Vector Graphic (MDM Brand Lightning / Geometric Icon)
- SVG Icon Sprite Sheet (Bluesky, Discord, Docs, GitHub, Social, X)
- Hero Illustration (Landing / Welcome Graphic)
- Vite Logo Asset
- Vue Logo Asset
- Deleted Requests History and Redownload — Spec
- useRequestData.ts
- Torrent Replacement for Underway Requests
- Unified Series Domain and TMDB Canonical Authority — Spec
- ICleanupService
- AdminView.vue
- WatchPartyLobbyModal.vue
- Waitlist Unconfirmed Release Dates and TBA Gating — Spec
- Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec
- WatchPartyRepository
- Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec
- MockJellyfinService
- IMetadataService
- api/src/db/schema.ts
- PreferredIndexerCookieResult
- Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec
- SubtitleInspectionService
- Unified Series Domain and TMDB Canonical Authority
- vue
- CoRequesterPicker.vue
- metadata.ts
- .handleMessage
- ProwlarrService
- api/src/index.ts
- DebridService
- AGENTS.md — Media Download Manager Instructions
- AnimeTmdbConfirmSection.vue
- streamer/src/app.ts
- prowlarrScoring.ts
- Decision
- prowlarrCookie.ts
- github-issues.md
- JellyfinSyncPlayService
- ApiError
- api/src/services/prowlarr.ts
- UserInviteModal.vue
- ReportCardHandler
- DownloadRequest
- Decision
- Preferred Indexer (BJ-Share) Cookie Management & Expired Status Warning Banner — Spec
- library.ts
- ParsedIntent
- ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure
- ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining
- AdminFeaturesTab.vue
- Spec: Modern Cinema UI Overhaul (Bolt Prototype Adoption)
- streamer/src/routes/streams.ts
- api/src/app.ts
- MockMetadata
- users
- InviteView.vue
- IDebridService
- Spec: Waitlist Tiering and In-Place Target Episode Adjustment
- useRequestSubmit
- useRequestReleases
- streamer/src/db/index.ts
- 0029. Telegram Client and Intent Parsing
- admin/index.ts
- 0028. Waitlist Tiering and In-Place Episode Adjustment
- src/types.ts
- clearSelection
- AdminSessionCard.vue
- middleware/auth.ts
- SpaceCheckResult
- RequestStep1Input.vue
- useAdminActivity
- EphemeralEvictionCron
- isExpanded
- .pinChatMessage
- isSelected
- libraryPathBuilder.ts
- upNext.test.ts
- requestWaitlistIntegration.ts
- MdmApiClient
- sessionMonitoring.test.ts
- useAdminConfig
- ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject
- useAdminCleanup
- StreamerJellyfinService

## God Nodes (most connected - your core abstractions)
1. `IRequestsRepository` - 86 edges
2. `IJellyfinService` - 80 edges
3. `api` - 74 edges
4. `vue` - 73 edges
5. `DownloadRequest` - 66 edges
6. `buildApp()` - 63 edges
7. `users` - 62 edges
8. `RequestsRepository` - 62 edges
9. `IQBittorrentService` - 61 edges
10. `AppDatabase` - 54 edges

## Surprising Connections (you probably didn't know these)
- `Architectural Seams` --references--> `adminGuard()`  [INFERRED]
  docs/spec/preferred-indexer-cookie-management.md → apps/api/src/middleware/auth.ts
- `Wave 1 — Foundation (no blockers; implement first)` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `1. Watcher Schema & Diagnostics (`apps/watcher`)` --references--> `WatcherPoller`  [INFERRED]
  docs/spec/waitlist-manual-request-shortcut.md → apps/watcher/src/jobs/watcherPoller.ts
- `Testing Decisions` --references--> `WatcherPoller`  [INFERRED]
  docs/spec/waitlist-manual-request-shortcut.md → apps/watcher/src/jobs/watcherPoller.ts
- `Solution` --references--> `executeEpisodicWaterfall()`  [INFERRED]
  docs/spec/preferred-indexer-qualification-and-episodic-waterfall.md → apps/watcher/src/services/episodicWaterfall.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Jellyfin Authentication and Role Model** — context_user_role, context_trusted_role, context_admin_role, context_invite, docs_adr_0001_jellyfin_as_auth_source_of_truth_jellyfin_auth, docker_docker_compose_yml_service_jellyfin [EXTRACTED 0.95]
- **Automated Discovery, Episodic Tracking, and Configurable Grace Period Ingestion** — docs_spec_discovery_feed_and_up_next_shelf_up_next_shelf, docs_spec_discovery_feed_and_up_next_shelf_episodic_gap_algorithm, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_watch_for_next_episodes, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_compute_grace_hours, docs_adr_0013_per_entry_grace_periods_with_release_newness_classification_per_entry_grace_period [EXTRACTED 0.95]
- **Download Request Hardlink Lifecycle** — context_download_request, context_staging_area, context_hardlink_move, context_library, context_storage_quota, docker_docker_compose_yml_service_qbittorrent, docker_docker_compose_yml_service_api [EXTRACTED 0.95]
- **Ephemeral Debrid Streaming Pipeline** — context_ephemeral_stream, context_stream_library, docker_docker_compose_yml_service_zurg, docker_docker_compose_yml_service_rclone, docker_docker_compose_yml_service_streamer, docs_adr_0012_dual_tier_ephemeral_streaming_with_real_debrid_dual_tier_streaming [EXTRACTED 0.95]
- **Preferred Indexer Dual-Candidate Airgap Architecture** — docs_adr_0016_preferred_indexer_for_downloads_preferred_indexer_oracle, docs_adr_0016_preferred_indexer_for_downloads_discovery_dual_candidate, docs_spec_preferred_indexer_bj_share_preferred_indexer_concept, docs_spec_preferred_indexer_bj_share_dual_candidate_binding, docs_spec_ephemeral_streaming_and_real_debrid_private_airgap [EXTRACTED 0.95]
- **Private Library Security & Processing Pipeline** — docs_spec_private_media_type_and_trusted_role_private_media_type, docs_spec_private_media_type_and_trusted_role_trusted_role, docs_spec_private_media_type_and_trusted_role_jellyfin_access_control, docs_spec_subgen_gpu_subtitle_transcription_subgen_container, docs_adr_0017_local_gpu_subtitle_transcription_with_subgen_subgen_whisper_integration [EXTRACTED 0.95]

## Communities (193 total, 37 thin omitted)

### Community 0 - "TelegramBotClient"
Cohesion: 0.26
Nodes (9): CallbackSession, CallbackStore, CarouselHandler, EpisodicHandler, main(), MessageHandler, TelegramBotClient, TelegramClientOptions (+1 more)

### Community 2 - "watcherPoller.ts"
Cohesion: 0.11
Nodes (19): getWatcherDatabasePath(), initWatcherDatabase(), WatcherPollerLogger, WatcherPollerOptions, formatBytes(), parseReleaseTitle(), ProwlarrSearchResult, ReleaseCandidate (+11 more)

### Community 3 - "useFeatureFlags"
Cohesion: 0.06
Nodes (33): DiscoveryItem, authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isUserInvitesEnabled (+25 more)

### Community 4 - "formatters.ts"
Cohesion: 0.08
Nodes (26): emit, expandedEpisodesId, handleEpisodePruned(), props, getProgressSpeedEta(), props, requestsStore, emit (+18 more)

### Community 5 - "ref_drizzle_orm"
Cohesion: 0.13
Nodes (21): buildWatcherApp(), fastify, NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, waitlistCoRequesters, watchRequests, AutoDownloadSubmitterLogger (+13 more)

### Community 6 - "ref_fastify"
Cohesion: 0.13
Nodes (24): adminGuard(), batchRoutes(), deletedRoutes(), episodesRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes() (+16 more)

### Community 7 - "Ephemeral Streaming Tier"
Cohesion: 0.08
Nodes (43): ADR 0013: Per-Entry Grace Periods with Release Newness Classification, graceOverrideHours Column, Per-Entry Grace Period Computation, Release Newness Threshold Classification, ADR 0015: Runtime Feature Flags and Subsystem Kill Switches, Authoritative Gateway Architecture for Feature Flags, Coordinated Pause for Background Workers, Full-Stack Feature Flag Enforcement (+35 more)

### Community 8 - "LibraryView.vue"
Cohesion: 0.05
Nodes (32): activeCategory, activeEpisodeCanManage, activeEpisodeRequestId, activeEpisodeTitle, allLibraryItems, allSelectedRequestIds, authStore, currentCategoryItems (+24 more)

### Community 9 - "streamer/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 10 - "watcher/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 11 - "Spec: Telegram Bot Client with Intent Parsing"
Cohesion: 0.25
Nodes (7): Further Notes, Out of Scope, Problem Statement, Solution, Spec: Telegram Bot Client with Intent Parsing, Testing Decisions, User Stories

### Community 12 - "ref_vitest"
Cohesion: 0.07
Nodes (25): PlaybackSession, api, useAuthStore, User, mockAnime, mockPush, mockReplace, mountOptions (+17 more)

### Community 13 - "useAdminActivity.ts"
Cohesion: 0.16
Nodes (11): closeStopModal(), emit, handleConfirmStop(), sessionToStop, stopMessage, ActivityResponse, GpuMetrics, PlaybackSessionItem (+3 more)

### Community 14 - "DashboardView.vue"
Cohesion: 0.07
Nodes (18): DiskInfo, useDashboardActions(), useStreamPlayback(), handleInstantStream(), handleStreamPlaybackError(), useRequestsStore, activeStreamsShelfRef, {
  activeTab, setActiveTab, refreshCurrentTab,
  showSubtitleModal, subtitleTarget, openSubtitlePicker, showRedownloadModal,
  redownloadTarget, openRedownloadModal, handleRedownloaded, itemToDelete,
  isDeleting, executeDelete, handleToggleKeep, retryingId, handleRetry,
  transcribingId, handleTranscribe,
} (+10 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "WaitlistCard.vue"
Cohesion: 0.12
Nodes (23): authStore, canAdjustTarget, emit, handleCardClick(), isActionable, isActiveEpisodic, isAdjustPopoverOpen, props (+15 more)

### Community 18 - "Recommended Implementation Order"
Cohesion: 0.40
Nodes (5): Dependency diagram, Recommended Implementation Order, Wave 1 — Foundation (no blockers; implement first), Wave 2 — Build on the foundation (start after Wave 1 blockers are complete), Wave 3 — Decomposition (start after 04 is complete)

### Community 19 - "WaitlistView.vue"
Cohesion: 0.05
Nodes (53): emit, errorMessage, handleSave(), isSeasonPack, isValid, props, saving, seasonNumber (+45 more)

### Community 20 - "IEpisodesRepository"
Cohesion: 0.11
Nodes (8): apps_api_src_db_index_newrequestepisode, apps_api_src_db_index_requestepisode, apps_api_src_db_index_requestepisodes, RequestEpisode, ConsumedEpisodeItem, EpisodesRepository, IEpisodesRepository, InsertRequestEpisode

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.07
Nodes (27): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+19 more)

### Community 23 - "AnimeCard.vue"
Cohesion: 0.08
Nodes (23): displayTitle, isAiringOrFinished, { isItemWaitlisted }, posterUrl, props, statusBadgeClasses, statusLabel, subTitle (+15 more)

### Community 24 - "telegram-bot/package.json"
Cohesion: 0.08
Nodes (24): dependencies, dotenv, devDependencies, esbuild, tsx, @types/node, typescript, vitest (+16 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "WatchRequest"
Cohesion: 0.12
Nodes (17): WatchRequest, waitlistActionRoutes(), waitlistCreateRoutes(), waitlistCrudRoutes(), renderStatusHtml(), waitlistRoutes(), waitlistMagicLinkRoutes(), CreateWaitlistBody (+9 more)

### Community 27 - "serviceContainer.ts"
Cohesion: 0.04
Nodes (56): AppOptions, fastify, FastifyInstance, featureFlags, CleanupCron, CleanupCronLogger, DownloadPoller, getLocalTimeInTimezone() (+48 more)

### Community 28 - "web/package.json"
Cohesion: 0.10
Nodes (20): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+12 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "useRequestStep1"
Cohesion: 0.22
Nodes (12): useRequestStep1(), processFiles(), removeBatchItem(), parseTorrentFile(), decode(), decodeBuffer(), decodeString(), CleanedTorrentResult (+4 more)

### Community 31 - "Header.vue"
Cohesion: 0.07
Nodes (25): collapsed, mobileOpen, showInviteModal, showSettingsModal, authStore, currentTitle, emit, { isConnected } (+17 more)

### Community 32 - "internal.ts"
Cohesion: 0.25
Nodes (8): serviceKeyAuth(), internalRoutes(), subgenWebhookSchema, ACTIVE_STATUSES, ACTIVE_WAITLIST_STATUSES, internalTelegramRoutes(), reportMessageIdSchema, snatchMessageIdSchema

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "useWaitlistMatching.ts"
Cohesion: 0.11
Nodes (21): isWaitlistedEffective, isCandidateWaitlisted, isWaitlistedEffective, isSelectedCandidateWaitlisted, available, { ensureWaitlistLoaded, isItemWaitlisted }, items, router (+13 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeSeasonal.test.ts"
Cohesion: 0.06
Nodes (42): extractShowNameFromPath(), stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry, calculateCurrentSeasonAndYear(), calculateNextSeasonAndYear() (+34 more)

### Community 39 - "WaitlistAddModal.vue"
Cohesion: 0.07
Nodes (32): availableReleasesCount, candidates, checkCandidateGuards(), closeModal(), downloadDirectly(), emit, hasSearched, initPrefilledModal() (+24 more)

### Community 40 - "unarchive.ts"
Cohesion: 0.09
Nodes (16): main(), FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, CommandExecFn, CommandExecResult (+8 more)

### Community 41 - "Docker Compose Stack Specification"
Cohesion: 0.20
Nodes (15): Subgen Service, Root Docker Compose File, Docker Compose Stack Specification, Fastify API Service, Caddy Reverse Proxy, Cloudflared Tunnel Daemon, Cloudflare DDNS Daemon, Jellyfin Media Server (+7 more)

### Community 42 - "StreamProgressModal.vue"
Cohesion: 0.21
Nodes (15): checkStreamStatus(), currentErrorMessage, currentJellyfinUrl, displayErrorMessage, effectiveJellyfinUrl, effectiveWaitlistAdded, emit, handleAddToWaitlist() (+7 more)

### Community 43 - "Cleanup Policy"
Cohesion: 0.16
Nodes (14): Cleanup, Cleanup Policy, Fully Consumed, Keep Flag, Storage Quota, ADR 0005 Document, Rationale: Prevent ENOSPC and Support Greedy FIFO, Software Storage Quota and Deferred Queueing (+6 more)

### Community 44 - "Atomic Hardlink Staging Flow"
Cohesion: 0.16
Nodes (14): Hardlink Move, Library, Private Library, Staging Area, Stream Library, ADR 0003 Document, Atomic Hardlink Staging Flow, Rationale: Zero-Copy Seeding and Clean Renaming (+6 more)

### Community 45 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, @fastify/cookie, @fastify/cors, @fastify/jwt (+5 more)

### Community 46 - ".refreshPlayHistory"
Cohesion: 0.07
Nodes (26): matchesLibraryPath(), Consequences, Considered Options, Context, Decision, Per-Episode Consumption Tracking and Selective Torrent Pruning, API Routes (`apps/api/src/routes/requests/episodes.ts`), Cleanup Service (`apps/api/src/services/cleanup.ts`) (+18 more)

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 48 - "useAdminData"
Cohesion: 0.20
Nodes (4): useAdminData(), handleCreateInvite(), handleRevokeInvite(), loadInvites()

### Community 49 - "TelegramPairingService"
Cohesion: 0.12
Nodes (4): ITelegramPairingService, TelegramAuthSession, TelegramPairingCode, TelegramPairingService

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "JellyfinService"
Cohesion: 0.06
Nodes (26): JellyfinApiError, JellyfinService, 1. Database Schema (`apps/api`), 1. UI Entry Points & Discoverability, 2. Jellyfin Service SyncPlay Extension (`apps/api`), 2. Media Selection & Creation Modal (`CreateWatchPartyModal.vue`), 3. Immediate Post-Creation Player Handoff, 4. Watch Party API Routes (`apps/api/src/routes/watchParties.ts`) (+18 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.09
Nodes (22): emit, fileInputRef, onClear(), onFileChange(), activeTab, candidates, canSubmit, emit (+14 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 55 - "discovery.test.ts"
Cohesion: 0.10
Nodes (8): ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult, apps_api_src_services_prowlarr_searchreleasesresult, DummyJellyfinService, MockProwlarrService, TorrentParsed, MockProwlarrService

### Community 56 - "SnatchHandler"
Cohesion: 0.17
Nodes (7): SnatchHandler, Acceptance Criteria, Implementation Decisions, Problem Statement, Solution, Spec: Telegram Pinned Report Card and Ephemeral Chat Cleanup, User Stories

### Community 57 - "releaseGating.ts"
Cohesion: 0.16
Nodes (14): AirDateFetcherLogger, AniListMediaResponse, AniListNextAiringEpisode, AniListStartDate, fetchAirDate(), FetchAirDateParams, fetchAniListAirDate(), fetchTmdbAirDate() (+6 more)

### Community 58 - "AnimeView.vue"
Cohesion: 0.09
Nodes (20): useSeasonalAnime(), fetchArchive(), fetchSeasonalSections(), initFromRoute(), selectSeasonAndYear(), activeSeasonSelect, { ensureWaitlistLoaded, isItemWaitlisted }, featureFlags (+12 more)

### Community 59 - "User Role"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Waitlist Entry"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 61 - "Leanback Client and Android TV Shell — Spec"
Cohesion: 0.14
Nodes (13): Architectural Shape, Authentication & Pairing (Quick Connect), Content Shelves & Media Actions, Further Notes, Implementation Decisions, Jellyfin Integration & Android TV Shell, Leanback Client and Android TV Shell — Spec, Out of Scope (+5 more)

### Community 62 - "sessionMonitoringService.ts"
Cohesion: 0.08
Nodes (28): GpuMetrics, PlaybackSessionItem, PlaybackSessionPlayState, PlaybackSessionTranscodingInfo, RawJellyfinItem, RawJellyfinMediaStream, RawJellyfinPlayState, RawJellyfinSession (+20 more)

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)"
Cohesion: 0.15
Nodes (12): Apple TV Authentication (Quick Connect), Architectural Shape, Content Discovery & Living-Room Actions, Draft Spec: Native Apple TV Companion App (`apps/tv-apple`), Further Notes, Implementation Decisions, Out of Scope, Problem Statement (+4 more)

### Community 66 - "watchParties.ts"
Cohesion: 0.09
Nodes (28): attachJellyfinWebUrl(), createWatchPartySchema, switchMediaSchema, watchPartyRoutes(), DiscordEmbed, DiscordEmbedField, NotificationContext, resolveDiscordWebhookUrl() (+20 more)

### Community 67 - "api/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 68 - "streamer/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 69 - "watcher/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 70 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, dev:prod, lint, preview, test, typecheck

### Community 71 - "candidateDiagnostics.ts"
Cohesion: 0.16
Nodes (17): CAM_REGEX, DiagnosticCandidate, DiagnosticEvaluationResult, EntryContext, evaluateCandidatesDiagnostic(), isBacklogEpisode(), meetsResolutionGate(), getPreferredIndexerMinSeeders() (+9 more)

### Community 72 - "Workflow"
Cohesion: 0.22
Nodes (8): 1. Verify Git Status & Commit, 2. Verify Push Status, 3. Identify Affected Containers, 4. Rebuild & Restart Relevant Containers, 5. Verify Container Health & Logs, 6. Report Summary, Commit, Push & Rebuild Relevant Containers, Workflow

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "IRequestsRepository"
Cohesion: 0.03
Nodes (18): DownloadRequest, CleanupService, markAllQueuedWaitingForSpace(), promoteQueuedRequests(), RequestsRepository, DeletedRequestListItem, IRequestsRepository, RequestListItem (+10 more)

### Community 76 - "WatcherPoller"
Cohesion: 0.13
Nodes (9): WatcherPoller, ReleaseGatingService, WaitlistCheckContext, WaitlistCheckContextOrFn, WaitlistCheckResult, Frontend State Management (`apps/web/src/views/WaitlistView.vue`), Implementation Decisions, Watcher Routes (`apps/watcher/src/routes/waitlist.ts`) (+1 more)

### Community 77 - "ActiveStreamsShelf.vue"
Cohesion: 0.06
Nodes (34): authStore, createdParty, emit, EphemeralStreamItem, featureFlags, fetchStreams(), handleEvict(), handlePartyCreated() (+26 more)

### Community 78 - "Leanback Client and Android TV Shell"
Cohesion: 0.50
Nodes (3): Context, Decision, Leanback Client and Android TV Shell

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 82 - "requestService.ts"
Cohesion: 0.10
Nodes (40): executeBatchRequests(), executeCreateRequest(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo(), findMatchingCanonicalRequest(), getDedupLockKey(), globalRequestMutex (+32 more)

### Community 83 - "IJellyfinService"
Cohesion: 0.07
Nodes (24): AppDatabase, DownloadPollerOptions, PollerLogger, UnarchiveDaemon, UnarchiveDaemonOptions, HistoryMatcherOptions, CleanupServiceOptions, IFileSystemService (+16 more)

### Community 84 - "IProwlarrService"
Cohesion: 0.08
Nodes (10): DiscoveryCategory, DiscoveryFeedResult, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), IProwlarrService, apps_api_src_services_prowlarr_releasecandidate, apps_api_src_services_prowlarr_resolution (+2 more)

### Community 85 - "SeasonPackEpisodesDrawer.vue"
Cohesion: 0.11
Nodes (12): canManage, confirmPruneEpisode, emit, episodes, error, executePrune(), loading, props (+4 more)

### Community 86 - "AnimeDetailModal.vue"
Cohesion: 0.08
Nodes (32): applyResolveResult(), bannerUrl, cleanDescription, confirmWaitlistSubmission(), displayTitle, emit, handleClose(), handleConfirmAction() (+24 more)

### Community 87 - "Multi-Use Revocable User Invites — Spec"
Cohesion: 0.12
Nodes (16): Administrative Visibility & Moderation, Backend Endpoints (`apps/api/src/routes/invites.ts`), Further Notes, Implementation Decisions, Multi-Use Revocable User Invites — Spec, Out of Scope, Problem Statement, Role Safety & Security (+8 more)

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 92 - "App.vue"
Cohesion: 0.40
Nodes (4): isAuthenticatedRoute, route, @vercel/analytics, @vercel/speed-insights

### Community 93 - "QBittorrentService"
Cohesion: 0.19
Nodes (6): QBittorrentError, QBittorrentService, KeyedMutex, extractHashFromMagnet(), resolveTorrentSource(), RFC-4648

### Community 94 - "WatcherDatabase"
Cohesion: 0.14
Nodes (11): FastifyInstance, WatcherAppOptions, WatcherDatabase, AutoDownloadSubmitter, AutoDownloadSubmitterOptions, EpisodicTrackingOptions, EpisodicTrackingService, WatcherAnilistMigrationOptions (+3 more)

### Community 99 - "telegram-bot/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 100 - "UserSettingsModal.vue"
Cohesion: 0.09
Nodes (23): authStore, clearGeminiApiKey(), countdownText, countdownTimer, expiresIn, feedbackMessage, geminiApiKeyInput, generatePairingCode() (+15 more)

### Community 101 - "extractEpisodeInfo"
Cohesion: 0.25
Nodes (4): resolveSourceItem(), ResolveSourceItemParams, ResolveSourceItemResult, extractEpisodeInfo()

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.10
Nodes (19): Active Media Detection & Guardrails, API Routes, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Services, Deletion Tracking & Audit Trail, Further Notes, Implementation Decisions (+11 more)

### Community 115 - "useRequestData.ts"
Cohesion: 0.23
Nodes (16): buildCandidate(), enrichCandidateMetadata(), parseEpisodeAndGranularity(), parseFastTrack(), parseMediaType(), parseSeasonNumber(), parseWaitlistParams(), parseYear() (+8 more)

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

### Community 117 - "Unified Series Domain and TMDB Canonical Authority — Spec"
Cohesion: 0.13
Nodes (14): Architectural Shape, Automated Waitlist Monitoring & Up Next Tracking, Further Notes, Implementation Decisions, Legacy Data Migration & System Health, Out of Scope, Problem Statement, Prowlarr Dual-Query Release Discovery (+6 more)

### Community 118 - "ICleanupService"
Cohesion: 0.14
Nodes (3): CleanupCronOptions, ICleanupService, PruneEpisodeResult

### Community 119 - "AdminView.vue"
Cohesion: 0.18
Nodes (11): AdminFeatureFlag, InviteItem, AdminUser, formatDate(), formatMediaSubtitle(), activity, admin, AdminTab (+3 more)

### Community 120 - "WatchPartyLobbyModal.vue"
Cohesion: 0.08
Nodes (22): authStore, changeMediaItemId, changeMediaTitle, emit, handleManualChangeMedia(), handlePlayNextEpisode(), HistoryItem, isHost (+14 more)

### Community 121 - "Waitlist Unconfirmed Release Dates and TBA Gating — Spec"
Cohesion: 0.14
Nodes (13): Adding Undated Media, Further Notes, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope, Problem Statement, Single Highest Seam: Watcher HTTP API Integration Tests, Solution (+5 more)

### Community 122 - "Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec"
Cohesion: 0.12
Nodes (16): 1. Watcher Schema & Diagnostics (`apps/watcher`), 2. Watcher Advance Endpoint (`apps/watcher`), 3. Main API Request Integration (`apps/api`), 4. Frontend Decomposition & Waitlist UI (`apps/web`), 5. Fast-Track Request Step 3 Initialization (`apps/web`), Episodic Scope & Lifecycle, Further Notes, Implementation Decisions (+8 more)

### Community 123 - "WatchPartyRepository"
Cohesion: 0.17
Nodes (3): NewWatchPartyRoom, WatchPartyRoom, WatchPartyRepository

### Community 124 - "Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec"
Cohesion: 0.12
Nodes (16): 1. Oracle VPS Configuration (`167.126.3.136`), 2. Home Stack Modifications (`docker/docker-compose.yml`), 3. DNS Configuration (Cloudflare), Cloudflare Compliance & Security, Further Notes, Good Test Principles, Implementation Decisions, Infrastructure Cleanliness (+8 more)

### Community 125 - "MockJellyfinService"
Cohesion: 0.06
Nodes (11): requestCoRequesters, JellyfinAuthResult, apps_api_src_services_prowlarr_preferredindexercookieresult, apps_api_src_services_prowlarr_preferredindexercookiestatus, TorrentInfo, MockCleanupService, MockJellyfinService, MockQBittorrentService (+3 more)

### Community 126 - "IMetadataService"
Cohesion: 0.17
Nodes (4): AnilistMigrationOptions, AnilistMigrationResult, IMetadataService, UpNextServiceOptions

### Community 127 - "api/src/db/schema.ts"
Cohesion: 0.10
Nodes (19): EpisodeStatus, FeatureFlag, Invite, InviteRole, invites, MediaType, NewFeatureFlag, NewInvite (+11 more)

### Community 128 - "PreferredIndexerCookieResult"
Cohesion: 0.24
Nodes (3): PreferredIndexerCookieResult, PreferredIndexerCookieStatus, MockProwlarrService

### Community 129 - "Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec"
Cohesion: 0.13
Nodes (14): 1. Seeder & Resolution Diagnostics (`apps/watcher` & `apps/api`), Episodic Waterfall Automation, Further Notes, Good Test Principles, Implementation Decisions, Out of Scope, Preferred Indexer Health & Seeder Qualification, Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec (+6 more)

### Community 131 - "Unified Series Domain and TMDB Canonical Authority"
Cohesion: 0.33
Nodes (5): Consequences, Considered Options, Context, Decision, Unified Series Domain and TMDB Canonical Authority

### Community 132 - "vue"
Cohesion: 0.10
Nodes (35): step2QueryInputRef, { isItemWaitlisted }, props, FastTrackParsedData, WaitlistParsedData, BatchItem, CanonicalRequestSummary, MetadataCandidate (+27 more)

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 134 - "metadata.ts"
Cohesion: 0.10
Nodes (13): BaseMetadataService, MetadataApiError, MetadataSearchOptions, MetadataService, rankMetadataCandidates(), CleanedTorrentResult, cleanSeparators(), cleanTorrentTitle() (+5 more)

### Community 135 - ".handleMessage"
Cohesion: 0.17
Nodes (3): InlineKeyboardMarkup, TelegramMessage, Implementation Decisions

### Community 136 - "ProwlarrService"
Cohesion: 0.15
Nodes (7): formatBytes(), ScoreOptions, ProwlarrService, buildSeriesSearchQueries(), hasCjkCharacters(), SeriesQueryOptions, SeriesQueryParam

### Community 137 - "api/src/index.ts"
Cohesion: 0.13
Nodes (14): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+6 more)

### Community 139 - "AGENTS.md — Media Download Manager Instructions"
Cohesion: 0.50
Nodes (3): AGENTS.md — Media Download Manager Instructions, Architectural Rules, Issue Tracking & Task Management

### Community 140 - "AnimeTmdbConfirmSection.vue"
Cohesion: 0.33
Nodes (6): emit, handleManualSearch(), isManualSearchOpen, manualSearchQuery, props, selectedCandidate

### Community 141 - "streamer/src/app.ts"
Cohesion: 0.19
Nodes (8): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, StreamPoller, DirectDownloader, IDirectDownloader, ref_node_stream

### Community 142 - "prowlarrScoring.ts"
Cohesion: 0.26
Nodes (9): DiscoveryItem, isTitleRelevant(), parseReleaseTitle(), ReleaseSource, Resolution, ScorableCandidate, scoreRelease(), VideoCodec (+1 more)

### Community 143 - "Decision"
Cohesion: 0.20
Nodes (9): 1. Native Jellyfin SyncPlay Launch Bridge, 2. Eligible Media Scope, 3. In-Place Media Switching & Discord Party Timeline, 4. Context-Specific Discord Channel Routing, 5. Room Persistence & Automated Cleanup, ADR-0025: Watch Party SyncPlay Integration & In-Place Timeline Progression, Consequences, Context (+1 more)

### Community 144 - "prowlarrCookie.ts"
Cohesion: 0.21
Nodes (14): fetchAllIndexers(), findPreferredIndexer(), getPreferredIndexerCookieStatus(), invalidatePreferredIndexerCookieCache(), maskCookie(), ProwlarrIndexer, ProwlarrIndexerField, ProwlarrIndexerStatus (+6 more)

### Community 146 - "JellyfinSyncPlayService"
Cohesion: 0.13
Nodes (12): JellyfinSyncPlayService, Acceptance Criteria, Background & Problem Statement, Cross-Platform TV Participation & Canonical Handoff, Deep Link & Discord Routing, Implementation Architecture, Jellyfin User Token & SyncPlay Provisioning, Slice 1: Backend Jellyfin User Token Storage, Migration, SyncPlay Provisioning & Canonical Launch URL (+4 more)

### Community 147 - "ApiError"
Cohesion: 0.06
Nodes (28): ConfigFormData, apps_web_src_components_admin_adminconfigtab_jellyfinstatusinfo, showTmdbKey, apps_web_src_components_admin_adminconfigtab_transcriptionformdata, JellyfinStatusInfo, {
  cookieStatus,
  isLoadingStatus,
  isTesting,
  isSaving,
  cookieInput,
  feedbackMessage,
  fetchCookieStatus,
  testCookie,
  saveCookie,
}, showInstructions, TranscriptionFormData (+20 more)

### Community 148 - "api/src/services/prowlarr.ts"
Cohesion: 0.17
Nodes (8): forwardToStreamer(), streamsAuth(), streamsRoutes(), apps_api_src_services_prowlarr_haspasskey, apps_api_src_services_prowlarr_isknownprivateindexer, hasPasskey(), IndexerPrivacyCache, isKnownPrivateIndexer()

### Community 149 - "UserInviteModal.vue"
Cohesion: 0.12
Nodes (10): errorMessage, hasCopied, invitedUsers, inviteUrl, isGenerating, isInvitesDisabledForUser, isLoading, MockApiError (+2 more)

### Community 151 - "DownloadRequest"
Cohesion: 0.21
Nodes (6): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), emit, DownloadRequest

### Community 152 - "Decision"
Cohesion: 0.22
Nodes (8): 1. Authenticated User Token Storage for SyncPlay, 2. Canonical Backend-Driven Jellyfin Launch URL, 3. Dedicated `/party/:id` Route & Auto-Lobby State, 4. Cross-Platform TV Guidance & AirPlay Launch Bridge, ADR-0027: Jellyfin SyncPlay Token Authentication, Canonical Handoff & Cross-Platform TV Bridge, Consequences, Context, Decision

### Community 153 - "Preferred Indexer (BJ-Share) Cookie Management & Expired Status Warning Banner — Spec"
Cohesion: 0.29
Nodes (6): Architectural Seams, Implementation Decisions, Preferred Indexer (BJ-Share) Cookie Management & Expired Status Warning Banner — Spec, Problem Statement, Solution, User Stories

### Community 154 - "library.ts"
Cohesion: 0.20
Nodes (11): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, libraryRoutes(), MediaArtwork, MediaRequester (+3 more)

### Community 155 - "ParsedIntent"
Cohesion: 0.23
Nodes (7): extractEpisodicInfo(), heuristicFallback(), ORDINAL_MAP, IntentParser, IntentParserOptions, MediaType, ParsedIntent

### Community 156 - "ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure"
Cohesion: 0.40
Nodes (4): ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure, Consequences, Context, Decision

### Community 157 - "ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining"
Cohesion: 0.25
Nodes (7): 1. Preferred Indexer Qualification, 2. Resolution Gating & 720p Fallback, 3. Episodic Waterfall Chaining Engine, ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining, Consequences, Context, Decision

### Community 158 - "AdminFeaturesTab.vue"
Cohesion: 0.22
Nodes (10): automationFlags, discoveryFlags, downloadsFlags, emit, flagConfirmModal, HIGH_IMPACT_FLAGS, HIGH_IMPACT_MESSAGES, onConfirmDisable() (+2 more)

### Community 159 - "Spec: Modern Cinema UI Overhaul (Bolt Prototype Adoption)"
Cohesion: 0.20
Nodes (9): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Slices & Implementation Issues, Solution, Spec: Modern Cinema UI Overhaul (Bolt Prototype Adoption), Testing Decisions (+1 more)

### Community 160 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 161 - "api/src/app.ts"
Cohesion: 0.09
Nodes (21): buildApp(), AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, getConfig(), _resetConfigForTesting(), testConfigDefaults, validateConfig() (+13 more)

### Community 163 - "users"
Cohesion: 0.06
Nodes (68): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequest, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase() (+60 more)

### Community 164 - "InviteView.vue"
Cohesion: 0.07
Nodes (27): app, router, routes, pinia, apps_web_src_style, authStore, confirmPassword, creatorUsername (+19 more)

### Community 166 - "Spec: Waitlist Tiering and In-Place Target Episode Adjustment"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Solution, Spec: Waitlist Tiering and In-Place Target Episode Adjustment, Testing Decisions, User Stories

### Community 167 - "useRequestSubmit"
Cohesion: 0.15
Nodes (18): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep2(), confirmStep2Selection(), handleSearchMetadata(), selectCandidate() (+10 more)

### Community 168 - "useRequestReleases"
Cohesion: 0.27
Nodes (8): useRequestReleases(), checkCacheForCandidates(), extractInfoHash(), fetchReleasesForCandidate(), getCandidateCacheStatus(), getSearchTitles(), reloadReleasesSilently(), searchReleasesApi()

### Community 169 - "streamer/src/db/index.ts"
Cohesion: 0.20
Nodes (13): apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), StreamerDatabase, apps_streamer_src_db_index_systemconfig, EphemeralStream, ephemeralStreams, NewEphemeralStream (+5 more)

### Community 171 - "admin/index.ts"
Cohesion: 0.17
Nodes (13): adminActivityRoutes(), adminCleanupRoutes(), adminConfigRoutes(), adminFeaturesRoutes(), adminRoutes(), adminJellyfinRoutes(), adminPreferredIndexerRoutes(), TestCookieBody (+5 more)

### Community 173 - "src/types.ts"
Cohesion: 0.15
Nodes (20): ApiClientOptions, CarouselSession, EpisodicSession, formatBytes(), formatConfirmationCard(), formatMediaSubtitle(), SnatchParams, SnatchSession (+12 more)

### Community 174 - "clearSelection"
Cohesion: 0.40
Nodes (6): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), handleLibraryEpisodePruned(), switchCategory()

### Community 176 - "middleware/auth.ts"
Cohesion: 0.09
Nodes (27): User, fastify, @fastify/jwt, FastifyJWT, FastifyRequest, JwtPayload, requireFeature(), animeSeasonalRoutes() (+19 more)

### Community 177 - "SpaceCheckResult"
Cohesion: 0.06
Nodes (9): SpaceCheckResult, MockCleanupService, MockCleanup, MockCleanupService, MockCleanup, MockCleanupService, MockCleanupService, MockCleanupService (+1 more)

### Community 178 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 179 - "useAdminActivity"
Cohesion: 0.57
Nodes (6): useAdminActivity(), fetchActivity(), handleVisibilityChange(), startPolling(), stopPolling(), stopSession()

### Community 184 - "libraryPathBuilder.ts"
Cohesion: 0.38
Nodes (4): buildLibraryPath(), BuildLibraryPathParams, padNumber(), sanitizePathSegment()

### Community 185 - "upNext.test.ts"
Cohesion: 0.12
Nodes (11): MetadataCandidate, apps_api_src_services_prowlarr_searchreleasesoptions, groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), matchesTarget(), normalizeShowTitle() (+3 more)

### Community 186 - "requestWaitlistIntegration.ts"
Cohesion: 0.60
Nodes (5): advanceWaitlistIfNeeded(), callWatcherEndpoint(), triggerNextSeasonWaitlist(), triggerWaitlistActions(), WaitlistTriggerParams

### Community 189 - "useAdminConfig"
Cohesion: 0.40
Nodes (3): useAdminConfig(), checkJellyfinStatus(), handleRescanJellyfin()

### Community 190 - "ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject"
Cohesion: 0.40
Nodes (4): ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject, Consequences, Context, Decision

### Community 191 - "useAdminCleanup"
Cohesion: 0.83
Nodes (4): useAdminCleanup(), confirmCleanItem(), handleRunScan(), loadDiskAndCandidates()

## Knowledge Gaps
- **1236 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+1231 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1787 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IRequestsRepository` connect `IRequestsRepository` to `users`, `useRequestSubmit`, `middleware/auth.ts`, `requestService.ts`, `IJellyfinService`, `Deleted Requests History and Redownload — Spec`, `SnatchHandler`, `serviceContainer.ts`, `IMetadataService`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `vue` connect `vue` to `useFeatureFlags`, `formatters.ts`, `LibraryView.vue`, `AnimeTmdbConfirmSection.vue`, `useAdminActivity.ts`, `DashboardView.vue`, `ref_vitest`, `WaitlistCard.vue`, `ApiError`, `WaitlistView.vue`, `DiscoveryFeed.vue`, `UserInviteModal.vue`, `AnimeCard.vue`, `DownloadRequest`, `web/package.json`, `PromotionModal.vue`, `AdminFeaturesTab.vue`, `Header.vue`, `useWaitlistMatching.ts`, `InviteView.vue`, `WaitlistAddModal.vue`, `StreamProgressModal.vue`, `AdminSessionCard.vue`, `SubtitlePickerModal.vue`, `RequestStep1Input.vue`, `TorrentReplacementModal.vue`, `AnimeView.vue`, `ActiveStreamsShelf.vue`, `SeasonPackEpisodesDrawer.vue`, `AnimeDetailModal.vue`, `App.vue`, `UserSettingsModal.vue`, `useRequestData.ts`, `AdminView.vue`, `WatchPartyLobbyModal.vue`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `RequestsRepository` connect `IRequestsRepository` to `users`, `unarchive.ts`, `middleware/auth.ts`, `requestService.ts`, `IJellyfinService`, `Deleted Requests History and Redownload — Spec`, `upNext.test.ts`, `serviceContainer.ts`, `MockJellyfinService`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `IJellyfinService` (e.g. with `Solution` and `2. Jellyfin Service SyncPlay Extension (`apps/api`)`) actually correct?**
  _`IJellyfinService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1236 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `watcherPoller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11290322580645161 - nodes in this community are weakly interconnected._