# Graph Report - Plex-auto-download  (2026-09-21)

## Corpus Check
- 323 files · ~222,178 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 2, .css 1)

## Summary
- 2104 nodes · 5013 edges · 136 communities (93 shown, 43 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 182 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d982889`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- middleware/auth.ts
- IDebridService
- Navbar.vue
- api/src/db/schema.ts
- AdminView.vue
- CleanupService
- IProwlarrService
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- api.ts
- DashboardView.vue
- ref_vitest
- InviteView.vue
- api/src/app.ts
- ref_node_path
- watcherPoller.ts
- api/src/services/prowlarr.ts
- metadata.ts
- DiscoveryFeed.vue
- api/package.json
- AppDatabase
- upNext.ts
- Context Domain Model Document
- JellyfinService
- discovery.test.ts
- web/package.json
- PromotionModal.vue
- cleanup.test.ts
- DownloadRequest
- downloadPoller.ts
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- streamer/src/index.ts
- compilerOptions
- IJellyfinService
- SubtitleInspectionService
- stores/waitlist.ts
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- devDependencies
- SubtitlePickerModal.vue
- MockMetadata
- ActiveStreamsShelf.vue
- compilerOptions
- useAdminData
- dependencies
- streamer/src/app.ts
- scripts
- autoDownloadSubmitter.ts
- OpenSubtitlesService
- stores/requests.ts
- useRequestStep1.ts
- User Role
- Waitlist Entry
- IMetadataService
- ref_drizzle_orm
- Media Download Manager Architecture Spec
- scripts
- MetadataCandidate
- useRequestReleases
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- create.ts
- QBittorrentService
- Indexer
- Ephemeral Stream
- RequestsRepository
- MockMetadata
- DummyJellyfinService
- ref_fastify
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- DummyQB
- MockCleanupService
- ICleanupService
- MockCleanupService
- UnarchiveService
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- library.ts
- WatcherDatabase
- ReleaseGatingService
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
- DummyJellyfinService
- config.ts
- Spec: Codebase Health, Architecture Hardening & Residual Refactoring
- FileSystemService
- ws.ts
- useRequestSubmit
- formatStatusText
- streamer/src/services/jellyfin.ts
- DebridService
- TranscriptionCron
- SymlinkManager
- DummyJellyfinService
- RequestStep1Input.vue
- streamer/src/routes/streams.ts
- MockCleanupService
- MockCleanupService
- watcher/src/index.ts
- clearSelection
- MockMetadataService
- CoRequesterPicker.vue
- isExpanded
- isSelected

## God Nodes (most connected - your core abstractions)
1. `buildApp()` - 65 edges
2. `IJellyfinService` - 63 edges
3. `DownloadRequest` - 54 edges
4. `RequestsRepository` - 49 edges
5. `Context Domain Model Document` - 49 edges
6. `IRequestsRepository` - 47 edges
7. `users` - 42 edges
8. `IQBittorrentService` - 39 edges
9. `api` - 37 edges
10. `AppDatabase` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Wave 1 — Foundation (no blockers; implement first)` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `Implementation Decisions` --references--> `buildApp()`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/app.ts
- `Problem Statement` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `User Stories` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `Solution` --references--> `FileSystemService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/fileSystem.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Jellyfin Authentication and Role Model** — context_user_role, context_trusted_role, context_admin_role, context_invite, docs_adr_0001_jellyfin_as_auth_source_of_truth_jellyfin_auth, docker_docker_compose_yml_service_jellyfin [EXTRACTED 0.95]
- **Automated Discovery, Episodic Tracking, and Configurable Grace Period Ingestion** — docs_spec_discovery_feed_and_up_next_shelf_up_next_shelf, docs_spec_discovery_feed_and_up_next_shelf_episodic_gap_algorithm, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_watch_for_next_episodes, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_compute_grace_hours, docs_adr_0013_per_entry_grace_periods_with_release_newness_classification_per_entry_grace_period [EXTRACTED 0.95]
- **Download Request Hardlink Lifecycle** — context_download_request, context_staging_area, context_hardlink_move, context_library, context_storage_quota, docker_docker_compose_yml_service_qbittorrent, docker_docker_compose_yml_service_api [EXTRACTED 0.95]
- **Ephemeral Debrid Streaming Pipeline** — context_ephemeral_stream, context_stream_library, docker_docker_compose_yml_service_zurg, docker_docker_compose_yml_service_rclone, docker_docker_compose_yml_service_streamer, docs_adr_0012_dual_tier_ephemeral_streaming_with_real_debrid_dual_tier_streaming [EXTRACTED 0.95]
- **Preferred Indexer Dual-Candidate Airgap Architecture** — docs_adr_0016_preferred_indexer_for_downloads_preferred_indexer_oracle, docs_adr_0016_preferred_indexer_for_downloads_discovery_dual_candidate, docs_spec_preferred_indexer_bj_share_preferred_indexer_concept, docs_spec_preferred_indexer_bj_share_dual_candidate_binding, docs_spec_ephemeral_streaming_and_real_debrid_private_airgap [EXTRACTED 0.95]
- **Private Library Security & Processing Pipeline** — docs_spec_private_media_type_and_trusted_role_private_media_type, docs_spec_private_media_type_and_trusted_role_trusted_role, docs_spec_private_media_type_and_trusted_role_jellyfin_access_control, docs_spec_subgen_gpu_subtitle_transcription_subgen_container, docs_adr_0017_local_gpu_subtitle_transcription_with_subgen_subgen_whisper_integration [EXTRACTED 0.95]

## Communities (136 total, 43 thin omitted)

### Community 0 - "middleware/auth.ts"
Cohesion: 0.19
Nodes (12): User, fastify, @fastify/jwt, FastifyJWT, FastifyRequest, JwtPayload, forwardToWatcher(), waitlistAuth() (+4 more)

### Community 1 - "IDebridService"
Cohesion: 0.09
Nodes (10): FastifyInstance, StreamerAppOptions, StreamerDatabase, EphemeralEvictionCron, EphemeralEvictionCronOptions, StreamPoller, StreamPollerOptions, IDebridService (+2 more)

### Community 2 - "Navbar.vue"
Cohesion: 0.05
Nodes (36): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isWaitlistEnabled, route, router (+28 more)

### Community 3 - "api/src/db/schema.ts"
Cohesion: 0.11
Nodes (20): FeatureFlag, featureFlags, Invite, InviteRole, invites, MediaType, NewFeatureFlag, NewInvite (+12 more)

### Community 4 - "AdminView.vue"
Cohesion: 0.10
Nodes (24): DiskInfo, ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, AdminFeatureFlag, automationFlags, discoveryFlags (+16 more)

### Community 6 - "IProwlarrService"
Cohesion: 0.08
Nodes (11): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), IDiscoveryService, IProwlarrService (+3 more)

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

### Community 12 - "api.ts"
Cohesion: 0.08
Nodes (22): available, items, router, UpNextItem, UpNextResponse, api, apiRequest(), useAuthStore (+14 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.05
Nodes (32): formatDate(), formatEta(), formatMediaSubtitle(), formatMediaType(), formatSpeed(), activeStreamingItem, activeStreamsShelfRef, authStore (+24 more)

### Community 14 - "ref_vitest"
Cohesion: 0.13
Nodes (18): apps_api_src_db_index_invites, apps_api_src_db_index_systemconfig, downloadRequests, requestCoRequesters, SystemConfig, users, SpaceCheckResult, JellyfinAuthResult (+10 more)

### Community 15 - "InviteView.vue"
Cohesion: 0.13
Nodes (13): authStore, confirmPassword, featureFlags, isCheckingToken, isSubmitting, isTokenValid, password, route (+5 more)

### Community 16 - "api/src/app.ts"
Cohesion: 0.09
Nodes (18): buildApp(), fastify, getConfig(), validateConfig(), apps_api_src_db_index_featureflags, app, __dirname, envPaths (+10 more)

### Community 17 - "ref_node_path"
Cohesion: 0.12
Nodes (19): BuildLibraryPathParams, ProcessAndHardlinkInput, ProcessAndHardlinkResult, ProcessAndHardlinkTorrentResult, OpenSubtitlesOptions, SearchSubtitlesParams, SubtitleSearchResult, FfprobeRunner (+11 more)

### Community 18 - "watcherPoller.ts"
Cohesion: 0.12
Nodes (20): WatcherPollerLogger, CAM_REGEX, formatBytes(), parseReleaseTitle(), ReleaseCandidate, ReleaseSource, Resolution, ScoreOptions (+12 more)

### Community 19 - "api/src/services/prowlarr.ts"
Cohesion: 0.14
Nodes (9): formatBytes(), hasCjkCharacters(), hasPasskey(), ProwlarrService, ReleaseSource, VideoCodec, isPreferredIndexer(), isQualifiedPreferred() (+1 more)

### Community 20 - "metadata.ts"
Cohesion: 0.24
Nodes (6): BaseMetadataService, MetadataApiError, MetadataSearchOptions, MetadataService, rankMetadataCandidates(), MockRouteMetadataService

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "AppDatabase"
Cohesion: 0.07
Nodes (30): AppOptions, FastifyInstance, AppDatabase, DownloadPoller, DownloadPollerOptions, PollerLogger, TranscriptionCronOptions, UnarchiveDaemon (+22 more)

### Community 24 - "upNext.ts"
Cohesion: 0.16
Nodes (14): groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), IUpNextService, matchesTarget(), normalizeShowTitle(), UpNextResult (+6 more)

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

### Community 30 - "cleanup.test.ts"
Cohesion: 0.16
Nodes (12): DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), INotificationService, NotificationEvent, NotificationPayload, NotificationServiceOptions (+4 more)

### Community 31 - "DownloadRequest"
Cohesion: 0.14
Nodes (3): DownloadRequest, IRequestsRepository, TransitionOptions

### Community 32 - "downloadPoller.ts"
Cohesion: 0.10
Nodes (30): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequest, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase() (+22 more)

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "streamer/src/index.ts"
Cohesion: 0.33
Nodes (5): app, __dirname, envPaths, __filename, ref_dotenv

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "IJellyfinService"
Cohesion: 0.09
Nodes (8): CleanupServiceOptions, IJellyfinService, RequestStateMachine, makeStateMachine(), DummyJellyfin, Implementation Decisions, Problem Statement, Solution

### Community 40 - "stores/waitlist.ts"
Cohesion: 0.40
Nodes (4): CreateWaitlistPayload, useWaitlistStore, WaitlistEntry, WaitlistStatus

### Community 41 - "Docker Compose Stack Specification"
Cohesion: 0.20
Nodes (15): Subgen Service, Root Docker Compose File, Docker Compose Stack Specification, Fastify API Service, Caddy Reverse Proxy, Cloudflared Tunnel Daemon, Cloudflare DDNS Daemon, Jellyfin Media Server (+7 more)

### Community 42 - "StreamProgressModal.vue"
Cohesion: 0.23
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

### Community 46 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 49 - "ActiveStreamsShelf.vue"
Cohesion: 0.21
Nodes (9): authStore, emit, EphemeralStreamItem, fetchStreams(), handleEvict(), handlePromote(), handleWsMessage(), loading (+1 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "useAdminData"
Cohesion: 0.13
Nodes (10): formatDate(), useAdminData(), checkJellyfinStatus(), confirmCleanItem(), handleCreateInvite(), handleRescanJellyfin(), handleRunScan(), handleSaveConfig() (+2 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "streamer/src/app.ts"
Cohesion: 0.19
Nodes (11): buildStreamerApp(), fastify, apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), ephemeralStreams, DebridTorrentInfo, DirectDownloader (+3 more)

### Community 54 - "scripts"
Cohesion: 0.18
Nodes (10): name, packageManager, private, scripts, build, dev, lint, test (+2 more)

### Community 55 - "autoDownloadSubmitter.ts"
Cohesion: 0.16
Nodes (15): AutoDownloadSubmitterLogger, renderStatusHtml(), waitlistRoutes(), deleteDiscordMessage(), ResendNotifier, sendWaitlistCancelNotification(), SendWaitlistCancelNotificationOptions, sendWaitlistErrorNotification() (+7 more)

### Community 57 - "stores/requests.ts"
Cohesion: 0.12
Nodes (31): step2QueryInputRef, FastTrackParsedData, BatchItem, CanonicalRequestSummary, MetadataCandidate, apps_web_src_composables_requesttypes_releasecandidate, apps_web_src_composables_userequestdata_batchitem, apps_web_src_composables_userequestdata_canonicalrequestsummary (+23 more)

### Community 58 - "useRequestStep1.ts"
Cohesion: 0.16
Nodes (16): useRequestStep1(), processFiles(), removeBatchItem(), UseRequestStep1Options, BencodeValue, ParsedTorrent, parseTorrentFile(), decode() (+8 more)

### Community 59 - "User Role"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Waitlist Entry"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 62 - "ref_drizzle_orm"
Cohesion: 0.21
Nodes (13): buildWatcherApp(), fastify, getWatcherDatabasePath(), initWatcherDatabase(), NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, waitlistCoRequesters (+5 more)

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "MetadataCandidate"
Cohesion: 0.28
Nodes (3): MetadataCandidate, MockMetadataService, MockMetadataService

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

### Community 71 - "create.ts"
Cohesion: 0.14
Nodes (24): requireFeature(), batchRoutes(), createRoutes(), batchItemSchema, batchRequestSchema, createRequestSchema, existsRequestSchema, searchMetadataSchema (+16 more)

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 78 - "ref_fastify"
Cohesion: 0.21
Nodes (11): adminGuard(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes(), promoteSchema, retryRoutes(), searchRoutes() (+3 more)

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 84 - "ICleanupService"
Cohesion: 0.09
Nodes (6): CleanupCron, CleanupCronLogger, CleanupCronOptions, ICleanupService, MockCleanup, MockCleanup

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "library.ts"
Cohesion: 0.11
Nodes (19): authMiddleware(), loginSchema, discoveryFeedQuerySchema, discoveryRoutes(), acceptInviteSchema, createInviteSchema, inviteRoutes(), artworkCache (+11 more)

### Community 94 - "WatcherDatabase"
Cohesion: 0.18
Nodes (10): FastifyInstance, WatcherDatabase, WatchRequest, AutoDownloadSubmitter, AutoDownloadSubmitterOptions, CreateWaitlistBody, EpisodicTrackingLogger, EpisodicTrackingOptions (+2 more)

### Community 95 - "ReleaseGatingService"
Cohesion: 0.18
Nodes (5): WatcherAppOptions, WatcherPoller, WatcherPollerOptions, WatcherProwlarrService, ReleaseGatingService

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

### Community 116 - "Spec: Codebase Health, Architecture Hardening & Residual Refactoring"
Cohesion: 0.20
Nodes (9): Dependency diagram, Out of Scope, Recommended Implementation Order, Spec: Codebase Health, Architecture Hardening & Residual Refactoring, Testing Decisions, User Stories, Wave 1 — Foundation (no blockers; implement first), Wave 2 — Build on the foundation (start after Wave 1 blockers are complete) (+1 more)

### Community 117 - "FileSystemService"
Cohesion: 0.15
Nodes (6): __dirname, envPaths, __filename, main(), FileSystemService, ref_node_url

### Community 118 - "ws.ts"
Cohesion: 0.25
Nodes (6): BroadcastFunction, fastify, FastifyInstance, wsRoutes, fastify-plugin, ws

### Community 119 - "useRequestSubmit"
Cohesion: 0.15
Nodes (18): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep2(), confirmStep2Selection(), handleSearchMetadata(), selectCandidate() (+10 more)

### Community 120 - "formatStatusText"
Cohesion: 0.67
Nodes (3): formatGraceRemaining(), formatStatusText(), getRemainingGraceMs()

### Community 121 - "streamer/src/services/jellyfin.ts"
Cohesion: 0.20
Nodes (7): apps_streamer_src_db_index_systemconfig, EphemeralStream, NewEphemeralStream, NewSystemConfig, SystemConfig, JellyfinSession, StreamerJellyfinService

### Community 123 - "TranscriptionCron"
Cohesion: 0.33
Nodes (3): getLocalTimeInTimezone(), isInsideWindow(), TranscriptionCron

### Community 126 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 127 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 130 - "watcher/src/index.ts"
Cohesion: 0.40
Nodes (4): app, __dirname, envPaths, __filename

### Community 131 - "clearSelection"
Cohesion: 0.50
Nodes (5): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), switchCategory()

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

## Knowledge Gaps
- **642 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+637 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 979 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IRequestsRepository` connect `DownloadRequest` to `downloadPoller.ts`, `CleanupService`, `IJellyfinService`, `create.ts`, `RequestsRepository`, `ref_vitest`, `api/src/app.ts`, `useRequestSubmit`, `AppDatabase`, `upNext.ts`, `TranscriptionCron`, `IMetadataService`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `vue` connect `stores/requests.ts` to `Navbar.vue`, `AdminView.vue`, `stores/waitlist.ts`, `LibraryView.vue`, `StreamProgressModal.vue`, `WaitlistView.vue`, `api.ts`, `DashboardView.vue`, `SubtitlePickerModal.vue`, `InviteView.vue`, `ActiveStreamsShelf.vue`, `DiscoveryFeed.vue`, `useRequestStep1.ts`, `web/package.json`, `PromotionModal.vue`, `RequestStep1Input.vue`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Rules for Agents` connect `useRequestSubmit` to `useRequestStep1.ts`, `DownloadRequest`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `buildApp()` (e.g. with `adminRoutes()` and `authRoutes()`) actually correct?**
  _`buildApp()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _642 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `IDebridService` be split into smaller, more focused modules?**
  _Cohesion score 0.09475806451612903 - nodes in this community are weakly interconnected._
- **Should `Navbar.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.05450733752620545 - nodes in this community are weakly interconnected._