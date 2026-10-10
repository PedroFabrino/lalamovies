# Graph Report - Plex-auto-download  (2026-10-09)

## Corpus Check
- 568 files · ~353,452 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 9, .example 3, .css 1)

## Summary
- 3590 nodes · 8733 edges · 170 communities (129 shown, 41 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 355 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `52fdffbd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FileSystemService
- requestService.ts
- Navbar.vue
- InviteView.vue
- useRequestSubmit
- watcher/src/app.ts
- ref_vitest
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- useWaitlistTiers.test.ts
- api.ts
- useAdminActivity.ts
- vue
- devDependencies
- dev-setup.mjs
- api/src/db/schema.ts
- episodesRepository.ts
- WaitlistView.vue
- api/src/utils/torrentTitleCleaner.ts
- DiscoveryFeed.vue
- api/package.json
- middleware/auth.ts
- telegram-bot/package.json
- Context Domain Model Document
- watcher/src/services/notifications.ts
- serviceContainer.ts
- web/package.json
- PromotionModal.vue
- api/src/routes/waitlist.ts
- ref_fastify
- services/cleanup.ts
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- Waitlist Unconfirmed Release Dates and TBA Gating — Spec
- compilerOptions
- animeTypes.ts
- WaitlistAddModal.vue
- subtitleInspection.ts
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- .refreshPlayHistory
- SubtitlePickerModal.vue
- useAdminData.ts
- TelegramPairingService
- compilerOptions
- watchParties.ts
- dependencies
- TorrentReplacementModal.vue
- scripts
- ReleaseCandidate
- library.ts
- airDateFetcher.ts
- SymlinkManager
- User Role
- Waitlist Entry
- Leanback Client and Android TV Shell — Spec
- sessionMonitoringService.ts
- Media Download Manager Architecture Spec
- scripts
- Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)
- admin/index.ts
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- IndexerPrivacyCache
- Workflow
- Indexer
- Ephemeral Stream
- IRequestsRepository
- DiscordNotifier
- ActiveStreamsShelf.vue
- Leanback Client and Android TV Shell
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- UpNextService
- watcher/src/services/prowlarr.ts
- prowlarrTypes.ts
- MockCleanupService
- AnimeDetailModal.vue
- Multi-Use Revocable User Invites — Spec
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- parseTorrentBuffer
- AutoDownloadSubmitter
- DummyQB
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- telegram-bot/tsconfig.json
- UserSettingsModal.vue
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
- watcher/src/db/schema.ts
- MockCleanup
- TorrentManualInput.vue
- ICleanupService
- WatcherPoller
- WatchPartyRepository
- Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec
- api/src/services/jellyfin.ts
- IStreamerJellyfinService
- IProwlarrService
- main.ts
- Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec
- DummyJellyfinService
- Unified Series Domain and TMDB Canonical Authority
- useRequestData.ts
- CoRequesterPicker.vue
- upNext.test.ts
- streamer/src/db/index.ts
- ws.ts
- api/src/index.ts
- DebridService
- AGENTS.md — Media Download Manager Instructions
- useRequestStep1.ts
- MockCleanup
- MockCleanup
- Decision
- github-issues.md
- JellyfinSyncPlayService
- DummyJellyfinService
- ProwlarrService
- streamer/src/app.ts
- Decision
- useRequestReleases
- ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure
- ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining
- IDebridService
- AnimeTmdbConfirmSection.vue
- streamer/src/routes/streams.ts
- SeasonPackEpisodesDrawer.vue
- UnarchiveService
- ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject
- 0029. Telegram Client and Intent Parsing
- 0028. Waitlist Tiering and In-Place Episode Adjustment
- src/types.ts
- requestWaitlistIntegration.ts
- clearSelection
- DummyJellyfinService
- DummyJellyfinService
- DummyJellyfin
- isExpanded
- isSelected
- IJellyfinService

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 80 edges
2. `IRequestsRepository` - 78 edges
3. `api` - 70 edges
4. `DownloadRequest` - 66 edges
5. `vue` - 64 edges
6. `buildApp()` - 61 edges
7. `IQBittorrentService` - 61 edges
8. `users` - 60 edges
9. `RequestsRepository` - 57 edges
10. `AppDatabase` - 54 edges

## Surprising Connections (you probably didn't know these)
- `Wave 1 — Foundation (no blockers; implement first)` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
- `Solution` --references--> `executeEpisodicWaterfall()`  [INFERRED]
  docs/spec/preferred-indexer-qualification-and-episodic-waterfall.md → apps/watcher/src/services/episodicWaterfall.ts
- `2. Canonical Backend-Driven Jellyfin Launch URL` --references--> `WatchParty`  [INFERRED]
  docs/adr/0027-jellyfin-syncplay-token-auth-and-cross-platform-tv-bridge.md → apps/web/src/components/ActiveWatchPartiesShelf.vue
- `Acceptance Criteria` --references--> `WatchParty`  [INFERRED]
  docs/spec/watch-party-syncplay-deep-link-and-tv-bridge.md → apps/web/src/components/ActiveWatchPartiesShelf.vue
- `Architectural Shape` --references--> `useFeatureFlags()`  [INFERRED]
  docs/spec/leanback-client-and-android-tv-shell.md → apps/web/src/composables/useFeatureFlags.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Jellyfin Authentication and Role Model** — context_user_role, context_trusted_role, context_admin_role, context_invite, docs_adr_0001_jellyfin_as_auth_source_of_truth_jellyfin_auth, docker_docker_compose_yml_service_jellyfin [EXTRACTED 0.95]
- **Automated Discovery, Episodic Tracking, and Configurable Grace Period Ingestion** — docs_spec_discovery_feed_and_up_next_shelf_up_next_shelf, docs_spec_discovery_feed_and_up_next_shelf_episodic_gap_algorithm, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_watch_for_next_episodes, docs_spec_watch_for_next_episodes_and_configurable_grace_periods_compute_grace_hours, docs_adr_0013_per_entry_grace_periods_with_release_newness_classification_per_entry_grace_period [EXTRACTED 0.95]
- **Download Request Hardlink Lifecycle** — context_download_request, context_staging_area, context_hardlink_move, context_library, context_storage_quota, docker_docker_compose_yml_service_qbittorrent, docker_docker_compose_yml_service_api [EXTRACTED 0.95]
- **Ephemeral Debrid Streaming Pipeline** — context_ephemeral_stream, context_stream_library, docker_docker_compose_yml_service_zurg, docker_docker_compose_yml_service_rclone, docker_docker_compose_yml_service_streamer, docs_adr_0012_dual_tier_ephemeral_streaming_with_real_debrid_dual_tier_streaming [EXTRACTED 0.95]
- **Preferred Indexer Dual-Candidate Airgap Architecture** — docs_adr_0016_preferred_indexer_for_downloads_preferred_indexer_oracle, docs_adr_0016_preferred_indexer_for_downloads_discovery_dual_candidate, docs_spec_preferred_indexer_bj_share_preferred_indexer_concept, docs_spec_preferred_indexer_bj_share_dual_candidate_binding, docs_spec_ephemeral_streaming_and_real_debrid_private_airgap [EXTRACTED 0.95]
- **Private Library Security & Processing Pipeline** — docs_spec_private_media_type_and_trusted_role_private_media_type, docs_spec_private_media_type_and_trusted_role_trusted_role, docs_spec_private_media_type_and_trusted_role_jellyfin_access_control, docs_spec_subgen_gpu_subtitle_transcription_subgen_container, docs_adr_0017_local_gpu_subtitle_transcription_with_subgen_subgen_whisper_integration [EXTRACTED 0.95]

## Communities (170 total, 41 thin omitted)

### Community 0 - "FileSystemService"
Cohesion: 0.10
Nodes (9): FileSystemService, buildLibraryPath(), BuildLibraryPathParams, padNumber(), sanitizePathSegment(), EnsureLocalPosterParams, IPosterService, PosterService (+1 more)

### Community 1 - "requestService.ts"
Cohesion: 0.12
Nodes (33): executeBatchRequests(), executeCreateRequest(), addCoRequester(), DedupMatchParams, findCanonicalSeriesInfo(), findMatchingCanonicalRequest(), getDedupLockKey(), globalRequestMutex (+25 more)

### Community 2 - "Navbar.vue"
Cohesion: 0.06
Nodes (25): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isUserInvitesEnabled, isWaitlistEnabled (+17 more)

### Community 3 - "InviteView.vue"
Cohesion: 0.06
Nodes (27): ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, ApiError, apiRequest(), authStore, confirmPassword (+19 more)

### Community 4 - "useRequestSubmit"
Cohesion: 0.15
Nodes (18): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep2(), confirmStep2Selection(), handleSearchMetadata(), selectCandidate() (+10 more)

### Community 5 - "watcher/src/app.ts"
Cohesion: 0.14
Nodes (21): buildWatcherApp(), fastify, getWatcherDatabasePath(), initWatcherDatabase(), WatcherDatabase, watchRequests, AutoDownloadSubmitterOptions, WatcherPollerLogger (+13 more)

### Community 6 - "ref_vitest"
Cohesion: 0.10
Nodes (18): buildApp(), apps_api_src_db_index_featureflags, apps_api_src_db_index_invites, invites, SystemConfig, users, apps_api_src_routes_admin_adminroutes, authRoutes() (+10 more)

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

### Community 11 - "useWaitlistTiers.test.ts"
Cohesion: 0.14
Nodes (19): classifyWaitlistEntry(), DEFAULT_TIER_STATE, loadSavedTierState(), partitionWaitlistEntries(), saveTierState(), useWaitlistTiers(), collapseAll(), expandAll() (+11 more)

### Community 12 - "api.ts"
Cohesion: 0.05
Nodes (51): DiscoveryItem, error, flags, handleFeatureFlagsWsMessage(), initWsListener(), isLoaded, isLoading, useFeatureFlags() (+43 more)

### Community 13 - "useAdminActivity.ts"
Cohesion: 0.09
Nodes (20): closeStopModal(), emit, handleConfirmStop(), sessionToStop, stopMessage, emit, showDiagnostics, ActivityResponse (+12 more)

### Community 14 - "vue"
Cohesion: 0.04
Nodes (55): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), DiskInfo, emit, expandedEpisodesId, handleEpisodePruned() (+47 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "api/src/db/schema.ts"
Cohesion: 0.09
Nodes (20): EpisodeStatus, FeatureFlag, Invite, InviteRole, MediaType, NewFeatureFlag, NewInvite, NewRequestCoRequester (+12 more)

### Community 18 - "episodesRepository.ts"
Cohesion: 0.10
Nodes (7): apps_api_src_db_index_newrequestepisode, apps_api_src_db_index_requestepisode, apps_api_src_db_index_requestepisodes, RequestEpisode, ConsumedEpisodeItem, EpisodesRepository, InsertRequestEpisode

### Community 19 - "WaitlistView.vue"
Cohesion: 0.04
Nodes (60): authStore, canAdjustTarget, emit, handleCardClick(), isActionable, isActiveEpisodic, isAdjustPopoverOpen, props (+52 more)

### Community 20 - "api/src/utils/torrentTitleCleaner.ts"
Cohesion: 0.24
Nodes (8): resolveSourceItem(), ResolveSourceItemParams, ResolveSourceItemResult, CleanedTorrentResult, cleanSeparators(), cleanTorrentTitle(), ExtractedEpisodeInfo, extractEpisodeInfo()

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "middleware/auth.ts"
Cohesion: 0.12
Nodes (20): User, authMiddleware(), fastify, @fastify/jwt, FastifyJWT, FastifyRequest, JwtPayload, discoveryFeedQuerySchema (+12 more)

### Community 24 - "telegram-bot/package.json"
Cohesion: 0.08
Nodes (24): dependencies, dotenv, devDependencies, esbuild, tsx, @types/node, typescript, vitest (+16 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "watcher/src/services/notifications.ts"
Cohesion: 0.16
Nodes (15): waitlistActionRoutes(), waitlistCreateRoutes(), waitlistCrudRoutes(), renderStatusHtml(), waitlistRoutes(), waitlistMagicLinkRoutes(), deleteDiscordMessage(), generateMagicLinkToken() (+7 more)

### Community 27 - "serviceContainer.ts"
Cohesion: 0.04
Nodes (47): AppOptions, fastify, FastifyInstance, CleanupCron, CleanupCronLogger, DownloadPoller, getLocalTimeInTimezone(), isInsideWindow() (+39 more)

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "api/src/routes/waitlist.ts"
Cohesion: 0.19
Nodes (11): animeSeasonalRoutes(), resolveTmdbSchema, seasonsQuerySchema, forwardToWatcher(), waitlistAuth(), WaitlistEntry, WaitlistRequestBody, WaitlistResponse (+3 more)

### Community 31 - "ref_fastify"
Cohesion: 0.09
Nodes (31): featureFlags, adminGuard(), isFeatureEnabled(), requireFeature(), internalRoutes(), subgenWebhookSchema, batchRoutes(), createRoutes() (+23 more)

### Community 32 - "services/cleanup.ts"
Cohesion: 0.06
Nodes (63): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequest, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase() (+55 more)

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "Waitlist Unconfirmed Release Dates and TBA Gating — Spec"
Cohesion: 0.10
Nodes (17): Adding Undated Media, Frontend State Management (`apps/web/src/views/WaitlistView.vue`), Further Notes, Implementation Decisions, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope, Problem Statement (+9 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeTypes.ts"
Cohesion: 0.05
Nodes (42): extractShowNameFromPath(), stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry, calculateCurrentSeasonAndYear(), calculateNextSeasonAndYear() (+34 more)

### Community 39 - "WaitlistAddModal.vue"
Cohesion: 0.07
Nodes (33): availableReleasesCount, candidates, checkCandidateGuards(), closeModal(), downloadDirectly(), emit, hasSearched, initPrefilledModal() (+25 more)

### Community 40 - "subtitleInspection.ts"
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

### Community 46 - ".refreshPlayHistory"
Cohesion: 0.07
Nodes (26): matchesLibraryPath(), Consequences, Considered Options, Context, Decision, Per-Episode Consumption Tracking and Selective Torrent Pruning, API Routes (`apps/api/src/routes/requests/episodes.ts`), Cleanup Service (`apps/api/src/services/cleanup.ts`) (+18 more)

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 48 - "useAdminData.ts"
Cohesion: 0.07
Nodes (26): AdminFeatureFlag, automationFlags, discoveryFlags, downloadsFlags, emit, flagConfirmModal, HIGH_IMPACT_FLAGS, HIGH_IMPACT_MESSAGES (+18 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "watchParties.ts"
Cohesion: 0.10
Nodes (27): attachJellyfinWebUrl(), createWatchPartySchema, switchMediaSchema, watchPartyRoutes(), DiscordEmbed, DiscordEmbedField, NotificationContext, resolveDiscordWebhookUrl() (+19 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.10
Nodes (18): activeTab, candidates, canSubmit, emit, errorMessage, handleClose(), handleConfirmReplace(), isPrivate (+10 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 55 - "ReleaseCandidate"
Cohesion: 0.15
Nodes (5): ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult, MockProwlarrService, MockProwlarrService

### Community 56 - "library.ts"
Cohesion: 0.18
Nodes (11): artworkCache, deleteMediaSchema, EpisodeItem, getShowFolderPath(), LibraryMediaCard, libraryRoutes(), MediaArtwork, MediaRequester (+3 more)

### Community 57 - "airDateFetcher.ts"
Cohesion: 0.18
Nodes (12): AirDateFetcherLogger, AniListMediaResponse, AniListNextAiringEpisode, AniListStartDate, fetchAirDate(), FetchAirDateParams, fetchAniListAirDate(), fetchTmdbAirDate() (+4 more)

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
Cohesion: 0.08
Nodes (28): GpuMetrics, PlaybackSessionItem, PlaybackSessionPlayState, PlaybackSessionTranscodingInfo, RawJellyfinItem, RawJellyfinMediaStream, RawJellyfinPlayState, RawJellyfinSession (+20 more)

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)"
Cohesion: 0.15
Nodes (12): Apple TV Authentication (Quick Connect), Architectural Shape, Content Discovery & Living-Room Actions, Draft Spec: Native Apple TV Companion App (`apps/tv-apple`), Further Notes, Implementation Decisions, Out of Scope, Problem Statement (+4 more)

### Community 66 - "admin/index.ts"
Cohesion: 0.11
Nodes (18): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, getConfig(), _resetConfigForTesting(), testConfigDefaults, validateConfig(), ValidateConfigOptions (+10 more)

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
Nodes (30): DownloadRequest, HistoryMatcherOptions, apps_api_src_services_prowlarr_resolution, markAllQueuedWaitingForSpace(), promoteQueuedRequests(), RequestsRepository, DeletedRequestListItem, IRequestsRepository (+22 more)

### Community 76 - "DiscordNotifier"
Cohesion: 0.24
Nodes (5): DiscordNotifier, apps_api_src_services_notifications_discordnotifier, NotificationService, ResendNotifier, 3. Notification Service Channel Router (`apps/api`)

### Community 77 - "ActiveStreamsShelf.vue"
Cohesion: 0.04
Nodes (56): authStore, createdParty, emit, EphemeralStreamItem, featureFlags, fetchStreams(), handleEvict(), handlePartyCreated() (+48 more)

### Community 78 - "Leanback Client and Android TV Shell"
Cohesion: 0.50
Nodes (3): Context, Decision, Leanback Client and Android TV Shell

### Community 79 - "Isolated Containerized Development Stack"
Cohesion: 0.40
Nodes (5): Development Stack, Production Stack, Isolated Containerized Development Stack, ADR 0007 Document, Rationale: Production Safety and Real NTFS Hardlink Testing

### Community 80 - "Graphify Knowledge Graph"
Cohesion: 0.50
Nodes (4): Graphify Rules Document, Graphify Knowledge Graph, Graphify Workflow Document, Graphify Pipeline Workflow

### Community 82 - "UpNextService"
Cohesion: 0.29
Nodes (5): groupShowRequests(), find(), union(), matchesTarget(), UpNextService

### Community 83 - "watcher/src/services/prowlarr.ts"
Cohesion: 0.08
Nodes (32): CAM_REGEX, formatBytes(), parseReleaseTitle(), ProwlarrSearchResult, ReleaseCandidate, ReleaseSource, Resolution, ScoreOptions (+24 more)

### Community 84 - "prowlarrTypes.ts"
Cohesion: 0.39
Nodes (5): DiscoveryItem, ReleaseSource, Resolution, ScorableCandidate, VideoCodec

### Community 86 - "AnimeDetailModal.vue"
Cohesion: 0.02
Nodes (99): displayTitle, isAiringOrFinished, { isItemWaitlisted }, isWaitlistedEffective, posterUrl, props, statusBadgeClasses, statusLabel (+91 more)

### Community 87 - "Multi-Use Revocable User Invites — Spec"
Cohesion: 0.12
Nodes (16): Administrative Visibility & Moderation, Backend Endpoints (`apps/api/src/routes/invites.ts`), Further Notes, Implementation Decisions, Multi-Use Revocable User Invites — Spec, Out of Scope, Problem Statement, Role Safety & Security (+8 more)

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 93 - "parseTorrentBuffer"
Cohesion: 0.14
Nodes (12): QBittorrentError, QBittorrentService, BencodeValue, ParsedTorrent, parseTorrentBuffer(), decode(), decodeBuffer(), decodeString() (+4 more)

### Community 94 - "AutoDownloadSubmitter"
Cohesion: 0.14
Nodes (8): FastifyInstance, WatcherAppOptions, AutoDownloadSubmitter, EpisodicTrackingService, sendWaitlistErrorNotification(), WaitlistCheckService, 2. Episodic Waterfall Chaining Engine (`apps/watcher`), Further Notes

### Community 99 - "telegram-bot/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 100 - "UserSettingsModal.vue"
Cohesion: 0.11
Nodes (19): authStore, clearGeminiApiKey(), countdownText, countdownTimer, expiresIn, feedbackMessage, geminiApiKeyInput, generatePairingCode() (+11 more)

### Community 101 - "api/src/services/prowlarr.ts"
Cohesion: 0.24
Nodes (12): formatBytes(), isTitleRelevant(), parseReleaseTitle(), scoreRelease(), getPreferredIndexerMinSeeders(), isPreferredIndexer(), isQualifiedPreferred(), PreferredCandidateLike (+4 more)

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.10
Nodes (19): Active Media Detection & Guardrails, API Routes, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Services, Deletion Tracking & Audit Trail, Further Notes, Implementation Decisions (+11 more)

### Community 115 - "JellyfinService"
Cohesion: 0.06
Nodes (26): JellyfinApiError, JellyfinService, 1. Database Schema (`apps/api`), 1. UI Entry Points & Discoverability, 2. Jellyfin Service SyncPlay Extension (`apps/api`), 2. Media Selection & Creation Modal (`CreateWatchPartyModal.vue`), 3. Immediate Post-Creation Player Handoff, 4. Watch Party API Routes (`apps/api/src/routes/watchParties.ts`) (+18 more)

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

### Community 117 - "Unified Series Domain and TMDB Canonical Authority — Spec"
Cohesion: 0.13
Nodes (14): Architectural Shape, Automated Waitlist Monitoring & Up Next Tracking, Further Notes, Implementation Decisions, Legacy Data Migration & System Health, Out of Scope, Problem Statement, Prowlarr Dual-Query Release Discovery (+6 more)

### Community 118 - "watcher/src/db/schema.ts"
Cohesion: 0.17
Nodes (13): NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, waitlistCoRequesters, WatchRequest, AutoDownloadSubmitterLogger, CreateWaitlistBody, normalizeTitle() (+5 more)

### Community 120 - "TorrentManualInput.vue"
Cohesion: 0.60
Nodes (4): emit, fileInputRef, onClear(), onFileChange()

### Community 121 - "ICleanupService"
Cohesion: 0.14
Nodes (3): CleanupCronOptions, ICleanupService, PruneEpisodeResult

### Community 122 - "WatcherPoller"
Cohesion: 0.09
Nodes (18): WatcherPoller, computeGraceHours(), ComputeGraceHoursOptions, 1. Watcher Schema & Diagnostics (`apps/watcher`), 2. Watcher Advance Endpoint (`apps/watcher`), 3. Main API Request Integration (`apps/api`), 4. Frontend Decomposition & Waitlist UI (`apps/web`), 5. Fast-Track Request Step 3 Initialization (`apps/web`) (+10 more)

### Community 123 - "WatchPartyRepository"
Cohesion: 0.17
Nodes (3): NewWatchPartyRoom, WatchPartyRoom, WatchPartyRepository

### Community 124 - "Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec"
Cohesion: 0.12
Nodes (16): 1. Oracle VPS Configuration (`167.126.3.136`), 2. Home Stack Modifications (`docker/docker-compose.yml`), 3. DNS Configuration (Cloudflare), Cloudflare Compliance & Security, Further Notes, Good Test Principles, Implementation Decisions, Infrastructure Cleanliness (+8 more)

### Community 125 - "api/src/services/jellyfin.ts"
Cohesion: 0.05
Nodes (14): downloadRequests, requestCoRequesters, SpaceCheckResult, InvalidCredentialsError, JellyfinAuthResult, TorrentInfo, MockCleanupService, MockCleanupService (+6 more)

### Community 126 - "IStreamerJellyfinService"
Cohesion: 0.20
Nodes (5): StreamerDatabase, EphemeralEvictionCronOptions, StreamPollerOptions, IStreamerJellyfinService, StreamerJellyfinService

### Community 127 - "IProwlarrService"
Cohesion: 0.12
Nodes (7): DiscoveryCategory, DiscoveryFeedResult, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), IProwlarrService, apps_api_src_services_prowlarr_scoreoptions

### Community 128 - "main.ts"
Cohesion: 0.50
Nodes (3): app, pinia, apps_web_src_style

### Community 129 - "Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec"
Cohesion: 0.13
Nodes (14): 1. Seeder & Resolution Diagnostics (`apps/watcher` & `apps/api`), Episodic Waterfall Automation, Further Notes, Good Test Principles, Implementation Decisions, Out of Scope, Preferred Indexer Health & Seeder Qualification, Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec (+6 more)

### Community 131 - "Unified Series Domain and TMDB Canonical Authority"
Cohesion: 0.33
Nodes (5): Consequences, Considered Options, Context, Decision, Unified Series Domain and TMDB Canonical Authority

### Community 132 - "useRequestData.ts"
Cohesion: 0.07
Nodes (54): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange(), step2QueryInputRef, { isItemWaitlisted } (+46 more)

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 134 - "upNext.test.ts"
Cohesion: 0.05
Nodes (24): runHardlinkingRecovery(), AnilistMigrationOptions, AnilistMigrationResult, runLegacyAnilistMigration(), BaseMetadataService, IMetadataService, MetadataApiError, MetadataCandidate (+16 more)

### Community 135 - "streamer/src/db/index.ts"
Cohesion: 0.19
Nodes (11): apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), apps_streamer_src_db_index_systemconfig, EphemeralStream, ephemeralStreams, NewEphemeralStream, NewSystemConfig (+3 more)

### Community 136 - "ws.ts"
Cohesion: 0.29
Nodes (5): fastify, FastifyInstance, wsRoutes, fastify-plugin, ws

### Community 137 - "api/src/index.ts"
Cohesion: 0.13
Nodes (14): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+6 more)

### Community 139 - "AGENTS.md — Media Download Manager Instructions"
Cohesion: 0.50
Nodes (3): AGENTS.md — Media Download Manager Instructions, Architectural Rules, Issue Tracking & Task Management

### Community 140 - "useRequestStep1.ts"
Cohesion: 0.21
Nodes (13): useRequestStep1(), processFiles(), removeBatchItem(), UseRequestStep1Options, parseTorrentFile(), decode(), decodeBuffer(), decodeString() (+5 more)

### Community 143 - "Decision"
Cohesion: 0.20
Nodes (9): 1. Native Jellyfin SyncPlay Launch Bridge, 2. Eligible Media Scope, 3. In-Place Media Switching & Discord Party Timeline, 4. Context-Specific Discord Channel Routing, 5. Room Persistence & Automated Cleanup, ADR-0025: Watch Party SyncPlay Integration & In-Place Timeline Progression, Consequences, Context (+1 more)

### Community 146 - "JellyfinSyncPlayService"
Cohesion: 0.13
Nodes (12): JellyfinSyncPlayService, Acceptance Criteria, Background & Problem Statement, Cross-Platform TV Participation & Canonical Handoff, Deep Link & Discord Routing, Implementation Architecture, Jellyfin User Token & SyncPlay Provisioning, Slice 1: Backend Jellyfin User Token Storage, Migration, SyncPlay Provisioning & Canonical Launch URL (+4 more)

### Community 151 - "streamer/src/app.ts"
Cohesion: 0.24
Nodes (7): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, DirectDownloader, IDirectDownloader, ref_node_stream

### Community 152 - "Decision"
Cohesion: 0.22
Nodes (8): 1. Authenticated User Token Storage for SyncPlay, 2. Canonical Backend-Driven Jellyfin Launch URL, 3. Dedicated `/party/:id` Route & Auto-Lobby State, 4. Cross-Platform TV Guidance & AirPlay Launch Bridge, ADR-0027: Jellyfin SyncPlay Token Authentication, Canonical Handoff & Cross-Platform TV Bridge, Consequences, Context, Decision

### Community 155 - "useRequestReleases"
Cohesion: 0.27
Nodes (8): useRequestReleases(), checkCacheForCandidates(), extractInfoHash(), fetchReleasesForCandidate(), getCandidateCacheStatus(), getSearchTitles(), reloadReleasesSilently(), searchReleasesApi()

### Community 156 - "ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure"
Cohesion: 0.40
Nodes (4): ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure, Consequences, Context, Decision

### Community 157 - "ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining"
Cohesion: 0.25
Nodes (7): 1. Preferred Indexer Qualification, 2. Resolution Gating & 720p Fallback, 3. Episodic Waterfall Chaining Engine, ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining, Consequences, Context, Decision

### Community 159 - "AnimeTmdbConfirmSection.vue"
Cohesion: 0.33
Nodes (6): emit, handleManualSearch(), isManualSearchOpen, manualSearchQuery, props, selectedCandidate

### Community 160 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 161 - "SeasonPackEpisodesDrawer.vue"
Cohesion: 0.11
Nodes (12): canManage, confirmPruneEpisode, emit, episodes, error, executePrune(), loading, props (+4 more)

### Community 165 - "ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject"
Cohesion: 0.40
Nodes (4): ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject, Consequences, Context, Decision

### Community 173 - "src/types.ts"
Cohesion: 0.06
Nodes (40): ApiClientOptions, MdmApiClient, CallbackSession, CallbackStore, CarouselHandler, CarouselSession, EpisodicHandler, EpisodicSession (+32 more)

### Community 176 - "requestWaitlistIntegration.ts"
Cohesion: 0.60
Nodes (5): advanceWaitlistIfNeeded(), callWatcherEndpoint(), triggerNextSeasonWaitlist(), triggerWaitlistActions(), WaitlistTriggerParams

### Community 180 - "clearSelection"
Cohesion: 0.40
Nodes (6): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), handleLibraryEpisodePruned(), switchCategory()

### Community 192 - "IJellyfinService"
Cohesion: 0.06
Nodes (20): AppDatabase, DownloadPollerOptions, PollerLogger, UnarchiveDaemonOptions, CleanupService, CleanupServiceOptions, EpisodicPruningService, IFileSystemService (+12 more)

## Knowledge Gaps
- **1169 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+1164 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1685 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `main.ts`, `Navbar.vue`, `InviteView.vue`, `useRequestData.ts`, `LibraryView.vue`, `useWaitlistTiers.test.ts`, `api.ts`, `useAdminActivity.ts`, `useRequestStep1.ts`, `WaitlistView.vue`, `DiscoveryFeed.vue`, `web/package.json`, `PromotionModal.vue`, `AnimeTmdbConfirmSection.vue`, `SeasonPackEpisodesDrawer.vue`, `WaitlistAddModal.vue`, `StreamProgressModal.vue`, `SubtitlePickerModal.vue`, `useAdminData.ts`, `TorrentReplacementModal.vue`, `ActiveStreamsShelf.vue`, `AnimeDetailModal.vue`, `UserSettingsModal.vue`, `TorrentManualInput.vue`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `useFeatureFlags()` connect `api.ts` to `Navbar.vue`, `InviteView.vue`, `useRequestData.ts`, `animeTypes.ts`, `ActiveStreamsShelf.vue`, `vue`, `DiscoveryFeed.vue`, `AnimeDetailModal.vue`, `Leanback Client and Android TV Shell — Spec`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `api` connect `api.ts` to `SeasonPackEpisodesDrawer.vue`, `Navbar.vue`, `InviteView.vue`, `UserSettingsModal.vue`, `useRequestData.ts`, `WaitlistAddModal.vue`, `LibraryView.vue`, `StreamProgressModal.vue`, `ActiveStreamsShelf.vue`, `useAdminActivity.ts`, `SubtitlePickerModal.vue`, `vue`, `useAdminData.ts`, `WaitlistView.vue`, `DiscoveryFeed.vue`, `AnimeDetailModal.vue`, `TorrentReplacementModal.vue`, `PromotionModal.vue`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IJellyfinService` (e.g. with `Solution` and `2. Jellyfin Service SyncPlay Extension (`apps/api`)`) actually correct?**
  _`IJellyfinService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1169 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FileSystemService` be split into smaller, more focused modules?**
  _Cohesion score 0.0989247311827957 - nodes in this community are weakly interconnected._