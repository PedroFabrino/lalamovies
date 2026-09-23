# Graph Report - Plex-auto-download  (2026-09-23)

## Corpus Check
- 362 files · ~241,716 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .example 3, .css 1)

## Summary
- 2387 nodes · 5877 edges · 133 communities (95 shown, 38 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 193 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f27fe216`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cleanup.ts
- streamer/src/app.ts
- Navbar.vue
- DummyJellyfinService
- serviceContainer.ts
- IJellyfinService
- api/src/db/schema.ts
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- api.ts
- DashboardView.vue
- ref_drizzle_orm
- devDependencies
- dev-setup.mjs
- IQBittorrentService
- watcher/src/app.ts
- ProwlarrService
- BaseMetadataService
- DiscoveryFeed.vue
- api/package.json
- requestService.ts
- vue
- Context Domain Model Document
- JellyfinService
- ReleaseCandidate
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
- animeTypes.ts
- AnimeDetailModal.vue
- AnimeView.vue
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- config.ts
- SubtitlePickerModal.vue
- InviteView.vue
- ref_vitest
- compilerOptions
- AdminView.vue
- dependencies
- TorrentReplacementModal.vue
- scripts
- UpNextShelf.vue
- library.ts
- useSeasonalAnime.ts
- useRequestStep1
- User Role
- Waitlist Entry
- upNext.test.ts
- useAdminData
- Media Download Manager Architecture Spec
- scripts
- OpenSubtitlesService
- useRequestReleases
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- requests/index.ts
- QBittorrentService
- Indexer
- Ephemeral Stream
- IRequestsRepository
- MockJellyfinService
- upNext.ts
- SubtitleInspectionService
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- ActiveStreamsShelf.vue
- UnarchiveService
- MockCleanupService
- MockCleanupService
- DummyJellyfinService
- subtitleInspection.ts
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- runRecovery.ts
- IProwlarrService
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
- libraryPathBuilder.ts
- api/src/services/prowlarr.ts
- Torrent Replacement for Underway Requests
- FileSystemService
- ws.ts
- useRequestSubmit
- formatStatusText
- MockCleanup
- stores/waitlist.ts
- DummyJellyfinService
- DummyQB
- DummyJellyfinService
- RequestStep1Input.vue
- DummyJellyfin
- UpNextService
- clearSelection
- CoRequesterPicker.vue
- isExpanded
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
- `Implementation Decisions` --references--> `buildApp()`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/app.ts
- `Architectural Shape` --references--> `AnimeSeasonService`  [INFERRED]
  docs/spec/seasonal-anime-discovery-and-waitlist-bridging.md → apps/api/src/services/animeSeasonService.ts
- `Testing Philosophy` --references--> `AnimeSeasonService`  [INFERRED]
  docs/spec/seasonal-anime-discovery-and-waitlist-bridging.md → apps/api/src/services/animeSeasonService.ts
- `Implementation Decisions` --references--> `CleanupServiceOptions`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `Problem Statement` --references--> `CleanupService`  [INFERRED]
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

## Communities (133 total, 38 thin omitted)

### Community 0 - "cleanup.ts"
Cohesion: 0.13
Nodes (35): apps_api_src_db_index_downloadrequest, apps_api_src_db_index_requestcorequesters, executeBatchRequests(), executeCreateRequest(), triggerNextSeasonWaitlist(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo() (+27 more)

### Community 1 - "streamer/src/app.ts"
Cohesion: 0.05
Nodes (33): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), StreamerDatabase (+25 more)

### Community 2 - "Navbar.vue"
Cohesion: 0.07
Nodes (27): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isWaitlistEnabled, route (+19 more)

### Community 4 - "serviceContainer.ts"
Cohesion: 0.06
Nodes (26): AppOptions, fastify, FastifyInstance, CleanupCron, CleanupCronLogger, CleanupCronOptions, DownloadPoller, getLocalTimeInTimezone() (+18 more)

### Community 5 - "IJellyfinService"
Cohesion: 0.08
Nodes (9): HistoryMatcherOptions, CleanupService, matchesLibraryPath(), IJellyfinService, Dependency diagram, Recommended Implementation Order, Wave 1 — Foundation (no blockers; implement first), Wave 2 — Build on the foundation (start after Wave 1 blockers are complete) (+1 more)

### Community 6 - "api/src/db/schema.ts"
Cohesion: 0.15
Nodes (12): FeatureFlag, Invite, InviteRole, MediaType, NewFeatureFlag, NewInvite, NewRequestCoRequester, NewSystemConfig (+4 more)

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
Cohesion: 0.09
Nodes (21): api, app, router, routes, useAuthStore, User, pinia, useRequestsStore (+13 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.05
Nodes (33): formatDate(), formatEta(), formatMediaSubtitle(), formatMediaType(), formatSpeed(), activeStreamingItem, activeStreamsShelfRef, authStore (+25 more)

### Community 14 - "ref_drizzle_orm"
Cohesion: 0.11
Nodes (14): downloadRequests, requestCoRequesters, SpaceCheckResult, InvalidCredentialsError, JellyfinAuthResult, TorrentInfo, MockJellyfin, MockQBittorrent (+6 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "IQBittorrentService"
Cohesion: 0.07
Nodes (36): AppDatabase, DownloadPollerOptions, PollerLogger, UnarchiveDaemonOptions, CleanupServiceOptions, IFileSystemService, ProcessAndHardlinkInput, ProcessAndHardlinkResult (+28 more)

### Community 18 - "watcher/src/app.ts"
Cohesion: 0.05
Nodes (62): buildWatcherApp(), fastify, FastifyInstance, WatcherAppOptions, getWatcherDatabasePath(), initWatcherDatabase(), WatcherDatabase, NewWaitlistCoRequester (+54 more)

### Community 19 - "ProwlarrService"
Cohesion: 0.20
Nodes (3): formatBytes(), hasCjkCharacters(), ProwlarrService

### Community 20 - "BaseMetadataService"
Cohesion: 0.10
Nodes (9): BaseMetadataService, MetadataApiError, MetadataService, rankMetadataCandidates(), MockMetadata, MockRouteMetadataService, MockMetadata, MockMetadata (+1 more)

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "requestService.ts"
Cohesion: 0.14
Nodes (15): executePromoteFromStream(), ExecutePromoteParams, executeRetryRequest(), RequestService, BatchItemInput, BatchRequestInput, BatchRequestResult, CreateRequestInput (+7 more)

### Community 24 - "vue"
Cohesion: 0.10
Nodes (35): step2QueryInputRef, FastTrackParsedData, BatchItem, CanonicalRequestSummary, MetadataCandidate, apps_web_src_composables_requesttypes_releasecandidate, apps_web_src_composables_userequestdata_batchitem, apps_web_src_composables_userequestdata_canonicalrequestsummary (+27 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

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

### Community 31 - "api/src/app.ts"
Cohesion: 0.07
Nodes (39): buildApp(), getConfig(), validateConfig(), apps_api_src_db_index_featureflags, featureFlags, invites, User, adminGuard() (+31 more)

### Community 32 - "api/src/db/index.ts"
Cohesion: 0.12
Nodes (24): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase(), apps_api_src_db_index_invites (+16 more)

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

### Community 38 - "animeTypes.ts"
Cohesion: 0.05
Nodes (42): extractShowNameFromPath(), stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry, calculateCurrentSeasonAndYear(), calculateNextSeasonAndYear() (+34 more)

### Community 39 - "AnimeDetailModal.vue"
Cohesion: 0.09
Nodes (23): bannerUrl, cleanDescription, confirmWaitlistSubmission(), displayTitle, emit, handleClose(), isAiringOrFinished, isResolvingTmdb (+15 more)

### Community 40 - "AnimeView.vue"
Cohesion: 0.10
Nodes (18): useSeasonalAnime(), fetchArchive(), fetchSeasonalSections(), initFromRoute(), selectSeasonAndYear(), activeSeasonSelect, featureFlags, handlePageChange() (+10 more)

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

### Community 46 - "config.ts"
Cohesion: 0.28
Nodes (6): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, _resetConfigForTesting(), testConfigDefaults, ValidateConfigOptions

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 48 - "InviteView.vue"
Cohesion: 0.08
Nodes (21): ApiError, apiRequest(), authStore, confirmPassword, featureFlags, isCheckingToken, isSubmitting, isTokenValid (+13 more)

### Community 49 - "ref_vitest"
Cohesion: 0.24
Nodes (6): DiskFileInfo, reconstructFilesFromDisk(), ref_node_fs, ref_node_os, ref_node_path, ref_vitest

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "AdminView.vue"
Cohesion: 0.10
Nodes (23): DiskInfo, ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, AdminFeatureFlag, automationFlags, discoveryFlags (+15 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.09
Nodes (22): emit, fileInputRef, onClear(), onFileChange(), activeTab, candidates, canSubmit, emit (+14 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 55 - "UpNextShelf.vue"
Cohesion: 0.22
Nodes (6): available, items, router, UpNextItem, UpNextResponse, mockPush

### Community 56 - "library.ts"
Cohesion: 0.20
Nodes (11): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, libraryRoutes(), MediaArtwork, MediaRequester (+3 more)

### Community 57 - "useSeasonalAnime.ts"
Cohesion: 0.13
Nodes (15): displayTitle, isAiringOrFinished, posterUrl, props, statusBadgeClasses, statusLabel, subTitle, canScrollLeft (+7 more)

### Community 58 - "useRequestStep1"
Cohesion: 0.22
Nodes (12): useRequestStep1(), processFiles(), removeBatchItem(), parseTorrentFile(), decode(), decodeBuffer(), decodeString(), CleanedTorrentResult (+4 more)

### Community 59 - "User Role"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Waitlist Entry"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 61 - "upNext.test.ts"
Cohesion: 0.17
Nodes (5): MetadataCandidate, MetadataSearchOptions, MockMetadataService, MockMetadataService, ref_node_crypto

### Community 62 - "useAdminData"
Cohesion: 0.12
Nodes (11): formatDate(), formatMediaSubtitle(), useAdminData(), checkJellyfinStatus(), confirmCleanItem(), handleCreateInvite(), handleRescanJellyfin(), handleRunScan() (+3 more)

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "OpenSubtitlesService"
Cohesion: 0.29
Nodes (4): OpenSubtitlesOptions, OpenSubtitlesService, SearchSubtitlesParams, SubtitleSearchResult

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
Cohesion: 0.25
Nodes (8): scripts, build, dev, dev:prod, lint, preview, test, typecheck

### Community 71 - "requests/index.ts"
Cohesion: 0.13
Nodes (21): batchRoutes(), createRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes(), promoteSchema, replaceTorrentRoutes() (+13 more)

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "IRequestsRepository"
Cohesion: 0.05
Nodes (19): DownloadRequest, RequestsRepository, IRequestsRepository, RequestListItem, InvalidTransitionError, RequestStateMachine, TransitionOptions, UpNextServiceOptions (+11 more)

### Community 77 - "upNext.ts"
Cohesion: 0.29
Nodes (9): Resolution, matchesTarget(), UpNextItem, UpNextResult, CleanedTorrentResult, cleanSeparators(), cleanTorrentTitle(), ExtractedEpisodeInfo (+1 more)

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 82 - "ActiveStreamsShelf.vue"
Cohesion: 0.21
Nodes (9): authStore, emit, EphemeralStreamItem, fetchStreams(), handleEvict(), handlePromote(), handleWsMessage(), loading (+1 more)

### Community 87 - "subtitleInspection.ts"
Cohesion: 0.25
Nodes (7): FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, ref_node_child_process, ref_node_util

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "runRecovery.ts"
Cohesion: 0.40
Nodes (5): __dirname, envPaths, __filename, main(), runCorruptedArchiveRecovery()

### Community 95 - "IMetadataService"
Cohesion: 0.11
Nodes (8): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), IMetadataService, ScoreOptions

### Community 99 - "loadEntries"
Cohesion: 0.50
Nodes (4): handleCheckAll(), handleCheckEntry(), loadEntries(), setView()

### Community 100 - "checkCandidateGuards"
Cohesion: 0.67
Nodes (3): checkCandidateGuards(), initPrefilledModal(), selectCandidate()

### Community 101 - "closeModal"
Cohesion: 0.67
Nodes (3): closeModal(), downloadDirectly(), submitWaitlistEntry()

### Community 114 - "libraryPathBuilder.ts"
Cohesion: 0.47
Nodes (4): buildLibraryPath(), BuildLibraryPathParams, padNumber(), sanitizePathSegment()

### Community 115 - "api/src/services/prowlarr.ts"
Cohesion: 0.23
Nodes (11): isFeatureEnabled(), forwardToStreamer(), streamsAuth(), streamsRoutes(), hasPasskey(), isKnownPrivateIndexer(), ReleaseSource, VideoCodec (+3 more)

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

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

### Community 126 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 128 - "UpNextService"
Cohesion: 0.31
Nodes (6): groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), normalizeShowTitle(), UpNextService

### Community 131 - "clearSelection"
Cohesion: 0.50
Nodes (5): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), switchCategory()

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

## Knowledge Gaps
- **739 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+734 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1114 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IJellyfinService` connect `IJellyfinService` to `cleanup.ts`, `api/src/db/index.ts`, `DummyJellyfinService`, `serviceContainer.ts`, `IRequestsRepository`, `MockJellyfinService`, `ref_drizzle_orm`, `IQBittorrentService`, `ref_vitest`, `upNext.test.ts`, `DummyJellyfinService`, `requestService.ts`, `JellyfinService`, `DummyJellyfinService`, `DummyJellyfin`, `DummyJellyfinService`, `api/src/app.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `vue` connect `vue` to `Navbar.vue`, `LibraryView.vue`, `WaitlistView.vue`, `api.ts`, `DashboardView.vue`, `DiscoveryFeed.vue`, `web/package.json`, `PromotionModal.vue`, `AnimeDetailModal.vue`, `AnimeView.vue`, `StreamProgressModal.vue`, `SubtitlePickerModal.vue`, `InviteView.vue`, `AdminView.vue`, `TorrentReplacementModal.vue`, `UpNextShelf.vue`, `useSeasonalAnime.ts`, `ActiveStreamsShelf.vue`, `stores/waitlist.ts`, `RequestStep1Input.vue`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `useAdminData()` connect `useAdminData` to `AdminView.vue`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _739 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cleanup.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12560386473429952 - nodes in this community are weakly interconnected._
- **Should `streamer/src/app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05133161512027491 - nodes in this community are weakly interconnected._
- **Should `Navbar.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06882591093117409 - nodes in this community are weakly interconnected._