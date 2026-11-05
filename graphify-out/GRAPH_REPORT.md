# Graph Report - Plex-auto-download  (2026-11-05)

## Corpus Check
- 625 files · ~381,102 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 9, .example 3, .css 1)

## Summary
- 3876 nodes · 9411 edges · 190 communities (158 shown, 32 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 405 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `23aa9202`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TelegramBotClient
- SymlinkManager
- watcher/src/services/prowlarr.ts
- ref_node_path
- AnimeView.vue
- watcher/src/app.ts
- requests/index.ts
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- Spec: Telegram Bot Client with Intent Parsing
- api.ts
- useAdminActivity.ts
- vue
- devDependencies
- dev-setup.mjs
- WaitlistCard.vue
- stores/requests.ts
- useWaitlistTiers.ts
- IEpisodesRepository
- DiscoveryFeed.vue
- api/package.json
- IJellyfinService
- telegram-bot/package.json
- Context Domain Model Document
- WatchRequest
- serviceContainer.ts
- web/package.json
- PromotionModal.vue
- useRequestSubmit
- ApiError
- OpenSubtitlesService
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- LibraryMediaCard.vue
- compilerOptions
- animeTypes.ts
- WaitlistAddModal.vue
- api/src/db/schema.ts
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- Per-Episode Consumption Tracking and Selective Torrent Pruning — Spec
- SubtitlePickerModal.vue
- IndexerPrivacyCache
- TelegramPairingService
- compilerOptions
- JellyfinService
- dependencies
- TorrentReplacementModal.vue
- scripts
- ReleaseCandidate
- SnatchHandler
- airDateFetcher.ts
- vue-router
- User Role
- Waitlist Entry
- Leanback Client and Android TV Shell — Spec
- sessionMonitoringService.ts
- Media Download Manager Architecture Spec
- scripts
- Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)
- watchParties.ts
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- useRequestStep1.ts
- Workflow
- Indexer
- Ephemeral Stream
- IRequestsRepository
- WatcherPoller
- ActiveStreamsShelf.vue
- Leanback Client and Android TV Shell
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- requestCreate.ts
- CleanupService
- upNext.ts
- formatters.ts
- AnimeDetailModal.vue
- Multi-Use Revocable User Invites — Spec
- utils.ts
- Web SPA HTML Entrypoint
- ICleanupService
- QBittorrentService
- AutoDownloadSubmitter
- DummyQB
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- telegram-bot/tsconfig.json
- UserSettingsModal.vue
- WaitlistView.vue
- vercel.json
- pnpm-workspace.yaml
- Favicon Vector Graphic (MDM Brand Lightning / Geometric Icon)
- SVG Icon Sprite Sheet (Bluesky, Discord, Docs, GitHub, Social, X)
- Hero Illustration (Landing / Welcome Graphic)
- Vite Logo Asset
- Vue Logo Asset
- Deleted Requests History and Redownload — Spec
- PartyChatPanel.vue
- Torrent Replacement for Underway Requests
- Unified Series Domain and TMDB Canonical Authority — Spec
- watcher/src/services/notifications.ts
- useAdminData
- WatchPartyLobbyModal.vue
- lucide-vue-next
- Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec
- IWatchPartyRepository
- Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec
- ref_vitest
- IQBittorrentService
- AdminView.vue
- prowlarrCookie.ts
- Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec
- setupServices
- Unified Series Domain and TMDB Canonical Authority
- useRequestData.ts
- CoRequesterPicker.vue
- upNext.test.ts
- .handleMessage
- ProwlarrService
- api/src/index.ts
- DebridService
- AGENTS.md — Media Download Manager Instructions
- Sidebar.vue
- streamer/src/app.ts
- api/src/services/prowlarr.ts
- Decision
- requestFastTrack.ts
- github-issues.md
- JellyfinSyncPlayService
- Header.vue
- useFeatureFlags
- search.ts
- ReportCardHandler
- Waitlist Unconfirmed Release Dates and TBA Gating — Spec
- Decision
- Preferred Indexer (BJ-Share) Cookie Management & Expired Status Warning Banner — Spec
- library.ts
- ParsedIntent
- ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure
- ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining
- SeasonPackEpisodesDrawer.vue
- Spec: Modern Cinema UI Overhaul (Bolt Prototype Adoption)
- streamer/src/routes/streams.ts
- src/config.ts
- useRequestReleases
- users
- internal.ts
- IDebridService
- WaitlistModalConfirmStep.vue
- AdminFeaturesTab.vue
- RequestStep1Input.vue
- streamer/src/db/index.ts
- 0029. Telegram Client and Intent Parsing
- MockCleanupService
- 0028. Waitlist Tiering and In-Place Episode Adjustment
- src/types.ts
- UnarchiveService
- MockCleanupService
- App.vue
- requestDedup.ts
- ws.ts
- checkCandidateGuards
- closeModal
- .pinChatMessage
- PreferredIndexerCookieResult
- services/discovery.ts
- requestWaitlistIntegration.ts
- MdmApiClient
- parseTorrentBuffer
- AnimeTmdbConfirmSection.vue
- .pruneEpisode
- IStreamerJellyfinService

## God Nodes (most connected - your core abstractions)
1. `IRequestsRepository` - 86 edges
2. `vue` - 81 edges
3. `IJellyfinService` - 80 edges
4. `api` - 76 edges
5. `DownloadRequest` - 66 edges
6. `buildApp()` - 65 edges
7. `users` - 63 edges
8. `RequestsRepository` - 63 edges
9. `IQBittorrentService` - 61 edges
10. `AppDatabase` - 55 edges

## Surprising Connections (you probably didn't know these)
- `Architectural Seams` --references--> `adminGuard()`  [INFERRED]
  docs/spec/preferred-indexer-cookie-management.md → apps/api/src/middleware/auth.ts
- `1. Watcher Schema & Diagnostics (`apps/watcher`)` --references--> `WatcherPoller`  [INFERRED]
  docs/spec/waitlist-manual-request-shortcut.md → apps/watcher/src/jobs/watcherPoller.ts
- `Testing Decisions` --references--> `WatcherPoller`  [INFERRED]
  docs/spec/waitlist-manual-request-shortcut.md → apps/watcher/src/jobs/watcherPoller.ts
- `Solution` --references--> `executeEpisodicWaterfall()`  [INFERRED]
  docs/spec/preferred-indexer-qualification-and-episodic-waterfall.md → apps/watcher/src/services/episodicWaterfall.ts
- `2. Canonical Backend-Driven Jellyfin Launch URL` --references--> `WatchParty`  [INFERRED]
  docs/adr/0027-jellyfin-syncplay-token-auth-and-cross-platform-tv-bridge.md → apps/web/src/components/ActiveWatchPartiesShelf.vue

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Jellyfin Authentication and Role Model** — context_user_role, context_trusted_role, context_admin_role, context_invite, docs_adr_0001_jellyfin_as_auth_source_of_truth_jellyfin_auth, docker_docker_compose_yml_service_jellyfin [EXTRACTED 0.95]
- **Automated Discovery, Episodic Tracking, and Configurable Grace Period Ingestion** — docs_spec_discovery_feed_and_up_next_shelf_up_next_shelf, docs_spec_discovery_feed_and_up_next_shelf_episodic_gap_algorithm, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_watch_for_next_episodes, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_compute_grace_hours, docs_adr_0013_per_entry_grace_periods_with_release_newness_classification_per_entry_grace_period [EXTRACTED 0.95]
- **Download Request Hardlink Lifecycle** — context_download_request, context_staging_area, context_hardlink_move, context_library, context_storage_quota, docker_docker_compose_yml_service_qbittorrent, docker_docker_compose_yml_service_api [EXTRACTED 0.95]
- **Ephemeral Debrid Streaming Pipeline** — context_ephemeral_stream, context_stream_library, docker_docker_compose_yml_service_zurg, docker_docker_compose_yml_service_rclone, docker_docker_compose_yml_service_streamer, docs_adr_0012_dual_tier_ephemeral_streaming_with_real_debrid_dual_tier_streaming [EXTRACTED 0.95]
- **Preferred Indexer Dual-Candidate Airgap Architecture** — docs_adr_0016_preferred_indexer_for_downloads_preferred_indexer_oracle, docs_adr_0016_preferred_indexer_for_downloads_discovery_dual_candidate, docs_spec_preferred_indexer_bj_share_preferred_indexer_concept, docs_spec_preferred_indexer_bj_share_dual_candidate_binding, docs_spec_ephemeral_streaming_and_real_debrid_private_airgap [EXTRACTED 0.95]
- **Private Library Security & Processing Pipeline** — docs_spec_private_media_type_and_trusted_role_private_media_type, docs_spec_private_media_type_and_trusted_role_trusted_role, docs_spec_private_media_type_and_trusted_role_jellyfin_access_control, docs_spec_subgen_gpu_subtitle_transcription_subgen_container, docs_adr_0017_local_gpu_subtitle_transcription_with_subgen_subgen_whisper_integration [EXTRACTED 0.95]

## Communities (190 total, 32 thin omitted)

### Community 0 - "TelegramBotClient"
Cohesion: 0.26
Nodes (9): CallbackSession, CallbackStore, CarouselHandler, EpisodicHandler, main(), MessageHandler, TelegramBotClient, TelegramClientOptions (+1 more)

### Community 2 - "watcher/src/services/prowlarr.ts"
Cohesion: 0.08
Nodes (31): CAM_REGEX, formatBytes(), parseReleaseTitle(), ProwlarrSearchResult, ReleaseCandidate, ReleaseSource, Resolution, ScoreOptions (+23 more)

### Community 3 - "ref_node_path"
Cohesion: 0.05
Nodes (47): __dirname, envPaths, __filename, main(), FileSystemService, HardlinkedEpisodeInfo, ProcessAndHardlinkInput, ProcessAndHardlinkResult (+39 more)

### Community 4 - "AnimeView.vue"
Cohesion: 0.04
Nodes (59): displayTitle, isAiringOrFinished, { isItemWaitlisted }, posterUrl, props, statusBadgeClasses, statusLabel, subTitle (+51 more)

### Community 5 - "watcher/src/app.ts"
Cohesion: 0.14
Nodes (23): buildWatcherApp(), fastify, getWatcherDatabasePath(), initWatcherDatabase(), WatcherDatabase, NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester (+15 more)

### Community 6 - "requests/index.ts"
Cohesion: 0.17
Nodes (15): adminGuard(), createRoutes(), deletedRoutes(), episodesRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes() (+7 more)

### Community 7 - "Ephemeral Streaming Tier"
Cohesion: 0.08
Nodes (43): ADR 0013: Per-Entry Grace Periods with Release Newness Classification, graceOverrideHours Column, Per-Entry Grace Period Computation, Release Newness Threshold Classification, ADR 0015: Runtime Feature Flags and Subsystem Kill Switches, Authoritative Gateway Architecture for Feature Flags, Coordinated Pause for Background Workers, Full-Stack Feature Flag Enforcement (+35 more)

### Community 8 - "LibraryView.vue"
Cohesion: 0.05
Nodes (36): activeCategory, activeEpisodeCanManage, activeEpisodeRequestId, activeEpisodeTitle, allLibraryItems, allSelectedRequestIds, authStore, clearSelection() (+28 more)

### Community 9 - "streamer/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 10 - "watcher/package.json"
Cohesion: 0.04
Nodes (46): dependencies, better-sqlite3, dotenv, drizzle-orm, fastify, node-cron, devDependencies, drizzle-kit (+38 more)

### Community 11 - "Spec: Telegram Bot Client with Intent Parsing"
Cohesion: 0.25
Nodes (7): Further Notes, Out of Scope, Problem Statement, Solution, Spec: Telegram Bot Client with Intent Parsing, Testing Decisions, User Stories

### Community 12 - "api.ts"
Cohesion: 0.06
Nodes (30): authStore, { cookieStatus, isLoadingStatus, fetchCookieStatus }, shouldShowBanner, PreferredIndexerCookieStatus, api, useAuthStore, User, mockAnime (+22 more)

### Community 13 - "useAdminActivity.ts"
Cohesion: 0.09
Nodes (20): closeStopModal(), emit, handleConfirmStop(), sessionToStop, stopMessage, emit, showDiagnostics, ActivityResponse (+12 more)

### Community 14 - "vue"
Cohesion: 0.06
Nodes (25): DiskInfo, useDashboardActions(), useStreamPlayback(), handleInstantStream(), handleStreamPlaybackError(), API_BASE_URL, useRequestsStore, activeStreamsShelfRef (+17 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "WaitlistCard.vue"
Cohesion: 0.13
Nodes (20): authStore, canAdjustTarget, emit, handleCardClick(), isActionable, isActiveEpisodic, isAdjustPopoverOpen, props (+12 more)

### Community 18 - "stores/requests.ts"
Cohesion: 0.12
Nodes (16): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), emit, emit, errorMessage, handleSearchNewSource() (+8 more)

### Community 19 - "useWaitlistTiers.ts"
Cohesion: 0.10
Nodes (26): classifyWaitlistEntry(), DEFAULT_TIER_STATE, loadSavedTierState(), partitionWaitlistEntries(), saveTierState(), STORAGE_KEY, useWaitlistTiers(), collapseAll() (+18 more)

### Community 20 - "IEpisodesRepository"
Cohesion: 0.07
Nodes (14): apps_api_src_db_index_newrequestepisode, apps_api_src_db_index_requestepisode, apps_api_src_db_index_requestepisodes, NewRequestEpisode, RequestEpisode, requestEpisodes, CleanupServiceOptions, ConsumedEpisodeItem (+6 more)

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "IJellyfinService"
Cohesion: 0.06
Nodes (6): IJellyfinService, DummyJellyfinService, DummyJellyfinService, DummyJellyfinService, DummyJellyfinService, DummyJellyfin

### Community 24 - "telegram-bot/package.json"
Cohesion: 0.08
Nodes (24): dependencies, dotenv, devDependencies, esbuild, tsx, @types/node, typescript, vitest (+16 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "WatchRequest"
Cohesion: 0.15
Nodes (12): WatchRequest, waitlistActionRoutes(), waitlistCreateRoutes(), waitlistRoutes(), CreateWaitlistBody, normalizeTitle(), executeEpisodicWaterfall(), WaterfallDeps (+4 more)

### Community 27 - "serviceContainer.ts"
Cohesion: 0.06
Nodes (33): AppOptions, fastify, FastifyInstance, watchPartyRooms, CleanupCron, CleanupCronLogger, DownloadPoller, getLocalTimeInTimezone() (+25 more)

### Community 28 - "web/package.json"
Cohesion: 0.10
Nodes (20): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+12 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): PromotionCandidate, candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next() (+11 more)

### Community 30 - "useRequestSubmit"
Cohesion: 0.15
Nodes (18): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep2(), confirmStep2Selection(), handleSearchMetadata(), selectCandidate() (+10 more)

### Community 31 - "ApiError"
Cohesion: 0.06
Nodes (23): errorMessage, hasCopied, invitedUsers, inviteUrl, isGenerating, isInvitesDisabledForUser, isLoading, ApiError (+15 more)

### Community 32 - "OpenSubtitlesService"
Cohesion: 0.29
Nodes (4): OpenSubtitlesOptions, OpenSubtitlesService, SearchSubtitlesParams, SubtitleSearchResult

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "LibraryMediaCard.vue"
Cohesion: 0.11
Nodes (17): hasCoRequestersInSelection, itemsWithCoRequesters, props, coRequestersTooltip, expanded, props, totalEpisodes, jellyfinLaunchUrl (+9 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeTypes.ts"
Cohesion: 0.06
Nodes (44): AnimeHistoryMatcher, extractShowNameFromPath(), HistoryMatcherOptions, stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry (+36 more)

### Community 39 - "WaitlistAddModal.vue"
Cohesion: 0.08
Nodes (22): availableReleasesCount, candidates, hasSearched, { isItemWaitlisted }, isPrefilled, isSearching, isSubmitting, libraryStatus (+14 more)

### Community 40 - "api/src/db/schema.ts"
Cohesion: 0.04
Nodes (70): EpisodeStatus, FeatureFlag, featureFlags, Invite, InviteRole, invites, MediaType, NewFeatureFlag (+62 more)

### Community 41 - "Docker Compose Stack Specification"
Cohesion: 0.20
Nodes (15): Subgen Service, Root Docker Compose File, Docker Compose Stack Specification, Fastify API Service, Caddy Reverse Proxy, Cloudflared Tunnel Daemon, Cloudflare DDNS Daemon, Jellyfin Media Server (+7 more)

### Community 42 - "StreamProgressModal.vue"
Cohesion: 0.19
Nodes (15): checkStreamStatus(), currentErrorMessage, currentJellyfinUrl, displayErrorMessage, effectiveJellyfinUrl, effectiveWaitlistAdded, emit, handleAddToWaitlist() (+7 more)

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
Cohesion: 0.12
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 48 - "IndexerPrivacyCache"
Cohesion: 0.16
Nodes (5): forwardToStreamer(), apps_api_src_services_prowlarr_haspasskey, hasPasskey(), IndexerPrivacyCache, isKnownPrivateIndexer()

### Community 49 - "TelegramPairingService"
Cohesion: 0.12
Nodes (4): ITelegramPairingService, TelegramAuthSession, TelegramPairingCode, TelegramPairingService

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "JellyfinService"
Cohesion: 0.05
Nodes (35): JellyfinApiError, JellyfinService, DEFAULT_CONSUMPTION_THRESHOLD, isMediaFullyConsumed(), parsePlayHistoryEntry(), PlaybackProgress, 90% Playback Consumption Threshold for Media Cleanup — Spec, Acceptance Criteria (+27 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.09
Nodes (22): emit, fileInputRef, onClear(), onFileChange(), activeTab, candidates, canSubmit, emit (+14 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 55 - "ReleaseCandidate"
Cohesion: 0.15
Nodes (4): ReleaseCandidate, SearchReleasesResult, MockProwlarrService, MockProwlarrService

### Community 56 - "SnatchHandler"
Cohesion: 0.17
Nodes (7): SnatchHandler, Acceptance Criteria, Implementation Decisions, Problem Statement, Solution, Spec: Telegram Pinned Report Card and Ephemeral Chat Cleanup, User Stories

### Community 57 - "airDateFetcher.ts"
Cohesion: 0.18
Nodes (12): AirDateFetcherLogger, AniListMediaResponse, AniListNextAiringEpisode, AniListStartDate, fetchAirDate(), FetchAirDateParams, fetchAniListAirDate(), fetchTmdbAirDate() (+4 more)

### Community 58 - "vue-router"
Cohesion: 0.08
Nodes (24): app, router, routes, pinia, apps_web_src_style, authStore, errorMessage, isLoading (+16 more)

### Community 59 - "User Role"
Cohesion: 0.22
Nodes (10): Admin Role, Invite, Trusted Role, User Role, ADR 0001 Document, Jellyfin Authentication Source of Truth, Rationale: Single Account Store, Rationale: Clean Role Composition and Zero Visibility Invariant (+2 more)

### Community 60 - "Waitlist Entry"
Cohesion: 0.24
Nodes (10): Grace Period, Release Newness Threshold, Waitlist, Waitlist Entry, Watch for Next Episodes, Watcher Service, Watcher Microservice, Rationale: Decoupled Poller and Clean Notification Channels (+2 more)

### Community 61 - "Leanback Client and Android TV Shell — Spec"
Cohesion: 0.14
Nodes (13): Architectural Shape, Authentication & Pairing (Quick Connect), Content Shelves & Media Actions, Further Notes, Implementation Decisions, Jellyfin Integration & Android TV Shell, Leanback Client and Android TV Shell — Spec, Out of Scope (+5 more)

### Community 62 - "sessionMonitoringService.ts"
Cohesion: 0.07
Nodes (30): GpuMetrics, PlaybackSession, PlaybackSessionItem, PlaybackSessionPlayState, PlaybackSessionTranscodingInfo, RawJellyfinItem, RawJellyfinMediaStream, RawJellyfinPlayState (+22 more)

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)"
Cohesion: 0.15
Nodes (12): Apple TV Authentication (Quick Connect), Architectural Shape, Content Discovery & Living-Room Actions, Draft Spec: Native Apple TV Companion App (`apps/tv-apple`), Further Notes, Implementation Decisions, Out of Scope, Problem Statement (+4 more)

### Community 66 - "watchParties.ts"
Cohesion: 0.07
Nodes (31): attachJellyfinWebUrl(), createWatchPartySchema, switchMediaSchema, watchPartyRoutes(), DiscordEmbed, DiscordEmbedField, DiscordNotifier, NotificationContext (+23 more)

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

### Community 71 - "useRequestStep1.ts"
Cohesion: 0.16
Nodes (16): useRequestStep1(), processFiles(), removeBatchItem(), UseRequestStep1Options, BencodeValue, ParsedTorrent, parseTorrentFile(), decode() (+8 more)

### Community 72 - "Workflow"
Cohesion: 0.22
Nodes (8): 1. Verify Git Status & Commit, 2. Verify Push Status, 3. Identify Affected Containers, 4. Rebuild & Restart Relevant Containers, 5. Verify Container Health & Logs, 6. Report Summary, Commit, Push & Rebuild Relevant Containers, Workflow

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "IRequestsRepository"
Cohesion: 0.04
Nodes (12): DownloadRequest, RequestsRepository, IRequestsRepository, RequestListItem, TransitionOptions, MockCleanupService, API Routes, Deletion Services (+4 more)

### Community 76 - "WatcherPoller"
Cohesion: 0.14
Nodes (8): WatcherPoller, ReleaseGatingService, WaitlistCheckContext, WaitlistCheckContextOrFn, WaitlistCheckResult, Implementation Decisions, Watcher Routes (`apps/watcher/src/routes/waitlist.ts`), Watcher Service Gating (`apps/watcher/src/services/releaseGating.ts`)

### Community 77 - "ActiveStreamsShelf.vue"
Cohesion: 0.06
Nodes (34): authStore, createdParty, emit, EphemeralStreamItem, featureFlags, fetchStreams(), handleEvict(), handlePartyCreated() (+26 more)

### Community 78 - "Leanback Client and Android TV Shell"
Cohesion: 0.50
Nodes (3): Context, Decision, Leanback Client and Android TV Shell

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 82 - "requestCreate.ts"
Cohesion: 0.20
Nodes (20): executeBatchRequests(), executeCreateRequest(), findCanonicalSeriesInfo(), getDedupLockKey(), buildInitialDownloadRequest(), BuildInitialRequestParams, checkDiskSafety(), DiskSafetyCheckResult (+12 more)

### Community 83 - "CleanupService"
Cohesion: 0.10
Nodes (17): CleanupService, matchesLibraryPath(), Consequences, Considered Options, Context, Decision, Per-Episode Consumption Tracking and Selective Torrent Pruning, Dependency diagram (+9 more)

### Community 84 - "upNext.ts"
Cohesion: 0.11
Nodes (10): IProwlarrService, groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), matchesTarget(), normalizeShowTitle(), UpNextResult (+2 more)

### Community 85 - "formatters.ts"
Cohesion: 0.09
Nodes (23): activeCount, completedCount, formattedSpeed, requestsStore, totalCount, emit, expandedEpisodesId, handleEpisodePruned() (+15 more)

### Community 86 - "AnimeDetailModal.vue"
Cohesion: 0.06
Nodes (43): isWaitlistedEffective, applyResolveResult(), bannerUrl, cleanDescription, confirmWaitlistSubmission(), displayTitle, emit, handleClose() (+35 more)

### Community 87 - "Multi-Use Revocable User Invites — Spec"
Cohesion: 0.12
Nodes (16): Administrative Visibility & Moderation, Backend Endpoints (`apps/api/src/routes/invites.ts`), Further Notes, Implementation Decisions, Multi-Use Revocable User Invites — Spec, Out of Scope, Problem Statement, Role Safety & Security (+8 more)

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 92 - "ICleanupService"
Cohesion: 0.05
Nodes (9): CleanupCronOptions, ICleanupService, MockCleanup, MockCleanupService, MockCleanupService, MockCleanup, MockCleanupService, MockCleanupService (+1 more)

### Community 93 - "QBittorrentService"
Cohesion: 0.22
Nodes (5): QBittorrentError, QBittorrentService, extractHashFromMagnet(), resolveTorrentSource(), RFC-4648

### Community 94 - "AutoDownloadSubmitter"
Cohesion: 0.16
Nodes (7): FastifyInstance, WatcherAppOptions, AutoDownloadSubmitter, AutoDownloadSubmitterOptions, EpisodicTrackingService, sendWaitlistErrorNotification(), WaitlistCheckService

### Community 99 - "telegram-bot/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 100 - "UserSettingsModal.vue"
Cohesion: 0.11
Nodes (19): authStore, clearGeminiApiKey(), countdownText, countdownTimer, expiresIn, feedbackMessage, geminiApiKeyInput, generatePairingCode() (+11 more)

### Community 101 - "WaitlistView.vue"
Cohesion: 0.06
Nodes (31): emit, errorMessage, handleSave(), isSeasonPack, isValid, props, saving, seasonNumber (+23 more)

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.14
Nodes (13): Active Media Detection & Guardrails, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Tracking & Audit Trail, Further Notes, Out of Scope, Problem Statement, Redownload Workflow (+5 more)

### Community 115 - "PartyChatPanel.vue"
Cohesion: 0.20
Nodes (6): ChatMessage, countdown, emojis, inputText, messages, props

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

### Community 117 - "Unified Series Domain and TMDB Canonical Authority — Spec"
Cohesion: 0.13
Nodes (14): Architectural Shape, Automated Waitlist Monitoring & Up Next Tracking, Further Notes, Implementation Decisions, Legacy Data Migration & System Health, Out of Scope, Problem Statement, Prowlarr Dual-Query Release Discovery (+6 more)

### Community 118 - "watcher/src/services/notifications.ts"
Cohesion: 0.20
Nodes (12): waitlistCrudRoutes(), renderStatusHtml(), waitlistMagicLinkRoutes(), deleteDiscordMessage(), generateMagicLinkToken(), ResendNotifier, sendWaitlistCancelNotification(), SendWaitlistCancelNotificationOptions (+4 more)

### Community 119 - "useAdminData"
Cohesion: 0.10
Nodes (13): useAdminCleanup(), confirmCleanItem(), handleRunScan(), loadDiskAndCandidates(), useAdminConfig(), checkJellyfinStatus(), handleRescanJellyfin(), formatDate() (+5 more)

### Community 120 - "WatchPartyLobbyModal.vue"
Cohesion: 0.14
Nodes (13): authStore, changeMediaItemId, changeMediaTitle, emit, handleManualChangeMedia(), handlePlayNextEpisode(), HistoryItem, isHost (+5 more)

### Community 121 - "lucide-vue-next"
Cohesion: 0.14
Nodes (7): copied, Participant, participants, props, requestsStore, SubtitleTrack, lucide-vue-next

### Community 122 - "Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec"
Cohesion: 0.12
Nodes (16): 1. Watcher Schema & Diagnostics (`apps/watcher`), 2. Watcher Advance Endpoint (`apps/watcher`), 3. Main API Request Integration (`apps/api`), 4. Frontend Decomposition & Waitlist UI (`apps/web`), 5. Fast-Track Request Step 3 Initialization (`apps/web`), Episodic Scope & Lifecycle, Further Notes, Implementation Decisions (+8 more)

### Community 123 - "IWatchPartyRepository"
Cohesion: 0.14
Nodes (4): NewWatchPartyRoom, WatchPartyRoom, IWatchPartyRepository, WatchPartyRepository

### Community 124 - "Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec"
Cohesion: 0.12
Nodes (16): 1. Oracle VPS Configuration (`167.126.3.136`), 2. Home Stack Modifications (`docker/docker-compose.yml`), 3. DNS Configuration (Cloudflare), Cloudflare Compliance & Security, Further Notes, Good Test Principles, Implementation Decisions, Infrastructure Cleanliness (+8 more)

### Community 125 - "ref_vitest"
Cohesion: 0.08
Nodes (22): buildApp(), apps_api_src_db_index_featureflags, downloadRequests, requestCoRequesters, SystemConfig, apps_api_src_routes_admin_adminroutes, apps_api_src_routes_invites_inviteroutes, SpaceCheckResult (+14 more)

### Community 126 - "IQBittorrentService"
Cohesion: 0.09
Nodes (22): AppDatabase, DownloadPollerOptions, PollerLogger, UnarchiveDaemon, UnarchiveDaemonOptions, IFileSystemService, ProcessAndHardlinkTorrentInput, HardlinkRecoveryOptions (+14 more)

### Community 127 - "AdminView.vue"
Cohesion: 0.10
Nodes (19): ConfigFormData, apps_web_src_components_admin_adminconfigtab_jellyfinstatusinfo, showTmdbKey, apps_web_src_components_admin_adminconfigtab_transcriptionformdata, InviteItem, JellyfinStatusInfo, {
  cookieStatus,
  isLoadingStatus,
  isTesting,
  isSaving,
  cookieInput,
  feedbackMessage,
  fetchCookieStatus,
  testCookie,
  saveCookie,
}, showInstructions (+11 more)

### Community 128 - "prowlarrCookie.ts"
Cohesion: 0.21
Nodes (14): fetchAllIndexers(), findPreferredIndexer(), getPreferredIndexerCookieStatus(), invalidatePreferredIndexerCookieCache(), maskCookie(), ProwlarrIndexer, ProwlarrIndexerField, ProwlarrIndexerStatus (+6 more)

### Community 129 - "Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec"
Cohesion: 0.12
Nodes (15): 1. Seeder & Resolution Diagnostics (`apps/watcher` & `apps/api`), 2. Episodic Waterfall Chaining Engine (`apps/watcher`), Episodic Waterfall Automation, Further Notes, Good Test Principles, Implementation Decisions, Out of Scope, Preferred Indexer Health & Seeder Qualification (+7 more)

### Community 130 - "setupServices"
Cohesion: 0.10
Nodes (9): DiscoveryService, NotificationService, RequestService, setupServices(), SubgenService, execFileAsync, SubtitleInspectionService, updateUserReportCardMessage() (+1 more)

### Community 131 - "Unified Series Domain and TMDB Canonical Authority"
Cohesion: 0.33
Nodes (5): Consequences, Considered Options, Context, Decision, Unified Series Domain and TMDB Canonical Authority

### Community 132 - "useRequestData.ts"
Cohesion: 0.11
Nodes (28): step2QueryInputRef, { isItemWaitlisted }, props, FastTrackParsedData, WaitlistParsedData, BatchItem, CanonicalRequestSummary, MetadataCandidate (+20 more)

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 134 - "upNext.test.ts"
Cohesion: 0.05
Nodes (21): AnilistMigrationOptions, AnilistMigrationResult, BaseMetadataService, IMetadataService, MetadataApiError, MetadataCandidate, MetadataSearchOptions, MetadataService (+13 more)

### Community 135 - ".handleMessage"
Cohesion: 0.17
Nodes (3): InlineKeyboardMarkup, TelegramMessage, Implementation Decisions

### Community 136 - "ProwlarrService"
Cohesion: 0.19
Nodes (3): formatBytes(), ScoreOptions, ProwlarrService

### Community 137 - "api/src/index.ts"
Cohesion: 0.13
Nodes (14): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+6 more)

### Community 139 - "AGENTS.md — Media Download Manager Instructions"
Cohesion: 0.50
Nodes (3): AGENTS.md — Media Download Manager Instructions, Architectural Rules, Issue Tracking & Task Management

### Community 140 - "Sidebar.vue"
Cohesion: 0.10
Nodes (20): collapsed, mobileOpen, showInviteModal, showSettingsModal, authStore, emit, featureFlags, {
  fetchStorage,
  storagePercent,
  formattedFootprint,
  formattedQuota,
  storageBarColor,
  storagePercentTextClass,
} (+12 more)

### Community 141 - "streamer/src/app.ts"
Cohesion: 0.24
Nodes (7): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, DirectDownloader, IDirectDownloader, ref_node_stream

### Community 142 - "api/src/services/prowlarr.ts"
Cohesion: 0.23
Nodes (11): isTitleRelevant(), parseReleaseTitle(), ReleaseSource, ScorableCandidate, scoreRelease(), VideoCodec, SearchReleasesOptions, buildSeriesSearchQueries() (+3 more)

### Community 143 - "Decision"
Cohesion: 0.20
Nodes (9): 1. Native Jellyfin SyncPlay Launch Bridge, 2. Eligible Media Scope, 3. In-Place Media Switching & Discord Party Timeline, 4. Context-Specific Discord Channel Routing, 5. Room Persistence & Automated Cleanup, ADR-0025: Watch Party SyncPlay Integration & In-Place Timeline Progression, Consequences, Context (+1 more)

### Community 144 - "requestFastTrack.ts"
Cohesion: 0.23
Nodes (16): buildCandidate(), enrichCandidateMetadata(), parseEpisodeAndGranularity(), parseFastTrack(), parseMediaType(), parseSeasonNumber(), parseWaitlistParams(), parseYear() (+8 more)

### Community 146 - "JellyfinSyncPlayService"
Cohesion: 0.13
Nodes (12): JellyfinSyncPlayService, Acceptance Criteria, Background & Problem Statement, Cross-Platform TV Participation & Canonical Handoff, Deep Link & Discord Routing, Implementation Architecture, Jellyfin User Token & SyncPlay Provisioning, Slice 1: Backend Jellyfin User Token Storage, Migration, SyncPlay Provisioning & Canonical Launch URL (+4 more)

### Community 147 - "Header.vue"
Cohesion: 0.13
Nodes (12): authStore, currentTitle, emit, { isConnected }, openSettings(), profileDropdownRef, profileOpen, requestsStore (+4 more)

### Community 148 - "useFeatureFlags"
Cohesion: 0.04
Nodes (45): DiscoveryItem, authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isUserInvitesEnabled (+37 more)

### Community 149 - "search.ts"
Cohesion: 0.21
Nodes (11): requireFeature(), batchRoutes(), batchItemSchema, batchRequestSchema, createRequestSchema, existsRequestSchema, replaceTorrentSchema, searchMetadataSchema (+3 more)

### Community 151 - "Waitlist Unconfirmed Release Dates and TBA Gating — Spec"
Cohesion: 0.14
Nodes (13): Adding Undated Media, Further Notes, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope, Problem Statement, Single Highest Seam: Watcher HTTP API Integration Tests, Solution (+5 more)

### Community 152 - "Decision"
Cohesion: 0.22
Nodes (8): 1. Authenticated User Token Storage for SyncPlay, 2. Canonical Backend-Driven Jellyfin Launch URL, 3. Dedicated `/party/:id` Route & Auto-Lobby State, 4. Cross-Platform TV Guidance & AirPlay Launch Bridge, ADR-0027: Jellyfin SyncPlay Token Authentication, Canonical Handoff & Cross-Platform TV Bridge, Consequences, Context, Decision

### Community 153 - "Preferred Indexer (BJ-Share) Cookie Management & Expired Status Warning Banner — Spec"
Cohesion: 0.29
Nodes (6): Architectural Seams, Implementation Decisions, Preferred Indexer (BJ-Share) Cookie Management & Expired Status Warning Banner — Spec, Problem Statement, Solution, User Stories

### Community 154 - "library.ts"
Cohesion: 0.18
Nodes (11): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, libraryRoutes(), MediaArtwork, MediaRequester (+3 more)

### Community 155 - "ParsedIntent"
Cohesion: 0.23
Nodes (7): extractEpisodicInfo(), heuristicFallback(), ORDINAL_MAP, IntentParser, IntentParserOptions, MediaType, ParsedIntent

### Community 156 - "ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure"
Cohesion: 0.40
Nodes (4): ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure, Consequences, Context, Decision

### Community 157 - "ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining"
Cohesion: 0.25
Nodes (7): 1. Preferred Indexer Qualification, 2. Resolution Gating & 720p Fallback, 3. Episodic Waterfall Chaining Engine, ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining, Consequences, Context, Decision

### Community 158 - "SeasonPackEpisodesDrawer.vue"
Cohesion: 0.11
Nodes (12): canManage, confirmPruneEpisode, emit, episodes, error, executePrune(), loading, props (+4 more)

### Community 159 - "Spec: Modern Cinema UI Overhaul (Bolt Prototype Adoption)"
Cohesion: 0.22
Nodes (8): Further Notes, Out of Scope, Problem Statement, Slices & Implementation Issues, Solution, Spec: Modern Cinema UI Overhaul (Bolt Prototype Adoption), Testing Decisions, User Stories

### Community 160 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 161 - "src/config.ts"
Cohesion: 0.25
Nodes (8): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, getConfig(), _resetConfigForTesting(), testConfigDefaults, validateConfig(), ValidateConfigOptions

### Community 162 - "useRequestReleases"
Cohesion: 0.27
Nodes (8): useRequestReleases(), checkCacheForCandidates(), extractInfoHash(), fetchReleasesForCandidate(), getCandidateCacheStatus(), getSearchTitles(), reloadReleasesSilently(), searchReleasesApi()

### Community 163 - "users"
Cohesion: 0.07
Nodes (49): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequest, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase() (+41 more)

### Community 164 - "internal.ts"
Cohesion: 0.25
Nodes (8): serviceKeyAuth(), internalRoutes(), subgenWebhookSchema, ACTIVE_STATUSES, ACTIVE_WAITLIST_STATUSES, internalTelegramRoutes(), reportMessageIdSchema, snatchMessageIdSchema

### Community 166 - "WaitlistModalConfirmStep.vue"
Cohesion: 0.33
Nodes (5): formatDateOnly(), getMediaTypeBadgeClasses(), MediaTypeOption, SeriesProgressResponse, WaitlistCandidate

### Community 167 - "AdminFeaturesTab.vue"
Cohesion: 0.18
Nodes (11): AdminFeatureFlag, automationFlags, discoveryFlags, downloadsFlags, emit, flagConfirmModal, HIGH_IMPACT_FLAGS, HIGH_IMPACT_MESSAGES (+3 more)

### Community 168 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 169 - "streamer/src/db/index.ts"
Cohesion: 0.19
Nodes (11): apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), apps_streamer_src_db_index_systemconfig, EphemeralStream, ephemeralStreams, NewEphemeralStream, NewSystemConfig (+3 more)

### Community 173 - "src/types.ts"
Cohesion: 0.15
Nodes (20): ApiClientOptions, CarouselSession, EpisodicSession, formatBytes(), formatConfirmationCard(), formatMediaSubtitle(), SnatchParams, SnatchSession (+12 more)

### Community 176 - "App.vue"
Cohesion: 0.40
Nodes (4): isAuthenticatedRoute, route, @vercel/analytics, @vercel/speed-insights

### Community 177 - "requestDedup.ts"
Cohesion: 0.32
Nodes (6): addCoRequester(), DedupMatchParams, findMatchingCanonicalRequest(), globalRequestMutex, KeyedMutex, toRepo()

### Community 178 - "ws.ts"
Cohesion: 0.29
Nodes (5): fastify, FastifyInstance, wsRoutes, fastify-plugin, ws

### Community 179 - "checkCandidateGuards"
Cohesion: 0.50
Nodes (4): checkCandidateGuards(), initPrefilledModal(), selectCandidate(), Frontend State Management (`apps/web/src/views/WaitlistView.vue`)

### Community 180 - "closeModal"
Cohesion: 0.67
Nodes (4): closeModal(), downloadDirectly(), emit, submitWaitlistEntry()

### Community 183 - "PreferredIndexerCookieResult"
Cohesion: 0.27
Nodes (3): PreferredIndexerCookieResult, PreferredIndexerCookieStatus, MockProwlarrService

### Community 185 - "services/discovery.ts"
Cohesion: 0.13
Nodes (17): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryServiceOptions, extractTitleAndYear(), Resolution, apps_api_src_services_prowlarr_resolution, apps_api_src_services_prowlarr_scoreoptions (+9 more)

### Community 186 - "requestWaitlistIntegration.ts"
Cohesion: 0.60
Nodes (5): advanceWaitlistIfNeeded(), callWatcherEndpoint(), triggerNextSeasonWaitlist(), triggerWaitlistActions(), WaitlistTriggerParams

### Community 188 - "parseTorrentBuffer"
Cohesion: 0.70
Nodes (4): parseTorrentBuffer(), decode(), decodeBuffer(), decodeString()

### Community 189 - "AnimeTmdbConfirmSection.vue"
Cohesion: 0.33
Nodes (6): emit, handleManualSearch(), isManualSearchOpen, manualSearchQuery, props, selectedCandidate

### Community 190 - ".pruneEpisode"
Cohesion: 0.13
Nodes (6): markAllQueuedWaitingForSpace(), promoteQueuedRequests(), ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject, Consequences, Context, Decision

### Community 193 - "IStreamerJellyfinService"
Cohesion: 0.20
Nodes (5): StreamerDatabase, EphemeralEvictionCronOptions, StreamPollerOptions, IStreamerJellyfinService, StreamerJellyfinService

## Knowledge Gaps
- **1271 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+1266 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1828 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `AnimeView.vue`, `useRequestData.ts`, `LibraryView.vue`, `Sidebar.vue`, `useAdminActivity.ts`, `api.ts`, `WaitlistCard.vue`, `stores/requests.ts`, `Header.vue`, `useFeatureFlags`, `DiscoveryFeed.vue`, `useWaitlistTiers.ts`, `web/package.json`, `PromotionModal.vue`, `SeasonPackEpisodesDrawer.vue`, `ApiError`, `LibraryMediaCard.vue`, `AdminFeaturesTab.vue`, `RequestStep1Input.vue`, `WaitlistAddModal.vue`, `StreamProgressModal.vue`, `SubtitlePickerModal.vue`, `App.vue`, `TorrentReplacementModal.vue`, `vue-router`, `AnimeTmdbConfirmSection.vue`, `useRequestStep1.ts`, `ActiveStreamsShelf.vue`, `formatters.ts`, `AnimeDetailModal.vue`, `UserSettingsModal.vue`, `WaitlistView.vue`, `PartyChatPanel.vue`, `WatchPartyLobbyModal.vue`, `lucide-vue-next`, `AdminView.vue`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `IRequestsRepository` connect `IRequestsRepository` to `setupServices`, `users`, `animeTypes.ts`, `upNext.test.ts`, `requestDedup.ts`, `requestCreate.ts`, `CleanupService`, `IEpisodesRepository`, `IJellyfinService`, `upNext.ts`, `useRequestSubmit`, `SnatchHandler`, `serviceContainer.ts`, `.pruneEpisode`, `ref_vitest`, `IQBittorrentService`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `CleanupService` connect `CleanupService` to `setupServices`, `users`, `IRequestsRepository`, `IEpisodesRepository`, `IJellyfinService`, `IQBittorrentService`, `serviceContainer.ts`, `ICleanupService`, `ref_vitest`, `.pruneEpisode`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1271 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `watcher/src/services/prowlarr.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08362369337979095 - nodes in this community are weakly interconnected._
- **Should `ref_node_path` be split into smaller, more focused modules?**
  _Cohesion score 0.048115477145148355 - nodes in this community are weakly interconnected._