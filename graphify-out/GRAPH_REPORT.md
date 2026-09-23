# Graph Report - Plex-auto-download  (2026-09-23)

## Corpus Check
- 366 files · ~245,173 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .example 3, .css 1)

## Summary
- 2422 nodes · 5913 edges · 134 communities (100 shown, 34 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 194 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `25225f9a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requestService.ts
- streamer/src/app.ts
- Navbar.vue
- ref_fastify
- serviceContainer.ts
- IJellyfinService
- middleware/auth.ts
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- ref_vitest
- DashboardView.vue
- api/src/services/jellyfin.ts
- devDependencies
- subtitleInspection.ts
- useRequestStep1.ts
- ref_drizzle_orm
- api/src/services/prowlarr.ts
- BaseMetadataService
- DiscoveryFeed.vue
- api/package.json
- useSeasonalAnime.ts
- stores/requests.ts
- Context Domain Model Document
- JellyfinService
- discovery.test.ts
- web/package.json
- PromotionModal.vue
- api/src/services/notifications.ts
- requests/index.ts
- api/src/db/index.ts
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- api/src/index.ts
- compilerOptions
- animeSeasonal.test.ts
- AnimeDetailModal.vue
- AnimeView.vue
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- ICleanupService
- SubtitlePickerModal.vue
- InviteView.vue
- api/src/app.ts
- compilerOptions
- vue
- dependencies
- TorrentReplacementModal.vue
- scripts
- upNext.test.ts
- IQBittorrentService
- library.ts
- FileSystemService
- User Role
- Waitlist Entry
- Leanback Client and Android TV Shell — Spec
- useAdminData
- Media Download Manager Architecture Spec
- scripts
- Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)
- useRequestReleases
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- MetadataCandidate
- QBittorrentService
- Indexer
- Ephemeral Stream
- IRequestsRepository
- config.ts
- IProwlarrService
- Leanback Client and Android TV Shell
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- ActiveStreamsShelf.vue
- runRecovery.ts
- MockCleanup
- MockCleanupService
- RequestStep1Input.vue
- libraryPathBuilder.ts
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- api/src/routes/waitlist.ts
- upNext.ts
- IMetadataService
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- loadEntries
- checkCandidateGuards
- closeModal
- vercel.json
- pnpm-workspace.yaml
- Favicon Vector Graphic (MDM Brand Lightning / Geometric Icon)
- SVG Icon Sprite Sheet (Bluesky, Discord, Docs, GitHub, Social, X)
- Hero Illustration (Landing / Welcome Graphic)
- Vite Logo Asset
- Vue Logo Asset
- UpNextShelf.vue
- parseTorrentBuffer
- Torrent Replacement for Underway Requests
- ref_node_path
- ws.ts
- useRequestSubmit
- formatStatusText
- MockCleanupService
- stores/waitlist.ts
- DummyQB
- MockCleanup
- OpenSubtitlesService
- MockCleanupService
- MockCleanup
- clearSelection
- DummyJellyfin
- DummyJellyfinService
- isExpanded
- CoRequesterPicker.vue
- isSelected

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 73 edges
2. `IRequestsRepository` - 65 edges
3. `DownloadRequest` - 60 edges
4. `IQBittorrentService` - 52 edges
5. `RequestsRepository` - 49 edges
6. `Context Domain Model Document` - 49 edges
7. `buildApp()` - 48 edges
8. `IFileSystemService` - 47 edges
9. `AppDatabase` - 46 edges
10. `users` - 46 edges

## Surprising Connections (you probably didn't know these)
- `Architectural Shape` --references--> `useFeatureFlags()`  [INFERRED]
  docs/spec/leanback-client-and-android-tv-shell.md → apps/web/src/composables/useFeatureFlags.ts
- `Implementation Decisions` --references--> `buildApp()`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/app.ts
- `Architectural Shape` --references--> `AnimeSeasonService`  [INFERRED]
  docs/spec/seasonal-anime-discovery-and-waitlist-bridging.md → apps/api/src/services/animeSeasonService.ts
- `Testing Philosophy` --references--> `AnimeSeasonService`  [INFERRED]
  docs/spec/seasonal-anime-discovery-and-waitlist-bridging.md → apps/api/src/services/animeSeasonService.ts
- `Implementation Decisions` --references--> `CleanupServiceOptions`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Jellyfin Authentication and Role Model** — context_user_role, context_trusted_role, context_admin_role, context_invite, docs_adr_0001_jellyfin_as_auth_source_of_truth_jellyfin_auth, docker_docker_compose_yml_service_jellyfin [EXTRACTED 0.95]
- **Automated Discovery, Episodic Tracking, and Configurable Grace Period Ingestion** — docs_spec_discovery_feed_and_up_next_shelf_up_next_shelf, docs_spec_discovery_feed_and_up_next_shelf_episodic_gap_algorithm, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_watch_for_next_episodes, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_compute_grace_hours, docs_adr_0013_per_entry_grace_periods_with_release_newness_classification_per_entry_grace_period [EXTRACTED 0.95]
- **Download Request Hardlink Lifecycle** — context_download_request, context_staging_area, context_hardlink_move, context_library, context_storage_quota, docker_docker_compose_yml_service_qbittorrent, docker_docker_compose_yml_service_api [EXTRACTED 0.95]
- **Ephemeral Debrid Streaming Pipeline** — context_ephemeral_stream, context_stream_library, docker_docker_compose_yml_service_zurg, docker_docker_compose_yml_service_rclone, docker_docker_compose_yml_service_streamer, docs_adr_0012_dual_tier_ephemeral_streaming_with_real_debrid_dual_tier_streaming [EXTRACTED 0.95]
- **Preferred Indexer Dual-Candidate Airgap Architecture** — docs_adr_0016_preferred_indexer_for_downloads_preferred_indexer_oracle, docs_adr_0016_preferred_indexer_for_downloads_discovery_dual_candidate, docs_spec_preferred_indexer_bj_share_preferred_indexer_concept, docs_spec_preferred_indexer_bj_share_dual_candidate_binding, docs_spec_ephemeral_streaming_and_real_debrid_private_airgap [EXTRACTED 0.95]
- **Private Library Security & Processing Pipeline** — docs_spec_private_media_type_and_trusted_role_private_media_type, docs_spec_private_media_type_and_trusted_role_trusted_role, docs_spec_private_media_type_and_trusted_role_jellyfin_access_control, docs_spec_subgen_gpu_subtitle_transcription_subgen_container, docs_adr_0017_local_gpu_subtitle_transcription_with_subgen_subgen_whisper_integration [EXTRACTED 0.95]

## Communities (134 total, 34 thin omitted)

### Community 0 - "requestService.ts"
Cohesion: 0.11
Nodes (36): executeBatchRequests(), executeCreateRequest(), triggerNextSeasonWaitlist(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo(), findMatchingCanonicalRequest(), getDedupLockKey() (+28 more)

### Community 1 - "streamer/src/app.ts"
Cohesion: 0.05
Nodes (33): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), StreamerDatabase (+25 more)

### Community 2 - "Navbar.vue"
Cohesion: 0.08
Nodes (25): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isWaitlistEnabled, route (+17 more)

### Community 3 - "ref_fastify"
Cohesion: 0.10
Nodes (20): FeatureFlag, featureFlags, Invite, InviteRole, invites, MediaType, NewFeatureFlag, NewInvite (+12 more)

### Community 4 - "serviceContainer.ts"
Cohesion: 0.06
Nodes (24): AppOptions, fastify, FastifyInstance, CleanupCron, DownloadPoller, getLocalTimeInTimezone(), isInsideWindow(), TranscriptionCron (+16 more)

### Community 5 - "IJellyfinService"
Cohesion: 0.08
Nodes (9): HistoryMatcherOptions, CleanupService, matchesLibraryPath(), IJellyfinService, Dependency diagram, Recommended Implementation Order, Wave 1 — Foundation (no blockers; implement first), Wave 2 — Build on the foundation (start after Wave 1 blockers are complete) (+1 more)

### Community 6 - "middleware/auth.ts"
Cohesion: 0.15
Nodes (8): User, fastify, @fastify/jwt, FastifyJWT, FastifyRequest, loginSchema, DummyJellyfinService, ref_node_crypto

### Community 7 - "Ephemeral Streaming Tier"
Cohesion: 0.08
Nodes (43): ADR 0013: Per-Entry Grace Periods with Release Newness Classification, graceOverrideHours Column, Per-Entry Grace Period Computation, Release Newness Threshold Classification, ADR 0015: Runtime Feature Flags and Subsystem Kill Switches, Authoritative Gateway Architecture for Feature Flags, Coordinated Pause for Background Workers, Full-Stack Feature Flag Enforcement (+35 more)

### Community 8 - "LibraryView.vue"
Cohesion: 0.06
Nodes (29): activeCategory, allLibraryItems, allSelectedRequestIds, authStore, currentCategoryItems, EpisodeItem, error, expandedCardIds (+21 more)

### Community 9 - "streamer/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 10 - "watcher/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 11 - "WaitlistView.vue"
Cohesion: 0.05
Nodes (31): activeView, approvingEntryId, authStore, availableReleasesCount, candidates, checkingEntryId, hasSearched, isCheckingAll (+23 more)

### Community 12 - "ref_vitest"
Cohesion: 0.09
Nodes (20): api, useAuthStore, User, mockPush, mockReplace, mountOptions, mockLocalStorage, mockPush (+12 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.05
Nodes (29): formatEta(), activeStreamingItem, activeStreamsShelfRef, authStore, discoveryFeedRef, DiskInfo, featureFlags, getProgressSpeedEta() (+21 more)

### Community 14 - "api/src/services/jellyfin.ts"
Cohesion: 0.13
Nodes (17): downloadRequests, requestCoRequesters, SpaceCheckResult, JellyfinAuthResult, NotificationEvent, NotificationPayload, TorrentInfo, BencodeValue (+9 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "subtitleInspection.ts"
Cohesion: 0.09
Nodes (25): execFileAsync, FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionService, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, ref_node_child_process (+17 more)

### Community 17 - "useRequestStep1.ts"
Cohesion: 0.16
Nodes (16): useRequestStep1(), processFiles(), removeBatchItem(), UseRequestStep1Options, BencodeValue, ParsedTorrent, parseTorrentFile(), decode() (+8 more)

### Community 18 - "ref_drizzle_orm"
Cohesion: 0.05
Nodes (63): buildWatcherApp(), fastify, FastifyInstance, WatcherAppOptions, getWatcherDatabasePath(), initWatcherDatabase(), WatcherDatabase, NewWaitlistCoRequester (+55 more)

### Community 19 - "api/src/services/prowlarr.ts"
Cohesion: 0.15
Nodes (8): formatBytes(), hasCjkCharacters(), ProwlarrService, ReleaseSource, VideoCodec, isPreferredIndexer(), isQualifiedPreferred(), PreferredCandidateLike

### Community 20 - "BaseMetadataService"
Cohesion: 0.12
Nodes (8): BaseMetadataService, MetadataApiError, MetadataService, rankMetadataCandidates(), MockMetadata, MockRouteMetadataService, MockMetadata, MockMetadata

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "useSeasonalAnime.ts"
Cohesion: 0.13
Nodes (15): displayTitle, isAiringOrFinished, posterUrl, props, statusBadgeClasses, statusLabel, subTitle, canScrollLeft (+7 more)

### Community 24 - "stores/requests.ts"
Cohesion: 0.10
Nodes (35): step2QueryInputRef, FastTrackParsedData, parseFastTrack(), BatchItem, CanonicalRequestSummary, MetadataCandidate, apps_web_src_composables_requesttypes_releasecandidate, apps_web_src_composables_userequestdata_batchitem (+27 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "JellyfinService"
Cohesion: 0.08
Nodes (4): InvalidCredentialsError, JellyfinApiError, JellyfinService, MockJellyfinService

### Community 27 - "discovery.test.ts"
Cohesion: 0.11
Nodes (7): ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult, DummyJellyfinService, MockProwlarrService, TorrentParsed, MockProwlarrService

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "api/src/services/notifications.ts"
Cohesion: 0.21
Nodes (6): DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), NotificationServiceOptions, ResendNotifier

### Community 31 - "requests/index.ts"
Cohesion: 0.13
Nodes (23): adminGuard(), requireFeature(), batchRoutes(), createRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes() (+15 more)

### Community 32 - "api/src/db/index.ts"
Cohesion: 0.10
Nodes (27): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase(), apps_api_src_db_index_invites (+19 more)

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "api/src/index.ts"
Cohesion: 0.13
Nodes (14): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+6 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeSeasonal.test.ts"
Cohesion: 0.06
Nodes (43): AnimeHistoryMatcher, extractShowNameFromPath(), stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry, calculateCurrentSeasonAndYear() (+35 more)

### Community 39 - "AnimeDetailModal.vue"
Cohesion: 0.08
Nodes (25): bannerUrl, cleanDescription, confirmWaitlistSubmission(), displayTitle, emit, handleClose(), isAiringOrFinished, isResolvingTmdb (+17 more)

### Community 40 - "AnimeView.vue"
Cohesion: 0.10
Nodes (18): useSeasonalAnime(), fetchArchive(), fetchSeasonalSections(), initFromRoute(), selectSeasonAndYear(), activeSeasonSelect, featureFlags, handlePageChange() (+10 more)

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

### Community 46 - "ICleanupService"
Cohesion: 0.18
Nodes (3): CleanupCronLogger, CleanupCronOptions, ICleanupService

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 48 - "InviteView.vue"
Cohesion: 0.06
Nodes (27): ApiError, apiRequest(), app, router, routes, pinia, apps_web_src_style, authStore (+19 more)

### Community 49 - "api/src/app.ts"
Cohesion: 0.15
Nodes (15): buildApp(), getConfig(), validateConfig(), apps_api_src_db_index_featureflags, authMiddleware(), adminRoutes(), animeSeasonalRoutes(), resolveTmdbSchema (+7 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "vue"
Cohesion: 0.09
Nodes (29): DiskInfo, ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, AdminFeatureFlag, automationFlags, discoveryFlags (+21 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.09
Nodes (22): emit, fileInputRef, onClear(), onFileChange(), activeTab, candidates, canSubmit, emit (+14 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 55 - "upNext.test.ts"
Cohesion: 0.23
Nodes (7): groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), normalizeShowTitle(), UpNextService, DummyJellyfinService

### Community 56 - "IQBittorrentService"
Cohesion: 0.13
Nodes (24): AppDatabase, apps_api_src_db_index_downloadrequest, DownloadPollerOptions, PollerLogger, UnarchiveDaemonOptions, CleanupServiceOptions, IFileSystemService, HardlinkRecoveryOptions (+16 more)

### Community 57 - "library.ts"
Cohesion: 0.20
Nodes (9): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, MediaArtwork, MediaRequester, moveMediaSchema (+1 more)

### Community 59 - "User Role"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Waitlist Entry"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 61 - "Leanback Client and Android TV Shell — Spec"
Cohesion: 0.14
Nodes (13): Architectural Shape, Authentication & Pairing (Quick Connect), Content Shelves & Media Actions, Further Notes, Implementation Decisions, Jellyfin Integration & Android TV Shell, Leanback Client and Android TV Shell — Spec, Out of Scope (+5 more)

### Community 62 - "useAdminData"
Cohesion: 0.12
Nodes (11): formatDate(), formatMediaSubtitle(), useAdminData(), checkJellyfinStatus(), confirmCleanItem(), handleCreateInvite(), handleRescanJellyfin(), handleRunScan() (+3 more)

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)"
Cohesion: 0.15
Nodes (12): Apple TV Authentication (Quick Connect), Architectural Shape, Content Discovery & Living-Room Actions, Draft Spec: Native Apple TV Companion App (`apps/tv-apple`), Further Notes, Implementation Decisions, Out of Scope, Problem Statement (+4 more)

### Community 66 - "useRequestReleases"
Cohesion: 0.27
Nodes (8): useRequestReleases(), checkCacheForCandidates(), extractInfoHash(), fetchReleasesForCandidate(), getCandidateCacheStatus(), getSearchTitles(), reloadReleasesSilently(), searchReleasesApi()

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

### Community 71 - "MetadataCandidate"
Cohesion: 0.28
Nodes (3): MetadataCandidate, MockMetadataService, MockMetadataService

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "IRequestsRepository"
Cohesion: 0.05
Nodes (14): DownloadRequest, RequestsRepository, IRequestsRepository, RequestListItem, RequestStateMachine, UpNextServiceOptions, MockCleanupService, Implementation Decisions (+6 more)

### Community 76 - "config.ts"
Cohesion: 0.20
Nodes (8): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, _resetConfigForTesting(), testConfigDefaults, ValidateConfigOptions, subgenWebhookSchema, zod

### Community 78 - "Leanback Client and Android TV Shell"
Cohesion: 0.50
Nodes (3): Context, Decision, Leanback Client and Android TV Shell

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 82 - "ActiveStreamsShelf.vue"
Cohesion: 0.21
Nodes (9): authStore, emit, EphemeralStreamItem, fetchStreams(), handleEvict(), handlePromote(), handleWsMessage(), loading (+1 more)

### Community 83 - "runRecovery.ts"
Cohesion: 0.16
Nodes (8): __dirname, envPaths, __filename, main(), runHardlinkingRecovery(), UnarchiveService, runCorruptedArchiveRecovery(), registerStartupHooks()

### Community 86 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 87 - "libraryPathBuilder.ts"
Cohesion: 0.47
Nodes (4): buildLibraryPath(), BuildLibraryPathParams, padNumber(), sanitizePathSegment()

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "api/src/routes/waitlist.ts"
Cohesion: 0.20
Nodes (13): JwtPayload, isFeatureEnabled(), forwardToStreamer(), streamsAuth(), streamsRoutes(), forwardToWatcher(), waitlistAuth(), WaitlistEntry (+5 more)

### Community 94 - "upNext.ts"
Cohesion: 0.13
Nodes (17): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), MetadataSearchOptions, Resolution (+9 more)

### Community 95 - "IMetadataService"
Cohesion: 0.13
Nodes (3): resolveArtwork(), IMetadataService, MockMetadataService

### Community 99 - "loadEntries"
Cohesion: 0.50
Nodes (4): handleCheckAll(), handleCheckEntry(), loadEntries(), setView()

### Community 100 - "checkCandidateGuards"
Cohesion: 0.67
Nodes (3): checkCandidateGuards(), initPrefilledModal(), selectCandidate()

### Community 101 - "closeModal"
Cohesion: 0.67
Nodes (3): closeModal(), downloadDirectly(), submitWaitlistEntry()

### Community 114 - "UpNextShelf.vue"
Cohesion: 0.25
Nodes (5): available, items, router, UpNextItem, UpNextResponse

### Community 115 - "parseTorrentBuffer"
Cohesion: 0.70
Nodes (4): parseTorrentBuffer(), decode(), decodeBuffer(), decodeString()

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

### Community 117 - "ref_node_path"
Cohesion: 0.13
Nodes (19): ProcessAndHardlinkInput, ProcessAndHardlinkResult, ProcessAndHardlinkTorrentInput, ProcessAndHardlinkTorrentResult, CommandExecFn, CommandExecResult, ExtractAndDeployMediaOptions, ExtractAndDeployMediaRequest (+11 more)

### Community 118 - "ws.ts"
Cohesion: 0.29
Nodes (5): fastify, FastifyInstance, wsRoutes, fastify-plugin, ws

### Community 119 - "useRequestSubmit"
Cohesion: 0.15
Nodes (18): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep2(), confirmStep2Selection(), handleSearchMetadata(), selectCandidate() (+10 more)

### Community 120 - "formatStatusText"
Cohesion: 0.67
Nodes (3): formatGraceRemaining(), formatStatusText(), getRemainingGraceMs()

### Community 122 - "stores/waitlist.ts"
Cohesion: 0.40
Nodes (4): CreateWaitlistPayload, useWaitlistStore, WaitlistEntry, WaitlistStatus

### Community 125 - "OpenSubtitlesService"
Cohesion: 0.29
Nodes (4): OpenSubtitlesOptions, OpenSubtitlesService, SearchSubtitlesParams, SubtitleSearchResult

### Community 128 - "clearSelection"
Cohesion: 0.50
Nodes (5): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), switchCategory()

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

## Knowledge Gaps
- **760 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+755 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1138 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IJellyfinService` connect `IJellyfinService` to `requestService.ts`, `api/src/db/index.ts`, `DummyJellyfinService`, `ref_fastify`, `serviceContainer.ts`, `DummyJellyfin`, `animeSeasonal.test.ts`, `middleware/auth.ts`, `IRequestsRepository`, `api/src/services/jellyfin.ts`, `api/src/app.ts`, `ref_node_path`, `upNext.test.ts`, `IQBittorrentService`, `JellyfinService`, `discovery.test.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `vue` connect `vue` to `Navbar.vue`, `LibraryView.vue`, `WaitlistView.vue`, `ref_vitest`, `DashboardView.vue`, `useRequestStep1.ts`, `DiscoveryFeed.vue`, `useSeasonalAnime.ts`, `stores/requests.ts`, `web/package.json`, `PromotionModal.vue`, `AnimeDetailModal.vue`, `AnimeView.vue`, `StreamProgressModal.vue`, `SubtitlePickerModal.vue`, `InviteView.vue`, `TorrentReplacementModal.vue`, `ActiveStreamsShelf.vue`, `RequestStep1Input.vue`, `UpNextShelf.vue`, `stores/waitlist.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `AnimeSeasonService` connect `animeSeasonal.test.ts` to `serviceContainer.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _760 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requestService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1146051712089448 - nodes in this community are weakly interconnected._
- **Should `streamer/src/app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05133161512027491 - nodes in this community are weakly interconnected._
- **Should `Navbar.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.0761904761904762 - nodes in this community are weakly interconnected._