# Graph Report - Plex-auto-download  (2026-09-23)

## Corpus Check
- 337 files · ~225,501 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 2, .css 1)

## Summary
- 2164 nodes · 5378 edges · 128 communities (91 shown, 37 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 182 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a17899e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requestService.ts
- streamer/src/app.ts
- Navbar.vue
- RequestStep1Input.vue
- AdminView.vue
- CleanupService
- upNext.ts
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- ref_vitest
- DashboardView.vue
- ref_drizzle_orm
- watcher/src/services/prowlarr.ts
- appTypes.ts
- ref_node_path
- watcher/src/app.ts
- api/src/services/prowlarr.ts
- BaseMetadataService
- DiscoveryFeed.vue
- api/package.json
- IJellyfinService
- upNext.test.ts
- Context Domain Model Document
- JellyfinService
- discovery.test.ts
- web/package.json
- PromotionModal.vue
- api/src/services/notifications.ts
- api/src/app.ts
- api/src/db/index.ts
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- api/src/index.ts
- compilerOptions
- middleware/auth.ts
- ISubtitleInspectionService
- watcher/src/routes/waitlist.ts
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- IRequestsRepository
- SubtitlePickerModal.vue
- DummyJellyfinService
- featureFlags.ts
- compilerOptions
- useAdminData
- dependencies
- watcher/src/db/schema.ts
- scripts
- api/src/db/schema.ts
- MetadataCandidate
- stores/requests.ts
- useRequestStep1
- User Role
- Waitlist Entry
- DownloadPoller
- ReleaseGatingService
- Media Download Manager Architecture Spec
- scripts
- UpNextShelf.vue
- useRequestReleases
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- ref_fastify
- QBittorrentService
- Indexer
- Ephemeral Stream
- RequestsRepository
- serviceContainer.ts
- stores/waitlist.ts
- OpenSubtitlesService
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- ActiveStreamsShelf.vue
- UnarchiveService
- ICleanupService
- MockCleanupService
- search.ts
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- library.ts
- UnarchiveDaemon
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
- config.ts
- Implementation Decisions
- .hardlinkDirectory
- ws.ts
- useRequestSubmit
- formatStatusText
- DummyJellyfinService
- MockCleanupService
- InviteView.vue
- clearSelection
- IProwlarrService
- CoRequesterPicker.vue
- isExpanded
- isSelected
- MockCleanup

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 70 edges
2. `IRequestsRepository` - 60 edges
3. `DownloadRequest` - 59 edges
4. `IQBittorrentService` - 50 edges
5. `Context Domain Model Document` - 49 edges
6. `RequestsRepository` - 48 edges
7. `buildApp()` - 45 edges
8. `IFileSystemService` - 45 edges
9. `AppDatabase` - 44 edges
10. `users` - 43 edges

## Surprising Connections (you probably didn't know these)
- `Wave 1 — Foundation (no blockers; implement first)` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `Implementation Decisions` --references--> `buildApp()`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/app.ts
- `Implementation Decisions` --references--> `CleanupServiceOptions`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `Problem Statement` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `User Stories` --references--> `CleanupService`  [INFERRED]
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

## Communities (128 total, 37 thin omitted)

### Community 0 - "requestService.ts"
Cohesion: 0.09
Nodes (41): executeBatchRequests(), executeCreateRequest(), triggerNextSeasonWaitlist(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo(), findMatchingCanonicalRequest(), getDedupLockKey() (+33 more)

### Community 1 - "streamer/src/app.ts"
Cohesion: 0.05
Nodes (33): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), StreamerDatabase (+25 more)

### Community 2 - "Navbar.vue"
Cohesion: 0.06
Nodes (34): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isWaitlistEnabled, route, router (+26 more)

### Community 3 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 4 - "AdminView.vue"
Cohesion: 0.10
Nodes (24): DiskInfo, ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, AdminFeatureFlag, automationFlags, discoveryFlags (+16 more)

### Community 6 - "upNext.ts"
Cohesion: 0.10
Nodes (19): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), IMetadataService, MetadataSearchOptions (+11 more)

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
Cohesion: 0.10
Nodes (20): api, apiRequest(), useAuthStore, User, mockLocalStorage, mockPush, store, mockRoute (+12 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.05
Nodes (32): formatDate(), formatEta(), formatMediaSubtitle(), formatMediaType(), formatSpeed(), activeStreamingItem, activeStreamsShelfRef, authStore (+24 more)

### Community 14 - "ref_drizzle_orm"
Cohesion: 0.17
Nodes (14): apps_api_src_db_index_systemconfig, downloadRequests, requestCoRequesters, SystemConfig, users, SpaceCheckResult, JellyfinAuthResult, IQBittorrentService (+6 more)

### Community 15 - "watcher/src/services/prowlarr.ts"
Cohesion: 0.12
Nodes (20): CAM_REGEX, formatBytes(), parseReleaseTitle(), ReleaseCandidate, ReleaseSource, Resolution, ScoreOptions, scoreRelease() (+12 more)

### Community 16 - "appTypes.ts"
Cohesion: 0.13
Nodes (11): AppOptions, fastify, FastifyInstance, TranscriptionCron, BroadcastFunction, IDiscoveryService, IRequestService, CreatedServices (+3 more)

### Community 17 - "ref_node_path"
Cohesion: 0.11
Nodes (17): FileSystemService, ProcessAndHardlinkInput, ProcessAndHardlinkResult, ProcessAndHardlinkTorrentResult, StorageFootprintService, CommandExecFn, CommandExecResult, ExtractAndDeployMediaOptions (+9 more)

### Community 18 - "watcher/src/app.ts"
Cohesion: 0.15
Nodes (14): buildWatcherApp(), fastify, FastifyInstance, WatcherAppOptions, WatcherDatabase, WatchRequest, AutoDownloadSubmitter, AutoDownloadSubmitterLogger (+6 more)

### Community 19 - "api/src/services/prowlarr.ts"
Cohesion: 0.15
Nodes (9): formatBytes(), hasCjkCharacters(), isKnownPrivateIndexer(), ProwlarrService, ReleaseSource, VideoCodec, isPreferredIndexer(), isQualifiedPreferred() (+1 more)

### Community 20 - "BaseMetadataService"
Cohesion: 0.11
Nodes (8): BaseMetadataService, MetadataApiError, MetadataService, rankMetadataCandidates(), MockMetadata, MockRouteMetadataService, MockMetadata, MockMetadataService

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "IJellyfinService"
Cohesion: 0.09
Nodes (26): AppDatabase, DownloadPollerOptions, PollerLogger, UnarchiveDaemonOptions, CleanupServiceOptions, IFileSystemService, HardlinkRecoveryOptions, HardlinkRecoveryResult (+18 more)

### Community 24 - "upNext.test.ts"
Cohesion: 0.23
Nodes (7): groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), normalizeShowTitle(), UpNextService, DummyJellyfinService

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
Cohesion: 0.18
Nodes (9): DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), NotificationEvent, NotificationPayload, NotificationServiceOptions, ResendNotifier (+1 more)

### Community 31 - "api/src/app.ts"
Cohesion: 0.14
Nodes (16): buildApp(), getConfig(), validateConfig(), apps_api_src_db_index_featureflags, authMiddleware(), adminRoutes(), updateRoleSchema, authRoutes() (+8 more)

### Community 32 - "api/src/db/index.ts"
Cohesion: 0.08
Nodes (36): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequest, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase() (+28 more)

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

### Community 38 - "middleware/auth.ts"
Cohesion: 0.24
Nodes (8): User, fastify, @fastify/jwt, FastifyJWT, FastifyRequest, JwtPayload, acceptInviteSchema, createInviteSchema

### Community 39 - "ISubtitleInspectionService"
Cohesion: 0.13
Nodes (11): ProcessAndHardlinkTorrentInput, execFileAsync, FfprobeRunner, ISubtitleInspectionService, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionService, SubtitleInspectionServiceOptions (+3 more)

### Community 40 - "watcher/src/routes/waitlist.ts"
Cohesion: 0.16
Nodes (14): renderStatusHtml(), waitlistRoutes(), deleteDiscordMessage(), generateMagicLinkToken(), ResendNotifier, sendWaitlistCancelNotification(), SendWaitlistCancelNotificationOptions, SendWaitlistErrorNotificationOptions (+6 more)

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
Cohesion: 0.07
Nodes (26): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, @fastify/cookie, @fastify/cors, @fastify/jwt (+18 more)

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 49 - "featureFlags.ts"
Cohesion: 0.22
Nodes (11): featureFlags, isFeatureEnabled(), requireFeature(), createRoutes(), forwardToStreamer(), streamsAuth(), streamsRoutes(), forwardToWatcher() (+3 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "useAdminData"
Cohesion: 0.12
Nodes (11): formatDate(), formatMediaSubtitle(), useAdminData(), checkJellyfinStatus(), confirmCleanItem(), handleCreateInvite(), handleRescanJellyfin(), handleRunScan() (+3 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "watcher/src/db/schema.ts"
Cohesion: 0.21
Nodes (12): getWatcherDatabasePath(), initWatcherDatabase(), NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, waitlistCoRequesters, watchRequests, WatcherPollerLogger (+4 more)

### Community 54 - "scripts"
Cohesion: 0.18
Nodes (10): name, packageManager, private, scripts, build, dev, lint, test (+2 more)

### Community 55 - "api/src/db/schema.ts"
Cohesion: 0.09
Nodes (20): FeatureFlag, Invite, InviteRole, invites, MediaType, NewFeatureFlag, NewInvite, NewRequestCoRequester (+12 more)

### Community 56 - "MetadataCandidate"
Cohesion: 0.28
Nodes (3): MetadataCandidate, MockMetadataService, MockMetadataService

### Community 57 - "stores/requests.ts"
Cohesion: 0.11
Nodes (34): step2QueryInputRef, FastTrackParsedData, BatchItem, CanonicalRequestSummary, MetadataCandidate, apps_web_src_composables_requesttypes_releasecandidate, apps_web_src_composables_userequestdata_batchitem, apps_web_src_composables_userequestdata_canonicalrequestsummary (+26 more)

### Community 58 - "useRequestStep1"
Cohesion: 0.22
Nodes (12): useRequestStep1(), processFiles(), removeBatchItem(), parseTorrentFile(), decode(), decodeBuffer(), decodeString(), CleanedTorrentResult (+4 more)

### Community 59 - "User Role"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Waitlist Entry"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "UpNextShelf.vue"
Cohesion: 0.25
Nodes (5): available, items, router, UpNextItem, UpNextResponse

### Community 66 - "useRequestReleases"
Cohesion: 0.17
Nodes (15): parseFastTrack(), useRequestData(), initFastTrackFromRoute(), useRequestReleases(), checkCacheForCandidates(), extractInfoHash(), fetchReleasesForCandidate(), getCandidateCacheStatus() (+7 more)

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
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 71 - "ref_fastify"
Cohesion: 0.21
Nodes (12): adminGuard(), batchRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes(), promoteSchema, retryRoutes() (+4 more)

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 76 - "serviceContainer.ts"
Cohesion: 0.23
Nodes (4): CleanupCron, NotificationService, setupServices(), SubgenService

### Community 77 - "stores/waitlist.ts"
Cohesion: 0.40
Nodes (4): CreateWaitlistPayload, useWaitlistStore, WaitlistEntry, WaitlistStatus

### Community 78 - "OpenSubtitlesService"
Cohesion: 0.29
Nodes (4): OpenSubtitlesOptions, OpenSubtitlesService, SearchSubtitlesParams, SubtitleSearchResult

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 82 - "ActiveStreamsShelf.vue"
Cohesion: 0.21
Nodes (9): authStore, emit, EphemeralStreamItem, fetchStreams(), handleEvict(), handlePromote(), handleWsMessage(), loading (+1 more)

### Community 84 - "ICleanupService"
Cohesion: 0.08
Nodes (6): CleanupCronLogger, CleanupCronOptions, ICleanupService, MockCleanupService, MockCleanupService, MockCleanup

### Community 86 - "search.ts"
Cohesion: 0.31
Nodes (8): batchItemSchema, batchRequestSchema, createRequestSchema, existsRequestSchema, searchMetadataSchema, searchReleasesSchema, TmdbEpisodeInfo, TmdbSeasonDetails

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "library.ts"
Cohesion: 0.18
Nodes (11): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, libraryRoutes(), MediaArtwork, MediaRequester (+3 more)

### Community 99 - "loadEntries"
Cohesion: 0.50
Nodes (4): handleCheckAll(), handleCheckEntry(), loadEntries(), setView()

### Community 100 - "checkCandidateGuards"
Cohesion: 0.67
Nodes (3): checkCandidateGuards(), initPrefilledModal(), selectCandidate()

### Community 101 - "closeModal"
Cohesion: 0.67
Nodes (3): closeModal(), downloadDirectly(), submitWaitlistEntry()

### Community 115 - "config.ts"
Cohesion: 0.28
Nodes (6): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, _resetConfigForTesting(), testConfigDefaults, ValidateConfigOptions

### Community 116 - "Implementation Decisions"
Cohesion: 0.17
Nodes (11): Dependency diagram, Implementation Decisions, Out of Scope, Problem Statement, Recommended Implementation Order, Spec: Codebase Health, Architecture Hardening & Residual Refactoring, Testing Decisions, User Stories (+3 more)

### Community 117 - ".hardlinkDirectory"
Cohesion: 0.23
Nodes (4): buildLibraryPath(), BuildLibraryPathParams, padNumber(), sanitizePathSegment()

### Community 118 - "ws.ts"
Cohesion: 0.12
Nodes (7): fastify, FastifyInstance, wsRoutes, DummyJellyfin, DummyQB, fastify-plugin, ws

### Community 119 - "useRequestSubmit"
Cohesion: 0.15
Nodes (18): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep2(), confirmStep2Selection(), handleSearchMetadata(), selectCandidate() (+10 more)

### Community 120 - "formatStatusText"
Cohesion: 0.67
Nodes (3): formatGraceRemaining(), formatStatusText(), getRemainingGraceMs()

### Community 129 - "InviteView.vue"
Cohesion: 0.13
Nodes (13): authStore, confirmPassword, featureFlags, isCheckingToken, isSubmitting, isTokenValid, password, route (+5 more)

### Community 131 - "clearSelection"
Cohesion: 0.50
Nodes (5): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), switchCategory()

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

## Knowledge Gaps
- **644 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+639 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 990 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IJellyfinService` connect `IJellyfinService` to `requestService.ts`, `api/src/db/index.ts`, `CleanupService`, `serviceContainer.ts`, `ref_drizzle_orm`, `appTypes.ts`, `DummyJellyfinService`, `ref_node_path`, `BaseMetadataService`, `DummyJellyfinService`, `ws.ts`, `.cleanItem`, `upNext.test.ts`, `JellyfinService`, `discovery.test.ts`, `DownloadPoller`, `UnarchiveDaemon`, `api/src/app.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `IRequestsRepository` connect `IRequestsRepository` to `requestService.ts`, `api/src/db/index.ts`, `CleanupService`, `upNext.ts`, `RequestsRepository`, `serviceContainer.ts`, `ref_drizzle_orm`, `appTypes.ts`, `IJellyfinService`, `useRequestSubmit`, `api/src/db/schema.ts`, `upNext.test.ts`, `DownloadPoller`, `UnarchiveDaemon`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `Rules for Agents` connect `useRequestSubmit` to `useRequestStep1`, `IRequestsRepository`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _644 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requestService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09209039548022599 - nodes in this community are weakly interconnected._
- **Should `streamer/src/app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0507048180096781 - nodes in this community are weakly interconnected._
- **Should `Navbar.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.05803921568627451 - nodes in this community are weakly interconnected._