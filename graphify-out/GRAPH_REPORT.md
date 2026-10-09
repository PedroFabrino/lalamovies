# Graph Report - Plex-auto-download  (2026-10-09)

## Corpus Check
- 540 files · ~338,940 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .example 3, .css 1)

## Summary
- 3397 nodes · 8217 edges · 175 communities (131 shown, 44 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 302 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `96dc1606`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api/src/db/index.ts
- requestCreate.ts
- useFeatureFlags
- watcherPoller.ts
- useRequestStep1.ts
- watcher/src/app.ts
- useRequestData.ts
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- api.ts
- useAdminActivity.ts
- DashboardView.vue
- devDependencies
- dev-setup.mjs
- WatchPartyLobbyModal.vue
- IEpisodesRepository
- WaitlistCard.vue
- upNext.ts
- DiscoveryFeed.vue
- api/package.json
- api/src/db/schema.ts
- vue
- Context Domain Model Document
- watcher/src/services/notifications.ts
- serviceContainer.ts
- web/package.json
- PromotionModal.vue
- useWaitlistTiers.ts
- requests/index.ts
- fileSystem.ts
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- MockJellyfinService
- compilerOptions
- animeTypes.ts
- WaitlistAddModal.vue
- requestService.ts
- Docker Compose Stack Specification
- StreamProgressModal.vue
- Cleanup Policy
- Atomic Hardlink Staging Flow
- dependencies
- .refreshPlayHistory
- SubtitlePickerModal.vue
- useAdminData.ts
- search.ts
- compilerOptions
- api/src/services/notifications.ts
- dependencies
- TorrentReplacementModal.vue
- scripts
- CleanupService
- parseTorrentBuffer
- airDateFetcher.ts
- SymlinkManager
- User Role
- Waitlist Entry
- Leanback Client and Android TV Shell — Spec
- sessionMonitoringService.ts
- Media Download Manager Architecture Spec
- scripts
- Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)
- src/config.ts
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- api/src/routes/streams.ts
- Workflow
- Indexer
- Ephemeral Stream
- DownloadRequest
- Waitlist Unconfirmed Release Dates and TBA Gating — Spec
- ActiveStreamsShelf.vue
- Leanback Client and Android TV Shell
- Isolated Containerized Development Stack
- Graphify Knowledge Graph
- ref_drizzle_kit
- AdminView.vue
- watcher/src/services/prowlarr.ts
- WaitlistEpisodeAdjustPopover.vue
- MockCleanupService
- AnimeDetailModal.vue
- Multi-Use Revocable User Invites — Spec
- utils.ts
- Web SPA HTML Entrypoint
- App.vue
- QBittorrentService
- AutoDownloadSubmitter
- DummyQB
- vite-env.d.ts
- web/tsconfig.json
- vite.config.ts
- MockCleanup
- streamer/src/services/jellyfin.ts
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
- WatchRequest
- unarchive.ts
- RequestStep1Input.vue
- ICleanupService
- Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec
- WatchPartyRepository
- Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec
- ref_drizzle_orm
- IStreamerJellyfinService
- setupServices
- MockCleanupService
- Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec
- Spec: Waitlist Tiering and In-Place Target Episode Adjustment
- Unified Series Domain and TMDB Canonical Authority
- Spec: Codebase Health, Architecture Hardening & Residual Refactoring
- CoRequesterPicker.vue
- DummyJellyfinService
- streamer/src/app.ts
- ws.ts
- api/src/index.ts
- DebridService
- AGENTS.md — Media Download Manager Instructions
- DummyJellyfinService
- DummyJellyfinService
- SeasonPackEpisodesDrawer.vue
- Decision
- .pruneEpisode
- github-issues.md
- JellyfinSyncPlayService
- UserInviteModal.vue
- DummyJellyfinService
- requestDedup.ts
- WaitlistModalConfirmStep.vue
- MockCleanupService
- Decision
- MockCleanupService
- MockCleanupService
- ref_vitest
- ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure
- ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining
- IDebridService
- AnimeTmdbConfirmSection.vue
- streamer/src/routes/streams.ts
- clearSelection
- streamer/src/index.ts
- UnarchiveService
- OpenSubtitlesService
- promoteQueuedRequests
- Per-Episode Consumption Tracking and Selective Torrent Pruning
- DummyJellyfin
- isExpanded
- isSelected
- MockMetadata
- MockMetadata
- 0028. Waitlist Tiering and In-Place Episode Adjustment
- requestWaitlistIntegration.ts
- IRequestsRepository

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 80 edges
2. `IRequestsRepository` - 78 edges
3. `api` - 69 edges
4. `DownloadRequest` - 66 edges
5. `vue` - 63 edges
6. `IQBittorrentService` - 61 edges
7. `buildApp()` - 59 edges
8. `RequestsRepository` - 57 edges
9. `users` - 56 edges
10. `AppDatabase` - 54 edges

## Surprising Connections (you probably didn't know these)
- `Wave 1 — Foundation (no blockers; implement first)` --references--> `CleanupService`  [INFERRED]
  docs/spec/codebase-health-and-architecture-hardening.md → apps/api/src/services/cleanup.ts
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

## Communities (175 total, 44 thin omitted)

### Community 0 - "api/src/db/index.ts"
Cohesion: 0.08
Nodes (41): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequests, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase(), apps_api_src_db_index_invites (+33 more)

### Community 1 - "requestCreate.ts"
Cohesion: 0.27
Nodes (16): executeBatchRequests(), executeCreateRequest(), findCanonicalSeriesInfo(), getDedupLockKey(), globalRequestMutex, buildInitialDownloadRequest(), BuildInitialRequestParams, checkDiskSafety() (+8 more)

### Community 2 - "useFeatureFlags"
Cohesion: 0.05
Nodes (40): authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isUserInvitesEnabled, isWaitlistEnabled (+32 more)

### Community 3 - "watcherPoller.ts"
Cohesion: 0.13
Nodes (14): WatcherDatabase, WatcherPoller, WatcherPollerLogger, WatcherPollerOptions, EpisodicTrackingOptions, WatcherAnilistMigrationOptions, WatcherProwlarrService, ReleaseGatingLogger (+6 more)

### Community 4 - "useRequestStep1.ts"
Cohesion: 0.09
Nodes (31): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep1(), processFiles(), removeBatchItem(), UseRequestStep1Options (+23 more)

### Community 5 - "watcher/src/app.ts"
Cohesion: 0.19
Nodes (13): buildWatcherApp(), fastify, getWatcherDatabasePath(), initWatcherDatabase(), NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, waitlistCoRequesters (+5 more)

### Community 6 - "useRequestData.ts"
Cohesion: 0.06
Nodes (57): step2QueryInputRef, { isItemWaitlisted }, props, buildCandidate(), enrichCandidateMetadata(), FastTrackParsedData, parseEpisodeAndGranularity(), parseFastTrack() (+49 more)

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
Cohesion: 0.09
Nodes (18): activeView, addModalRef, approvingEntryId, authStore, checkingEntryId, entriesRef, handleCheckAll(), handleCheckEntry() (+10 more)

### Community 12 - "api.ts"
Cohesion: 0.06
Nodes (30): api, router, routes, useAuthStore, User, ProgressData, RequestStatus, useRequestsStore (+22 more)

### Community 13 - "useAdminActivity.ts"
Cohesion: 0.09
Nodes (20): closeStopModal(), emit, handleConfirmStop(), sessionToStop, stopMessage, emit, showDiagnostics, ActivityResponse (+12 more)

### Community 14 - "DashboardView.vue"
Cohesion: 0.06
Nodes (18): DiskInfo, emit, useDashboardActions(), useStreamPlayback(), handleInstantStream(), handleStreamPlaybackError(), activeStreamsShelfRef, {
  activeTab, setActiveTab, refreshCurrentTab,
  showSubtitleModal, subtitleTarget, openSubtitlePicker, showRedownloadModal,
  redownloadTarget, openRedownloadModal, handleRedownloaded, itemToDelete,
  isDeleting, executeDelete, handleToggleKeep, retryingId, handleRetry,
  transcribingId, handleTranscribe,
} (+10 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "WatchPartyLobbyModal.vue"
Cohesion: 0.08
Nodes (22): authStore, changeMediaItemId, changeMediaTitle, emit, handleManualChangeMedia(), handlePlayNextEpisode(), HistoryItem, isHost (+14 more)

### Community 18 - "IEpisodesRepository"
Cohesion: 0.09
Nodes (11): apps_api_src_db_index_newrequestepisode, apps_api_src_db_index_requestepisode, apps_api_src_db_index_requestepisodes, NewRequestEpisode, RequestEpisode, requestEpisodes, ConsumedEpisodeItem, EpisodesRepository (+3 more)

### Community 19 - "WaitlistCard.vue"
Cohesion: 0.11
Nodes (24): authStore, canAdjustTarget, emit, handleCardClick(), isActionable, isActiveEpisodic, isAdjustPopoverOpen, props (+16 more)

### Community 20 - "upNext.ts"
Cohesion: 0.05
Nodes (40): DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryServiceOptions, AnilistMigrationOptions, AnilistMigrationResult, BaseMetadataService, IMetadataService (+32 more)

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.08
Nodes (30): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+22 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "api/src/db/schema.ts"
Cohesion: 0.04
Nodes (65): EpisodeStatus, FeatureFlag, Invite, InviteRole, invites, MediaType, NewFeatureFlag, NewInvite (+57 more)

### Community 24 - "vue"
Cohesion: 0.04
Nodes (58): ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, displayTitle, isAiringOrFinished, { isItemWaitlisted }, posterUrl (+50 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "watcher/src/services/notifications.ts"
Cohesion: 0.21
Nodes (11): renderStatusHtml(), waitlistMagicLinkRoutes(), deleteDiscordMessage(), generateMagicLinkToken(), ResendNotifier, sendWaitlistCancelNotification(), SendWaitlistCancelNotificationOptions, SendWaitlistErrorNotificationOptions (+3 more)

### Community 27 - "serviceContainer.ts"
Cohesion: 0.06
Nodes (31): AppOptions, fastify, FastifyInstance, watchPartyRooms, CleanupCron, CleanupCronLogger, getLocalTimeInTimezone(), isInsideWindow() (+23 more)

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "useWaitlistTiers.ts"
Cohesion: 0.15
Nodes (19): classifyWaitlistEntry(), DEFAULT_TIER_STATE, loadSavedTierState(), partitionWaitlistEntries(), saveTierState(), STORAGE_KEY, useWaitlistTiers(), collapseAll() (+11 more)

### Community 31 - "requests/index.ts"
Cohesion: 0.16
Nodes (16): adminGuard(), batchRoutes(), createRoutes(), deletedRoutes(), episodesRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes() (+8 more)

### Community 32 - "fileSystem.ts"
Cohesion: 0.07
Nodes (24): FileSystemService, HardlinkedEpisodeInfo, ProcessAndHardlinkInput, ProcessAndHardlinkResult, ProcessAndHardlinkTorrentResult, buildLibraryPath(), BuildLibraryPathParams, padNumber() (+16 more)

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 36 - "MockJellyfinService"
Cohesion: 0.10
Nodes (3): InvalidCredentialsError, JellyfinApiError, MockJellyfinService

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeTypes.ts"
Cohesion: 0.06
Nodes (44): AnimeHistoryMatcher, extractShowNameFromPath(), HistoryMatcherOptions, stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry (+36 more)

### Community 39 - "WaitlistAddModal.vue"
Cohesion: 0.07
Nodes (30): availableReleasesCount, candidates, checkCandidateGuards(), closeModal(), downloadDirectly(), emit, hasSearched, initPrefilledModal() (+22 more)

### Community 40 - "requestService.ts"
Cohesion: 0.20
Nodes (12): executePromoteFromStream(), executeRetryRequest(), BatchItemInput, BatchRequestInput, BatchRequestResult, CreateRequestInput, CreateRequestResult, PromoteStreamInput (+4 more)

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
Cohesion: 0.09
Nodes (22): matchesLibraryPath(), Context, API Routes (`apps/api/src/routes/requests/episodes.ts`), Cleanup Service (`apps/api/src/services/cleanup.ts`), Database Schema (`apps/api/src/db/schema.ts`), Episodic Storage Reclamation, Existing Downloads Backfill, File Processing & Hardlinking (`apps/api/src/services/fileSystem.ts`) (+14 more)

### Community 47 - "SubtitlePickerModal.vue"
Cohesion: 0.11
Nodes (16): applyError, applyingTarget, emit, handleApplySelected(), handleApplySingle(), handleClose(), handleFetchBest(), isApplying (+8 more)

### Community 48 - "useAdminData.ts"
Cohesion: 0.07
Nodes (26): AdminFeatureFlag, automationFlags, discoveryFlags, downloadsFlags, emit, flagConfirmModal, HIGH_IMPACT_FLAGS, HIGH_IMPACT_MESSAGES (+18 more)

### Community 49 - "search.ts"
Cohesion: 0.23
Nodes (9): batchItemSchema, batchRequestSchema, createRequestSchema, existsRequestSchema, replaceTorrentSchema, searchMetadataSchema, searchReleasesSchema, TmdbEpisodeInfo (+1 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "api/src/services/notifications.ts"
Cohesion: 0.08
Nodes (29): attachJellyfinWebUrl(), createWatchPartySchema, switchMediaSchema, watchPartyRoutes(), DiscordEmbed, DiscordEmbedField, DiscordNotifier, formatNotificationMediaTitle() (+21 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.09
Nodes (22): emit, fileInputRef, onClear(), onFileChange(), activeTab, candidates, canSubmit, emit (+14 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 56 - "parseTorrentBuffer"
Cohesion: 0.22
Nodes (10): BencodeValue, ParsedTorrent, parseTorrentBuffer(), decode(), decodeBuffer(), decodeString(), TorrentInfoDict, extractHashFromMagnet() (+2 more)

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

### Community 66 - "src/config.ts"
Cohesion: 0.25
Nodes (8): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, getConfig(), _resetConfigForTesting(), testConfigDefaults, validateConfig(), ValidateConfigOptions

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

### Community 71 - "api/src/routes/streams.ts"
Cohesion: 0.15
Nodes (8): forwardToStreamer(), streamsAuth(), streamsRoutes(), apps_api_src_services_prowlarr_haspasskey, apps_api_src_services_prowlarr_isknownprivateindexer, hasPasskey(), IndexerPrivacyCache, isKnownPrivateIndexer()

### Community 72 - "Workflow"
Cohesion: 0.22
Nodes (8): 1. Verify Git Status & Commit, 2. Verify Push Status, 3. Identify Affected Containers, 4. Rebuild & Restart Relevant Containers, 5. Verify Container Health & Logs, 6. Report Summary, Commit, Push & Rebuild Relevant Containers, Workflow

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "DownloadRequest"
Cohesion: 0.08
Nodes (4): DownloadRequest, RequestsRepository, DeletedRequestListItem, RequestListItem

### Community 76 - "Waitlist Unconfirmed Release Dates and TBA Gating — Spec"
Cohesion: 0.12
Nodes (16): Adding Undated Media, Further Notes, Implementation Decisions, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope, Problem Statement, Single Highest Seam: Watcher HTTP API Integration Tests (+8 more)

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

### Community 82 - "AdminView.vue"
Cohesion: 0.06
Nodes (37): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), emit, expandedEpisodesId, handleEpisodePruned(), props (+29 more)

### Community 83 - "watcher/src/services/prowlarr.ts"
Cohesion: 0.08
Nodes (31): CAM_REGEX, formatBytes(), parseReleaseTitle(), ProwlarrSearchResult, ReleaseCandidate, ReleaseSource, Resolution, ScoreOptions (+23 more)

### Community 84 - "WaitlistEpisodeAdjustPopover.vue"
Cohesion: 0.20
Nodes (10): emit, errorMessage, handleSave(), isSeasonPack, isValid, props, saving, seasonNumber (+2 more)

### Community 86 - "AnimeDetailModal.vue"
Cohesion: 0.05
Nodes (58): isWaitlistedEffective, applyResolveResult(), bannerUrl, cleanDescription, confirmWaitlistSubmission(), displayTitle, emit, handleClose() (+50 more)

### Community 87 - "Multi-Use Revocable User Invites — Spec"
Cohesion: 0.12
Nodes (16): Administrative Visibility & Moderation, Backend Endpoints (`apps/api/src/routes/invites.ts`), Further Notes, Implementation Decisions, Multi-Use Revocable User Invites — Spec, Out of Scope, Problem Statement, Role Safety & Security (+8 more)

### Community 91 - "Web SPA HTML Entrypoint"
Cohesion: 0.67
Nodes (3): Web SPA HTML Entrypoint, Vue Single Page Application Mount, Web Frontend Vue3 Template Guide

### Community 94 - "AutoDownloadSubmitter"
Cohesion: 0.15
Nodes (8): FastifyInstance, WatcherAppOptions, AutoDownloadSubmitter, AutoDownloadSubmitterOptions, EpisodicTrackingService, sendWaitlistErrorNotification(), WaitlistCheckService, 2. Episodic Waterfall Chaining Engine (`apps/watcher`)

### Community 100 - "streamer/src/services/jellyfin.ts"
Cohesion: 0.28
Nodes (6): apps_streamer_src_db_index_systemconfig, EphemeralStream, NewEphemeralStream, NewSystemConfig, SystemConfig, JellyfinSession

### Community 101 - "api/src/services/prowlarr.ts"
Cohesion: 0.06
Nodes (24): formatBytes(), isTitleRelevant(), parseReleaseTitle(), ReleaseSource, Resolution, ScorableCandidate, ScoreOptions, scoreRelease() (+16 more)

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.10
Nodes (19): Active Media Detection & Guardrails, API Routes, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Services, Deletion Tracking & Audit Trail, Further Notes, Implementation Decisions (+11 more)

### Community 115 - "JellyfinService"
Cohesion: 0.06
Nodes (25): JellyfinService, 1. Database Schema (`apps/api`), 1. UI Entry Points & Discoverability, 2. Jellyfin Service SyncPlay Extension (`apps/api`), 2. Media Selection & Creation Modal (`CreateWatchPartyModal.vue`), 3. Immediate Post-Creation Player Handoff, 4. Watch Party API Routes (`apps/api/src/routes/watchParties.ts`), 5. Frontend Components & Views (`apps/web`) (+17 more)

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

### Community 117 - "Unified Series Domain and TMDB Canonical Authority — Spec"
Cohesion: 0.13
Nodes (14): Architectural Shape, Automated Waitlist Monitoring & Up Next Tracking, Further Notes, Implementation Decisions, Legacy Data Migration & System Health, Out of Scope, Problem Statement, Prowlarr Dual-Query Release Discovery (+6 more)

### Community 118 - "WatchRequest"
Cohesion: 0.14
Nodes (14): WatchRequest, waitlistActionRoutes(), waitlistCreateRoutes(), waitlistCrudRoutes(), waitlistRoutes(), CreateWaitlistBody, normalizeTitle(), executeEpisodicWaterfall() (+6 more)

### Community 119 - "unarchive.ts"
Cohesion: 0.10
Nodes (16): execFileAsync, FfprobeRunner, SUBTITLE_EXTENSIONS, SubtitleInspectionResult, SubtitleInspectionService, SubtitleInspectionServiceOptions, VIDEO_EXTENSIONS, CommandExecFn (+8 more)

### Community 120 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 121 - "ICleanupService"
Cohesion: 0.06
Nodes (7): CleanupCronOptions, ICleanupService, MockCleanupService, MockCleanup, MockCleanupService, MockCleanupService, MockCleanup

### Community 122 - "Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec"
Cohesion: 0.12
Nodes (16): 1. Watcher Schema & Diagnostics (`apps/watcher`), 2. Watcher Advance Endpoint (`apps/watcher`), 3. Main API Request Integration (`apps/api`), 4. Frontend Decomposition & Waitlist UI (`apps/web`), 5. Fast-Track Request Step 3 Initialization (`apps/web`), Episodic Scope & Lifecycle, Further Notes, Implementation Decisions (+8 more)

### Community 123 - "WatchPartyRepository"
Cohesion: 0.17
Nodes (3): NewWatchPartyRoom, WatchPartyRoom, WatchPartyRepository

### Community 124 - "Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec"
Cohesion: 0.12
Nodes (16): 1. Oracle VPS Configuration (`167.126.3.136`), 2. Home Stack Modifications (`docker/docker-compose.yml`), 3. DNS Configuration (Cloudflare), Cloudflare Compliance & Security, Further Notes, Good Test Principles, Implementation Decisions, Infrastructure Cleanliness (+8 more)

### Community 125 - "ref_drizzle_orm"
Cohesion: 0.15
Nodes (11): downloadRequests, requestCoRequesters, SystemConfig, SpaceCheckResult, IJellyfinService, JellyfinAuthResult, TorrentInfo, MockJellyfin (+3 more)

### Community 126 - "IStreamerJellyfinService"
Cohesion: 0.20
Nodes (5): StreamerDatabase, EphemeralEvictionCronOptions, StreamPollerOptions, IStreamerJellyfinService, StreamerJellyfinService

### Community 127 - "setupServices"
Cohesion: 0.22
Nodes (4): DiscoveryService, extractTitleAndYear(), setupServices(), SubgenService

### Community 129 - "Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec"
Cohesion: 0.13
Nodes (14): 1. Seeder & Resolution Diagnostics (`apps/watcher` & `apps/api`), Episodic Waterfall Automation, Further Notes, Good Test Principles, Implementation Decisions, Out of Scope, Preferred Indexer Health & Seeder Qualification, Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec (+6 more)

### Community 130 - "Spec: Waitlist Tiering and In-Place Target Episode Adjustment"
Cohesion: 0.22
Nodes (8): Further Notes, Implementation Decisions, Out of Scope, Problem Statement, Solution, Spec: Waitlist Tiering and In-Place Target Episode Adjustment, Testing Decisions, User Stories

### Community 131 - "Unified Series Domain and TMDB Canonical Authority"
Cohesion: 0.33
Nodes (5): Consequences, Considered Options, Context, Decision, Unified Series Domain and TMDB Canonical Authority

### Community 132 - "Spec: Codebase Health, Architecture Hardening & Residual Refactoring"
Cohesion: 0.20
Nodes (9): Dependency diagram, Out of Scope, Recommended Implementation Order, Spec: Codebase Health, Architecture Hardening & Residual Refactoring, Testing Decisions, User Stories, Wave 1 — Foundation (no blockers; implement first), Wave 2 — Build on the foundation (start after Wave 1 blockers are complete) (+1 more)

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 135 - "streamer/src/app.ts"
Cohesion: 0.24
Nodes (8): buildStreamerApp(), fastify, apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), ephemeralStreams, DebridTorrentInfo, SymlinkManagerOptions

### Community 136 - "ws.ts"
Cohesion: 0.29
Nodes (5): fastify, FastifyInstance, wsRoutes, fastify-plugin, ws

### Community 137 - "api/src/index.ts"
Cohesion: 0.18
Nodes (10): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+2 more)

### Community 139 - "AGENTS.md — Media Download Manager Instructions"
Cohesion: 0.50
Nodes (3): AGENTS.md — Media Download Manager Instructions, Architectural Rules, Issue Tracking & Task Management

### Community 142 - "SeasonPackEpisodesDrawer.vue"
Cohesion: 0.11
Nodes (12): canManage, confirmPruneEpisode, emit, episodes, error, executePrune(), loading, props (+4 more)

### Community 143 - "Decision"
Cohesion: 0.20
Nodes (9): 1. Native Jellyfin SyncPlay Launch Bridge, 2. Eligible Media Scope, 3. In-Place Media Switching & Discord Party Timeline, 4. Context-Specific Discord Channel Routing, 5. Room Persistence & Automated Cleanup, ADR-0025: Watch Party SyncPlay Integration & In-Place Timeline Progression, Consequences, Context (+1 more)

### Community 146 - "JellyfinSyncPlayService"
Cohesion: 0.13
Nodes (12): JellyfinSyncPlayService, Acceptance Criteria, Background & Problem Statement, Cross-Platform TV Participation & Canonical Handoff, Deep Link & Discord Routing, Implementation Architecture, Jellyfin User Token & SyncPlay Provisioning, Slice 1: Backend Jellyfin User Token Storage, Migration, SyncPlay Provisioning & Canonical Launch URL (+4 more)

### Community 147 - "UserInviteModal.vue"
Cohesion: 0.12
Nodes (10): errorMessage, hasCopied, invitedUsers, inviteUrl, isGenerating, isInvitesDisabledForUser, isLoading, MockApiError (+2 more)

### Community 149 - "requestDedup.ts"
Cohesion: 0.38
Nodes (5): addCoRequester(), DedupMatchParams, findMatchingCanonicalRequest(), KeyedMutex, toRepo()

### Community 150 - "WaitlistModalConfirmStep.vue"
Cohesion: 0.48
Nodes (3): MediaTypeOption, SeriesProgressResponse, WaitlistCandidate

### Community 152 - "Decision"
Cohesion: 0.22
Nodes (8): 1. Authenticated User Token Storage for SyncPlay, 2. Canonical Backend-Driven Jellyfin Launch URL, 3. Dedicated `/party/:id` Route & Auto-Lobby State, 4. Cross-Platform TV Guidance & AirPlay Launch Bridge, ADR-0027: Jellyfin SyncPlay Token Authentication, Canonical Handoff & Cross-Platform TV Bridge, Consequences, Context, Decision

### Community 155 - "ref_vitest"
Cohesion: 0.11
Nodes (11): buildApp(), apps_api_src_db_index_featureflags, featureFlags, apps_api_src_routes_admin_adminroutes, animeSeasonalRoutes(), authRoutes(), internalRoutes(), subgenWebhookSchema (+3 more)

### Community 156 - "ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure"
Cohesion: 0.40
Nodes (4): ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure, Consequences, Context, Decision

### Community 157 - "ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining"
Cohesion: 0.25
Nodes (7): 1. Preferred Indexer Qualification, 2. Resolution Gating & 720p Fallback, 3. Episodic Waterfall Chaining Engine, ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining, Consequences, Context, Decision

### Community 158 - "IDebridService"
Cohesion: 0.12
Nodes (7): FastifyInstance, StreamerAppOptions, StreamPoller, IDebridService, DirectDownloader, IDirectDownloader, ref_node_stream

### Community 159 - "AnimeTmdbConfirmSection.vue"
Cohesion: 0.33
Nodes (6): emit, handleManualSearch(), isManualSearchOpen, manualSearchQuery, props, selectedCandidate

### Community 160 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 161 - "clearSelection"
Cohesion: 0.40
Nodes (6): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), handleLibraryEpisodePruned(), switchCategory()

### Community 162 - "streamer/src/index.ts"
Cohesion: 0.40
Nodes (4): app, __dirname, envPaths, __filename

### Community 164 - "OpenSubtitlesService"
Cohesion: 0.29
Nodes (4): OpenSubtitlesOptions, OpenSubtitlesService, SearchSubtitlesParams, SubtitleSearchResult

### Community 165 - "promoteQueuedRequests"
Cohesion: 0.28
Nodes (6): markAllQueuedWaitingForSpace(), promoteQueuedRequests(), ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject, Consequences, Context, Decision

### Community 166 - "Per-Episode Consumption Tracking and Selective Torrent Pruning"
Cohesion: 0.40
Nodes (4): Consequences, Considered Options, Decision, Per-Episode Consumption Tracking and Selective Torrent Pruning

### Community 175 - "requestWaitlistIntegration.ts"
Cohesion: 0.60
Nodes (5): advanceWaitlistIfNeeded(), callWatcherEndpoint(), triggerNextSeasonWaitlist(), triggerWaitlistActions(), WaitlistTriggerParams

### Community 192 - "IRequestsRepository"
Cohesion: 0.06
Nodes (39): AppDatabase, apps_api_src_db_index_downloadrequest, DownloadPoller, DownloadPollerOptions, PollerLogger, UnarchiveDaemon, UnarchiveDaemonOptions, CleanupServiceOptions (+31 more)

## Knowledge Gaps
- **1107 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+1102 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1608 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `useFeatureFlags`, `useRequestStep1.ts`, `useRequestData.ts`, `LibraryView.vue`, `WaitlistView.vue`, `api.ts`, `useAdminActivity.ts`, `SeasonPackEpisodesDrawer.vue`, `DashboardView.vue`, `WatchPartyLobbyModal.vue`, `UserInviteModal.vue`, `WaitlistCard.vue`, `DiscoveryFeed.vue`, `web/package.json`, `PromotionModal.vue`, `useWaitlistTiers.ts`, `AnimeTmdbConfirmSection.vue`, `WaitlistAddModal.vue`, `StreamProgressModal.vue`, `SubtitlePickerModal.vue`, `useAdminData.ts`, `TorrentReplacementModal.vue`, `ActiveStreamsShelf.vue`, `AdminView.vue`, `WaitlistEpisodeAdjustPopover.vue`, `AnimeDetailModal.vue`, `RequestStep1Input.vue`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `AnimeSeasonService` connect `animeTypes.ts` to `serviceContainer.ts`, `ref_vitest`, `setupServices`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `useFeatureFlags()` connect `useFeatureFlags` to `useRequestData.ts`, `animeTypes.ts`, `api.ts`, `ActiveStreamsShelf.vue`, `DashboardView.vue`, `AdminView.vue`, `DiscoveryFeed.vue`, `vue`, `Leanback Client and Android TV Shell — Spec`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IJellyfinService` (e.g. with `Solution` and `2. Jellyfin Service SyncPlay Extension (`apps/api`)`) actually correct?**
  _`IJellyfinService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1107 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api/src/db/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08391608391608392 - nodes in this community are weakly interconnected._