# Graph Report - Plex-auto-download  (2026-10-01)

## Corpus Check
- 500 files · ~314,146 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .example 3, .css 1)

## Summary
- 3161 nodes · 7673 edges · 160 communities (125 shown, 35 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 281 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `556bb8d7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- IProwlarrService
- streamer/src/app.ts
- Navbar.vue
- WaitlistCard.vue
- ref_vitest
- watcher/src/app.ts
- SymlinkManager
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- api.ts
- DashboardView.vue
- stores/requests.ts
- devDependencies
- dev-setup.mjs
- useRequestStep1
- episodesRepository.ts
- MockJellyfinService
- IMetadataService
- DiscoveryFeed.vue
- api/package.json
- api/src/db/schema.ts
- useRequestData.ts
- Context Domain Model Document
- watcher/src/db/schema.ts
- AppDatabase
- web/package.json
- PromotionModal.vue
- api/src/utils/torrentTitleCleaner.ts
- requests/index.ts
- SubtitleInspectionService
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- AutoDownloadSubmitter
- compilerOptions
- animeTypes.ts
- WaitlistAddModal.vue
- ref_node_path
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- .refreshPlayHistory
- SubtitlePickerModal.vue
- useAdminData
- api/src/services/prowlarr.ts
- compilerOptions
- requestsRepository.ts
- dependencies
- TorrentReplacementModal.vue
- scripts
- ProwlarrService
- serviceContainer.ts
- middleware/auth.ts
- AnimeCard.vue
- User Role
- Waitlist Entry
- Leanback Client and Android TV Shell — Spec
- UserInviteModal.vue
- Media Download Manager Architecture Spec
- scripts
- Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)
- requestFastTrack.ts
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- IndexerPrivacyCache
- ref_drizzle_orm
- Indexer
- Ephemeral Stream
- IRequestsRepository
- Waitlist Unconfirmed Release Dates and TBA Gating — Spec
- WatchPartyLobbyModal.vue
- Leanback Client and Android TV Shell
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- QBittorrentService
- watcher/src/services/prowlarr.ts
- SeasonPackEpisodesDrawer.vue
- MockCleanupService
- AnimeDetailModal.vue
- Multi-Use Revocable User Invites — Spec
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- api/src/db/index.ts
- useRequestSubmit
- DummyQB
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- useWaitlistMatching.ts
- AnimeView.vue
- ReleaseCandidate
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
- ws.ts
- WatchPartyRepository
- WatchRequest
- airDateFetcher.ts
- WatcherPoller
- api/src/services/notifications.ts
- Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec
- transcriptionCron.ts
- requestWaitlistIntegration.ts
- vue
- IStreamerJellyfinService
- Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec
- DummyJellyfinService
- Unified Series Domain and TMDB Canonical Authority
- ICleanupService
- CoRequesterPicker.vue
- src/config.ts
- ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject
- AdminFeaturesTab.vue
- api/src/index.ts
- IJellyfinService
- AGENTS.md — Media Download Manager Instructions
- JellyfinSyncPlayService
- library.ts
- OpenSubtitlesService
- Decision
- RequestStep1Input.vue
- github-issues.md
- watcher/src/index.ts
- WaitlistCheckService
- TorrentManualInput.vue
- DebridService
- clearSelection
- IDebridService
- ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure
- ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining
- Recommended Implementation Order
- streamer/src/routes/streams.ts
- streamer/src/db/index.ts
- isExpanded
- isSelected

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 78 edges
2. `IRequestsRepository` - 76 edges
3. `DownloadRequest` - 66 edges
4. `api` - 62 edges
5. `IQBittorrentService` - 59 edges
6. `buildApp()` - 58 edges
7. `RequestsRepository` - 57 edges
8. `vue` - 56 edges
9. `users` - 55 edges
10. `AppDatabase` - 52 edges

## Surprising Connections (you probably didn't know these)
- `Wave 1 — Foundation (no blockers; implement first)` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `Solution` --references--> `executeEpisodicWaterfall()`  [INFERRED]
  docs/spec/preferred-indexer-qualification-and-episodic-waterfall.md → apps/watcher/src/services/episodicWaterfall.ts
- `Architectural Shape` --references--> `useFeatureFlags()`  [INFERRED]
  docs/spec/leanback-client-and-android-tv-shell.md → apps/web/src/composables/useFeatureFlags.ts
- `Implementation Decisions` --references--> `buildApp()`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/app.ts
- `Architectural Shape` --references--> `AnimeSeasonService`  [INFERRED]
  docs/spec/seasonal-anime-discovery-and-waitlist-bridging.md → apps/api/src/services/animeSeasonService.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Jellyfin Authentication and Role Model** — context_user_role, context_trusted_role, context_admin_role, context_invite, docs_adr_0001_jellyfin_as_auth_source_of_truth_jellyfin_auth, docker_docker_compose_yml_service_jellyfin [EXTRACTED 0.95]
- **Automated Discovery, Episodic Tracking, and Configurable Grace Period Ingestion** — docs_spec_discovery_feed_and_up_next_shelf_up_next_shelf, docs_spec_discovery_feed_and_up_next_shelf_episodic_gap_algorithm, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_watch_for_next_episodes, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_compute_grace_hours, docs_adr_0013_per_entry_grace_periods_with_release_newness_classification_per_entry_grace_period [EXTRACTED 0.95]
- **Download Request Hardlink Lifecycle** — context_download_request, context_staging_area, context_hardlink_move, context_library, context_storage_quota, docker_docker_compose_yml_service_qbittorrent, docker_docker_compose_yml_service_api [EXTRACTED 0.95]
- **Ephemeral Debrid Streaming Pipeline** — context_ephemeral_stream, context_stream_library, docker_docker_compose_yml_service_zurg, docker_docker_compose_yml_service_rclone, docker_docker_compose_yml_service_streamer, docs_adr_0012_dual_tier_ephemeral_streaming_with_real_debrid_dual_tier_streaming [EXTRACTED 0.95]
- **Preferred Indexer Dual-Candidate Airgap Architecture** — docs_adr_0016_preferred_indexer_for_downloads_preferred_indexer_oracle, docs_adr_0016_preferred_indexer_for_downloads_discovery_dual_candidate, docs_spec_preferred_indexer_bj_share_preferred_indexer_concept, docs_spec_preferred_indexer_bj_share_dual_candidate_binding, docs_spec_ephemeral_streaming_and_real_debrid_private_airgap [EXTRACTED 0.95]
- **Private Library Security & Processing Pipeline** — docs_spec_private_media_type_and_trusted_role_private_media_type, docs_spec_private_media_type_and_trusted_role_trusted_role, docs_spec_private_media_type_and_trusted_role_jellyfin_access_control, docs_spec_subgen_gpu_subtitle_transcription_subgen_container, docs_adr_0017_local_gpu_subtitle_transcription_with_subgen_subgen_whisper_integration [EXTRACTED 0.95]

## Communities (160 total, 35 thin omitted)

### Community 0 - "IProwlarrService"
Cohesion: 0.12
Nodes (8): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryServiceOptions, ScoreOptions, IProwlarrService, apps_api_src_services_prowlarr_resolution, apps_api_src_services_prowlarr_scoreoptions

### Community 1 - "streamer/src/app.ts"
Cohesion: 0.21
Nodes (8): buildStreamerApp(), fastify, apps_streamer_src_db_index_ephemeralstreams, ephemeralStreams, DebridTorrentInfo, DirectDownloader, SymlinkManagerOptions, ref_node_stream

### Community 2 - "Navbar.vue"
Cohesion: 0.04
Nodes (52): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isUserInvitesEnabled, isWaitlistEnabled (+44 more)

### Community 3 - "WaitlistCard.vue"
Cohesion: 0.12
Nodes (22): emit, handleCardClick(), isActionable, props, DEFAULT_MEDIA_TYPE_CONFIG, DEFAULT_STATUS_CONFIG, formatDateOnly(), formatGraceRemaining() (+14 more)

### Community 4 - "ref_vitest"
Cohesion: 0.11
Nodes (17): buildApp(), apps_api_src_db_index_featureflags, featureFlags, users, apps_api_src_routes_admin_adminroutes, authRoutes(), internalRoutes(), apps_api_src_routes_invites_inviteroutes (+9 more)

### Community 5 - "watcher/src/app.ts"
Cohesion: 0.15
Nodes (20): buildWatcherApp(), fastify, FastifyInstance, WatcherAppOptions, getWatcherDatabasePath(), initWatcherDatabase(), WatcherDatabase, WatcherPollerLogger (+12 more)

### Community 6 - "SymlinkManager"
Cohesion: 0.17
Nodes (6): FastifyInstance, StreamerAppOptions, EphemeralEvictionCron, StreamPoller, IDirectDownloader, SymlinkManager

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

### Community 11 - "WaitlistView.vue"
Cohesion: 0.11
Nodes (16): activeView, addModalRef, approvingEntryId, authStore, checkingEntryId, handleCheckAll(), handleCheckEntry(), isCheckingAll (+8 more)

### Community 12 - "api.ts"
Cohesion: 0.05
Nodes (40): authStore, emit, EphemeralStreamItem, fetchStreams(), handleEvict(), handlePromote(), handleWsMessage(), loading (+32 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.07
Nodes (18): DiskInfo, useDashboardActions(), useStreamPlayback(), handleInstantStream(), handleStreamPlaybackError(), useRequestsStore, activeStreamsShelfRef, activeTab (+10 more)

### Community 14 - "stores/requests.ts"
Cohesion: 0.06
Nodes (35): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), emit, expandedEpisodesId, handleEpisodePruned(), props (+27 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "useRequestStep1"
Cohesion: 0.22
Nodes (12): useRequestStep1(), processFiles(), removeBatchItem(), parseTorrentFile(), decode(), decodeBuffer(), decodeString(), CleanedTorrentResult (+4 more)

### Community 18 - "episodesRepository.ts"
Cohesion: 0.05
Nodes (13): apps_api_src_db_index_newrequestepisode, apps_api_src_db_index_requestepisode, apps_api_src_db_index_requestepisodes, NewRequestEpisode, RequestEpisode, requestEpisodes, ConsumedEpisodeItem, EpisodesRepository (+5 more)

### Community 20 - "IMetadataService"
Cohesion: 0.06
Nodes (16): AnilistMigrationOptions, AnilistMigrationResult, BaseMetadataService, IMetadataService, MetadataApiError, MetadataCandidate, MetadataSearchOptions, MetadataService (+8 more)

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "api/src/db/schema.ts"
Cohesion: 0.09
Nodes (23): EpisodeStatus, FeatureFlag, Invite, InviteRole, MediaType, NewFeatureFlag, NewInvite, NewRequestCoRequester (+15 more)

### Community 24 - "useRequestData.ts"
Cohesion: 0.09
Nodes (35): step2QueryInputRef, { isItemWaitlisted }, props, FastTrackParsedData, WaitlistParsedData, BatchItem, CanonicalRequestSummary, MetadataCandidate (+27 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "watcher/src/db/schema.ts"
Cohesion: 0.13
Nodes (21): NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, waitlistCoRequesters, watchRequests, AutoDownloadSubmitterLogger, waitlistCrudRoutes(), renderStatusHtml() (+13 more)

### Community 27 - "AppDatabase"
Cohesion: 0.11
Nodes (19): AppDatabase, PollerLogger, IFileSystemService, HardlinkRecoveryOptions, HardlinkRecoveryResult, runHardlinkingRecovery(), markAllQueuedWaitingForSpace(), PollerLogger (+11 more)

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "api/src/utils/torrentTitleCleaner.ts"
Cohesion: 0.13
Nodes (11): extractTitleAndYear(), scoreRelease(), resolveSourceItem(), ResolveSourceItemParams, ResolveSourceItemResult, matchesTarget(), CleanedTorrentResult, cleanSeparators() (+3 more)

### Community 31 - "requests/index.ts"
Cohesion: 0.09
Nodes (28): adminGuard(), batchRoutes(), deletedRoutes(), episodesRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes() (+20 more)

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "AutoDownloadSubmitter"
Cohesion: 0.26
Nodes (3): AutoDownloadSubmitter, AutoDownloadSubmitterOptions, EpisodicTrackingService

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeTypes.ts"
Cohesion: 0.05
Nodes (42): extractShowNameFromPath(), stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry, calculateCurrentSeasonAndYear(), calculateNextSeasonAndYear() (+34 more)

### Community 39 - "WaitlistAddModal.vue"
Cohesion: 0.07
Nodes (29): availableReleasesCount, candidates, checkCandidateGuards(), closeModal(), downloadDirectly(), emit, hasSearched, initPrefilledModal() (+21 more)

### Community 40 - "ref_node_path"
Cohesion: 0.06
Nodes (36): FileSystemService, HardlinkedEpisodeInfo, ProcessAndHardlinkInput, ProcessAndHardlinkResult, ProcessAndHardlinkTorrentInput, ProcessAndHardlinkTorrentResult, buildLibraryPath(), BuildLibraryPathParams (+28 more)

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

### Community 46 - ".refreshPlayHistory"
Cohesion: 0.07
Nodes (26): matchesLibraryPath(), Consequences, Considered Options, Context, Decision, Per-Episode Consumption Tracking and Selective Torrent Pruning, API Routes (`apps/api/src/routes/requests/episodes.ts`), Cleanup Service (`apps/api/src/services/cleanup.ts`) (+18 more)

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 48 - "useAdminData"
Cohesion: 0.10
Nodes (13): useAdminCleanup(), confirmCleanItem(), handleRunScan(), loadDiskAndCandidates(), useAdminConfig(), checkJellyfinStatus(), handleRescanJellyfin(), formatDate() (+5 more)

### Community 49 - "api/src/services/prowlarr.ts"
Cohesion: 0.24
Nodes (11): formatBytes(), parseReleaseTitle(), ScorableCandidate, getPreferredIndexerMinSeeders(), isPreferredIndexer(), isQualifiedPreferred(), PreferredCandidateLike, buildSeriesSearchQueries() (+3 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "requestsRepository.ts"
Cohesion: 0.08
Nodes (50): apps_api_src_db_index_downloadrequest, executeBatchRequests(), executeCreateRequest(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo(), findMatchingCanonicalRequest(), getDedupLockKey() (+42 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.10
Nodes (18): activeTab, candidates, canSubmit, emit, errorMessage, handleClose(), handleConfirmReplace(), isPrivate (+10 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 56 - "serviceContainer.ts"
Cohesion: 0.05
Nodes (40): AppOptions, fastify, FastifyInstance, watchPartyRooms, CleanupCron, DownloadPoller, DownloadPollerOptions, TranscriptionCron (+32 more)

### Community 57 - "middleware/auth.ts"
Cohesion: 0.07
Nodes (40): invites, User, authMiddleware(), fastify, @fastify/jwt, FastifyJWT, FastifyRequest, JwtPayload (+32 more)

### Community 58 - "AnimeCard.vue"
Cohesion: 0.08
Nodes (21): displayTitle, isAiringOrFinished, { isItemWaitlisted }, posterUrl, props, statusBadgeClasses, statusLabel, subTitle (+13 more)

### Community 59 - "User Role"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Waitlist Entry"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 61 - "Leanback Client and Android TV Shell — Spec"
Cohesion: 0.14
Nodes (13): Architectural Shape, Authentication & Pairing (Quick Connect), Content Shelves & Media Actions, Further Notes, Implementation Decisions, Jellyfin Integration & Android TV Shell, Leanback Client and Android TV Shell — Spec, Out of Scope (+5 more)

### Community 62 - "UserInviteModal.vue"
Cohesion: 0.12
Nodes (10): errorMessage, hasCopied, invitedUsers, inviteUrl, isGenerating, isInvitesDisabledForUser, isLoading, MockApiError (+2 more)

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)"
Cohesion: 0.15
Nodes (12): Apple TV Authentication (Quick Connect), Architectural Shape, Content Discovery & Living-Room Actions, Draft Spec: Native Apple TV Companion App (`apps/tv-apple`), Further Notes, Implementation Decisions, Out of Scope, Problem Statement (+4 more)

### Community 66 - "requestFastTrack.ts"
Cohesion: 0.13
Nodes (24): buildCandidate(), enrichCandidateMetadata(), parseEpisodeAndGranularity(), parseFastTrack(), parseMediaType(), parseSeasonNumber(), parseWaitlistParams(), parseYear() (+16 more)

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

### Community 71 - "IndexerPrivacyCache"
Cohesion: 0.16
Nodes (4): apps_api_src_services_prowlarr_haspasskey, hasPasskey(), IndexerPrivacyCache, isKnownPrivateIndexer()

### Community 72 - "ref_drizzle_orm"
Cohesion: 0.14
Nodes (19): apps_api_src_db_index_downloadrequests, apps_api_src_db_index_invites, apps_api_src_db_index_newdownloadrequest, apps_api_src_db_index_requestcorequesters, apps_api_src_db_index_systemconfig, apps_api_src_db_index_users, downloadRequests, requestCoRequesters (+11 more)

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "IRequestsRepository"
Cohesion: 0.05
Nodes (17): DownloadRequest, NewDownloadRequest, RequestsRepository, DeletedRequestListItem, FindByCriteriaFilters, IRequestsRepository, RequestListItem, TransitionOptions (+9 more)

### Community 76 - "Waitlist Unconfirmed Release Dates and TBA Gating — Spec"
Cohesion: 0.12
Nodes (14): Adding Undated Media, Frontend State Management (`apps/web/src/views/WaitlistView.vue`), Further Notes, Implementation Decisions, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope, Problem Statement (+6 more)

### Community 77 - "WatchPartyLobbyModal.vue"
Cohesion: 0.08
Nodes (24): loading, parties, selectedParty, WatchParty, controlMode, emit, errorMessage, handleCreate() (+16 more)

### Community 78 - "Leanback Client and Android TV Shell"
Cohesion: 0.50
Nodes (3): Context, Decision, Leanback Client and Android TV Shell

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 82 - "QBittorrentService"
Cohesion: 0.22
Nodes (5): QBittorrentError, QBittorrentService, extractHashFromMagnet(), resolveTorrentSource(), RFC-4648

### Community 83 - "watcher/src/services/prowlarr.ts"
Cohesion: 0.09
Nodes (30): CAM_REGEX, formatBytes(), parseReleaseTitle(), ProwlarrSearchResult, ReleaseCandidate, ReleaseSource, Resolution, ScoreOptions (+22 more)

### Community 84 - "SeasonPackEpisodesDrawer.vue"
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

### Community 93 - "api/src/db/index.ts"
Cohesion: 0.09
Nodes (20): DEFAULT_FEATURE_FLAGS, __dirname, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase(), seedDefaultConfig(), seedDefaultFeatureFlags() (+12 more)

### Community 94 - "useRequestSubmit"
Cohesion: 0.14
Nodes (17): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep2(), confirmStep2Selection(), handleSearchMetadata(), selectCandidate() (+9 more)

### Community 99 - "useWaitlistMatching.ts"
Cohesion: 0.10
Nodes (23): isWaitlistedEffective, isCandidateWaitlisted, isWaitlistedEffective, isSelectedCandidateWaitlisted, available, { ensureWaitlistLoaded, isItemWaitlisted }, items, router (+15 more)

### Community 100 - "AnimeView.vue"
Cohesion: 0.09
Nodes (20): MediaSeason, useSeasonalAnime(), fetchArchive(), fetchSeasonalSections(), initFromRoute(), selectSeasonAndYear(), activeSeasonSelect, { ensureWaitlistLoaded, isItemWaitlisted } (+12 more)

### Community 101 - "ReleaseCandidate"
Cohesion: 0.13
Nodes (9): ReleaseSource, Resolution, VideoCodec, ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult, UpNextItem, MockProwlarrService (+1 more)

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.10
Nodes (19): Active Media Detection & Guardrails, API Routes, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Services, Deletion Tracking & Audit Trail, Further Notes, Implementation Decisions (+11 more)

### Community 115 - "JellyfinService"
Cohesion: 0.07
Nodes (22): JellyfinApiError, JellyfinService, 1. Database Schema (`apps/api`), 2. Jellyfin Service SyncPlay Extension (`apps/api`), 4. Watch Party API Routes (`apps/api/src/routes/watchParties.ts`), 5. Frontend Components & Views (`apps/web`), 6. Background Teardown Job (`apps/api/src/jobs/watchPartyCleanup.ts`), Discord Social Integration & Channel Routing (+14 more)

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

### Community 117 - "Unified Series Domain and TMDB Canonical Authority — Spec"
Cohesion: 0.13
Nodes (14): Architectural Shape, Automated Waitlist Monitoring & Up Next Tracking, Further Notes, Implementation Decisions, Legacy Data Migration & System Health, Out of Scope, Problem Statement, Prowlarr Dual-Query Release Discovery (+6 more)

### Community 118 - "ws.ts"
Cohesion: 0.29
Nodes (5): fastify, FastifyInstance, wsRoutes, fastify-plugin, ws

### Community 119 - "WatchPartyRepository"
Cohesion: 0.18
Nodes (3): NewWatchPartyRoom, WatchPartyRoom, WatchPartyRepository

### Community 120 - "WatchRequest"
Cohesion: 0.17
Nodes (13): WatchRequest, waitlistActionRoutes(), waitlistCreateRoutes(), waitlistRoutes(), CreateWaitlistBody, normalizeTitle(), executeEpisodicWaterfall(), WaterfallDeps (+5 more)

### Community 121 - "airDateFetcher.ts"
Cohesion: 0.18
Nodes (12): AirDateFetcherLogger, AniListMediaResponse, AniListNextAiringEpisode, AniListStartDate, fetchAirDate(), FetchAirDateParams, fetchAniListAirDate(), fetchTmdbAirDate() (+4 more)

### Community 122 - "WatcherPoller"
Cohesion: 0.08
Nodes (20): WatcherPoller, 1. Watcher Schema & Diagnostics (`apps/watcher`), 2. Watcher Advance Endpoint (`apps/watcher`), 3. Main API Request Integration (`apps/api`), 4. Frontend Decomposition & Waitlist UI (`apps/web`), 5. Fast-Track Request Step 3 Initialization (`apps/web`), Episodic Scope & Lifecycle, Further Notes (+12 more)

### Community 123 - "api/src/services/notifications.ts"
Cohesion: 0.09
Nodes (27): createWatchPartySchema, switchMediaSchema, watchPartyRoutes(), DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), NotificationContext (+19 more)

### Community 124 - "Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec"
Cohesion: 0.12
Nodes (16): 1. Oracle VPS Configuration (`167.126.3.136`), 2. Home Stack Modifications (`docker/docker-compose.yml`), 3. DNS Configuration (Cloudflare), Cloudflare Compliance & Security, Further Notes, Good Test Principles, Implementation Decisions, Infrastructure Cleanliness (+8 more)

### Community 125 - "transcriptionCron.ts"
Cohesion: 0.17
Nodes (7): getLocalTimeInTimezone(), isInsideWindow(), TranscriptionCronLogger, TranscriptionCronOptions, ISubgenService, SubgenService, SubgenServiceOptions

### Community 126 - "requestWaitlistIntegration.ts"
Cohesion: 0.60
Nodes (5): advanceWaitlistIfNeeded(), callWatcherEndpoint(), triggerNextSeasonWaitlist(), triggerWaitlistActions(), WaitlistTriggerParams

### Community 127 - "vue"
Cohesion: 0.11
Nodes (19): ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, AdminFeatureFlag, InviteItem, AdminUser, emit (+11 more)

### Community 128 - "IStreamerJellyfinService"
Cohesion: 0.20
Nodes (5): StreamerDatabase, EphemeralEvictionCronOptions, StreamPollerOptions, IStreamerJellyfinService, StreamerJellyfinService

### Community 129 - "Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec"
Cohesion: 0.13
Nodes (14): 1. Seeder & Resolution Diagnostics (`apps/watcher` & `apps/api`), Episodic Waterfall Automation, Further Notes, Good Test Principles, Implementation Decisions, Out of Scope, Preferred Indexer Health & Seeder Qualification, Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec (+6 more)

### Community 131 - "Unified Series Domain and TMDB Canonical Authority"
Cohesion: 0.33
Nodes (5): Consequences, Considered Options, Context, Decision, Unified Series Domain and TMDB Canonical Authority

### Community 132 - "ICleanupService"
Cohesion: 0.03
Nodes (14): CleanupCronLogger, CleanupCronOptions, ICleanupService, PruneEpisodeResult, MockCleanupService, MockCleanup, MockCleanupService, MockCleanupService (+6 more)

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 134 - "src/config.ts"
Cohesion: 0.25
Nodes (8): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, getConfig(), _resetConfigForTesting(), testConfigDefaults, validateConfig(), ValidateConfigOptions

### Community 135 - "ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject"
Cohesion: 0.40
Nodes (4): ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject, Consequences, Context, Decision

### Community 136 - "AdminFeaturesTab.vue"
Cohesion: 0.22
Nodes (10): automationFlags, discoveryFlags, downloadsFlags, emit, flagConfirmModal, HIGH_IMPACT_FLAGS, HIGH_IMPACT_MESSAGES, onConfirmDisable() (+2 more)

### Community 137 - "api/src/index.ts"
Cohesion: 0.18
Nodes (9): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+1 more)

### Community 138 - "IJellyfinService"
Cohesion: 0.07
Nodes (5): AnimeHistoryMatcher, HistoryMatcherOptions, CleanupService, EpisodicPruningService, IJellyfinService

### Community 139 - "AGENTS.md — Media Download Manager Instructions"
Cohesion: 0.50
Nodes (3): AGENTS.md — Media Download Manager Instructions, Architectural Rules, Issue Tracking & Task Management

### Community 141 - "library.ts"
Cohesion: 0.18
Nodes (11): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, libraryRoutes(), MediaArtwork, MediaRequester (+3 more)

### Community 143 - "Decision"
Cohesion: 0.20
Nodes (9): 1. Native Jellyfin SyncPlay Launch Bridge, 2. Eligible Media Scope, 3. In-Place Media Switching & Discord Party Timeline, 4. Context-Specific Discord Channel Routing, 5. Room Persistence & Automated Cleanup, ADR-0025: Watch Party SyncPlay Integration & In-Place Timeline Progression, Consequences, Context (+1 more)

### Community 144 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 147 - "watcher/src/index.ts"
Cohesion: 0.40
Nodes (4): app, __dirname, envPaths, __filename

### Community 149 - "TorrentManualInput.vue"
Cohesion: 0.60
Nodes (4): emit, fileInputRef, onClear(), onFileChange()

### Community 154 - "clearSelection"
Cohesion: 0.40
Nodes (6): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), handleLibraryEpisodePruned(), switchCategory()

### Community 156 - "ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure"
Cohesion: 0.40
Nodes (4): ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure, Consequences, Context, Decision

### Community 157 - "ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining"
Cohesion: 0.25
Nodes (7): 1. Preferred Indexer Qualification, 2. Resolution Gating & 720p Fallback, 3. Episodic Waterfall Chaining Engine, ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining, Consequences, Context, Decision

### Community 158 - "Recommended Implementation Order"
Cohesion: 0.40
Nodes (5): Dependency diagram, Recommended Implementation Order, Wave 1 — Foundation (no blockers; implement first), Wave 2 — Build on the foundation (start after Wave 1 blockers are complete), Wave 3 — Decomposition (start after 04 is complete)

### Community 159 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 160 - "streamer/src/db/index.ts"
Cohesion: 0.26
Nodes (8): getStreamerDatabasePath(), initStreamerDatabase(), apps_streamer_src_db_index_systemconfig, EphemeralStream, NewEphemeralStream, NewSystemConfig, SystemConfig, JellyfinSession

## Knowledge Gaps
- **1017 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+1012 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1481 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IRequestsRepository` connect `IRequestsRepository` to `ref_drizzle_orm`, `ref_node_path`, `IJellyfinService`, `Deleted Requests History and Redownload — Spec`, `requestsRepository.ts`, `IMetadataService`, `serviceContainer.ts`, `AppDatabase`, `transcriptionCron.ts`, `useRequestSubmit`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `WatcherPoller` connect `WatcherPoller` to `watcher/src/db/schema.ts`, `AutoDownloadSubmitter`, `watcher/src/app.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `vue` connect `vue` to `Navbar.vue`, `WaitlistCard.vue`, `AdminFeaturesTab.vue`, `LibraryView.vue`, `WaitlistView.vue`, `api.ts`, `DashboardView.vue`, `stores/requests.ts`, `RequestStep1Input.vue`, `DiscoveryFeed.vue`, `TorrentManualInput.vue`, `useRequestData.ts`, `web/package.json`, `PromotionModal.vue`, `WaitlistAddModal.vue`, `StreamProgressModal.vue`, `SubtitlePickerModal.vue`, `TorrentReplacementModal.vue`, `AnimeCard.vue`, `UserInviteModal.vue`, `WatchPartyLobbyModal.vue`, `SeasonPackEpisodesDrawer.vue`, `AnimeDetailModal.vue`, `useWaitlistMatching.ts`, `AnimeView.vue`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IJellyfinService` (e.g. with `Solution` and `2. Jellyfin Service SyncPlay Extension (`apps/api`)`) actually correct?**
  _`IJellyfinService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1017 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `IProwlarrService` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._