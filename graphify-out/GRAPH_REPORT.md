# Graph Report - Plex-auto-download  (2026-09-20)

## Corpus Check
- 270 files · ~210,345 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 2, .css 1)

## Summary
- 2085 nodes · 4524 edges · 130 communities (79 shown, 51 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 107 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ccc9b19`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- watcher/src/app.ts
- streamer/src/app.ts
- InviteView.vue
- RequestView.vue
- AdminView.vue
- CleanupService
- main.ts
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- api.ts
- DashboardView.vue
- IJellyfinService
- Navbar.vue
- MockQBittorrentService
- ref_vitest
- QBittorrentService
- api/src/services/prowlarr.ts
- BaseMetadataService
- DiscoveryFeed.vue
- api/package.json
- downloadPoller.ts
- UpNextService
- Context Domain Model Document
- JellyfinService
- discovery.test.ts
- web/package.json
- PromotionModal.vue
- cleanup.test.ts
- api/src/db/index.ts
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- api/src/index.ts
- compilerOptions
- DownloadRequest
- subtitleInspection.ts
- MockJellyfin
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
- dependencies
- MockCleanup
- scripts
- upNext.ts
- LoginView.vue
- parseTorrentFile
- lib/torrentTitleCleaner.ts
- User Role
- Waitlist Entry
- isKnownPrivateIndexer
- fetchReleasesForCandidate
- Media Download Manager Architecture Spec
- scripts
- MockJellyfin
- MockJellyfinService
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- MockCleanupService
- releaseExplorer.ts
- Indexer
- Ephemeral Stream
- MockJellyfinService
- MockCleanupService
- MockJellyfin
- api/src/app.ts
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- DummyQB
- MockQBittorrent
- ICleanupService
- MockCleanupService
- routes/requests.ts
- unarchiveRecovery.ts
- utils.ts
- MockQBittorrentService
- Web SPA HTML Entrypoint
- App.vue
- MockJellyfin
- loadEntries
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- checkCandidateGuards
- MockJellyfin
- MetadataCandidate
- vercel.json
- pnpm-workspace.yaml
- Favicon Vector Graphic (MDM Brand Lightning / Geometric Icon)
- SVG Icon Sprite Sheet (Bluesky, Discord, Docs, GitHub, Social, X)
- Hero Illustration (Landing / Welcome Graphic)
- Vite Logo Asset
- Vue Logo Asset
- IProwlarrService
- MockJellyfinService
- OpenSubtitlesService
- MockJellyfinService
- DummyJellyfinService
- closeModal
- DummyJellyfin
- formatStatusText
- transcriptionCron.ts
- IMetadataService
- ws.ts
- MockQBittorrentService
- MockQBittorrent
- MockQBittorrent
- MockQBService
- MockQBService
- MockJellyfin
- MockMetadata

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 70 edges
2. `buildApp()` - 61 edges
3. `Context Domain Model Document` - 49 edges
4. `IQBittorrentService` - 43 edges
5. `downloadRequests` - 42 edges
6. `users` - 39 edges
7. `api` - 33 edges
8. `FileSystemService` - 32 edges
9. `DownloadRequest` - 31 edges
10. `AppDatabase` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Cloudflare Tunnel Ingress Architecture` --semantically_similar_to--> `Cloudflare Tunnel Ingress`  [INFERRED] [semantically similar]
  docs/adr/0002-cloudflare-tunnel-for-network-exposure.md → README.md
- `Play-History LRU Cleanup Mechanism` --semantically_similar_to--> `Cleanup Policy`  [INFERRED] [semantically similar]
  README.md → CONTEXT.md
- `Fastify API Service` --implements--> `Production Stack`  [INFERRED]
  docker/docker-compose.yml → CONTEXT.md
- `Embedded SQLite Application State` --shares_data_with--> `Fastify API Service`  [INFERRED]
  docs/adr/0004-sqlite-for-application-state.md → docker/docker-compose.yml
- `Cloudflare Tunnel Ingress Architecture` --implements--> `Cloudflared Tunnel Daemon`  [INFERRED]
  docs/adr/0002-cloudflare-tunnel-for-network-exposure.md → docker/docker-compose.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Jellyfin Authentication and Role Model** — context_user_role, context_trusted_role, context_admin_role, context_invite, docs_adr_0001_jellyfin_as_auth_source_of_truth_jellyfin_auth, docker_docker_compose_yml_service_jellyfin [EXTRACTED 0.95]
- **Automated Discovery, Episodic Tracking, and Configurable Grace Period Ingestion** — docs_spec_discovery_feed_and_up_next_shelf_up_next_shelf, docs_spec_discovery_feed_and_up_next_shelf_episodic_gap_algorithm, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_watch_for_next_episodes, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_compute_grace_hours, docs_adr_0013_per_entry_grace_periods_with_release_newness_classification_per_entry_grace_period [EXTRACTED 0.95]
- **Download Request Hardlink Lifecycle** — context_download_request, context_staging_area, context_hardlink_move, context_library, context_storage_quota, docker_docker_compose_yml_service_qbittorrent, docker_docker_compose_yml_service_api [EXTRACTED 0.95]
- **Ephemeral Debrid Streaming Pipeline** — context_ephemeral_stream, context_stream_library, docker_docker_compose_yml_service_zurg, docker_docker_compose_yml_service_rclone, docker_docker_compose_yml_service_streamer, docs_adr_0012_dual_tier_ephemeral_streaming_with_real_debrid_dual_tier_streaming [EXTRACTED 0.95]
- **Preferred Indexer Dual-Candidate Airgap Architecture** — docs_adr_0016_preferred_indexer_for_downloads_preferred_indexer_oracle, docs_adr_0016_preferred_indexer_for_downloads_discovery_dual_candidate, docs_spec_preferred_indexer_bj_share_preferred_indexer_concept, docs_spec_preferred_indexer_bj_share_dual_candidate_binding, docs_spec_ephemeral_streaming_and_real_debrid_private_airgap [EXTRACTED 0.95]
- **Private Library Security & Processing Pipeline** — docs_spec_private_media_type_and_trusted_role_private_media_type, docs_spec_private_media_type_and_trusted_role_trusted_role, docs_spec_private_media_type_and_trusted_role_jellyfin_access_control, docs_spec_subgen_gpu_subtitle_transcription_subgen_container, docs_adr_0017_local_gpu_subtitle_transcription_with_subgen_subgen_whisper_integration [EXTRACTED 0.95]

## Communities (130 total, 51 thin omitted)

### Community 0 - "watcher/src/app.ts"
Cohesion: 0.05
Nodes (62): buildWatcherApp(), fastify, FastifyInstance, WatcherAppOptions, getWatcherDatabasePath(), initWatcherDatabase(), WatcherDatabase, NewWaitlistCoRequester (+54 more)

### Community 1 - "streamer/src/app.ts"
Cohesion: 0.05
Nodes (33): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), StreamerDatabase (+25 more)

### Community 2 - "InviteView.vue"
Cohesion: 0.13
Nodes (13): authStore, confirmPassword, featureFlags, isCheckingToken, isSubmitting, isTokenValid, password, route (+5 more)

### Community 3 - "RequestView.vue"
Cohesion: 0.02
Nodes (72): MediaType, activeAnimeTitle, activeRelease, activeStreamingCandidate, authStore, batchItems, batchSeasonInput, candidates (+64 more)

### Community 4 - "AdminView.vue"
Cohesion: 0.03
Nodes (59): activeTab, AdminFeatureFlag, AdminUser, authStore, automationFlags, candidatesList, checkJellyfinStatus(), configErrorMessage (+51 more)

### Community 6 - "main.ts"
Cohesion: 0.50
Nodes (3): app, pinia, apps_web_src_style

### Community 7 - "Ephemeral Streaming Tier"
Cohesion: 0.08
Nodes (43): ADR 0013: Per-Entry Grace Periods with Release Newness Classification, graceOverrideHours Column, Per-Entry Grace Period Computation, Release Newness Threshold Classification, ADR 0015: Runtime Feature Flags and Subsystem Kill Switches, Authoritative Gateway Architecture for Feature Flags, Coordinated Pause for Background Workers, Full-Stack Feature Flag Enforcement (+35 more)

### Community 8 - "LibraryView.vue"
Cohesion: 0.05
Nodes (38): activeCategory, allLibraryItems, allSelectedRequestIds, authStore, clearSelection(), currentCategoryItems, EpisodeItem, error (+30 more)

### Community 9 - "streamer/package.json"
Cohesion: 0.05
Nodes (39): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+31 more)

### Community 10 - "watcher/package.json"
Cohesion: 0.05
Nodes (39): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+31 more)

### Community 11 - "WaitlistView.vue"
Cohesion: 0.05
Nodes (32): useWaitlistStore, WaitlistEntry, WaitlistStatus, activeView, approvingEntryId, authStore, availableReleasesCount, candidates (+24 more)

### Community 12 - "api.ts"
Cohesion: 0.10
Nodes (20): api, ApiError, apiRequest(), router, routes, useAuthStore, User, ProgressData (+12 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.05
Nodes (33): formatDate(), formatEta(), formatMediaSubtitle(), formatMediaType(), formatSpeed(), DownloadRequest, activeStreamingItem, activeStreamsShelfRef (+25 more)

### Community 14 - "IJellyfinService"
Cohesion: 0.08
Nodes (15): requestCoRequesters, SystemConfig, SpaceCheckResult, IJellyfinService, InvalidCredentialsError, JellyfinAuthResult, IQBittorrentService, TorrentInfo (+7 more)

### Community 15 - "Navbar.vue"
Cohesion: 0.08
Nodes (24): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isWaitlistEnabled, route, router (+16 more)

### Community 17 - "ref_vitest"
Cohesion: 0.14
Nodes (16): apps_api_src_db_index_downloadrequests, apps_api_src_db_index_users, downloadRequests, BuildLibraryPathParams, FileSystemService, ProcessAndHardlinkInput, ProcessAndHardlinkResult, ProcessAndHardlinkTorrentResult (+8 more)

### Community 18 - "QBittorrentService"
Cohesion: 0.11
Nodes (8): QBittorrentError, QBittorrentService, parseTorrentBuffer(), decode(), decodeBuffer(), decodeString(), MockQBittorrent, MockQBittorrent

### Community 19 - "api/src/services/prowlarr.ts"
Cohesion: 0.14
Nodes (10): formatBytes(), hasCjkCharacters(), hasPasskey(), isKnownPrivateIndexer(), ProwlarrService, ReleaseSource, VideoCodec, isPreferredIndexer() (+2 more)

### Community 20 - "BaseMetadataService"
Cohesion: 0.11
Nodes (8): BaseMetadataService, MetadataApiError, MetadataService, rankMetadataCandidates(), DummyJellyfinService, MockRouteMetadataService, MockMetadata, MockMetadataService

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.08
Nodes (29): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+21 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "downloadPoller.ts"
Cohesion: 0.08
Nodes (26): AppOptions, FastifyInstance, AppDatabase, apps_api_src_db_index_downloadrequest, DownloadPoller, DownloadPollerOptions, PollerLogger, UnarchiveDaemon (+18 more)

### Community 24 - "UpNextService"
Cohesion: 0.31
Nodes (6): groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), normalizeShowTitle(), UpNextService

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "JellyfinService"
Cohesion: 0.14
Nodes (3): JellyfinApiError, JellyfinService, MockJellyfinService

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
Cohesion: 0.14
Nodes (11): CleanupCron, DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), NotificationEvent, NotificationPayload, NotificationService (+3 more)

### Community 32 - "api/src/db/index.ts"
Cohesion: 0.10
Nodes (19): DEFAULT_FEATURE_FLAGS, __dirname, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase(), apps_api_src_db_index_invites, apps_api_src_db_index_newdownloadrequest (+11 more)

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
Cohesion: 0.17
Nodes (3): DownloadRequest, InvalidTransitionError, MockCleanupService

### Community 39 - "subtitleInspection.ts"
Cohesion: 0.16
Nodes (9): execFileAsync, FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionService, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, ref_node_child_process (+1 more)

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

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 54 - "scripts"
Cohesion: 0.18
Nodes (10): name, packageManager, private, scripts, build, dev, lint, test (+2 more)

### Community 55 - "upNext.ts"
Cohesion: 0.12
Nodes (18): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), IDiscoveryService, MetadataSearchOptions (+10 more)

### Community 56 - "LoginView.vue"
Cohesion: 0.11
Nodes (13): available, items, router, UpNextItem, UpNextResponse, authStore, errorMessage, isLoading (+5 more)

### Community 57 - "parseTorrentFile"
Cohesion: 0.27
Nodes (9): fileToBase64(), ParsedTorrentClient, parseTorrentFile(), decode(), decodeBuffer(), decodeString(), BatchItem, handleConfirmRequest() (+1 more)

### Community 58 - "lib/torrentTitleCleaner.ts"
Cohesion: 0.24
Nodes (9): CleanedTorrentResult, cleanSeparators(), cleanTorrentTitle(), ExtractedEpisodeInfo, extractEpisodeInfo(), handleFileDrop(), handleFileInputChange(), processFiles() (+1 more)

### Community 59 - "User Role"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Waitlist Entry"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 61 - "isKnownPrivateIndexer"
Cohesion: 0.28
Nodes (9): formatBytes(), isKnownPrivateIndexer(), checkCacheForCandidates(), extractInfoHash(), getCandidateCacheStatus(), handleInstantStreamCandidate(), handleStreamPlaybackError(), initFastTrackFromRoute() (+1 more)

### Community 62 - "fetchReleasesForCandidate"
Cohesion: 0.28
Nodes (9): checkDuplicateExists(), confirmStep2Selection(), fetchReleasesForCandidate(), hasCjk(), onGranularityChange(), onSeasonOrEpisodeChange(), selectCandidate(), setAnimeTitle() (+1 more)

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

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

### Community 72 - "releaseExplorer.ts"
Cohesion: 0.38
Nodes (5): CandidateSortOption, ReleaseCandidate, SORT_OPTIONS, sortReleaseCandidates(), sortedReleaseCandidates

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 78 - "api/src/app.ts"
Cohesion: 0.06
Nodes (60): buildApp(), fastify, apps_api_src_db_index_featureflags, FeatureFlag, featureFlags, Invite, InviteRole, invites (+52 more)

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 84 - "ICleanupService"
Cohesion: 0.14
Nodes (3): CleanupCronOptions, ICleanupService, MockCleanup

### Community 86 - "routes/requests.ts"
Cohesion: 0.18
Nodes (14): batchItemSchema, batchRequestSchema, createRequestSchema, existsRequestSchema, requestRoutes(), searchMetadataSchema, searchReleasesSchema, addCoRequester() (+6 more)

### Community 87 - "unarchiveRecovery.ts"
Cohesion: 0.11
Nodes (15): __dirname, envPaths, __filename, main(), CommandExecFn, CommandExecResult, ExtractAndDeployMediaOptions, ExtractAndDeployMediaRequest (+7 more)

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 95 - "loadEntries"
Cohesion: 0.50
Nodes (4): handleCheckAll(), handleCheckEntry(), loadEntries(), setView()

### Community 99 - "checkCandidateGuards"
Cohesion: 0.67
Nodes (3): checkCandidateGuards(), initPrefilledModal(), selectCandidate()

### Community 101 - "MetadataCandidate"
Cohesion: 0.28
Nodes (3): MetadataCandidate, MockMetadataService, MockMetadataService

### Community 119 - "closeModal"
Cohesion: 0.67
Nodes (3): closeModal(), downloadDirectly(), submitWaitlistEntry()

### Community 121 - "formatStatusText"
Cohesion: 0.67
Nodes (3): formatGraceRemaining(), formatStatusText(), getRemainingGraceMs()

### Community 122 - "transcriptionCron.ts"
Cohesion: 0.17
Nodes (8): getLocalTimeInTimezone(), isInsideWindow(), TranscriptionCron, TranscriptionCronLogger, TranscriptionCronOptions, ISubgenService, SubgenService, SubgenServiceOptions

### Community 125 - "ws.ts"
Cohesion: 0.25
Nodes (6): BroadcastFunction, fastify, FastifyInstance, wsRoutes, fastify-plugin, ws

## Knowledge Gaps
- **709 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+704 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1084 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IJellyfinService` connect `IJellyfinService` to `MockJellyfin`, `CleanupService`, `ref_vitest`, `BaseMetadataService`, `downloadPoller.ts`, `JellyfinService`, `discovery.test.ts`, `cleanup.test.ts`, `.cleanItem`, `api/src/db/index.ts`, `DummyJellyfinService`, `MockJellyfin`, `MockJellyfinService`, `MockJellyfinService`, `MockJellyfin`, `api/src/app.ts`, `unarchiveRecovery.ts`, `MockJellyfin`, `MockJellyfin`, `MockJellyfinService`, `MockJellyfinService`, `DummyJellyfinService`, `DummyJellyfin`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `IQBittorrentService` connect `IJellyfinService` to `MockQBittorrent`, `MockQBService`, `MockQBService`, `api/src/app.ts`, `MockQBittorrentService`, `ref_vitest`, `QBittorrentService`, `DummyQB`, `cleanup.test.ts`, `downloadPoller.ts`, `MockQBittorrentService`, `MockQBittorrent`, `MockQBittorrentService`, `.cleanItem`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `vue` connect `Navbar.vue` to `InviteView.vue`, `RequestView.vue`, `AdminView.vue`, `main.ts`, `LibraryView.vue`, `StreamProgressModal.vue`, `WaitlistView.vue`, `api.ts`, `DashboardView.vue`, `SubtitlePickerModal.vue`, `ActiveStreamsShelf.vue`, `DiscoveryFeed.vue`, `LoginView.vue`, `web/package.json`, `PromotionModal.vue`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `buildApp()` (e.g. with `adminRoutes()` and `authRoutes()`) actually correct?**
  _`buildApp()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _709 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `watcher/src/app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05126945126945127 - nodes in this community are weakly interconnected._
- **Should `streamer/src/app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05133161512027491 - nodes in this community are weakly interconnected._