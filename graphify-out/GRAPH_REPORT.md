# Graph Report - Plex-auto-download  (2026-09-27)

## Corpus Check
- 444 files · ~284,421 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .example 3, .css 1)

## Summary
- 2828 nodes · 6850 edges · 152 communities (113 shown, 39 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 248 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5237e980`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requestCreate.ts
- streamer/src/db/index.ts
- Navbar.vue
- formatters.ts
- ref_vitest
- watcher/src/db/schema.ts
- search.ts
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- api.ts
- DashboardView.vue
- UnarchiveService
- devDependencies
- dev-setup.mjs
- useRequestStep1.ts
- IEpisodesRepository
- api/src/services/prowlarr.ts
- BaseMetadataService
- DiscoveryFeed.vue
- api/package.json
- ref_node_path
- useRequestData.ts
- Context Domain Model Document
- watcher/src/routes/waitlist.ts
- DummyJellyfinService
- web/package.json
- PromotionModal.vue
- vue
- requests/index.ts
- IDebridService
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- watcher/src/app.ts
- compilerOptions
- animeTypes.ts
- AnimeDetailModal.vue
- Seasonal Anime Discovery & Waitlist Bridging — Spec
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- .refreshPlayHistory
- SubtitlePickerModal.vue
- AdminView.vue
- ref_fastify
- compilerOptions
- requestServiceTypes.ts
- dependencies
- TorrentReplacementModal.vue
- scripts
- SeasonPackEpisodesDrawer.vue
- IJellyfinService
- api/src/db/index.ts
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
- ICleanupService
- QBittorrentService
- Indexer
- Ephemeral Stream
- IRequestsRepository
- Waitlist Unconfirmed Release Dates and TBA Gating — Spec
- parseTorrentBuffer
- Leanback Client and Android TV Shell
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- upNext.ts
- watcher/src/services/prowlarr.ts
- DebridService
- MockCleanupService
- serviceContainer.ts
- Multi-Use Revocable User Invites — Spec
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- api/src/utils/torrentTitleCleaner.ts
- IMetadataService
- DummyQB
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- OpenSubtitlesService
- streamer/src/app.ts
- MockCleanup
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
- RedownloadModal.vue
- airDateFetcher.ts
- watcherPoller.ts
- api/src/services/notifications.ts
- WatcherPoller
- src/config.ts
- SymlinkManager
- AnimeTmdbConfirmSection.vue
- api/src/index.ts
- DummyJellyfinService
- setupServices
- Unified Series Domain and TMDB Canonical Authority
- IStreamerJellyfinService
- CoRequesterPicker.vue
- AnimeView.vue
- streamer/src/routes/streams.ts
- libraryPathBuilder.ts
- SubtitleInspectionService
- Implementation Decisions
- AGENTS.md — Media Download Manager Instructions
- MockCleanupService
- MockCleanupService
- DummyJellyfin
- DummyJellyfinService
- checkCandidateGuards
- github-issues.md
- loadEntries
- RequestListItem
- closeModal
- CleanupService
- DummyJellyfinService
- formatStatusText

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 75 edges
2. `IRequestsRepository` - 75 edges
3. `DownloadRequest` - 66 edges
4. `IQBittorrentService` - 57 edges
5. `RequestsRepository` - 54 edges
6. `api` - 53 edges
7. `buildApp()` - 52 edges
8. `users` - 52 edges
9. `IFileSystemService` - 51 edges
10. `AppDatabase` - 50 edges

## Surprising Connections (you probably didn't know these)
- `Architectural Shape` --references--> `AnimeSeasonService`  [INFERRED]
  docs/spec/seasonal-anime-discovery-and-waitlist-bridging.md → apps/api/src/services/animeSeasonService.ts
- `Testing Philosophy` --references--> `AnimeSeasonService`  [INFERRED]
  docs/spec/seasonal-anime-discovery-and-waitlist-bridging.md → apps/api/src/services/animeSeasonService.ts
- `Architectural Shape` --references--> `useFeatureFlags()`  [INFERRED]
  docs/spec/leanback-client-and-android-tv-shell.md → apps/web/src/composables/useFeatureFlags.ts
- `Implementation Decisions` --references--> `buildApp()`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/app.ts
- `Wave 1 — Foundation (no blockers; implement first)` --references--> `CleanupService`  [INFERRED]
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

## Communities (152 total, 39 thin omitted)

### Community 0 - "requestCreate.ts"
Cohesion: 0.22
Nodes (19): executeBatchRequests(), executeCreateRequest(), triggerNextSeasonWaitlist(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo(), findMatchingCanonicalRequest(), getDedupLockKey() (+11 more)

### Community 1 - "streamer/src/db/index.ts"
Cohesion: 0.18
Nodes (12): apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), apps_streamer_src_db_index_systemconfig, EphemeralStream, ephemeralStreams, NewEphemeralStream, NewSystemConfig (+4 more)

### Community 2 - "Navbar.vue"
Cohesion: 0.05
Nodes (40): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isUserInvitesEnabled, isWaitlistEnabled (+32 more)

### Community 3 - "formatters.ts"
Cohesion: 0.11
Nodes (18): emit, expandedEpisodesId, handleEpisodePruned(), props, getProgressSpeedEta(), props, requestsStore, progressPercent (+10 more)

### Community 4 - "ref_vitest"
Cohesion: 0.11
Nodes (23): buildApp(), apps_api_src_db_index_featureflags, apps_api_src_db_index_invites, apps_api_src_db_index_requestcorequesters, apps_api_src_db_index_systemconfig, downloadRequests, requestCoRequesters, SystemConfig (+15 more)

### Community 5 - "watcher/src/db/schema.ts"
Cohesion: 0.21
Nodes (11): buildWatcherApp(), getWatcherDatabasePath(), initWatcherDatabase(), NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, watchRequests, runWatcherLegacyAnilistMigration() (+3 more)

### Community 6 - "search.ts"
Cohesion: 0.18
Nodes (13): requireFeature(), batchRoutes(), createRoutes(), replaceTorrentRoutes(), batchItemSchema, batchRequestSchema, createRequestSchema, existsRequestSchema (+5 more)

### Community 7 - "Ephemeral Streaming Tier"
Cohesion: 0.08
Nodes (43): ADR 0013: Per-Entry Grace Periods with Release Newness Classification, graceOverrideHours Column, Per-Entry Grace Period Computation, Release Newness Threshold Classification, ADR 0015: Runtime Feature Flags and Subsystem Kill Switches, Authoritative Gateway Architecture for Feature Flags, Coordinated Pause for Background Workers, Full-Stack Feature Flag Enforcement (+35 more)

### Community 8 - "LibraryView.vue"
Cohesion: 0.05
Nodes (42): activeCategory, activeEpisodeCanManage, activeEpisodeRequestId, activeEpisodeTitle, allLibraryItems, allSelectedRequestIds, authStore, clearSelection() (+34 more)

### Community 9 - "streamer/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 10 - "watcher/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 11 - "WaitlistView.vue"
Cohesion: 0.05
Nodes (32): activeView, approvingEntryId, authStore, availableReleasesCount, candidates, checkingEntryId, hasSearched, isCheckingAll (+24 more)

### Community 12 - "api.ts"
Cohesion: 0.05
Nodes (42): authStore, emit, EphemeralStreamItem, fetchStreams(), handleEvict(), handlePromote(), handleWsMessage(), loading (+34 more)

### Community 13 - "DashboardView.vue"
Cohesion: 0.06
Nodes (23): DiskInfo, useStreamPlayback(), handleInstantStream(), handleStreamPlaybackError(), activeStreamsShelfRef, activeTab, authStore, discoveryFeedRef (+15 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "useRequestStep1.ts"
Cohesion: 0.21
Nodes (13): useRequestStep1(), processFiles(), removeBatchItem(), UseRequestStep1Options, parseTorrentFile(), decode(), decodeBuffer(), decodeString() (+5 more)

### Community 18 - "IEpisodesRepository"
Cohesion: 0.11
Nodes (5): RequestEpisode, ConsumedEpisodeItem, EpisodesRepository, IEpisodesRepository, EpisodicPruningService

### Community 19 - "api/src/services/prowlarr.ts"
Cohesion: 0.07
Nodes (20): forwardToStreamer(), formatBytes(), hasCjkCharacters(), hasPasskey(), isKnownPrivateIndexer(), ProwlarrService, ReleaseCandidate, ReleaseSource (+12 more)

### Community 20 - "BaseMetadataService"
Cohesion: 0.06
Nodes (16): animeSeasonalRoutes(), resolveTmdbSchema, seasonsQuerySchema, BaseMetadataService, MetadataApiError, MetadataService, rankMetadataCandidates(), parseAnimeTitleAndSeason() (+8 more)

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.08
Nodes (30): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+22 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "ref_node_path"
Cohesion: 0.07
Nodes (34): __dirname, envPaths, __filename, main(), FileSystemService, HardlinkedEpisodeInfo, ProcessAndHardlinkInput, ProcessAndHardlinkResult (+26 more)

### Community 24 - "useRequestData.ts"
Cohesion: 0.09
Nodes (38): step2QueryInputRef, { isItemWaitlisted }, props, FastTrackParsedData, parseFastTrack(), BatchItem, CanonicalRequestSummary, MetadataCandidate (+30 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "watcher/src/routes/waitlist.ts"
Cohesion: 0.21
Nodes (13): normalizeTitle(), renderStatusHtml(), waitlistRoutes(), deleteDiscordMessage(), generateMagicLinkToken(), ResendNotifier, sendWaitlistCancelNotification(), SendWaitlistCancelNotificationOptions (+5 more)

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "vue"
Cohesion: 0.12
Nodes (16): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), customQueryInputRef, emit, fileInputRef, isDragging (+8 more)

### Community 31 - "requests/index.ts"
Cohesion: 0.18
Nodes (13): adminGuard(), deletedRoutes(), episodesRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes(), promoteSchema (+5 more)

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "watcher/src/app.ts"
Cohesion: 0.14
Nodes (16): fastify, FastifyInstance, WatcherAppOptions, WatcherDatabase, waitlistCoRequesters, WatchRequest, AutoDownloadSubmitter, AutoDownloadSubmitterLogger (+8 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeTypes.ts"
Cohesion: 0.10
Nodes (25): AnimeHistoryMatcher, extractShowNameFromPath(), HistoryMatcherOptions, stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry (+17 more)

### Community 39 - "AnimeDetailModal.vue"
Cohesion: 0.05
Nodes (54): isWaitlistedEffective, bannerUrl, cleanDescription, confirmWaitlistSubmission(), displayTitle, emit, handleClose(), isAiringOrFinished (+46 more)

### Community 40 - "Seasonal Anime Discovery & Waitlist Bridging — Spec"
Cohesion: 0.10
Nodes (19): Airing Anime Actions (Streaming & Torrent Search), AniList GraphQL Query Shape, Anticipated Sequels & Personalized Priority, Architectural Shape, Data Contracts, Detail Modal & Waitlist Commitment, Further Notes, Implementation Decisions (+11 more)

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

### Community 48 - "AdminView.vue"
Cohesion: 0.06
Nodes (35): ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, AdminFeatureFlag, automationFlags, discoveryFlags, downloadsFlags (+27 more)

### Community 49 - "ref_fastify"
Cohesion: 0.05
Nodes (59): EpisodeStatus, FeatureFlag, featureFlags, Invite, InviteRole, invites, MediaType, NewFeatureFlag (+51 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "requestServiceTypes.ts"
Cohesion: 0.19
Nodes (8): executeRetryRequest(), BatchItemInput, BatchRequestInput, BatchRequestResult, CreateRequestInput, CreateRequestResult, RequestServiceError, RetryRequestResult

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
Cohesion: 0.10
Nodes (14): canManage, confirmPruneEpisode, emit, episodes, error, executePrune(), loading, props (+6 more)

### Community 56 - "IJellyfinService"
Cohesion: 0.07
Nodes (45): AppDatabase, DownloadPoller, DownloadPollerOptions, PollerLogger, UnarchiveDaemonOptions, CleanupServiceOptions, IFileSystemService, HardlinkRecoveryOptions (+37 more)

### Community 57 - "api/src/db/index.ts"
Cohesion: 0.08
Nodes (33): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequest, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase() (+25 more)

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

### Community 71 - "ICleanupService"
Cohesion: 0.06
Nodes (7): CleanupCronOptions, ICleanupService, PruneEpisodeResult, MockCleanupService, MockCleanup, MockCleanupService, MockCleanup

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "IRequestsRepository"
Cohesion: 0.07
Nodes (4): DownloadRequest, RequestsRepository, DeletedRequestListItem, IRequestsRepository

### Community 76 - "Waitlist Unconfirmed Release Dates and TBA Gating — Spec"
Cohesion: 0.13
Nodes (13): Adding Undated Media, Further Notes, Implementation Decisions, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope, Problem Statement, Solution (+5 more)

### Community 77 - "parseTorrentBuffer"
Cohesion: 0.24
Nodes (10): BencodeValue, ParsedTorrent, parseTorrentBuffer(), decode(), decodeBuffer(), decodeString(), TorrentInfoDict, extractHashFromMagnet() (+2 more)

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
Cohesion: 0.15
Nodes (17): forwardToWatcher(), waitlistAuth(), WaitlistEntry, WaitlistRequestBody, WaitlistResponse, waitlistRoutes(), DiscoveryItem, Resolution (+9 more)

### Community 83 - "watcher/src/services/prowlarr.ts"
Cohesion: 0.10
Nodes (23): WatcherPollerOptions, formatBytes(), parseReleaseTitle(), ReleaseCandidate, ReleaseSource, Resolution, ScoreOptions, scoreRelease() (+15 more)

### Community 86 - "serviceContainer.ts"
Cohesion: 0.06
Nodes (21): AppOptions, fastify, FastifyInstance, CleanupCron, CleanupCronLogger, getLocalTimeInTimezone(), isInsideWindow(), TranscriptionCron (+13 more)

### Community 87 - "Multi-Use Revocable User Invites — Spec"
Cohesion: 0.12
Nodes (16): Administrative Visibility & Moderation, Backend Endpoints (`apps/api/src/routes/invites.ts`), Further Notes, Implementation Decisions, Multi-Use Revocable User Invites — Spec, Out of Scope, Problem Statement, Role Safety & Security (+8 more)

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "api/src/utils/torrentTitleCleaner.ts"
Cohesion: 0.13
Nodes (11): resolveExistingSeriesFolder(), ResolveExistingSeriesFolderParams, ResolveExistingSeriesFolderResult, resolveSourceItem(), ResolveSourceItemParams, ResolveSourceItemResult, CleanedTorrentResult, cleanSeparators() (+3 more)

### Community 94 - "IMetadataService"
Cohesion: 0.07
Nodes (10): DiscoveryCategory, DiscoveryFeedResult, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), AnilistMigrationOptions, IMetadataService, IProwlarrService (+2 more)

### Community 99 - "OpenSubtitlesService"
Cohesion: 0.29
Nodes (4): OpenSubtitlesOptions, OpenSubtitlesService, SearchSubtitlesParams, SubtitleSearchResult

### Community 100 - "streamer/src/app.ts"
Cohesion: 0.19
Nodes (8): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, StreamPoller, DirectDownloader, IDirectDownloader, ref_node_stream

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.14
Nodes (13): Active Media Detection & Guardrails, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Tracking & Audit Trail, Further Notes, Out of Scope, Problem Statement, Redownload Workflow (+5 more)

### Community 115 - "JellyfinService"
Cohesion: 0.09
Nodes (3): JellyfinApiError, JellyfinService, MockJellyfinService

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

### Community 120 - "RedownloadModal.vue"
Cohesion: 0.28
Nodes (8): emit, errorMessage, handleSearchNewSource(), handleUseOriginalSource(), isSubmitting, props, requestsStore, router

### Community 121 - "airDateFetcher.ts"
Cohesion: 0.18
Nodes (12): AirDateFetcherLogger, AniListMediaResponse, AniListNextAiringEpisode, AniListStartDate, fetchAirDate(), FetchAirDateParams, fetchAniListAirDate(), fetchTmdbAirDate() (+4 more)

### Community 122 - "watcherPoller.ts"
Cohesion: 0.32
Nodes (5): WatcherPollerLogger, CAM_REGEX, computeGraceHours(), ComputeGraceHoursOptions, ref_node_cron

### Community 123 - "api/src/services/notifications.ts"
Cohesion: 0.18
Nodes (9): DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle(), NotificationEvent, NotificationPayload, NotificationServiceOptions, ResendNotifier (+1 more)

### Community 124 - "WatcherPoller"
Cohesion: 0.28
Nodes (4): WatcherPoller, Single Highest Seam: Watcher HTTP API Integration Tests, Testing Decisions, Web Component Unit Tests

### Community 125 - "src/config.ts"
Cohesion: 0.25
Nodes (8): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, getConfig(), _resetConfigForTesting(), testConfigDefaults, validateConfig(), ValidateConfigOptions

### Community 127 - "AnimeTmdbConfirmSection.vue"
Cohesion: 0.29
Nodes (7): emit, handleManualSearch(), isManualSearchOpen, manualSearchQuery, MetadataCandidate, props, selectedCandidate

### Community 128 - "api/src/index.ts"
Cohesion: 0.13
Nodes (14): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+6 more)

### Community 130 - "setupServices"
Cohesion: 0.29
Nodes (4): isFeatureEnabled(), NotificationService, setupServices(), SubgenService

### Community 131 - "Unified Series Domain and TMDB Canonical Authority"
Cohesion: 0.33
Nodes (5): Consequences, Considered Options, Context, Decision, Unified Series Domain and TMDB Canonical Authority

### Community 132 - "IStreamerJellyfinService"
Cohesion: 0.20
Nodes (5): StreamerDatabase, EphemeralEvictionCronOptions, StreamPollerOptions, IStreamerJellyfinService, StreamerJellyfinService

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 134 - "AnimeView.vue"
Cohesion: 0.05
Nodes (42): displayTitle, isAiringOrFinished, { isItemWaitlisted }, posterUrl, props, statusBadgeClasses, statusLabel, subTitle (+34 more)

### Community 135 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 136 - "libraryPathBuilder.ts"
Cohesion: 0.38
Nodes (4): buildLibraryPath(), BuildLibraryPathParams, padNumber(), sanitizePathSegment()

### Community 138 - "Implementation Decisions"
Cohesion: 0.33
Nodes (6): API Routes, Deletion Services, Implementation Decisions, Repository & Query Layer, Schema Extension, Web Client & UI Components

### Community 139 - "AGENTS.md — Media Download Manager Instructions"
Cohesion: 0.50
Nodes (3): AGENTS.md — Media Download Manager Instructions, Architectural Rules, Issue Tracking & Task Management

### Community 144 - "checkCandidateGuards"
Cohesion: 0.50
Nodes (4): checkCandidateGuards(), initPrefilledModal(), selectCandidate(), Frontend State Management (`apps/web/src/views/WaitlistView.vue`)

### Community 146 - "loadEntries"
Cohesion: 0.50
Nodes (4): handleCheckAll(), handleCheckEntry(), loadEntries(), setView()

### Community 148 - "closeModal"
Cohesion: 0.67
Nodes (3): closeModal(), downloadDirectly(), submitWaitlistEntry()

### Community 149 - "CleanupService"
Cohesion: 0.14
Nodes (11): CleanupService, Dependency diagram, Out of Scope, Problem Statement, Recommended Implementation Order, Spec: Codebase Health, Architecture Hardening & Residual Refactoring, Testing Decisions, User Stories (+3 more)

### Community 151 - "formatStatusText"
Cohesion: 0.67
Nodes (3): formatGraceRemaining(), formatStatusText(), getRemainingGraceMs()

## Knowledge Gaps
- **914 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+909 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1337 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `Navbar.vue`, `formatters.ts`, `AnimeView.vue`, `LibraryView.vue`, `WaitlistView.vue`, `api.ts`, `DashboardView.vue`, `useRequestStep1.ts`, `DiscoveryFeed.vue`, `useRequestData.ts`, `web/package.json`, `PromotionModal.vue`, `AnimeDetailModal.vue`, `StreamProgressModal.vue`, `SubtitlePickerModal.vue`, `AdminView.vue`, `TorrentReplacementModal.vue`, `SeasonPackEpisodesDrawer.vue`, `UserInviteModal.vue`, `RedownloadModal.vue`, `AnimeTmdbConfirmSection.vue`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `IJellyfinService` connect `IJellyfinService` to `DummyJellyfinService`, `ref_vitest`, `animeTypes.ts`, `.refreshPlayHistory`, `DummyJellyfinService`, `DummyJellyfin`, `ref_fastify`, `IEpisodesRepository`, `JellyfinService`, `CleanupService`, `serviceContainer.ts`, `ref_node_path`, `DummyJellyfinService`, `api/src/db/index.ts`, `.pruneEpisode`, `DummyJellyfinService`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `IRequestsRepository` connect `IRequestsRepository` to `requestCreate.ts`, `ref_vitest`, `animeTypes.ts`, `Implementation Decisions`, `IEpisodesRepository`, `upNext.ts`, `ref_node_path`, `CleanupService`, `serviceContainer.ts`, `useRequestSubmit`, `IJellyfinService`, `api/src/db/index.ts`, `IMetadataService`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _914 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Navbar.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.047895500725689405 - nodes in this community are weakly interconnected._
- **Should `formatters.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11397849462365592 - nodes in this community are weakly interconnected._