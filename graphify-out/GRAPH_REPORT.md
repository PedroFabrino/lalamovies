# Graph Report - Plex-auto-download  (2026-10-10)

## Corpus Check
- 578 files · ~363,008 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 9, .example 3, .css 1)

## Summary
- 3649 nodes · 8889 edges · 197 communities (154 shown, 43 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 384 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `75a24974`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Spec: Codebase Health, Architecture Hardening & Residual Refactoring
- services/cleanup.ts
- ref_fastify
- Navbar.vue
- AnimeView.vue
- watcher/src/app.ts
- requests/index.ts
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- useWaitlistTiers.ts
- ref_vitest
- useAdminActivity.ts
- vue
- devDependencies
- dev-setup.mjs
- WaitlistCard.vue
- IEpisodesRepository
- WaitlistView.vue
- api/src/utils/torrentTitleCleaner.ts
- DiscoveryFeed.vue
- api/package.json
- AnimeCard.vue
- telegram-bot/package.json
- Context Domain Model Document
- watcher/src/services/notifications.ts
- serviceContainer.ts
- web/package.json
- PromotionModal.vue
- useRequestSubmit
- ref_node_crypto
- FileSystemService
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- ReleaseGatingService
- compilerOptions
- animeTypes.ts
- WaitlistAddModal.vue
- subtitleInspection.ts
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- .refreshPlayHistory
- SubtitlePickerModal.vue
- AdminView.vue
- TelegramPairingService
- compilerOptions
- watchParties.ts
- dependencies
- TorrentReplacementModal.vue
- scripts
- ReleaseCandidate
- SnatchHandler
- airDateFetcher.ts
- SymlinkManager
- User Role
- Waitlist Entry
- Leanback Client and Android TV Shell — Spec
- sessionMonitoringService.ts
- Media Download Manager Architecture Spec
- scripts
- Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)
- useAdminConfig.ts
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- library.ts
- Workflow
- Indexer
- Ephemeral Stream
- IRequestsRepository
- discordNotifier.ts
- ActiveStreamsShelf.vue
- Leanback Client and Android TV Shell
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- requestService.ts
- watcher/src/services/prowlarr.ts
- useWaitlistMatching.ts
- MockCleanupService
- AnimeDetailModal.vue
- Multi-Use Revocable User Invites — Spec
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- parseTorrentBuffer
- WatcherPoller
- DummyQB
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- telegram-bot/tsconfig.json
- UserSettingsModal.vue
- api/src/services/prowlarr.ts
- vercel.json
- pnpm-workspace.yaml
- Favicon Vector Graphic (MDM Brand Lightning / Geometric Icon)
- SVG Icon Sprite Sheet (Bluesky, Discord, Docs, GitHub, Social, X)
- Hero Illustration (Landing / Welcome Graphic)
- Vite Logo Asset
- Vue Logo Asset
- Deleted Requests History and Redownload — Spec
- JellyfinService
- Torrent Replacement for Underway Requests
- Unified Series Domain and TMDB Canonical Authority — Spec
- WatchRequest
- MockCleanupService
- WatchPartyLobbyModal.vue
- api/src/db/schema.ts
- Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec
- IWatchPartyRepository
- Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec
- ref_drizzle_orm
- ephemeralEvictionCron.ts
- IProwlarrService
- sessionMonitoring.test.ts
- WaitlistCheckService
- InviteView.vue
- Unified Series Domain and TMDB Canonical Authority
- useRequestData.ts
- CoRequesterPicker.vue
- upNext.test.ts
- MetadataCandidate
- ws.ts
- api/src/index.ts
- DebridService
- AGENTS.md — Media Download Manager Instructions
- useRequestStep1.ts
- RequestStep1Input.vue
- WaitlistEpisodeAdjustPopover.vue
- Decision
- SeasonPackEpisodesDrawer.vue
- github-issues.md
- Specification: Watch Party SyncPlay Token Auth, Deep Link & Cross-Platform TV Bridge
- watchPartyCleanup.ts
- IndexerPrivacyCache
- ProwlarrService
- ReportCardHandler
- MockCleanup
- Decision
- MockCleanupService
- src/types.ts
- IntentParser
- ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure
- ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining
- streamer/src/app.ts
- AnimeTmdbConfirmSection.vue
- streamer/src/routes/streams.ts
- formatters.ts
- Spec: Waitlist Tiering and In-Place Target Episode Adjustment
- unarchive.ts
- AdminFeaturesTab.vue
- ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject
- useAdminData
- DummyJellyfinService
- useRequestReleases
- streamer/src/db/index.ts
- 0029. Telegram Client and Intent Parsing
- internal.ts
- 0028. Waitlist Tiering and In-Place Episode Adjustment
- TelegramBotClient
- prowlarrScoring.ts
- requestWaitlistIntegration.ts
- src/config.ts
- JellyfinSyncPlayService
- MockCleanupService
- watcher/src/index.ts
- IDebridService
- MockCleanupService
- AdminSessionCard.vue
- UpNextShelf.vue
- DummyJellyfin
- Spec: Telegram Bot Client with Intent Parsing
- normalizeShowTitle
- MdmApiClient
- useAdminActivity
- isQualifiedPreferred
- EphemeralEvictionCron
- IJellyfinService
- StreamerJellyfinService
- TorrentManualInput.vue
- main.ts
- useAdminCleanup

## God Nodes (most connected - your core abstractions)
1. `IRequestsRepository` - 85 edges
2. `IJellyfinService` - 80 edges
3. `api` - 70 edges
4. `DownloadRequest` - 66 edges
5. `vue` - 64 edges
6. `buildApp()` - 62 edges
7. `users` - 61 edges
8. `IQBittorrentService` - 61 edges
9. `RequestsRepository` - 61 edges
10. `AppDatabase` - 54 edges

## Surprising Connections (you probably didn't know these)
- `Wave 1 — Foundation (no blockers; implement first)` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `1. Watcher Schema & Diagnostics (`apps/watcher`)` --references--> `WatcherPoller`  [INFERRED]
  docs/spec/waitlist-manual-request-shortcut.md → apps/watcher/src/jobs/watcherPoller.ts
- `Testing Decisions` --references--> `WatcherPoller`  [INFERRED]
  docs/spec/waitlist-manual-request-shortcut.md → apps/watcher/src/jobs/watcherPoller.ts
- `Solution` --references--> `executeEpisodicWaterfall()`  [INFERRED]
  docs/spec/preferred-indexer-qualification-and-episodic-waterfall.md → apps/watcher/src/services/episodicWaterfall.ts
- `2. Canonical Backend-Driven Jellyfin Launch URL` --references--> `WatchParty`  [INFERRED]
  docs/adr/0027-jellyfin-syncplay-token-auth-and-cross-platform-tv-bridge.md → apps/web/src/components/ActiveWatchPartiesShelf.vue

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Jellyfin Authentication and Role Model** — context_user_role, context_trusted_role, context_admin_role, context_invite, docs_adr_0001_jellyfin_as_auth_source_of_truth_jellyfin_auth, docker_docker_compose_yml_service_jellyfin [EXTRACTED 0.95]
- **Automated Discovery, Episodic Tracking, and Configurable Grace Period Ingestion** — docs_spec_discovery_feed_and_up_next_shelf_up_next_shelf, docs_spec_discovery_feed_and_up_next_shelf_episodic_gap_algorithm, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_watch_for_next_episodes, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_compute_grace_hours, docs_adr_0013_per_entry_grace_periods_with_release_newness_classification_per_entry_grace_period [EXTRACTED 0.95]
- **Download Request Hardlink Lifecycle** — context_download_request, context_staging_area, context_hardlink_move, context_library, context_storage_quota, docker_docker_compose_yml_service_qbittorrent, docker_docker_compose_yml_service_api [EXTRACTED 0.95]
- **Ephemeral Debrid Streaming Pipeline** — context_ephemeral_stream, context_stream_library, docker_docker_compose_yml_service_zurg, docker_docker_compose_yml_service_rclone, docker_docker_compose_yml_service_streamer, docs_adr_0012_dual_tier_ephemeral_streaming_with_real_debrid_dual_tier_streaming [EXTRACTED 0.95]
- **Preferred Indexer Dual-Candidate Airgap Architecture** — docs_adr_0016_preferred_indexer_for_downloads_preferred_indexer_oracle, docs_adr_0016_preferred_indexer_for_downloads_discovery_dual_candidate, docs_spec_preferred_indexer_bj_share_preferred_indexer_concept, docs_spec_preferred_indexer_bj_share_dual_candidate_binding, docs_spec_ephemeral_streaming_and_real_debrid_private_airgap [EXTRACTED 0.95]
- **Private Library Security & Processing Pipeline** — docs_spec_private_media_type_and_trusted_role_private_media_type, docs_spec_private_media_type_and_trusted_role_trusted_role, docs_spec_private_media_type_and_trusted_role_jellyfin_access_control, docs_spec_subgen_gpu_subtitle_transcription_subgen_container, docs_adr_0017_local_gpu_subtitle_transcription_with_subgen_subgen_whisper_integration [EXTRACTED 0.95]

## Communities (197 total, 43 thin omitted)

### Community 0 - "Spec: Codebase Health, Architecture Hardening & Residual Refactoring"
Cohesion: 0.20
Nodes (9): Dependency diagram, Out of Scope, Recommended Implementation Order, Spec: Codebase Health, Architecture Hardening & Residual Refactoring, Testing Decisions, User Stories, Wave 1 — Foundation (no blockers; implement first), Wave 2 — Build on the foundation (start after Wave 1 blockers are complete) (+1 more)

### Community 1 - "services/cleanup.ts"
Cohesion: 0.06
Nodes (64): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequest, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase() (+56 more)

### Community 2 - "ref_fastify"
Cohesion: 0.12
Nodes (16): buildApp(), getConfig(), validateConfig(), apps_api_src_db_index_featureflags, users, authMiddleware(), apps_api_src_routes_admin_adminroutes, animeSeasonalRoutes() (+8 more)

### Community 3 - "Navbar.vue"
Cohesion: 0.06
Nodes (26): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isUserInvitesEnabled, isWaitlistEnabled (+18 more)

### Community 4 - "AnimeView.vue"
Cohesion: 0.09
Nodes (20): MediaSeason, useSeasonalAnime(), fetchArchive(), fetchSeasonalSections(), initFromRoute(), selectSeasonAndYear(), activeSeasonSelect, { ensureWaitlistLoaded, isItemWaitlisted } (+12 more)

### Community 5 - "watcher/src/app.ts"
Cohesion: 0.20
Nodes (13): buildWatcherApp(), fastify, getWatcherDatabasePath(), initWatcherDatabase(), NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, watchRequests (+5 more)

### Community 6 - "requests/index.ts"
Cohesion: 0.11
Nodes (24): adminGuard(), deletedRoutes(), episodesRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes(), promoteSchema (+16 more)

### Community 7 - "Ephemeral Streaming Tier"
Cohesion: 0.08
Nodes (43): ADR 0013: Per-Entry Grace Periods with Release Newness Classification, graceOverrideHours Column, Per-Entry Grace Period Computation, Release Newness Threshold Classification, ADR 0015: Runtime Feature Flags and Subsystem Kill Switches, Authoritative Gateway Architecture for Feature Flags, Coordinated Pause for Background Workers, Full-Stack Feature Flag Enforcement (+35 more)

### Community 8 - "LibraryView.vue"
Cohesion: 0.05
Nodes (42): activeCategory, activeEpisodeCanManage, activeEpisodeRequestId, activeEpisodeTitle, allLibraryItems, allSelectedRequestIds, authStore, clearSelection() (+34 more)

### Community 9 - "streamer/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 10 - "watcher/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 11 - "useWaitlistTiers.ts"
Cohesion: 0.21
Nodes (16): classifyWaitlistEntry(), DEFAULT_TIER_STATE, loadSavedTierState(), partitionWaitlistEntries(), saveTierState(), useWaitlistTiers(), collapseAll(), expandAll() (+8 more)

### Community 12 - "ref_vitest"
Cohesion: 0.05
Nodes (47): PlaybackSession, error, flags, initWsListener(), isLoaded, isLoading, useFeatureFlags(), ensureFlagsLoaded() (+39 more)

### Community 13 - "useAdminActivity.ts"
Cohesion: 0.16
Nodes (11): closeStopModal(), emit, handleConfirmStop(), sessionToStop, stopMessage, ActivityResponse, GpuMetrics, PlaybackSessionItem (+3 more)

### Community 14 - "vue"
Cohesion: 0.05
Nodes (38): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), DiskInfo, emit, emit, errorMessage (+30 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "WaitlistCard.vue"
Cohesion: 0.12
Nodes (23): authStore, canAdjustTarget, emit, handleCardClick(), isActionable, isActiveEpisodic, isAdjustPopoverOpen, props (+15 more)

### Community 18 - "IEpisodesRepository"
Cohesion: 0.09
Nodes (8): apps_api_src_db_index_newrequestepisode, apps_api_src_db_index_requestepisode, apps_api_src_db_index_requestepisodes, RequestEpisode, ConsumedEpisodeItem, EpisodesRepository, IEpisodesRepository, InsertRequestEpisode

### Community 19 - "WaitlistView.vue"
Cohesion: 0.07
Nodes (22): STORAGE_KEY, activeView, addModalRef, approvingEntryId, authStore, checkingEntryId, entriesRef, handleCheckAll() (+14 more)

### Community 20 - "api/src/utils/torrentTitleCleaner.ts"
Cohesion: 0.21
Nodes (9): resolveSourceItem(), ResolveSourceItemParams, ResolveSourceItemResult, matchesTarget(), CleanedTorrentResult, cleanSeparators(), cleanTorrentTitle(), ExtractedEpisodeInfo (+1 more)

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.08
Nodes (30): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+22 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "AnimeCard.vue"
Cohesion: 0.08
Nodes (21): displayTitle, isAiringOrFinished, { isItemWaitlisted }, posterUrl, props, statusBadgeClasses, statusLabel, subTitle (+13 more)

### Community 24 - "telegram-bot/package.json"
Cohesion: 0.08
Nodes (24): dependencies, dotenv, devDependencies, esbuild, tsx, @types/node, typescript, vitest (+16 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "watcher/src/services/notifications.ts"
Cohesion: 0.19
Nodes (13): waitlistCoRequesters, waitlistCrudRoutes(), renderStatusHtml(), waitlistMagicLinkRoutes(), deleteDiscordMessage(), generateMagicLinkToken(), ResendNotifier, sendWaitlistCancelNotification() (+5 more)

### Community 27 - "serviceContainer.ts"
Cohesion: 0.05
Nodes (55): AppOptions, fastify, FastifyInstance, AppDatabase, CleanupCron, CleanupCronLogger, CleanupCronOptions, DownloadPoller (+47 more)

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "useRequestSubmit"
Cohesion: 0.20
Nodes (12): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestSubmit(), buildSinglePayload(), checkDuplicateExists(), handleConfirmRequest() (+4 more)

### Community 31 - "ref_node_crypto"
Cohesion: 0.21
Nodes (10): invites, acceptInviteSchema, inviteAcceptRoutes(), inviteAdminRoutes(), inviteRoutes(), createInviteSchema, getFrontendUrl(), inviteManageRoutes() (+2 more)

### Community 32 - "FileSystemService"
Cohesion: 0.11
Nodes (8): FileSystemService, buildLibraryPath(), BuildLibraryPathParams, padNumber(), sanitizePathSegment(), IPosterService, PosterService, StorageFootprintService

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "ReleaseGatingService"
Cohesion: 0.11
Nodes (14): ReleaseGatingService, Adding Undated Media, Further Notes, Implementation Decisions, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope, Problem Statement (+6 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeTypes.ts"
Cohesion: 0.06
Nodes (43): AnimeHistoryMatcher, extractShowNameFromPath(), stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry, calculateCurrentSeasonAndYear() (+35 more)

### Community 39 - "WaitlistAddModal.vue"
Cohesion: 0.07
Nodes (33): availableReleasesCount, candidates, checkCandidateGuards(), closeModal(), downloadDirectly(), emit, hasSearched, initPrefilledModal() (+25 more)

### Community 40 - "subtitleInspection.ts"
Cohesion: 0.16
Nodes (9): execFileAsync, FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionService, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, ref_node_child_process (+1 more)

### Community 41 - "Docker Compose Stack Specification"
Cohesion: 0.20
Nodes (15): Subgen Service, Root Docker Compose File, Docker Compose Stack Specification, Fastify API Service, Caddy Reverse Proxy, Cloudflared Tunnel Daemon, Cloudflare DDNS Daemon, Jellyfin Media Server (+7 more)

### Community 42 - "StreamProgressModal.vue"
Cohesion: 0.25
Nodes (13): checkStreamStatus(), currentErrorMessage, currentJellyfinUrl, effectiveJellyfinUrl, emit, handleAddToWaitlist(), handleClose(), handlePromote() (+5 more)

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

### Community 48 - "AdminView.vue"
Cohesion: 0.19
Nodes (10): InviteItem, AdminUser, formatDate(), formatMediaSubtitle(), activity, admin, AdminTab, authStore (+2 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "watchParties.ts"
Cohesion: 0.17
Nodes (19): attachJellyfinWebUrl(), createWatchPartySchema, switchMediaSchema, watchPartyRoutes(), resolveDiscordWebhookUrl(), apps_api_src_services_notifications_notificationcontext, apps_api_src_services_notifications_resolvediscordwebhookurl, buildWatchPartyEndedPayload() (+11 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.10
Nodes (18): activeTab, candidates, canSubmit, emit, errorMessage, handleClose(), handleConfirmReplace(), isPrivate (+10 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 55 - "ReleaseCandidate"
Cohesion: 0.14
Nodes (5): ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult, MockProwlarrService, MockProwlarrService

### Community 56 - "SnatchHandler"
Cohesion: 0.18
Nodes (3): EpisodicHandler, SnatchHandler, TelegramCallbackQuery

### Community 57 - "airDateFetcher.ts"
Cohesion: 0.18
Nodes (12): AirDateFetcherLogger, AniListMediaResponse, AniListNextAiringEpisode, AniListStartDate, fetchAirDate(), FetchAirDateParams, fetchAniListAirDate(), fetchTmdbAirDate() (+4 more)

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

### Community 66 - "useAdminConfig.ts"
Cohesion: 0.23
Nodes (7): ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, useAdminConfig(), checkJellyfinStatus(), handleRescanJellyfin()

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

### Community 71 - "library.ts"
Cohesion: 0.07
Nodes (36): featureFlags, User, fastify, @fastify/jwt, FastifyJWT, FastifyRequest, JwtPayload, isFeatureEnabled() (+28 more)

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
Cohesion: 0.04
Nodes (19): apps_api_src_db_index_user, DownloadRequest, NewDownloadRequest, AnilistMigrationOptions, AnilistMigrationResult, markAllQueuedWaitingForSpace(), promoteQueuedRequests(), RequestsRepository (+11 more)

### Community 76 - "discordNotifier.ts"
Cohesion: 0.12
Nodes (14): DiscordEmbed, DiscordEmbedField, DiscordNotifier, NotificationContext, apps_api_src_services_notifications_discordnotifier, formatNotificationMediaTitle(), NotificationEvent, NotificationPayload (+6 more)

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
Nodes (35): executeBatchRequests(), executeCreateRequest(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo(), findMatchingCanonicalRequest(), getDedupLockKey(), globalRequestMutex (+27 more)

### Community 83 - "watcher/src/services/prowlarr.ts"
Cohesion: 0.08
Nodes (33): WatcherPollerOptions, CAM_REGEX, formatBytes(), parseReleaseTitle(), ProwlarrSearchResult, ReleaseCandidate, ReleaseSource, Resolution (+25 more)

### Community 84 - "useWaitlistMatching.ts"
Cohesion: 0.15
Nodes (16): isWaitlistedEffective, isCandidateWaitlisted, isWaitlistedEffective, isSelectedCandidateWaitlisted, selectItem(), isCandidateAlreadyWaitlisted, ACTIVE_STATUSES, isSeries() (+8 more)

### Community 86 - "AnimeDetailModal.vue"
Cohesion: 0.08
Nodes (32): applyResolveResult(), bannerUrl, cleanDescription, confirmWaitlistSubmission(), displayTitle, emit, handleClose(), handleConfirmAction() (+24 more)

### Community 87 - "Multi-Use Revocable User Invites — Spec"
Cohesion: 0.12
Nodes (16): Administrative Visibility & Moderation, Backend Endpoints (`apps/api/src/routes/invites.ts`), Further Notes, Implementation Decisions, Multi-Use Revocable User Invites — Spec, Out of Scope, Problem Statement, Role Safety & Security (+8 more)

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "parseTorrentBuffer"
Cohesion: 0.14
Nodes (12): QBittorrentError, QBittorrentService, BencodeValue, ParsedTorrent, parseTorrentBuffer(), decode(), decodeBuffer(), decodeString() (+4 more)

### Community 94 - "WatcherPoller"
Cohesion: 0.11
Nodes (19): FastifyInstance, WatcherAppOptions, WatcherDatabase, AutoDownloadSubmitter, AutoDownloadSubmitterLogger, AutoDownloadSubmitterOptions, WatcherPoller, EpisodicTrackingLogger (+11 more)

### Community 99 - "telegram-bot/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 100 - "UserSettingsModal.vue"
Cohesion: 0.11
Nodes (19): authStore, clearGeminiApiKey(), countdownText, countdownTimer, expiresIn, feedbackMessage, geminiApiKeyInput, generatePairingCode() (+11 more)

### Community 101 - "api/src/services/prowlarr.ts"
Cohesion: 0.23
Nodes (9): apps_api_src_services_prowlarr_haspasskey, hasPasskey(), isKnownPrivateIndexer(), parseReleaseTitle(), scoreRelease(), buildSeriesSearchQueries(), hasCjkCharacters(), SeriesQueryOptions (+1 more)

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.10
Nodes (19): Active Media Detection & Guardrails, API Routes, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Services, Deletion Tracking & Audit Trail, Further Notes, Implementation Decisions (+11 more)

### Community 115 - "JellyfinService"
Cohesion: 0.06
Nodes (26): JellyfinApiError, JellyfinService, 1. Database Schema (`apps/api`), 1. UI Entry Points & Discoverability, 2. Jellyfin Service SyncPlay Extension (`apps/api`), 2. Media Selection & Creation Modal (`CreateWatchPartyModal.vue`), 3. Immediate Post-Creation Player Handoff, 4. Watch Party API Routes (`apps/api/src/routes/watchParties.ts`) (+18 more)

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

### Community 117 - "Unified Series Domain and TMDB Canonical Authority — Spec"
Cohesion: 0.13
Nodes (14): Architectural Shape, Automated Waitlist Monitoring & Up Next Tracking, Further Notes, Implementation Decisions, Legacy Data Migration & System Health, Out of Scope, Problem Statement, Prowlarr Dual-Query Release Discovery (+6 more)

### Community 118 - "WatchRequest"
Cohesion: 0.15
Nodes (13): WatchRequest, waitlistActionRoutes(), waitlistCreateRoutes(), waitlistRoutes(), CreateWaitlistBody, normalizeTitle(), executeEpisodicWaterfall(), WaterfallDeps (+5 more)

### Community 120 - "WatchPartyLobbyModal.vue"
Cohesion: 0.08
Nodes (22): authStore, changeMediaItemId, changeMediaTitle, emit, handleManualChangeMedia(), handlePlayNextEpisode(), HistoryItem, isHost (+14 more)

### Community 121 - "api/src/db/schema.ts"
Cohesion: 0.08
Nodes (26): EpisodeStatus, FeatureFlag, Invite, InviteRole, MediaType, NewFeatureFlag, NewInvite, NewRequestCoRequester (+18 more)

### Community 122 - "Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec"
Cohesion: 0.12
Nodes (16): 1. Watcher Schema & Diagnostics (`apps/watcher`), 2. Watcher Advance Endpoint (`apps/watcher`), 3. Main API Request Integration (`apps/api`), 4. Frontend Decomposition & Waitlist UI (`apps/web`), 5. Fast-Track Request Step 3 Initialization (`apps/web`), Episodic Scope & Lifecycle, Further Notes, Implementation Decisions (+8 more)

### Community 123 - "IWatchPartyRepository"
Cohesion: 0.13
Nodes (6): NewWatchPartyRoom, WatchPartyRoom, watchPartyRooms, IWatchPartyRepository, WatchPartyRepository, WatchPartyRoomWithHost

### Community 124 - "Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec"
Cohesion: 0.12
Nodes (16): 1. Oracle VPS Configuration (`167.126.3.136`), 2. Home Stack Modifications (`docker/docker-compose.yml`), 3. DNS Configuration (Cloudflare), Cloudflare Compliance & Security, Further Notes, Good Test Principles, Implementation Decisions, Infrastructure Cleanliness (+8 more)

### Community 125 - "ref_drizzle_orm"
Cohesion: 0.07
Nodes (17): apps_api_src_db_index_invites, downloadRequests, requestCoRequesters, SystemConfig, SpaceCheckResult, InvalidCredentialsError, JellyfinAuthResult, TorrentInfo (+9 more)

### Community 126 - "ephemeralEvictionCron.ts"
Cohesion: 0.24
Nodes (6): apps_streamer_src_db_index_ephemeralstreams, StreamerDatabase, ephemeralStreams, EphemeralEvictionCronOptions, StreamPollerOptions, IStreamerJellyfinService

### Community 127 - "IProwlarrService"
Cohesion: 0.11
Nodes (9): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), IProwlarrService, apps_api_src_services_prowlarr_resolution (+1 more)

### Community 129 - "WaitlistCheckService"
Cohesion: 0.10
Nodes (16): WaitlistCheckService, 1. Seeder & Resolution Diagnostics (`apps/watcher` & `apps/api`), 2. Episodic Waterfall Chaining Engine (`apps/watcher`), Episodic Waterfall Automation, Further Notes, Good Test Principles, Implementation Decisions, Out of Scope (+8 more)

### Community 130 - "InviteView.vue"
Cohesion: 0.07
Nodes (23): ApiError, apiRequest(), authStore, confirmPassword, creatorUsername, featureFlags, isCheckingToken, isSubmitting (+15 more)

### Community 131 - "Unified Series Domain and TMDB Canonical Authority"
Cohesion: 0.33
Nodes (5): Consequences, Considered Options, Context, Decision, Unified Series Domain and TMDB Canonical Authority

### Community 132 - "useRequestData.ts"
Cohesion: 0.07
Nodes (54): step2QueryInputRef, { isItemWaitlisted }, props, buildCandidate(), enrichCandidateMetadata(), FastTrackParsedData, parseEpisodeAndGranularity(), parseFastTrack() (+46 more)

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 134 - "upNext.test.ts"
Cohesion: 0.04
Nodes (22): BaseMetadataService, IMetadataService, MetadataApiError, MetadataCandidate, MetadataSearchOptions, MetadataService, rankMetadataCandidates(), apps_api_src_services_prowlarr_iprowlarrservice (+14 more)

### Community 135 - "MetadataCandidate"
Cohesion: 0.18
Nodes (8): CarouselSession, EpisodicSession, SnatchParams, WaitlistSession, InlineKeyboardMarkup, MetadataCandidate, TelegramMessage, Implementation Decisions

### Community 136 - "ws.ts"
Cohesion: 0.29
Nodes (5): fastify, FastifyInstance, wsRoutes, fastify-plugin, ws

### Community 137 - "api/src/index.ts"
Cohesion: 0.18
Nodes (9): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+1 more)

### Community 139 - "AGENTS.md — Media Download Manager Instructions"
Cohesion: 0.50
Nodes (3): AGENTS.md — Media Download Manager Instructions, Architectural Rules, Issue Tracking & Task Management

### Community 140 - "useRequestStep1.ts"
Cohesion: 0.21
Nodes (13): useRequestStep1(), processFiles(), removeBatchItem(), UseRequestStep1Options, parseTorrentFile(), decode(), decodeBuffer(), decodeString() (+5 more)

### Community 141 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 142 - "WaitlistEpisodeAdjustPopover.vue"
Cohesion: 0.20
Nodes (10): emit, errorMessage, handleSave(), isSeasonPack, isValid, props, saving, seasonNumber (+2 more)

### Community 143 - "Decision"
Cohesion: 0.20
Nodes (9): 1. Native Jellyfin SyncPlay Launch Bridge, 2. Eligible Media Scope, 3. In-Place Media Switching & Discord Party Timeline, 4. Context-Specific Discord Channel Routing, 5. Room Persistence & Automated Cleanup, ADR-0025: Watch Party SyncPlay Integration & In-Place Timeline Progression, Consequences, Context (+1 more)

### Community 144 - "SeasonPackEpisodesDrawer.vue"
Cohesion: 0.12
Nodes (12): canManage, confirmPruneEpisode, emit, episodes, error, executePrune(), loading, props (+4 more)

### Community 146 - "Specification: Watch Party SyncPlay Token Auth, Deep Link & Cross-Platform TV Bridge"
Cohesion: 0.17
Nodes (11): Acceptance Criteria, Background & Problem Statement, Cross-Platform TV Participation & Canonical Handoff, Deep Link & Discord Routing, Implementation Architecture, Jellyfin User Token & SyncPlay Provisioning, Slice 1: Backend Jellyfin User Token Storage, Migration, SyncPlay Provisioning & Canonical Launch URL, Slice 2: Shareable Discord Deep Link `/party/:id` & Auto-Lobby Routing (+3 more)

### Community 147 - "watchPartyCleanup.ts"
Cohesion: 0.16
Nodes (6): WatchPartyCleanupJob, WatchPartyCleanupLogger, WatchPartyCleanupOptions, BroadcastFunction, IJellyfinSyncPlayService, SyncPlayGroupDetails

### Community 149 - "ProwlarrService"
Cohesion: 0.21
Nodes (3): formatBytes(), ScoreOptions, ProwlarrService

### Community 150 - "ReportCardHandler"
Cohesion: 0.18
Nodes (7): ReportCardHandler, Acceptance Criteria, Implementation Decisions, Problem Statement, Solution, Spec: Telegram Pinned Report Card and Ephemeral Chat Cleanup, User Stories

### Community 152 - "Decision"
Cohesion: 0.22
Nodes (8): 1. Authenticated User Token Storage for SyncPlay, 2. Canonical Backend-Driven Jellyfin Launch URL, 3. Dedicated `/party/:id` Route & Auto-Lobby State, 4. Cross-Platform TV Guidance & AirPlay Launch Bridge, ADR-0027: Jellyfin SyncPlay Token Authentication, Canonical Handoff & Cross-Platform TV Bridge, Consequences, Context, Decision

### Community 154 - "src/types.ts"
Cohesion: 0.22
Nodes (10): InlineKeyboardButton, IntentAction, ReportItem, ReportWaitlistItem, SearchReleasesResponse, SeriesProgressResult, TelegramChat, TelegramUpdate (+2 more)

### Community 155 - "IntentParser"
Cohesion: 0.33
Nodes (4): IntentParser, IntentParserOptions, ORDINAL_MAP, ParsedIntent

### Community 156 - "ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure"
Cohesion: 0.40
Nodes (4): ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure, Consequences, Context, Decision

### Community 157 - "ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining"
Cohesion: 0.25
Nodes (7): 1. Preferred Indexer Qualification, 2. Resolution Gating & 720p Fallback, 3. Episodic Waterfall Chaining Engine, ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining, Consequences, Context, Decision

### Community 158 - "streamer/src/app.ts"
Cohesion: 0.19
Nodes (8): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, StreamPoller, DirectDownloader, IDirectDownloader, ref_node_stream

### Community 159 - "AnimeTmdbConfirmSection.vue"
Cohesion: 0.33
Nodes (6): emit, handleManualSearch(), isManualSearchOpen, manualSearchQuery, props, selectedCandidate

### Community 160 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 161 - "formatters.ts"
Cohesion: 0.10
Nodes (17): emit, expandedEpisodesId, handleEpisodePruned(), props, getProgressSpeedEta(), props, requestsStore, progressPercent (+9 more)

### Community 162 - "Spec: Waitlist Tiering and In-Place Target Episode Adjustment"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Solution, Spec: Waitlist Tiering and In-Place Target Episode Adjustment, Testing Decisions, User Stories

### Community 163 - "unarchive.ts"
Cohesion: 0.15
Nodes (8): CommandExecFn, CommandExecResult, ExtractAndDeployMediaOptions, ExtractAndDeployMediaRequest, ExtractArchiveOptions, ExtractedMedia, UnarchiveService, UnarchiveServiceOptions

### Community 164 - "AdminFeaturesTab.vue"
Cohesion: 0.20
Nodes (11): AdminFeatureFlag, automationFlags, discoveryFlags, downloadsFlags, emit, flagConfirmModal, HIGH_IMPACT_FLAGS, HIGH_IMPACT_MESSAGES (+3 more)

### Community 165 - "ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject"
Cohesion: 0.40
Nodes (4): ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject, Consequences, Context, Decision

### Community 166 - "useAdminData"
Cohesion: 0.20
Nodes (4): useAdminData(), handleCreateInvite(), handleRevokeInvite(), loadInvites()

### Community 168 - "useRequestReleases"
Cohesion: 0.27
Nodes (8): useRequestReleases(), checkCacheForCandidates(), extractInfoHash(), fetchReleasesForCandidate(), getCandidateCacheStatus(), getSearchTitles(), reloadReleasesSilently(), searchReleasesApi()

### Community 169 - "streamer/src/db/index.ts"
Cohesion: 0.26
Nodes (8): getStreamerDatabasePath(), initStreamerDatabase(), apps_streamer_src_db_index_systemconfig, EphemeralStream, NewEphemeralStream, NewSystemConfig, SystemConfig, JellyfinSession

### Community 171 - "internal.ts"
Cohesion: 0.25
Nodes (8): serviceKeyAuth(), internalRoutes(), subgenWebhookSchema, ACTIVE_STATUSES, ACTIVE_WAITLIST_STATUSES, internalTelegramRoutes(), reportMessageIdSchema, snatchMessageIdSchema

### Community 173 - "TelegramBotClient"
Cohesion: 0.24
Nodes (10): ApiClientOptions, CallbackSession, CallbackStore, CarouselHandler, main(), MessageHandler, SnatchSession, TelegramBotClient (+2 more)

### Community 174 - "prowlarrScoring.ts"
Cohesion: 0.38
Nodes (6): isTitleRelevant(), ReleaseSource, Resolution, ScorableCandidate, VideoCodec, UpNextItem

### Community 175 - "requestWaitlistIntegration.ts"
Cohesion: 0.60
Nodes (5): advanceWaitlistIfNeeded(), callWatcherEndpoint(), triggerNextSeasonWaitlist(), triggerWaitlistActions(), WaitlistTriggerParams

### Community 176 - "src/config.ts"
Cohesion: 0.28
Nodes (6): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, _resetConfigForTesting(), testConfigDefaults, ValidateConfigOptions

### Community 179 - "watcher/src/index.ts"
Cohesion: 0.40
Nodes (4): app, __dirname, envPaths, __filename

### Community 183 - "UpNextShelf.vue"
Cohesion: 0.25
Nodes (6): available, { ensureWaitlistLoaded, isItemWaitlisted }, items, router, UpNextItem, UpNextResponse

### Community 185 - "Spec: Telegram Bot Client with Intent Parsing"
Cohesion: 0.25
Nodes (7): Further Notes, Out of Scope, Problem Statement, Solution, Spec: Telegram Bot Client with Intent Parsing, Testing Decisions, User Stories

### Community 186 - "normalizeShowTitle"
Cohesion: 0.52
Nodes (5): groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), normalizeShowTitle()

### Community 187 - "MdmApiClient"
Cohesion: 0.15
Nodes (5): MdmApiClient, MdmUser, MediaType, 0030. Telegram Pinned Report and Ephemeral Interaction Flow, Context & Decision

### Community 188 - "useAdminActivity"
Cohesion: 0.57
Nodes (6): useAdminActivity(), fetchActivity(), handleVisibilityChange(), startPolling(), stopPolling(), stopSession()

### Community 190 - "isQualifiedPreferred"
Cohesion: 0.60
Nodes (4): getPreferredIndexerMinSeeders(), isPreferredIndexer(), isQualifiedPreferred(), PreferredCandidateLike

### Community 192 - "IJellyfinService"
Cohesion: 0.08
Nodes (4): HistoryMatcherOptions, CleanupService, PruneEpisodeResult, IJellyfinService

### Community 194 - "TorrentManualInput.vue"
Cohesion: 0.60
Nodes (4): emit, fileInputRef, onClear(), onFileChange()

### Community 195 - "main.ts"
Cohesion: 0.50
Nodes (3): app, pinia, apps_web_src_style

### Community 196 - "useAdminCleanup"
Cohesion: 0.83
Nodes (4): useAdminCleanup(), confirmCleanItem(), handleRunScan(), loadDiskAndCandidates()

## Knowledge Gaps
- **1179 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+1174 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1704 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IRequestsRepository` connect `IRequestsRepository` to `IJellyfinService`, `services/cleanup.ts`, `animeTypes.ts`, `library.ts`, `IEpisodesRepository`, `requestService.ts`, `Deleted Requests History and Redownload — Spec`, `ReportCardHandler`, `serviceContainer.ts`, `useRequestSubmit`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `vue` connect `vue` to `InviteView.vue`, `Navbar.vue`, `useRequestData.ts`, `AnimeView.vue`, `LibraryView.vue`, `useWaitlistTiers.ts`, `ref_vitest`, `useAdminActivity.ts`, `RequestStep1Input.vue`, `WaitlistEpisodeAdjustPopover.vue`, `SeasonPackEpisodesDrawer.vue`, `WaitlistCard.vue`, `useRequestStep1.ts`, `WaitlistView.vue`, `DiscoveryFeed.vue`, `AnimeCard.vue`, `web/package.json`, `PromotionModal.vue`, `AnimeTmdbConfirmSection.vue`, `formatters.ts`, `AdminFeaturesTab.vue`, `WaitlistAddModal.vue`, `StreamProgressModal.vue`, `SubtitlePickerModal.vue`, `AdminView.vue`, `TorrentReplacementModal.vue`, `AdminSessionCard.vue`, `UpNextShelf.vue`, `useAdminConfig.ts`, `TorrentManualInput.vue`, `main.ts`, `ActiveStreamsShelf.vue`, `useWaitlistMatching.ts`, `AnimeDetailModal.vue`, `UserSettingsModal.vue`, `WatchPartyLobbyModal.vue`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `api` connect `ref_vitest` to `InviteView.vue`, `Navbar.vue`, `useRequestData.ts`, `AnimeView.vue`, `LibraryView.vue`, `useAdminActivity.ts`, `vue`, `SeasonPackEpisodesDrawer.vue`, `WaitlistView.vue`, `DiscoveryFeed.vue`, `PromotionModal.vue`, `WaitlistAddModal.vue`, `StreamProgressModal.vue`, `SubtitlePickerModal.vue`, `AdminView.vue`, `TorrentReplacementModal.vue`, `UpNextShelf.vue`, `useAdminActivity`, `useAdminConfig.ts`, `ActiveStreamsShelf.vue`, `AnimeDetailModal.vue`, `UserSettingsModal.vue`, `WatchPartyLobbyModal.vue`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `IJellyfinService` (e.g. with `Solution` and `2. Jellyfin Service SyncPlay Extension (`apps/api`)`) actually correct?**
  _`IJellyfinService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `services/cleanup.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055783817951959545 - nodes in this community are weakly interconnected._