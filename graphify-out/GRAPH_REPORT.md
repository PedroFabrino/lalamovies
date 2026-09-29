# Graph Report - Plex-auto-download  (2026-09-29)

## Corpus Check
- 453 files · ~287,934 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .example 3, .css 1)

## Summary
- 2880 nodes · 7049 edges · 144 communities (114 shown, 30 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 254 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d0a7e4f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- streamer/src/app.ts
- Navbar.vue
- stores/requests.ts
- api/src/services/jellyfin.ts
- watcher/src/app.ts
- SymlinkManager
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- api.ts
- DashboardView.vue
- library.ts
- devDependencies
- dev-setup.mjs
- useRequestStep1
- IEpisodesRepository
- MockProwlarrService
- BaseMetadataService
- DiscoveryFeed.vue
- api/package.json
- ref_vitest
- useRequestData.ts
- Context Domain Model Document
- watcher/src/routes/waitlist.ts
- IJellyfinService
- web/package.json
- PromotionModal.vue
- RequestStep1Input.vue
- requests/index.ts
- subtitleInspection.ts
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- autoDownloadSubmitter.ts
- compilerOptions
- animeTypes.ts
- useWaitlistMatching.ts
- InviteView.vue
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- Per-Episode Consumption Tracking and Selective Torrent Pruning — Spec
- SubtitlePickerModal.vue
- useAdminData
- ref_fastify
- compilerOptions
- requestStateMachine.ts
- dependencies
- TorrentReplacementModal.vue
- scripts
- SeasonPackEpisodesDrawer.vue
- IQBittorrentService
- ref_drizzle_orm
- serviceContainer.ts
- User Role
- Waitlist Entry
- Leanback Client and Android TV Shell — Spec
- UserInviteModal.vue
- Media Download Manager Architecture Spec
- scripts
- Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)
- useRequestReleases
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- QBittorrentService
- Indexer
- Ephemeral Stream
- IRequestsRepository
- ReleaseGatingService
- AnimeTmdbConfirmSection.vue
- Leanback Client and Android TV Shell
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- upNext.ts
- watcherPoller.ts
- MockCleanupService
- AnimeDetailModal.vue
- Multi-Use Revocable User Invites — Spec
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- services/discovery.ts
- DummyQB
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- OpenSubtitlesService
- MockCleanup
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
- ws.ts
- useRequestSubmit
- releaseGating.ts
- WatcherPoller
- api/src/services/notifications.ts
- AnimeView.vue
- api/src/app.ts
- MockCleanupService
- vue
- IStreamerJellyfinService
- IndexerPrivacyCache
- Unified Series Domain and TMDB Canonical Authority
- CoRequesterPicker.vue
- AnimeCard.vue
- IProwlarrService
- api/src/index.ts
- AGENTS.md — Media Download Manager Instructions
- AdminFeaturesTab.vue
- github-issues.md
- clearSelection
- CleanupService
- isExpanded
- isSelected
- DebridService
- unarchive.ts
- IDebridService
- fileSystem.ts
- queuePromoter.ts
- streamer/src/routes/streams.ts
- streamer/src/db/index.ts

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 77 edges
2. `IRequestsRepository` - 76 edges
3. `DownloadRequest` - 66 edges
4. `IQBittorrentService` - 59 edges
5. `RequestsRepository` - 57 edges
6. `buildApp()` - 56 edges
7. `users` - 53 edges
8. `api` - 53 edges
9. `IFileSystemService` - 51 edges
10. `AppDatabase` - 50 edges

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

## Communities (144 total, 30 thin omitted)

### Community 1 - "streamer/src/app.ts"
Cohesion: 0.24
Nodes (7): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, DirectDownloader, IDirectDownloader, ref_node_stream

### Community 2 - "Navbar.vue"
Cohesion: 0.06
Nodes (29): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isUserInvitesEnabled, isWaitlistEnabled (+21 more)

### Community 3 - "stores/requests.ts"
Cohesion: 0.06
Nodes (34): emit, expandedEpisodesId, handleEpisodePruned(), props, emit, getProgressSpeedEta(), props, requestsStore (+26 more)

### Community 4 - "api/src/services/jellyfin.ts"
Cohesion: 0.07
Nodes (15): downloadRequests, SpaceCheckResult, JellyfinAuthResult, TorrentInfo, MockJellyfin, MockJellyfinService, MockQBittorrent, MockQBittorrentService (+7 more)

### Community 5 - "watcher/src/app.ts"
Cohesion: 0.21
Nodes (12): buildWatcherApp(), fastify, getWatcherDatabasePath(), initWatcherDatabase(), NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, waitlistCoRequesters (+4 more)

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
Cohesion: 0.04
Nodes (46): activeView, approvingEntryId, authStore, availableReleasesCount, candidates, checkCandidateGuards(), checkingEntryId, closeModal() (+38 more)

### Community 12 - "api.ts"
Cohesion: 0.08
Nodes (23): api, useAuthStore, User, mockAnime, mockPush, mockReplace, mountOptions, mockPush (+15 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.05
Nodes (33): authStore, emit, EphemeralStreamItem, fetchStreams(), handleEvict(), handlePromote(), handleWsMessage(), loading (+25 more)

### Community 14 - "library.ts"
Cohesion: 0.20
Nodes (11): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, libraryRoutes(), MediaArtwork, MediaRequester (+3 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "useRequestStep1"
Cohesion: 0.22
Nodes (12): useRequestStep1(), processFiles(), removeBatchItem(), parseTorrentFile(), decode(), decodeBuffer(), decodeString(), CleanedTorrentResult (+4 more)

### Community 18 - "IEpisodesRepository"
Cohesion: 0.08
Nodes (10): apps_api_src_db_index_newrequestepisode, apps_api_src_db_index_requestepisode, apps_api_src_db_index_requestepisodes, NewRequestEpisode, RequestEpisode, requestEpisodes, ConsumedEpisodeItem, EpisodesRepository (+2 more)

### Community 19 - "MockProwlarrService"
Cohesion: 0.10
Nodes (8): SearchReleasesOptions, SearchReleasesResult, buildSeriesSearchQueries(), hasCjkCharacters(), SeriesQueryOptions, SeriesQueryParam, MockProwlarrService, MockProwlarrService

### Community 20 - "BaseMetadataService"
Cohesion: 0.07
Nodes (11): BaseMetadataService, MetadataApiError, MetadataService, rankMetadataCandidates(), MockMetadata, MockMetadataService, MockRouteMetadataService, MockMetadata (+3 more)

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (27): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+19 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "ref_vitest"
Cohesion: 0.23
Nodes (6): DiskFileInfo, reconstructFilesFromDisk(), ref_node_fs, ref_node_os, ref_node_path, ref_vitest

### Community 24 - "useRequestData.ts"
Cohesion: 0.09
Nodes (37): step2QueryInputRef, { isItemWaitlisted }, props, FastTrackParsedData, parseFastTrack(), BatchItem, CanonicalRequestSummary, MetadataCandidate (+29 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "watcher/src/routes/waitlist.ts"
Cohesion: 0.21
Nodes (13): normalizeTitle(), renderStatusHtml(), waitlistRoutes(), deleteDiscordMessage(), generateMagicLinkToken(), ResendNotifier, sendWaitlistCancelNotification(), SendWaitlistCancelNotificationOptions (+5 more)

### Community 27 - "IJellyfinService"
Cohesion: 0.06
Nodes (12): IJellyfinService, MetadataCandidate, MetadataSearchOptions, apps_api_src_services_prowlarr_iprowlarrservice, apps_api_src_services_prowlarr_releasecandidate, apps_api_src_services_prowlarr_searchreleasesoptions, apps_api_src_services_prowlarr_searchreleasesresult, DummyJellyfinService (+4 more)

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 31 - "requests/index.ts"
Cohesion: 0.11
Nodes (24): batchRoutes(), createRoutes(), deletedRoutes(), episodesRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes() (+16 more)

### Community 32 - "subtitleInspection.ts"
Cohesion: 0.16
Nodes (9): execFileAsync, FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionService, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, ref_node_child_process (+1 more)

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "autoDownloadSubmitter.ts"
Cohesion: 0.17
Nodes (12): FastifyInstance, WatcherAppOptions, WatcherDatabase, WatchRequest, AutoDownloadSubmitter, AutoDownloadSubmitterLogger, AutoDownloadSubmitterOptions, CreateWaitlistBody (+4 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeTypes.ts"
Cohesion: 0.06
Nodes (44): AnimeHistoryMatcher, extractShowNameFromPath(), HistoryMatcherOptions, stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry (+36 more)

### Community 39 - "useWaitlistMatching.ts"
Cohesion: 0.10
Nodes (22): isWaitlistedEffective, isWaitlistedEffective, isSelectedCandidateWaitlisted, available, { ensureWaitlistLoaded, isItemWaitlisted }, items, router, selectItem() (+14 more)

### Community 40 - "InviteView.vue"
Cohesion: 0.06
Nodes (28): ApiError, apiRequest(), app, router, routes, pinia, apps_web_src_style, authStore (+20 more)

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

### Community 46 - "Per-Episode Consumption Tracking and Selective Torrent Pruning — Spec"
Cohesion: 0.10
Nodes (20): API Routes (`apps/api/src/routes/requests/episodes.ts`), Cleanup Service (`apps/api/src/services/cleanup.ts`), Database Schema (`apps/api/src/db/schema.ts`), Episodic Storage Reclamation, Existing Downloads Backfill, File Processing & Hardlinking (`apps/api/src/services/fileSystem.ts`), Frontend UI (`apps/web/src/components/requests/SeasonPackEpisodesDrawer.vue`), Further Notes (+12 more)

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 48 - "useAdminData"
Cohesion: 0.10
Nodes (13): useAdminCleanup(), confirmCleanItem(), handleRunScan(), loadDiskAndCandidates(), useAdminConfig(), checkJellyfinStatus(), handleRescanJellyfin(), formatDate() (+5 more)

### Community 49 - "ref_fastify"
Cohesion: 0.05
Nodes (61): EpisodeStatus, FeatureFlag, featureFlags, Invite, InviteRole, invites, MediaType, NewFeatureFlag (+53 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "requestStateMachine.ts"
Cohesion: 0.10
Nodes (42): executeBatchRequests(), executeCreateRequest(), triggerNextSeasonWaitlist(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo(), findMatchingCanonicalRequest(), getDedupLockKey() (+34 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.09
Nodes (22): emit, fileInputRef, onClear(), onFileChange(), activeTab, candidates, canSubmit, emit (+14 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 55 - "SeasonPackEpisodesDrawer.vue"
Cohesion: 0.14
Nodes (11): canManage, confirmPruneEpisode, emit, episodes, error, executePrune(), loading, props (+3 more)

### Community 56 - "IQBittorrentService"
Cohesion: 0.09
Nodes (26): AppDatabase, DownloadPoller, DownloadPollerOptions, PollerLogger, UnarchiveDaemon, UnarchiveDaemonOptions, CleanupServiceOptions, IFileSystemService (+18 more)

### Community 57 - "ref_drizzle_orm"
Cohesion: 0.11
Nodes (30): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase(), apps_api_src_db_index_invites (+22 more)

### Community 58 - "serviceContainer.ts"
Cohesion: 0.05
Nodes (27): AppOptions, fastify, FastifyInstance, CleanupCron, CleanupCronLogger, CleanupCronOptions, getLocalTimeInTimezone(), isInsideWindow() (+19 more)

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

### Community 72 - "QBittorrentService"
Cohesion: 0.17
Nodes (8): QBittorrentError, QBittorrentService, BencodeValue, ParsedTorrent, TorrentInfoDict, extractHashFromMagnet(), resolveTorrentSource(), RFC-4648

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "IRequestsRepository"
Cohesion: 0.05
Nodes (19): apps_api_src_db_index_downloadrequest, apps_api_src_db_index_newdownloadrequest, DownloadRequest, NewDownloadRequest, PENDING_STATUSES, RequestsRepository, DeletedRequestListItem, FindByCriteriaFilters (+11 more)

### Community 76 - "ReleaseGatingService"
Cohesion: 0.12
Nodes (14): ReleaseGatingService, Adding Undated Media, Further Notes, Implementation Decisions, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope, Problem Statement (+6 more)

### Community 77 - "AnimeTmdbConfirmSection.vue"
Cohesion: 0.33
Nodes (6): emit, handleManualSearch(), isManualSearchOpen, manualSearchQuery, props, selectedCandidate

### Community 78 - "Leanback Client and Android TV Shell"
Cohesion: 0.50
Nodes (3): Context, Decision, Leanback Client and Android TV Shell

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 82 - "upNext.ts"
Cohesion: 0.10
Nodes (14): AnilistMigrationOptions, AnilistMigrationResult, IMetadataService, apps_api_src_services_prowlarr_resolution, groupShowRequests(), find(), union(), isCandidateAlreadyRequested() (+6 more)

### Community 83 - "watcherPoller.ts"
Cohesion: 0.08
Nodes (27): WatcherPollerLogger, WatcherPollerOptions, CAM_REGEX, formatBytes(), parseReleaseTitle(), ReleaseCandidate, ReleaseSource, Resolution (+19 more)

### Community 86 - "AnimeDetailModal.vue"
Cohesion: 0.07
Nodes (35): applyResolveResult(), bannerUrl, cleanDescription, confirmWaitlistSubmission(), displayTitle, emit, handleClose(), handleConfirmAction() (+27 more)

### Community 87 - "Multi-Use Revocable User Invites — Spec"
Cohesion: 0.12
Nodes (16): Administrative Visibility & Moderation, Backend Endpoints (`apps/api/src/routes/invites.ts`), Further Notes, Implementation Decisions, Multi-Use Revocable User Invites — Spec, Out of Scope, Problem Statement, Role Safety & Security (+8 more)

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "services/discovery.ts"
Cohesion: 0.15
Nodes (14): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryServiceOptions, extractTitleAndYear(), apps_api_src_services_prowlarr_scoreoptions, resolveSourceItem(), ResolveSourceItemParams (+6 more)

### Community 99 - "OpenSubtitlesService"
Cohesion: 0.29
Nodes (4): OpenSubtitlesOptions, OpenSubtitlesService, SearchSubtitlesParams, SubtitleSearchResult

### Community 100 - "MockCleanup"
Cohesion: 0.11
Nodes (3): MockCleanup, MockCleanupService, MockCleanupService

### Community 101 - "api/src/services/prowlarr.ts"
Cohesion: 0.29
Nodes (11): formatBytes(), parseReleaseTitle(), ReleaseSource, Resolution, ScorableCandidate, scoreRelease(), VideoCodec, ReleaseCandidate (+3 more)

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.10
Nodes (19): Active Media Detection & Guardrails, API Routes, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Services, Deletion Tracking & Audit Trail, Further Notes, Implementation Decisions (+11 more)

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

### Community 117 - "Unified Series Domain and TMDB Canonical Authority — Spec"
Cohesion: 0.13
Nodes (14): Architectural Shape, Automated Waitlist Monitoring & Up Next Tracking, Further Notes, Implementation Decisions, Legacy Data Migration & System Health, Out of Scope, Problem Statement, Prowlarr Dual-Query Release Discovery (+6 more)

### Community 118 - "ws.ts"
Cohesion: 0.29
Nodes (5): fastify, FastifyInstance, wsRoutes, fastify-plugin, ws

### Community 119 - "useRequestSubmit"
Cohesion: 0.15
Nodes (18): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep2(), confirmStep2Selection(), handleSearchMetadata(), selectCandidate() (+10 more)

### Community 121 - "releaseGating.ts"
Cohesion: 0.15
Nodes (15): AirDateFetcherLogger, AniListMediaResponse, AniListNextAiringEpisode, AniListStartDate, fetchAirDate(), FetchAirDateParams, fetchAniListAirDate(), fetchTmdbAirDate() (+7 more)

### Community 122 - "WatcherPoller"
Cohesion: 0.31
Nodes (4): WatcherPoller, Single Highest Seam: Watcher HTTP API Integration Tests, Testing Decisions, Web Component Unit Tests

### Community 123 - "api/src/services/notifications.ts"
Cohesion: 0.18
Nodes (9): DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), NotificationEvent, NotificationPayload, NotificationServiceOptions, ResendNotifier (+1 more)

### Community 124 - "AnimeView.vue"
Cohesion: 0.10
Nodes (19): useSeasonalAnime(), fetchArchive(), fetchSeasonalSections(), initFromRoute(), selectSeasonAndYear(), activeSeasonSelect, { ensureWaitlistLoaded, isItemWaitlisted }, featureFlags (+11 more)

### Community 125 - "api/src/app.ts"
Cohesion: 0.09
Nodes (15): buildApp(), AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, getConfig(), _resetConfigForTesting(), testConfigDefaults, validateConfig() (+7 more)

### Community 127 - "vue"
Cohesion: 0.12
Nodes (17): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData (+9 more)

### Community 128 - "IStreamerJellyfinService"
Cohesion: 0.20
Nodes (5): StreamerDatabase, EphemeralEvictionCronOptions, StreamPollerOptions, IStreamerJellyfinService, StreamerJellyfinService

### Community 130 - "IndexerPrivacyCache"
Cohesion: 0.16
Nodes (5): forwardToStreamer(), apps_api_src_services_prowlarr_haspasskey, hasPasskey(), IndexerPrivacyCache, isKnownPrivateIndexer()

### Community 131 - "Unified Series Domain and TMDB Canonical Authority"
Cohesion: 0.33
Nodes (5): Consequences, Considered Options, Context, Decision, Unified Series Domain and TMDB Canonical Authority

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 134 - "AnimeCard.vue"
Cohesion: 0.08
Nodes (23): displayTitle, isAiringOrFinished, { isItemWaitlisted }, posterUrl, props, statusBadgeClasses, statusLabel, subTitle (+15 more)

### Community 136 - "IProwlarrService"
Cohesion: 0.13
Nodes (3): ScoreOptions, ProwlarrService, IProwlarrService

### Community 137 - "api/src/index.ts"
Cohesion: 0.13
Nodes (14): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+6 more)

### Community 139 - "AGENTS.md — Media Download Manager Instructions"
Cohesion: 0.50
Nodes (3): AGENTS.md — Media Download Manager Instructions, Architectural Rules, Issue Tracking & Task Management

### Community 141 - "AdminFeaturesTab.vue"
Cohesion: 0.22
Nodes (10): automationFlags, discoveryFlags, downloadsFlags, emit, flagConfirmModal, HIGH_IMPACT_FLAGS, HIGH_IMPACT_MESSAGES, onConfirmDisable() (+2 more)

### Community 147 - "clearSelection"
Cohesion: 0.40
Nodes (6): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), handleLibraryEpisodePruned(), switchCategory()

### Community 149 - "CleanupService"
Cohesion: 0.08
Nodes (17): CleanupService, matchesLibraryPath(), Consequences, Considered Options, Context, Decision, Per-Episode Consumption Tracking and Selective Torrent Pruning, Dependency diagram (+9 more)

### Community 154 - "unarchive.ts"
Cohesion: 0.11
Nodes (12): __dirname, envPaths, __filename, main(), CommandExecFn, CommandExecResult, ExtractAndDeployMediaOptions, ExtractAndDeployMediaRequest (+4 more)

### Community 157 - "fileSystem.ts"
Cohesion: 0.09
Nodes (14): FileSystemService, HardlinkedEpisodeInfo, ProcessAndHardlinkInput, ProcessAndHardlinkResult, ProcessAndHardlinkTorrentInput, ProcessAndHardlinkTorrentResult, buildLibraryPath(), BuildLibraryPathParams (+6 more)

### Community 158 - "queuePromoter.ts"
Cohesion: 0.18
Nodes (8): markAllQueuedWaitingForSpace(), PollerLogger, promoteQueuedRequests(), resolvePollerNotificationRecipients(), ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject, Consequences, Context, Decision

### Community 159 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 160 - "streamer/src/db/index.ts"
Cohesion: 0.19
Nodes (11): apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), apps_streamer_src_db_index_systemconfig, EphemeralStream, ephemeralStreams, NewEphemeralStream, NewSystemConfig (+3 more)

## Knowledge Gaps
- **915 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+910 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1352 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AnimeSeasonService` connect `animeTypes.ts` to `serviceContainer.ts`, `IJellyfinService`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `IJellyfinService` connect `IJellyfinService` to `api/src/services/jellyfin.ts`, `animeTypes.ts`, `IRequestsRepository`, `ref_fastify`, `JellyfinService`, `requestStateMachine.ts`, `CleanupService`, `ref_vitest`, `IQBittorrentService`, `ref_drizzle_orm`, `serviceContainer.ts`, `api/src/app.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `IRequestsRepository` connect `IRequestsRepository` to `animeTypes.ts`, `upNext.ts`, `requestStateMachine.ts`, `Deleted Requests History and Redownload — Spec`, `CleanupService`, `useRequestSubmit`, `IQBittorrentService`, `ref_drizzle_orm`, `serviceContainer.ts`, `queuePromoter.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _915 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Navbar.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06463414634146342 - nodes in this community are weakly interconnected._
- **Should `stores/requests.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.061367621274108705 - nodes in this community are weakly interconnected._