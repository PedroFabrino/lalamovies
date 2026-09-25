# Graph Report - Plex-auto-download  (2026-09-25)

## Corpus Check
- 410 files · ~268,899 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .example 3, .css 1)

## Summary
- 2686 nodes · 6504 edges · 146 communities (109 shown, 37 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 233 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8c56d62f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requestsRepository.ts
- streamer/src/app.ts
- Navbar.vue
- stores/requests.ts
- ICleanupService
- WatcherDatabase
- MockJellyfinService
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- api.ts
- DashboardView.vue
- ref_node_path
- devDependencies
- subtitleInspection.ts
- useRequestStep1
- IEpisodesRepository
- api/src/services/prowlarr.ts
- metadata.ts
- DiscoveryFeed.vue
- api/package.json
- AnimeCard.vue
- useRequestData.ts
- Context Domain Model Document
- watcher/src/routes/waitlist.ts
- discovery.test.ts
- web/package.json
- PromotionModal.vue
- watcher/src/app.ts
- requests/index.ts
- watcher/src/db/schema.ts
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
- CleanupService
- SubtitlePickerModal.vue
- router/index.ts
- ref_vitest
- compilerOptions
- vue
- dependencies
- TorrentReplacementModal.vue
- scripts
- upNext.ts
- IJellyfinService
- api/src/db/index.ts
- InviteView.vue
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
- SeasonPackEpisodesDrawer.vue
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
- watcher/src/services/prowlarr.ts
- MockCleanup
- MockCleanupService
- serviceContainer.ts
- Multi-Use Revocable User Invites — Spec
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- extractEpisodeInfo
- IMetadataService
- DummyQB
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
- Deleted Requests History and Redownload — Spec
- JellyfinService
- Torrent Replacement for Underway Requests
- UnarchiveService
- ws.ts
- useRequestSubmit
- formatStatusText
- airDateFetcher.ts
- ref_drizzle_orm
- api/src/services/notifications.ts
- Waitlist Unconfirmed Release Dates and TBA Gating — Spec
- api/src/routes/waitlist.ts
- library.ts
- watcherPoller.ts
- watcher/src/index.ts
- DummyJellyfinService
- MockMetadata
- AdminFeaturesTab.vue
- MetadataCandidate
- CoRequesterPicker.vue
- useSeasonalAnime.ts
- MockCleanup
- clearSelection
- MockCleanup
- MockMetadata
- OpenSubtitlesService
- MockMetadataService
- DummyJellyfinService
- DummyJellyfin
- isExpanded
- isSelected
- AnimeTmdbConfirmSection.vue

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 75 edges
2. `IRequestsRepository` - 71 edges
3. `DownloadRequest` - 64 edges
4. `IQBittorrentService` - 57 edges
5. `IFileSystemService` - 51 edges
6. `RequestsRepository` - 51 edges
7. `buildApp()` - 50 edges
8. `AppDatabase` - 50 edges
9. `Context Domain Model Document` - 49 edges
10. `api` - 48 edges

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

## Communities (146 total, 37 thin omitted)

### Community 0 - "requestsRepository.ts"
Cohesion: 0.08
Nodes (52): executeBatchRequests(), executeCreateRequest(), triggerNextSeasonWaitlist(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo(), findMatchingCanonicalRequest(), getDedupLockKey() (+44 more)

### Community 1 - "streamer/src/app.ts"
Cohesion: 0.05
Nodes (33): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), StreamerDatabase (+25 more)

### Community 2 - "Navbar.vue"
Cohesion: 0.06
Nodes (32): DiscoveryItem, authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isWaitlistEnabled (+24 more)

### Community 3 - "stores/requests.ts"
Cohesion: 0.06
Nodes (34): emit, expandedEpisodesId, handleEpisodePruned(), props, emit, getProgressSpeedEta(), props, requestsStore (+26 more)

### Community 4 - "ICleanupService"
Cohesion: 0.11
Nodes (5): CleanupCron, CleanupCronLogger, CleanupCronOptions, ICleanupService, PruneEpisodeResult

### Community 5 - "WatcherDatabase"
Cohesion: 0.12
Nodes (15): FastifyInstance, WatcherAppOptions, WatcherDatabase, AutoDownloadSubmitter, AutoDownloadSubmitterOptions, WatcherPoller, WatcherPollerOptions, EpisodicTrackingOptions (+7 more)

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
Cohesion: 0.05
Nodes (34): useWaitlistStore, WaitlistEntry, WaitlistStatus, activeView, approvingEntryId, authStore, availableReleasesCount, candidates (+26 more)

### Community 12 - "api.ts"
Cohesion: 0.07
Nodes (26): available, items, router, UpNextItem, UpNextResponse, api, apiRequest(), useAuthStore (+18 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.07
Nodes (20): DiskInfo, activeStreamsShelfRef, activeTab, authStore, discoveryFeedRef, diskInfo, featureFlags, isDeleting (+12 more)

### Community 14 - "ref_node_path"
Cohesion: 0.07
Nodes (36): apps_api_src_db_index_downloadrequests, __dirname, envPaths, __filename, main(), FileSystemService, HardlinkedEpisodeInfo, ProcessAndHardlinkInput (+28 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "subtitleInspection.ts"
Cohesion: 0.09
Nodes (25): execFileAsync, FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionService, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, ref_node_child_process (+17 more)

### Community 17 - "useRequestStep1"
Cohesion: 0.22
Nodes (12): useRequestStep1(), processFiles(), removeBatchItem(), parseTorrentFile(), decode(), decodeBuffer(), decodeString(), CleanedTorrentResult (+4 more)

### Community 18 - "IEpisodesRepository"
Cohesion: 0.06
Nodes (11): apps_api_src_db_index_downloadrequest, apps_api_src_db_index_newrequestepisode, apps_api_src_db_index_requestepisode, apps_api_src_db_index_requestepisodes, NewRequestEpisode, RequestEpisode, requestEpisodes, ConsumedEpisodeItem (+3 more)

### Community 19 - "api/src/services/prowlarr.ts"
Cohesion: 0.13
Nodes (14): isFeatureEnabled(), forwardToStreamer(), streamsAuth(), streamsRoutes(), formatBytes(), hasCjkCharacters(), hasPasskey(), isKnownPrivateIndexer() (+6 more)

### Community 20 - "metadata.ts"
Cohesion: 0.14
Nodes (11): BaseMetadataService, MetadataApiError, MetadataSearchOptions, MetadataService, rankMetadataCandidates(), CleanedTorrentResult, cleanSeparators(), cleanTorrentTitle() (+3 more)

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.10
Nodes (25): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+17 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "AnimeCard.vue"
Cohesion: 0.25
Nodes (7): displayTitle, isAiringOrFinished, posterUrl, props, statusBadgeClasses, statusLabel, subTitle

### Community 24 - "useRequestData.ts"
Cohesion: 0.09
Nodes (37): step2QueryInputRef, FastTrackParsedData, parseFastTrack(), BatchItem, CanonicalRequestSummary, MetadataCandidate, apps_web_src_composables_requesttypes_releasecandidate, apps_web_src_composables_userequestdata_batchitem (+29 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "watcher/src/routes/waitlist.ts"
Cohesion: 0.22
Nodes (12): renderStatusHtml(), waitlistRoutes(), deleteDiscordMessage(), generateMagicLinkToken(), ResendNotifier, sendWaitlistCancelNotification(), SendWaitlistCancelNotificationOptions, SendWaitlistErrorNotificationOptions (+4 more)

### Community 27 - "discovery.test.ts"
Cohesion: 0.11
Nodes (7): ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult, DummyJellyfinService, MockProwlarrService, TorrentParsed, MockProwlarrService

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "watcher/src/app.ts"
Cohesion: 0.28
Nodes (6): buildWatcherApp(), fastify, getWatcherDatabasePath(), initWatcherDatabase(), ReleaseGatingLogger, ReleaseGatingService

### Community 31 - "requests/index.ts"
Cohesion: 0.11
Nodes (25): requireFeature(), batchRoutes(), createRoutes(), deletedRoutes(), episodesRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes() (+17 more)

### Community 32 - "watcher/src/db/schema.ts"
Cohesion: 0.20
Nodes (9): NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, waitlistCoRequesters, WatchRequest, watchRequests, AutoDownloadSubmitterLogger, CreateWaitlistBody (+1 more)

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
Cohesion: 0.18
Nodes (10): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+2 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeSeasonal.test.ts"
Cohesion: 0.06
Nodes (43): AnimeHistoryMatcher, extractShowNameFromPath(), stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry, calculateCurrentSeasonAndYear() (+35 more)

### Community 39 - "AnimeDetailModal.vue"
Cohesion: 0.09
Nodes (27): bannerUrl, cleanDescription, confirmWaitlistSubmission(), displayTitle, emit, handleClose(), isAiringOrFinished, isResolvingTmdb (+19 more)

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

### Community 46 - "CleanupService"
Cohesion: 0.06
Nodes (32): CleanupService, matchesLibraryPath(), Consequences, Considered Options, Context, Decision, Per-Episode Consumption Tracking and Selective Torrent Pruning, Dependency diagram (+24 more)

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 48 - "router/index.ts"
Cohesion: 0.13
Nodes (11): app, router, routes, pinia, apps_web_src_style, authStore, errorMessage, isLoading (+3 more)

### Community 49 - "ref_vitest"
Cohesion: 0.07
Nodes (44): buildApp(), apps_api_src_db_index_featureflags, EpisodeStatus, FeatureFlag, featureFlags, Invite, InviteRole, invites (+36 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "vue"
Cohesion: 0.10
Nodes (23): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData (+15 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.09
Nodes (22): emit, fileInputRef, onClear(), onFileChange(), activeTab, candidates, canSubmit, emit (+14 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 55 - "upNext.ts"
Cohesion: 0.25
Nodes (8): groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), normalizeShowTitle(), UpNextResult, UpNextService, UpNextServiceOptions

### Community 56 - "IJellyfinService"
Cohesion: 0.06
Nodes (38): AppOptions, fastify, FastifyInstance, AppDatabase, DownloadPoller, DownloadPollerOptions, PollerLogger, UnarchiveDaemon (+30 more)

### Community 57 - "api/src/db/index.ts"
Cohesion: 0.12
Nodes (16): DEFAULT_FEATURE_FLAGS, __dirname, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase(), apps_api_src_db_index_newdownloadrequest, seedDefaultConfig() (+8 more)

### Community 58 - "InviteView.vue"
Cohesion: 0.13
Nodes (13): authStore, confirmPassword, featureFlags, isCheckingToken, isSubmitting, isTokenValid, password, route (+5 more)

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

### Community 71 - "SeasonPackEpisodesDrawer.vue"
Cohesion: 0.14
Nodes (11): canManage, confirmPruneEpisode, emit, episodes, error, executePrune(), loading, props (+3 more)

### Community 72 - "QBittorrentService"
Cohesion: 0.22
Nodes (5): QBittorrentError, QBittorrentService, extractHashFromMagnet(), resolveTorrentSource(), RFC-4648

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "IRequestsRepository"
Cohesion: 0.05
Nodes (15): DownloadRequest, RequestsRepository, DeletedRequestListItem, IRequestsRepository, RequestListItem, InvalidTransitionError, RequestStateMachine, MockCleanupService (+7 more)

### Community 76 - "config.ts"
Cohesion: 0.25
Nodes (8): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, getConfig(), _resetConfigForTesting(), testConfigDefaults, validateConfig(), ValidateConfigOptions

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

### Community 83 - "watcher/src/services/prowlarr.ts"
Cohesion: 0.13
Nodes (19): CAM_REGEX, formatBytes(), parseReleaseTitle(), ReleaseCandidate, ReleaseSource, Resolution, ScoreOptions, scoreRelease() (+11 more)

### Community 86 - "serviceContainer.ts"
Cohesion: 0.08
Nodes (15): getLocalTimeInTimezone(), isInsideWindow(), TranscriptionCron, TranscriptionCronLogger, TranscriptionCronOptions, DiscoveryService, IDiscoveryService, EpisodicPruningService (+7 more)

### Community 87 - "Multi-Use Revocable User Invites — Spec"
Cohesion: 0.12
Nodes (16): Administrative Visibility & Moderation, Backend Endpoints (`apps/api/src/routes/invites.ts`), Further Notes, Implementation Decisions, Multi-Use Revocable User Invites — Spec, Out of Scope, Problem Statement, Role Safety & Security (+8 more)

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "extractEpisodeInfo"
Cohesion: 0.17
Nodes (6): extractTitleAndYear(), resolveSourceItem(), ResolveSourceItemParams, ResolveSourceItemResult, matchesTarget(), extractEpisodeInfo()

### Community 94 - "IMetadataService"
Cohesion: 0.13
Nodes (8): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryServiceOptions, IMetadataService, Resolution, ScoreOptions, UpNextItem

### Community 99 - "loadEntries"
Cohesion: 0.50
Nodes (4): handleCheckAll(), handleCheckEntry(), loadEntries(), setView()

### Community 100 - "checkCandidateGuards"
Cohesion: 0.67
Nodes (3): checkCandidateGuards(), initPrefilledModal(), selectCandidate()

### Community 101 - "closeModal"
Cohesion: 0.67
Nodes (3): closeModal(), downloadDirectly(), submitWaitlistEntry()

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.10
Nodes (19): Active Media Detection & Guardrails, API Routes, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Services, Deletion Tracking & Audit Trail, Further Notes, Implementation Decisions (+11 more)

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

### Community 121 - "airDateFetcher.ts"
Cohesion: 0.18
Nodes (12): AirDateFetcherLogger, AniListMediaResponse, AniListNextAiringEpisode, AniListStartDate, fetchAirDate(), FetchAirDateParams, fetchAniListAirDate(), fetchTmdbAirDate() (+4 more)

### Community 122 - "ref_drizzle_orm"
Cohesion: 0.16
Nodes (15): apps_api_src_db_index_invites, apps_api_src_db_index_requestcorequesters, apps_api_src_db_index_systemconfig, apps_api_src_db_index_users, downloadRequests, requestCoRequesters, SystemConfig, SpaceCheckResult (+7 more)

### Community 123 - "api/src/services/notifications.ts"
Cohesion: 0.18
Nodes (9): DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), NotificationEvent, NotificationPayload, NotificationServiceOptions, ResendNotifier (+1 more)

### Community 124 - "Waitlist Unconfirmed Release Dates and TBA Gating — Spec"
Cohesion: 0.14
Nodes (14): Adding Undated Media, Frontend State Management (`apps/web/src/views/WaitlistView.vue`), Further Notes, Implementation Decisions, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope, Problem Statement (+6 more)

### Community 125 - "api/src/routes/waitlist.ts"
Cohesion: 0.24
Nodes (9): JwtPayload, forwardToWatcher(), waitlistAuth(), WaitlistEntry, WaitlistRequestBody, WaitlistResponse, waitlistRoutes(), parseAnimeTitleAndSeason() (+1 more)

### Community 126 - "library.ts"
Cohesion: 0.20
Nodes (11): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, libraryRoutes(), MediaArtwork, MediaRequester (+3 more)

### Community 127 - "watcherPoller.ts"
Cohesion: 0.38
Nodes (4): WatcherPollerLogger, computeGraceHours(), ComputeGraceHoursOptions, ref_node_cron

### Community 128 - "watcher/src/index.ts"
Cohesion: 0.40
Nodes (4): app, __dirname, envPaths, __filename

### Community 131 - "AdminFeaturesTab.vue"
Cohesion: 0.22
Nodes (10): automationFlags, discoveryFlags, downloadsFlags, emit, flagConfirmModal, HIGH_IMPACT_FLAGS, HIGH_IMPACT_MESSAGES, onConfirmDisable() (+2 more)

### Community 132 - "MetadataCandidate"
Cohesion: 0.28
Nodes (3): MetadataCandidate, MockMetadataService, MockMetadataService

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 134 - "useSeasonalAnime.ts"
Cohesion: 0.13
Nodes (13): canScrollLeft, canScrollRight, carouselRef, isCollapsed, props, isCollapsed, props, resolvedStorageKey (+5 more)

### Community 136 - "clearSelection"
Cohesion: 0.40
Nodes (6): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), handleLibraryEpisodePruned(), switchCategory()

### Community 139 - "OpenSubtitlesService"
Cohesion: 0.29
Nodes (4): OpenSubtitlesOptions, OpenSubtitlesService, SearchSubtitlesParams, SubtitleSearchResult

### Community 145 - "AnimeTmdbConfirmSection.vue"
Cohesion: 0.50
Nodes (3): MetadataCandidate, props, selectedCandidate

## Knowledge Gaps
- **858 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+853 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1265 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IRequestsRepository` connect `IRequestsRepository` to `requestsRepository.ts`, `animeSeasonal.test.ts`, `CleanupService`, `IEpisodesRepository`, `Deleted Requests History and Redownload — Spec`, `upNext.ts`, `serviceContainer.ts`, `useRequestSubmit`, `IJellyfinService`, `api/src/db/index.ts`, `ref_drizzle_orm`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `CleanupService` connect `CleanupService` to `ICleanupService`, `IRequestsRepository`, `IEpisodesRepository`, `serviceContainer.ts`, `IJellyfinService`, `ref_drizzle_orm`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `IJellyfinService` connect `IJellyfinService` to `requestsRepository.ts`, `DummyJellyfinService`, `animeSeasonal.test.ts`, `MockJellyfinService`, `IRequestsRepository`, `DummyJellyfinService`, `CleanupService`, `ref_node_path`, `DummyJellyfin`, `ref_vitest`, `IEpisodesRepository`, `JellyfinService`, `metadata.ts`, `serviceContainer.ts`, `api/src/db/index.ts`, `ref_drizzle_orm`, `discovery.test.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _858 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requestsRepository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08105263157894736 - nodes in this community are weakly interconnected._
- **Should `streamer/src/app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05133161512027491 - nodes in this community are weakly interconnected._