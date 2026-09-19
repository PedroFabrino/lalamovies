# Graph Report - Plex-auto-download  (2026-09-18)

## Corpus Check
- 258 files · ~193,427 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 2, .css 1)

## Summary
- 1912 nodes · 3911 edges · 114 communities (81 shown, 33 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Watcher Service Architecture
- Real-Debrid Streamer Service
- Main API Application Setup
- Download Request UI
- Admin Control Dashboard
- Automated Storage Cleanup
- Jellyfin Media Server Client
- Architecture Decision Records
- Media Library Management UI
- Test Suites & Mocks
- Test Suites & Mocks
- Waitlist & Watch Subsystem
- Admin Control Dashboard
- Waitlist & Watch Subsystem
- Download Poller & Hardlinking
- Waitlist & Watch Subsystem
- Jellyfin Media Server Client
- qBittorrent Torrent Client
- qBittorrent Torrent Client
- Prowlarr Indexer Search
- TMDB & AniList Metadata Service
- Media Discovery & Up-Next Shelf
- Test Suites & Mocks
- Prowlarr Indexer Search
- Download Request UI
- Architecture Decision Records
- Jellyfin Media Server Client
- TMDB & AniList Metadata Service
- Test Suites & Mocks
- TMDB & AniList Metadata Service
- Test Suites & Mocks
- Prowlarr Indexer Search
- Prowlarr Indexer Search
- Test Suites & Mocks
- Tsconfig Compileroptions Module
- Architecture Decision Records
- Dirname Envpaths Module
- Tsconfig Node Module
- Jellyfin Media Server Client
- Subtitleinspection Execfileasync Module
- Runtime Feature Flags Engine
- Architecture Decision Records
- Waitlist & Watch Subsystem
- Architecture Decision Records
- Architecture Decision Records
- Web Frontend Dependencies
- Test Suites & Mocks
- Library Artworkcache Module
- Prowlarr Indexer Search
- Jellyfin Media Server Client
- Tsconfig Base Module
- File System & Hardlink Pipeline
- API & Root Package Configuration
- Apierror Constructor Module
- Test Suites & Mocks
- Prowlarr Indexer Search
- Test Suites & Mocks
- Download Request UI
- Download Request UI
- Architecture Decision Records
- Architecture Decision Records
- Download Request UI
- Download Request UI
- Architecture Decision Records
- Test Suites & Mocks
- Cleanupcron Cleanupcron Module
- Jellyfin Media Server Client
- Tsconfig Compileroptions Module
- Tsconfig Compileroptions Module
- Tsconfig Compileroptions Module
- Test Suites & Mocks
- User Dashboard Views
- Download Request UI
- Architecture Decision Records
- Architecture Decision Records
- Jellyfin Media Server Client
- Jellyfin Media Server Client
- Test Suites & Mocks
- Waitlist & Watch Subsystem
- Architecture Decision Records
- Graphify Document Module
- Drizzle Config Module
- Jellyfin Media Server Client
- qBittorrent Torrent Client
- Jellyfin Media Server Client
- Automated Storage Cleanup
- Jellyfin Media Server Client
- Jellyfin Media Server Client
- API & Root Package Configuration
- Admin Control Dashboard
- Waitlist & Watch Subsystem
- Web Vue Module
- API & Root Package Configuration
- Waitlist & Watch Subsystem
- Waitlist & Watch Subsystem
- Waitlist & Watch Subsystem
- Vite Env Module
- Tsconfig Files Module
- API & Root Package Configuration
- Admin Control Dashboard
- Admin Control Dashboard
- Admin Control Dashboard
- Vercel Rewrites Module
- Pnpm Workspace Module
- Favicon Vector Module
- Svg Icon Module
- Hero Illustration Module
- Vite Logo Module
- Vue Logo Module

## God Nodes (most connected - your core abstractions)
1. `buildApp()` - 54 edges
2. `IJellyfinService` - 54 edges
3. `Context Domain Model Document` - 49 edges
4. `IQBittorrentService` - 36 edges
5. `users` - 31 edges
6. `downloadRequests` - 31 edges
7. `api` - 31 edges
8. `IProwlarrService` - 28 edges
9. `ICleanupService` - 26 edges
10. `IMetadataService` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Play-History LRU Cleanup Mechanism` --semantically_similar_to--> `Cleanup Policy`  [INFERRED] [semantically similar]
  README.md → CONTEXT.md
- `Cloudflare Tunnel Ingress Architecture` --semantically_similar_to--> `Cloudflare Tunnel Ingress`  [INFERRED] [semantically similar]
  docs/adr/0002-cloudflare-tunnel-for-network-exposure.md → README.md
- `Fastify API Service` --implements--> `Production Stack`  [INFERRED]
  docker/docker-compose.yml → CONTEXT.md
- `Embedded SQLite Application State` --shares_data_with--> `Fastify API Service`  [INFERRED]
  docs/adr/0004-sqlite-for-application-state.md → docker/docker-compose.yml
- `Private Media Type and Trusted Role Isolation` --implements--> `Private Library`  [EXTRACTED]
  docs/adr/0010-private-media-type-and-trusted-role.md → CONTEXT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Download Request Hardlink Lifecycle** — context_download_request, context_staging_area, context_hardlink_move, context_library, context_storage_quota, docker_docker_compose_yml_service_qbittorrent, docker_docker_compose_yml_service_api [EXTRACTED 0.95]
- **Jellyfin Authentication and Role Model** — context_user_role, context_trusted_role, context_admin_role, context_invite, docs_adr_0001_jellyfin_as_auth_source_of_truth_jellyfin_auth, docker_docker_compose_yml_service_jellyfin [EXTRACTED 0.95]
- **Ephemeral Debrid Streaming Pipeline** — context_ephemeral_stream, context_stream_library, docker_docker_compose_yml_service_zurg, docker_docker_compose_yml_service_rclone, docker_docker_compose_yml_service_streamer, docs_adr_0012_dual_tier_ephemeral_streaming_with_real_debrid_dual_tier_streaming [EXTRACTED 0.95]
- **Private Library Security & Processing Pipeline** — docs_spec_private_media_type_and_trusted_role_private_media_type, docs_spec_private_media_type_and_trusted_role_trusted_role, docs_spec_private_media_type_and_trusted_role_jellyfin_access_control, docs_spec_subgen_gpu_subtitle_transcription_subgen_container, docs_adr_0017_local_gpu_subtitle_transcription_with_subgen_subgen_whisper_integration [EXTRACTED 0.95]
- **Preferred Indexer Dual-Candidate Airgap Architecture** — docs_adr_0016_preferred_indexer_for_downloads_preferred_indexer_oracle, docs_adr_0016_preferred_indexer_for_downloads_discovery_dual_candidate, docs_spec_preferred_indexer_bj_share_preferred_indexer_concept, docs_spec_preferred_indexer_bj_share_dual_candidate_binding, docs_spec_ephemeral_streaming_and_real_debrid_private_airgap [EXTRACTED 0.95]
- **Automated Discovery, Episodic Tracking, and Configurable Grace Period Ingestion** — docs_spec_discovery_feed_and_up_next_shelf_up_next_shelf, docs_spec_discovery_feed_and_up_next_shelf_episodic_gap_algorithm, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_watch_for_next_episodes, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_compute_grace_hours, docs_adr_0013_per_entry_grace_periods_with_release_newness_classification_per_entry_grace_period [EXTRACTED 0.95]

## Communities (114 total, 33 thin omitted)

### Community 0 - "Watcher Service Architecture"
Cohesion: 0.05
Nodes (63): buildWatcherApp(), fastify, FastifyInstance, WatcherAppOptions, getWatcherDatabasePath(), initWatcherDatabase(), WatcherDatabase, NewWaitlistCoRequester (+55 more)

### Community 1 - "Real-Debrid Streamer Service"
Cohesion: 0.05
Nodes (32): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), StreamerDatabase (+24 more)

### Community 2 - "Main API Application Setup"
Cohesion: 0.06
Nodes (56): buildApp(), fastify, apps_api_src_db_index_featureflags, FeatureFlag, featureFlags, Invite, InviteRole, invites (+48 more)

### Community 3 - "Download Request UI"
Cohesion: 0.02
Nodes (72): MediaType, activeAnimeTitle, activeRelease, activeStreamingCandidate, authStore, batchItems, batchSeasonInput, candidates (+64 more)

### Community 4 - "Admin Control Dashboard"
Cohesion: 0.03
Nodes (49): activeTab, AdminFeatureFlag, AdminUser, authStore, automationFlags, candidatesList, configErrorMessage, configForm (+41 more)

### Community 5 - "Automated Storage Cleanup"
Cohesion: 0.06
Nodes (9): DownloadRequest, CleanupService, ICleanupService, matchesLibraryPath(), MockCleanupService, MockCleanup, MockCleanupService, MockCleanupService (+1 more)

### Community 6 - "Jellyfin Media Server Client"
Cohesion: 0.14
Nodes (28): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequest, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase() (+20 more)

### Community 7 - "Architecture Decision Records"
Cohesion: 0.08
Nodes (43): ADR 0013: Per-Entry Grace Periods with Release Newness Classification, graceOverrideHours Column, Per-Entry Grace Period Computation, Release Newness Threshold Classification, ADR 0015: Runtime Feature Flags and Subsystem Kill Switches, Authoritative Gateway Architecture for Feature Flags, Coordinated Pause for Background Workers, Full-Stack Feature Flag Enforcement (+35 more)

### Community 8 - "Media Library Management UI"
Cohesion: 0.06
Nodes (36): activeCategory, allLibraryItems, allSelectedRequestIds, authStore, clearSelection(), currentCategoryItems, EpisodeItem, error (+28 more)

### Community 9 - "Test Suites & Mocks"
Cohesion: 0.05
Nodes (39): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+31 more)

### Community 10 - "Test Suites & Mocks"
Cohesion: 0.05
Nodes (39): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+31 more)

### Community 11 - "Waitlist & Watch Subsystem"
Cohesion: 0.05
Nodes (29): activeView, approvingEntryId, authStore, availableReleasesCount, candidates, checkingEntryId, hasSearched, isCheckingAll (+21 more)

### Community 12 - "Admin Control Dashboard"
Cohesion: 0.14
Nodes (11): api, useAuthStore, User, mockRoute, mockRouterPush, mockRouteQuery, mockRouterPush, mockRouterReplace (+3 more)

### Community 13 - "Waitlist & Watch Subsystem"
Cohesion: 0.05
Nodes (24): activeStreamingItem, activeStreamsShelfRef, authStore, discoveryFeedRef, DiskInfo, featureFlags, handleInstantStream(), handleStreamPlaybackError() (+16 more)

### Community 14 - "Download Poller & Hardlinking"
Cohesion: 0.11
Nodes (15): AppOptions, FastifyInstance, AppDatabase, DownloadPoller, DownloadPollerOptions, getLocalTimeInTimezone(), isInsideWindow(), TranscriptionCron (+7 more)

### Community 15 - "Waitlist & Watch Subsystem"
Cohesion: 0.09
Nodes (24): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isWaitlistEnabled, route, router (+16 more)

### Community 16 - "Jellyfin Media Server Client"
Cohesion: 0.06
Nodes (6): IJellyfinService, MockJellyfin, MockJellyfinService, MockJellyfinService, MockJellyfin, DummyJellyfinService

### Community 17 - "qBittorrent Torrent Client"
Cohesion: 0.06
Nodes (7): IQBittorrentService, MockQBittorrentService, MockQBittorrent, MockQBittorrentService, MockQBService, MockQBittorrentService, MockQBittorrentService

### Community 18 - "qBittorrent Torrent Client"
Cohesion: 0.11
Nodes (8): QBittorrentError, QBittorrentService, parseTorrentBuffer(), decode(), decodeBuffer(), decodeString(), MockQBittorrent, MockQBittorrent

### Community 19 - "Prowlarr Indexer Search"
Cohesion: 0.13
Nodes (13): forwardToStreamer(), streamsAuth(), streamsRoutes(), formatBytes(), hasCjkCharacters(), hasPasskey(), isKnownPrivateIndexer(), ProwlarrService (+5 more)

### Community 20 - "TMDB & AniList Metadata Service"
Cohesion: 0.11
Nodes (9): BaseMetadataService, MetadataApiError, MetadataSearchOptions, MetadataService, rankMetadataCandidates(), MockMetadata, MockRouteMetadataService, MockMetadata (+1 more)

### Community 21 - "Media Discovery & Up-Next Shelf"
Cohesion: 0.10
Nodes (25): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+17 more)

### Community 22 - "Test Suites & Mocks"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "Prowlarr Indexer Search"
Cohesion: 0.10
Nodes (10): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), IDiscoveryService, IMetadataService (+2 more)

### Community 24 - "Download Request UI"
Cohesion: 0.10
Nodes (16): DiscoveryItem, error, flags, initWsListener(), isLoaded, isLoading, useFeatureFlags(), ensureFlagsLoaded() (+8 more)

### Community 25 - "Architecture Decision Records"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "Jellyfin Media Server Client"
Cohesion: 0.17
Nodes (3): JellyfinApiError, JellyfinService, MockJellyfinService

### Community 27 - "TMDB & AniList Metadata Service"
Cohesion: 0.14
Nodes (16): batchItemSchema, batchRequestSchema, createRequestSchema, existsRequestSchema, requestRoutes(), searchMetadataSchema, searchReleasesSchema, addCoRequester() (+8 more)

### Community 28 - "Test Suites & Mocks"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "TMDB & AniList Metadata Service"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "Test Suites & Mocks"
Cohesion: 0.16
Nodes (10): DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), NotificationEvent, NotificationPayload, NotificationService, NotificationServiceOptions (+2 more)

### Community 31 - "Prowlarr Indexer Search"
Cohesion: 0.15
Nodes (5): ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult, MockProwlarrService, MockProwlarrService

### Community 32 - "Prowlarr Indexer Search"
Cohesion: 0.19
Nodes (10): Resolution, groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), IUpNextService, normalizeShowTitle(), UpNextItem (+2 more)

### Community 33 - "Test Suites & Mocks"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "Tsconfig Compileroptions Module"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Architecture Decision Records"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "Dirname Envpaths Module"
Cohesion: 0.13
Nodes (14): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+6 more)

### Community 37 - "Tsconfig Node Module"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "Jellyfin Media Server Client"
Cohesion: 0.16
Nodes (5): MetadataCandidate, DummyJellyfinService, MockMetadataService, TorrentParsed, MockMetadataService

### Community 39 - "Subtitleinspection Execfileasync Module"
Cohesion: 0.16
Nodes (9): execFileAsync, FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionService, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, ref_node_child_process (+1 more)

### Community 40 - "Runtime Feature Flags Engine"
Cohesion: 0.13
Nodes (13): authStore, confirmPassword, featureFlags, isCheckingToken, isSubmitting, isTokenValid, password, route (+5 more)

### Community 41 - "Architecture Decision Records"
Cohesion: 0.20
Nodes (15): Subgen Service, Root Docker Compose File, Docker Compose Stack Specification, Fastify API Service, Caddy Reverse Proxy, Cloudflared Tunnel Daemon, Cloudflare DDNS Daemon, Jellyfin Media Server (+7 more)

### Community 42 - "Waitlist & Watch Subsystem"
Cohesion: 0.25
Nodes (13): checkStreamStatus(), currentErrorMessage, currentJellyfinUrl, effectiveJellyfinUrl, emit, handleAddToWaitlist(), handleClose(), handlePromote() (+5 more)

### Community 43 - "Architecture Decision Records"
Cohesion: 0.16
Nodes (14): Cleanup, Cleanup Policy, Fully Consumed, Keep Flag, Storage Quota, ADR 0005 Document, Rationale: Prevent ENOSPC and Support Greedy FIFO, Software Storage Quota and Deferred Queueing (+6 more)

### Community 44 - "Architecture Decision Records"
Cohesion: 0.16
Nodes (14): Hardlink Move, Library, Private Library, Staging Area, Stream Library, ADR 0003 Document, Atomic Hardlink Staging Flow, Rationale: Zero-Copy Seeding and Clean Renaming (+6 more)

### Community 45 - "Web Frontend Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, @fastify/cookie, @fastify/cors, @fastify/jwt (+5 more)

### Community 46 - "Test Suites & Mocks"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 47 - "Library Artworkcache Module"
Cohesion: 0.20
Nodes (11): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, libraryRoutes(), MediaArtwork, MediaRequester (+3 more)

### Community 49 - "Jellyfin Media Server Client"
Cohesion: 0.21
Nodes (9): authStore, emit, EphemeralStreamItem, fetchStreams(), handleEvict(), handlePromote(), handleWsMessage(), loading (+1 more)

### Community 50 - "Tsconfig Base Module"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 52 - "API & Root Package Configuration"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "Apierror Constructor Module"
Cohesion: 0.18
Nodes (8): ApiError, apiRequest(), authStore, errorMessage, isLoading, password, router, username

### Community 54 - "Test Suites & Mocks"
Cohesion: 0.18
Nodes (10): name, packageManager, private, scripts, build, dev, lint, test (+2 more)

### Community 55 - "Prowlarr Indexer Search"
Cohesion: 0.29
Nodes (6): matchesTarget(), CleanedTorrentResult, cleanSeparators(), cleanTorrentTitle(), ExtractedEpisodeInfo, extractEpisodeInfo()

### Community 56 - "Test Suites & Mocks"
Cohesion: 0.22
Nodes (6): available, items, router, UpNextItem, UpNextResponse, mockPush

### Community 57 - "Download Request UI"
Cohesion: 0.27
Nodes (9): fileToBase64(), ParsedTorrentClient, parseTorrentFile(), decode(), decodeBuffer(), decodeString(), BatchItem, handleConfirmRequest() (+1 more)

### Community 58 - "Download Request UI"
Cohesion: 0.24
Nodes (9): CleanedTorrentResult, cleanSeparators(), cleanTorrentTitle(), ExtractedEpisodeInfo, extractEpisodeInfo(), handleFileDrop(), handleFileInputChange(), processFiles() (+1 more)

### Community 59 - "Architecture Decision Records"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Architecture Decision Records"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 61 - "Download Request UI"
Cohesion: 0.28
Nodes (9): formatBytes(), isKnownPrivateIndexer(), checkCacheForCandidates(), extractInfoHash(), getCandidateCacheStatus(), handleInstantStreamCandidate(), handleStreamPlaybackError(), initFastTrackFromRoute() (+1 more)

### Community 62 - "Download Request UI"
Cohesion: 0.28
Nodes (9): checkDuplicateExists(), confirmStep2Selection(), fetchReleasesForCandidate(), hasCjk(), onGranularityChange(), onSeasonOrEpisodeChange(), selectCandidate(), setAnimeTitle() (+1 more)

### Community 63 - "Architecture Decision Records"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "Test Suites & Mocks"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "Cleanupcron Cleanupcron Module"
Cohesion: 0.29
Nodes (3): CleanupCron, CleanupCronLogger, CleanupCronOptions

### Community 67 - "Tsconfig Compileroptions Module"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 68 - "Tsconfig Compileroptions Module"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 69 - "Tsconfig Compileroptions Module"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 70 - "Test Suites & Mocks"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 71 - "User Dashboard Views"
Cohesion: 0.33
Nodes (6): formatDate(), formatEta(), formatMediaSubtitle(), formatMediaType(), formatSpeed(), getProgressSpeedEta()

### Community 72 - "Download Request UI"
Cohesion: 0.38
Nodes (5): CandidateSortOption, ReleaseCandidate, SORT_OPTIONS, sortReleaseCandidates(), sortedReleaseCandidates

### Community 73 - "Architecture Decision Records"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Architecture Decision Records"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 78 - "Waitlist & Watch Subsystem"
Cohesion: 0.40
Nodes (4): CreateWaitlistPayload, useWaitlistStore, WaitlistEntry, WaitlistStatus

### Community 79 - "Architecture Decision Records"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Document Module"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 89 - "Admin Control Dashboard"
Cohesion: 0.50
Nodes (4): confirmCleanItem(), handleRunScan(), handleSaveConfig(), loadDiskAndCandidates()

### Community 90 - "Waitlist & Watch Subsystem"
Cohesion: 0.50
Nodes (4): handleCheckAll(), handleCheckEntry(), loadEntries(), setView()

### Community 91 - "Web Vue Module"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "Waitlist & Watch Subsystem"
Cohesion: 0.67
Nodes (3): checkCandidateGuards(), initPrefilledModal(), selectCandidate()

### Community 94 - "Waitlist & Watch Subsystem"
Cohesion: 0.67
Nodes (3): closeModal(), downloadDirectly(), submitWaitlistEntry()

### Community 95 - "Waitlist & Watch Subsystem"
Cohesion: 0.67
Nodes (3): formatGraceRemaining(), formatStatusText(), getRemainingGraceMs()

## Knowledge Gaps
- **675 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+670 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1006 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IJellyfinService` connect `Jellyfin Media Server Client` to `Main API Application Setup`, `Jellyfin Media Server Client`, `Automated Storage Cleanup`, `Jellyfin Media Server Client`, `Jellyfin Media Server Client`, `Jellyfin Media Server Client`, `Jellyfin Media Server Client`, `Download Poller & Hardlinking`, `qBittorrent Torrent Client`, `Jellyfin Media Server Client`, `TMDB & AniList Metadata Service`, `Jellyfin Media Server Client`, `Jellyfin Media Server Client`, `Jellyfin Media Server Client`, `Jellyfin Media Server Client`, `TMDB & AniList Metadata Service`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `ws` connect `Main API Application Setup` to `Test Suites & Mocks`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Test Suites & Mocks` to `Test Suites & Mocks`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `buildApp()` (e.g. with `adminRoutes()` and `authRoutes()`) actually correct?**
  _`buildApp()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _675 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Watcher Service Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.05067567567567568 - nodes in this community are weakly interconnected._
- **Should `Real-Debrid Streamer Service` be split into smaller, more focused modules?**
  _Cohesion score 0.052407614781634936 - nodes in this community are weakly interconnected._