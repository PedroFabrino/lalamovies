# Graph Report - Plex-auto-download  (2026-09-21)

## Corpus Check
- 297 files · ~217,691 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 2, .css 1)

## Summary
- 2008 nodes · 4680 edges · 117 communities (79 shown, 38 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 171 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `423d658f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- watcher/src/app.ts
- streamer/src/app.ts
- InviteView.vue
- requestStateMachine.ts
- AdminView.vue
- CleanupService
- IMetadataService
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- ref_vitest
- DashboardView.vue
- ref_drizzle_orm
- Navbar.vue
- Implementation Decisions
- ref_node_path
- search.ts
- ProwlarrService
- BaseMetadataService
- DiscoveryFeed.vue
- api/package.json
- IJellyfinService
- upNext.ts
- Context Domain Model Document
- JellyfinService
- ReleaseCandidate
- web/package.json
- PromotionModal.vue
- api/src/services/notifications.ts
- api/src/db/index.ts
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- api/src/index.ts
- compilerOptions
- DownloadRequest
- subtitleInspection.ts
- router/index.ts
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- devDependencies
- SubtitlePickerModal.vue
- DummyJellyfinService
- ActiveStreamsShelf.vue
- compilerOptions
- useAdminData
- dependencies
- api/src/services/prowlarr.ts
- scripts
- api/src/utils/torrentTitleCleaner.ts
- UpNextShelf.vue
- useRequestData.ts
- useRequestData
- User Role
- Waitlist Entry
- isQualifiedPreferred
- clearSelection
- Media Download Manager Architecture Spec
- scripts
- discovery.test.ts
- DummyJellyfinService
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- isExpanded
- Indexer
- Ephemeral Stream
- isSelected
- MockCleanupService
- MockCleanup
- api/src/app.ts
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- DummyQB
- MockCleanupService
- ICleanupService
- MockCleanupService
- MockCleanupService
- FileSystemService
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- DummyJellyfinService
- DummyJellyfin
- loadEntries
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- checkCandidateGuards
- closeModal
- formatStatusText
- vercel.json
- pnpm-workspace.yaml
- Favicon Vector Graphic (MDM Brand Lightning / Geometric Icon)
- SVG Icon Sprite Sheet (Bluesky, Discord, Docs, GitHub, Social, X)
- Hero Illustration (Landing / Welcome Graphic)
- Vite Logo Asset
- Vue Logo Asset
- IProwlarrService
- OpenSubtitlesService
- transcriptionCron.ts

## God Nodes (most connected - your core abstractions)
1. `buildApp()` - 64 edges
2. `IJellyfinService` - 63 edges
3. `Context Domain Model Document` - 49 edges
4. `downloadRequests` - 43 edges
5. `users` - 40 edges
6. `useRequestData()` - 39 edges
7. `IQBittorrentService` - 37 edges
8. `AppDatabase` - 35 edges
9. `DownloadRequest` - 35 edges
10. `FileSystemService` - 34 edges

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

## Communities (117 total, 38 thin omitted)

### Community 0 - "watcher/src/app.ts"
Cohesion: 0.05
Nodes (62): buildWatcherApp(), fastify, FastifyInstance, WatcherAppOptions, getWatcherDatabasePath(), initWatcherDatabase(), WatcherDatabase, NewWaitlistCoRequester (+54 more)

### Community 1 - "streamer/src/app.ts"
Cohesion: 0.05
Nodes (34): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), StreamerDatabase (+26 more)

### Community 2 - "InviteView.vue"
Cohesion: 0.11
Nodes (15): ApiError, apiRequest(), authStore, confirmPassword, featureFlags, isCheckingToken, isSubmitting, isTokenValid (+7 more)

### Community 3 - "requestStateMachine.ts"
Cohesion: 0.12
Nodes (17): apps_api_src_db_index_downloadrequest, BroadcastFunction, fastify, FastifyInstance, wsRoutes, addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo() (+9 more)

### Community 4 - "AdminView.vue"
Cohesion: 0.10
Nodes (24): DiskInfo, ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, AdminFeatureFlag, automationFlags, discoveryFlags (+16 more)

### Community 6 - "IMetadataService"
Cohesion: 0.12
Nodes (9): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryServiceOptions, IMetadataService, Resolution, ScoreOptions, UpNextItem (+1 more)

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
Nodes (34): useWaitlistStore, WaitlistEntry, WaitlistStatus, activeView, approvingEntryId, authStore, availableReleasesCount, candidates (+26 more)

### Community 12 - "ref_vitest"
Cohesion: 0.10
Nodes (18): api, useAuthStore, User, CreateWaitlistPayload, mockLocalStorage, mockPush, store, mockRoute (+10 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.05
Nodes (32): formatDate(), formatEta(), formatMediaSubtitle(), formatMediaType(), formatSpeed(), activeStreamingItem, activeStreamsShelfRef, authStore (+24 more)

### Community 14 - "ref_drizzle_orm"
Cohesion: 0.19
Nodes (16): apps_api_src_db_index_invites, apps_api_src_db_index_requestcorequesters, apps_api_src_db_index_systemconfig, apps_api_src_db_index_users, downloadRequests, requestCoRequesters, SystemConfig, SpaceCheckResult (+8 more)

### Community 15 - "Navbar.vue"
Cohesion: 0.08
Nodes (24): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isWaitlistEnabled, route, router (+16 more)

### Community 16 - "Implementation Decisions"
Cohesion: 0.18
Nodes (10): Dependency diagram, Implementation Decisions, Out of Scope, Recommended Implementation Order, Spec: Codebase Health, Architecture Hardening & Residual Refactoring, Testing Decisions, User Stories, Wave 1 — Foundation (no blockers; implement first) (+2 more)

### Community 17 - "ref_node_path"
Cohesion: 0.10
Nodes (29): users, __dirname, envPaths, __filename, main(), BuildLibraryPathParams, ProcessAndHardlinkInput, ProcessAndHardlinkResult (+21 more)

### Community 18 - "search.ts"
Cohesion: 0.06
Nodes (32): AppConfig, config, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, testConfigDefaults, validateConfig(), ValidateConfigOptions, requestRoutes() (+24 more)

### Community 19 - "ProwlarrService"
Cohesion: 0.20
Nodes (3): formatBytes(), hasCjkCharacters(), ProwlarrService

### Community 20 - "BaseMetadataService"
Cohesion: 0.12
Nodes (7): BaseMetadataService, MetadataApiError, rankMetadataCandidates(), MockMetadata, MockRouteMetadataService, MockMetadata, MockMetadataService

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "IJellyfinService"
Cohesion: 0.07
Nodes (25): AppOptions, FastifyInstance, AppDatabase, DownloadPoller, DownloadPollerOptions, PollerLogger, UnarchiveDaemon, UnarchiveDaemonOptions (+17 more)

### Community 24 - "upNext.ts"
Cohesion: 0.14
Nodes (13): MetadataSearchOptions, MetadataService, groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), IUpNextService, matchesTarget() (+5 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "JellyfinService"
Cohesion: 0.09
Nodes (3): JellyfinApiError, JellyfinService, MockJellyfinService

### Community 27 - "ReleaseCandidate"
Cohesion: 0.15
Nodes (5): ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult, MockProwlarrService, MockProwlarrService

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "api/src/services/notifications.ts"
Cohesion: 0.18
Nodes (9): DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), NotificationEvent, NotificationPayload, NotificationServiceOptions, ResendNotifier (+1 more)

### Community 32 - "api/src/db/index.ts"
Cohesion: 0.13
Nodes (16): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase(), apps_api_src_db_index_newdownloadrequest (+8 more)

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

### Community 38 - "DownloadRequest"
Cohesion: 0.15
Nodes (4): DownloadRequest, RequestsRepository, InvalidTransitionError, Problem Statement

### Community 39 - "subtitleInspection.ts"
Cohesion: 0.16
Nodes (9): execFileAsync, FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionService, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, ref_node_child_process (+1 more)

### Community 40 - "router/index.ts"
Cohesion: 0.13
Nodes (12): app, router, routes, pinia, apps_web_src_style, authStore, errorMessage, isLoading (+4 more)

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
Cohesion: 0.12
Nodes (11): formatDate(), formatMediaSubtitle(), useAdminData(), checkJellyfinStatus(), confirmCleanItem(), handleCreateInvite(), handleRescanJellyfin(), handleRunScan() (+3 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "api/src/services/prowlarr.ts"
Cohesion: 0.33
Nodes (8): isFeatureEnabled(), forwardToStreamer(), streamsAuth(), streamsRoutes(), hasPasskey(), isKnownPrivateIndexer(), ReleaseSource, VideoCodec

### Community 54 - "scripts"
Cohesion: 0.18
Nodes (10): name, packageManager, private, scripts, build, dev, lint, test (+2 more)

### Community 55 - "api/src/utils/torrentTitleCleaner.ts"
Cohesion: 0.20
Nodes (6): DiscoveryService, extractTitleAndYear(), CleanedTorrentResult, cleanSeparators(), ExtractedEpisodeInfo, extractEpisodeInfo()

### Community 56 - "UpNextShelf.vue"
Cohesion: 0.25
Nodes (5): available, items, router, UpNextItem, UpNextResponse

### Community 57 - "useRequestData.ts"
Cohesion: 0.10
Nodes (28): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange(), step2QueryInputRef, BatchItem (+20 more)

### Community 58 - "useRequestData"
Cohesion: 0.09
Nodes (32): useRequestData(), checkCacheForCandidates(), checkDuplicateExists(), confirmStep2Selection(), extractInfoHash(), fetchReleasesForCandidate(), getCandidateCacheStatus(), handleConfirmRequest() (+24 more)

### Community 59 - "User Role"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Waitlist Entry"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 61 - "isQualifiedPreferred"
Cohesion: 0.70
Nodes (3): isPreferredIndexer(), isQualifiedPreferred(), PreferredCandidateLike

### Community 62 - "clearSelection"
Cohesion: 0.50
Nodes (5): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), switchCategory()

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "discovery.test.ts"
Cohesion: 0.13
Nodes (6): IDiscoveryService, MetadataCandidate, DummyJellyfinService, MockMetadataService, TorrentParsed, MockMetadataService

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

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 78 - "api/src/app.ts"
Cohesion: 0.05
Nodes (61): buildApp(), fastify, apps_api_src_db_index_featureflags, FeatureFlag, featureFlags, Invite, InviteRole, invites (+53 more)

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 84 - "ICleanupService"
Cohesion: 0.14
Nodes (3): CleanupCronOptions, ICleanupService, MockCleanup

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 95 - "loadEntries"
Cohesion: 0.50
Nodes (4): handleCheckAll(), handleCheckEntry(), loadEntries(), setView()

### Community 99 - "checkCandidateGuards"
Cohesion: 0.67
Nodes (3): checkCandidateGuards(), initPrefilledModal(), selectCandidate()

### Community 100 - "closeModal"
Cohesion: 0.67
Nodes (3): closeModal(), downloadDirectly(), submitWaitlistEntry()

### Community 101 - "formatStatusText"
Cohesion: 0.67
Nodes (3): formatGraceRemaining(), formatStatusText(), getRemainingGraceMs()

### Community 122 - "transcriptionCron.ts"
Cohesion: 0.24
Nodes (6): getLocalTimeInTimezone(), isInsideWindow(), TranscriptionCron, TranscriptionCronLogger, TranscriptionCronOptions, ISubgenService

## Knowledge Gaps
- **636 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+631 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 961 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IJellyfinService` connect `IJellyfinService` to `api/src/db/index.ts`, `discovery.test.ts`, `DummyJellyfinService`, `requestStateMachine.ts`, `CleanupService`, `api/src/app.ts`, `ref_drizzle_orm`, `DummyJellyfinService`, `ref_node_path`, `upNext.ts`, `JellyfinService`, `DummyJellyfinService`, `DummyJellyfin`, `.cleanItem`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `IQBittorrentService` connect `ref_drizzle_orm` to `CleanupService`, `api/src/app.ts`, `search.ts`, `DummyQB`, `IJellyfinService`, `.cleanItem`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `ws` connect `requestStateMachine.ts` to `api/src/app.ts`, `api/package.json`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `buildApp()` (e.g. with `adminRoutes()` and `authRoutes()`) actually correct?**
  _`buildApp()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _636 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `watcher/src/app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05009481668773704 - nodes in this community are weakly interconnected._
- **Should `streamer/src/app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05009276437847866 - nodes in this community are weakly interconnected._