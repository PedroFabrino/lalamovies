# Graph Report - Plex-auto-download  (2026-10-01)

## Corpus Check
- 507 files · ~320,990 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .example 3, .css 1)

## Summary
- 3228 nodes · 7791 edges · 175 communities (131 shown, 44 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 290 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e980bf2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- WatchPartyLobbyModal.vue
- streamer/src/app.ts
- useFeatureFlags
- WaitlistCard.vue
- AdminView.vue
- ref_drizzle_orm
- SymlinkManager
- Ephemeral Streaming Tier
- LibraryView.vue
- streamer/package.json
- watcher/package.json
- WaitlistView.vue
- ref_vitest
- airDateFetcher.ts
- vue
- devDependencies
- dev-setup.mjs
- api/src/db/index.ts
- EpisodesRepository
- MockJellyfinService
- BaseMetadataService
- DiscoveryFeed.vue
- api/package.json
- api/src/db/schema.ts
- useRequestData.ts
- Context Domain Model Document
- watcher/src/services/notifications.ts
- serviceContainer.ts
- web/package.json
- PromotionModal.vue
- api/src/utils/torrentTitleCleaner.ts
- requests/index.ts
- SubtitleInspectionService
- devDependencies
- compilerOptions
- Subgen Container Architecture (Whisper large-v3)
- EphemeralEvictionCron
- compilerOptions
- animeSeasonal.test.ts
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
- requestStateMachine.ts
- dependencies
- TorrentReplacementModal.vue
- scripts
- ProwlarrService
- watchPartyCleanup.ts
- api/src/routes/waitlist.ts
- AnimeCard.vue
- User Role
- Waitlist Entry
- Leanback Client and Android TV Shell — Spec
- UserInviteModal.vue
- Media Download Manager Architecture Spec
- scripts
- Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)
- api/src/services/notifications.ts
- api/tsconfig.json
- streamer/tsconfig.json
- watcher/tsconfig.json
- scripts
- IndexerPrivacyCache
- ref_fastify
- Indexer
- Ephemeral Stream
- DownloadRequest
- ReleaseGatingService
- ActiveStreamsShelf.vue
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
- upNext.ts
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
- middleware/auth.ts
- WatcherPoller
- watcherPoller.ts
- queuePromoter.ts
- Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec
- watchParties.ts
- Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec
- services/cleanup.ts
- requestWaitlistIntegration.ts
- AnimeTmdbConfirmSection.vue
- StreamerJellyfinService
- Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec
- IMetadataService
- Unified Series Domain and TMDB Canonical Authority
- Implementation Decisions
- CoRequesterPicker.vue
- src/config.ts
- promoteQueuedRequests
- Watch Party SyncPlay Integration and In-Place Party Timeline — Spec
- api/src/index.ts
- useRequestReleases
- AGENTS.md — Media Download Manager Instructions
- upNext.test.ts
- DummyJellyfinService
- IWatchPartyRepository
- Decision
- github-issues.md
- Specification: Watch Party SyncPlay Token Auth, Deep Link & Cross-Platform TV Bridge
- InviteView.vue
- AdminFeaturesTab.vue
- DummyJellyfin
- JellyfinSyncPlayService
- useDashboardActions
- Decision
- DebridService
- clearSelection
- IDebridService
- ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure
- ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining
- streamer/src/routes/streams.ts
- streamer/src/db/index.ts
- isExpanded
- isSelected
- UnarchiveService
- OpenSubtitlesService
- libraryPathBuilder.ts
- api/src/utils/seriesQueryBuilder.ts
- requestDedup.ts
- RequestStep1Input.vue
- useStreamPlayback
- Implementation Decisions
- TorrentManualInput.vue
- User Stories
- MockCleanupService
- MockCleanupService

## God Nodes (most connected - your core abstractions)
1. `IJellyfinService` - 78 edges
2. `IRequestsRepository` - 76 edges
3. `DownloadRequest` - 66 edges
4. `api` - 64 edges
5. `IQBittorrentService` - 59 edges
6. `buildApp()` - 58 edges
7. `RequestsRepository` - 57 edges
8. `vue` - 57 edges
9. `users` - 55 edges
10. `AppDatabase` - 52 edges

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

### Community 0 - "WatchPartyLobbyModal.vue"
Cohesion: 0.09
Nodes (22): authStore, changeMediaItemId, changeMediaTitle, emit, handleManualChangeMedia(), handlePlayNextEpisode(), HistoryItem, isHost (+14 more)

### Community 1 - "streamer/src/app.ts"
Cohesion: 0.19
Nodes (8): buildStreamerApp(), fastify, FastifyInstance, StreamerAppOptions, StreamPoller, DirectDownloader, IDirectDownloader, ref_node_stream

### Community 2 - "useFeatureFlags"
Cohesion: 0.06
Nodes (31): DiscoveryItem, authStore, featureFlags, { isConnected }, isLibraryEnabled, isRequestEnabled, isSeasonalAnimeEnabled, isUserInvitesEnabled (+23 more)

### Community 3 - "WaitlistCard.vue"
Cohesion: 0.13
Nodes (21): emit, handleCardClick(), isActionable, props, DEFAULT_MEDIA_TYPE_CONFIG, DEFAULT_STATUS_CONFIG, formatDateOnly(), formatGraceRemaining() (+13 more)

### Community 4 - "AdminView.vue"
Cohesion: 0.17
Nodes (12): ConfigFormData, JellyfinStatusInfo, showTmdbKey, TranscriptionFormData, AdminFeatureFlag, InviteItem, AdminUser, admin (+4 more)

### Community 5 - "ref_drizzle_orm"
Cohesion: 0.18
Nodes (15): buildWatcherApp(), fastify, getWatcherDatabasePath(), initWatcherDatabase(), NewWaitlistCoRequester, NewWatchRequest, WaitlistCoRequester, watchRequests (+7 more)

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
Cohesion: 0.10
Nodes (18): MediaTypeOption, WaitlistCandidate, activeView, addModalRef, approvingEntryId, authStore, checkingEntryId, handleCheckAll() (+10 more)

### Community 12 - "ref_vitest"
Cohesion: 0.06
Nodes (33): api, router, useAuthStore, User, mockAnime, mockPush, mockReplace, mountOptions (+25 more)

### Community 13 - "airDateFetcher.ts"
Cohesion: 0.18
Nodes (12): AirDateFetcherLogger, AniListMediaResponse, AniListNextAiringEpisode, AniListStartDate, fetchAirDate(), FetchAirDateParams, fetchAniListAirDate(), fetchTmdbAirDate() (+4 more)

### Community 14 - "vue"
Cohesion: 0.05
Nodes (48): DiskInfo, emit, expandedEpisodeId, handleEpisodePruned(), DiskInfo, emit, expandedEpisodesId, handleEpisodePruned() (+40 more)

### Community 15 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, drizzle-kit, esbuild, eslint, tsx, @types/better-sqlite3, @types/node, @types/node-cron (+5 more)

### Community 16 - "dev-setup.mjs"
Cohesion: 0.21
Nodes (16): COMPOSE_DEV_FILE, configureJellyfin(), ensureDirectories(), ensureEnvDev(), ensureSampleFixture(), ENV_DEV, ENV_DEV_EXAMPLE, findMdmApiKey() (+8 more)

### Community 17 - "api/src/db/index.ts"
Cohesion: 0.08
Nodes (27): DEFAULT_FEATURE_FLAGS, __dirname, apps_api_src_db_index_downloadrequest, __filename, getDatabasePath(), getMigrationsFolder(), initDatabase(), apps_api_src_db_index_invites (+19 more)

### Community 18 - "EpisodesRepository"
Cohesion: 0.12
Nodes (3): RequestEpisode, ConsumedEpisodeItem, EpisodesRepository

### Community 20 - "BaseMetadataService"
Cohesion: 0.08
Nodes (10): BaseMetadataService, MetadataApiError, MetadataService, rankMetadataCandidates(), MockMetadata, DummyJellyfinService, MockRouteMetadataService, MockMetadata (+2 more)

### Community 21 - "DiscoveryFeed.vue"
Cohesion: 0.09
Nodes (26): activeCategory, available, CachedCategoryData, cacheMap, categoryCache, CategoryTab, checkCacheForItems(), currentItems (+18 more)

### Community 22 - "api/package.json"
Cohesion: 0.08
Nodes (25): better-sqlite3, dotenv, drizzle-kit, drizzle-orm, esbuild, eslint, fastify, node-cron (+17 more)

### Community 23 - "api/src/db/schema.ts"
Cohesion: 0.09
Nodes (25): EpisodeStatus, FeatureFlag, Invite, InviteRole, MediaType, NewFeatureFlag, NewInvite, NewRequestCoRequester (+17 more)

### Community 24 - "useRequestData.ts"
Cohesion: 0.08
Nodes (48): step2QueryInputRef, { isItemWaitlisted }, props, buildCandidate(), enrichCandidateMetadata(), FastTrackParsedData, parseEpisodeAndGranularity(), parseFastTrack() (+40 more)

### Community 25 - "Context Domain Model Document"
Cohesion: 0.14
Nodes (25): Batch Submission, Coordinated Pause, Degraded Mode, Discovery Feed, Discovery Item, Context Domain Model Document, Download Request, Episode Selection (+17 more)

### Community 26 - "watcher/src/services/notifications.ts"
Cohesion: 0.18
Nodes (13): waitlistActionRoutes(), waitlistCrudRoutes(), renderStatusHtml(), waitlistRoutes(), waitlistMagicLinkRoutes(), executeEpisodicWaterfall(), deleteDiscordMessage(), ResendNotifier (+5 more)

### Community 27 - "serviceContainer.ts"
Cohesion: 0.05
Nodes (51): AppOptions, fastify, FastifyInstance, AppDatabase, CleanupCron, CleanupCronLogger, DownloadPoller, DownloadPollerOptions (+43 more)

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (21): eslint, @types/node, typescript, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, vitest, name, private (+13 more)

### Community 29 - "PromotionModal.vue"
Cohesion: 0.12
Nodes (19): candidates, emit, episodeNumber, errorMessage, goToStep2(), handleClose(), handleStep2Next(), isPromoting (+11 more)

### Community 30 - "api/src/utils/torrentTitleCleaner.ts"
Cohesion: 0.18
Nodes (8): resolveSourceItem(), ResolveSourceItemParams, ResolveSourceItemResult, CleanedTorrentResult, cleanSeparators(), cleanTorrentTitle(), ExtractedEpisodeInfo, extractEpisodeInfo()

### Community 31 - "requests/index.ts"
Cohesion: 0.12
Nodes (22): adminGuard(), deletedRoutes(), episodesRoutes(), requestRoutes(), lifecycleRoutes(), listRoutes(), promoteRoutes(), redownloadRoutes() (+14 more)

### Community 33 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-plugin-vue, happy-dom, postcss, tailwindcss, @types/node (+10 more)

### Community 34 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 35 - "Subgen Container Architecture (Whisper large-v3)"
Cohesion: 0.19
Nodes (18): ADR 0017: Local GPU Subtitle Transcription with Subgen, Off-Peak Scheduled Transcription Window, Subgen Local Whisper GPU Transcription, Zero-Subtitle ffprobe Inspection, OpenSubtitles Subtitle Fetching Spec, Auto-Fetch Subtitles on Completion Hook, Manual Subtitle Picker Modal, OpenSubtitles REST API Integration (+10 more)

### Community 37 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 38 - "animeSeasonal.test.ts"
Cohesion: 0.06
Nodes (43): AnimeHistoryMatcher, extractShowNameFromPath(), stripSeasonNumbering(), ANILIST_SEASONAL_QUERY, AnimeSeasonService, AnimeSeasonServiceOptions, CacheEntry, calculateCurrentSeasonAndYear() (+35 more)

### Community 39 - "WaitlistAddModal.vue"
Cohesion: 0.07
Nodes (29): availableReleasesCount, candidates, checkCandidateGuards(), closeModal(), downloadDirectly(), emit, hasSearched, initPrefilledModal() (+21 more)

### Community 40 - "ref_node_path"
Cohesion: 0.05
Nodes (58): apps_api_src_db_index_downloadrequests, apps_api_src_db_index_users, downloadRequests, users, artworkCache, deleteMediaSchema, EpisodeItem, LibraryMediaCard (+50 more)

### Community 41 - "Docker Compose Stack Specification"
Cohesion: 0.20
Nodes (15): Subgen Service, Root Docker Compose File, Docker Compose Stack Specification, Fastify API Service, Caddy Reverse Proxy, Cloudflared Tunnel Daemon, Cloudflare DDNS Daemon, Jellyfin Media Server (+7 more)

### Community 42 - "StreamProgressModal.vue"
Cohesion: 0.25
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
Cohesion: 0.27
Nodes (11): formatBytes(), parseReleaseTitle(), ReleaseSource, Resolution, ScorableCandidate, scoreRelease(), VideoCodec, getPreferredIndexerMinSeeders() (+3 more)

### Community 50 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 51 - "requestStateMachine.ts"
Cohesion: 0.09
Nodes (42): executeBatchRequests(), executeCreateRequest(), findCanonicalSeriesInfo(), getDedupLockKey(), buildInitialDownloadRequest(), BuildInitialRequestParams, checkDiskSafety(), DiskSafetyCheckResult (+34 more)

### Community 52 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, lucide-vue-next, pinia, radix-vue, tailwind-merge, @vercel/analytics (+3 more)

### Community 53 - "TorrentReplacementModal.vue"
Cohesion: 0.10
Nodes (18): activeTab, candidates, canSubmit, emit, errorMessage, handleClose(), handleConfirmReplace(), isPrivate (+10 more)

### Community 54 - "scripts"
Cohesion: 0.13
Nodes (14): name, packageManager, private, scripts, build, dev, dev:down, dev:prod (+6 more)

### Community 56 - "watchPartyCleanup.ts"
Cohesion: 0.24
Nodes (4): WatchPartyCleanupLogger, WatchPartyCleanupOptions, BroadcastFunction, IJellyfinSyncPlayService

### Community 57 - "api/src/routes/waitlist.ts"
Cohesion: 0.12
Nodes (21): featureFlags, JwtPayload, isFeatureEnabled(), requireFeature(), animeSeasonalRoutes(), resolveTmdbSchema, seasonsQuerySchema, batchRoutes() (+13 more)

### Community 58 - "AnimeCard.vue"
Cohesion: 0.08
Nodes (23): displayTitle, isAiringOrFinished, { isItemWaitlisted }, posterUrl, props, statusBadgeClasses, statusLabel, subTitle (+15 more)

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
Cohesion: 0.18
Nodes (7): errorMessage, hasCopied, invitedUsers, inviteUrl, isGenerating, isInvitesDisabledForUser, isLoading

### Community 63 - "Media Download Manager Architecture Spec"
Cohesion: 0.31
Nodes (9): ADR 0014: Fully Consumed Tier in Cleanup Priority, Co-Requester Play History Verification, Fully Consumed Cleanup Priority Tier, Media Download Manager Architecture Spec, Disk Free Space Cleanup Policy, Download Request State Machine, Hardlink Move and Staging Area Pipeline, Jellyfin Identity Provider & Auth Flow (+1 more)

### Community 64 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:generate, dev, lint, start, test, typecheck

### Community 65 - "Draft Spec: Native Apple TV Companion App (`apps/tv-apple`)"
Cohesion: 0.15
Nodes (12): Apple TV Authentication (Quick Connect), Architectural Shape, Content Discovery & Living-Room Actions, Draft Spec: Native Apple TV Companion App (`apps/tv-apple`), Further Notes, Implementation Decisions, Out of Scope, Problem Statement (+4 more)

### Community 66 - "api/src/services/notifications.ts"
Cohesion: 0.18
Nodes (10): DiscordEmbed, DiscordEmbedField, DiscordNotifier, NotificationEvent, NotificationPayload, NotificationService, NotificationServiceOptions, ResendNotifier (+2 more)

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

### Community 72 - "ref_fastify"
Cohesion: 0.09
Nodes (17): buildApp(), getConfig(), validateConfig(), apps_api_src_db_index_featureflags, apps_api_src_routes_admin_adminroutes, authRoutes(), internalRoutes(), subgenWebhookSchema (+9 more)

### Community 73 - "Indexer"
Cohesion: 0.29
Nodes (7): Indexer, Preferred Indexer, Private Tracker Airgap, Prowlarr Indexer Proxy, Rationale: Avoid Heavy *Arr Daemons and Retain Custom LRU Eviction, ADR 0008 Document, Direct Prowlarr Indexer Integration

### Community 74 - "Ephemeral Stream"
Cohesion: 0.47
Nodes (6): Debrid Provider, Ephemeral Stream, Streamer Microservice, ADR 0012 Document, Dual-Tier Ephemeral Debrid Streaming Architecture, Rationale: Centralized Proxying Against Real-Debrid Multi-IP Ban

### Community 75 - "DownloadRequest"
Cohesion: 0.07
Nodes (4): DownloadRequest, RequestsRepository, DeletedRequestListItem, RequestListItem

### Community 76 - "ReleaseGatingService"
Cohesion: 0.09
Nodes (18): ReleaseGatingService, Adding Undated Media, Frontend State Management (`apps/web/src/views/WaitlistView.vue`), Further Notes, Implementation Decisions, Manual Verification & Self-Healing, Metadata Synchronization & Polling, Out of Scope (+10 more)

### Community 77 - "ActiveStreamsShelf.vue"
Cohesion: 0.05
Nodes (40): authStore, createdParty, emit, EphemeralStreamItem, featureFlags, fetchStreams(), handleEvict(), handlePartyCreated() (+32 more)

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
Cohesion: 0.08
Nodes (32): WatcherPollerOptions, CAM_REGEX, formatBytes(), parseReleaseTitle(), ProwlarrSearchResult, ReleaseCandidate, ReleaseSource, Resolution (+24 more)

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

### Community 93 - "upNext.ts"
Cohesion: 0.22
Nodes (10): apps_api_src_services_prowlarr_resolution, groupShowRequests(), find(), union(), isCandidateAlreadyRequested(), matchesTarget(), normalizeShowTitle(), UpNextItem (+2 more)

### Community 94 - "useRequestSubmit"
Cohesion: 0.09
Nodes (30): Hard Limits, No Monoliths / No God Files, Rules for Agents, When you discover a file already over the limit, useRequestStep1(), processFiles(), removeBatchItem(), useRequestStep2() (+22 more)

### Community 99 - "useWaitlistMatching.ts"
Cohesion: 0.10
Nodes (23): isWaitlistedEffective, isCandidateWaitlisted, isWaitlistedEffective, isSelectedCandidateWaitlisted, available, { ensureWaitlistLoaded, isItemWaitlisted }, items, router (+15 more)

### Community 100 - "AnimeView.vue"
Cohesion: 0.10
Nodes (19): useSeasonalAnime(), fetchArchive(), fetchSeasonalSections(), initFromRoute(), selectSeasonAndYear(), activeSeasonSelect, { ensureWaitlistLoaded, isItemWaitlisted }, featureFlags (+11 more)

### Community 101 - "ReleaseCandidate"
Cohesion: 0.14
Nodes (5): ReleaseCandidate, SearchReleasesOptions, SearchReleasesResult, MockProwlarrService, MockProwlarrService

### Community 114 - "Deleted Requests History and Redownload — Spec"
Cohesion: 0.10
Nodes (19): Active Media Detection & Guardrails, API Routes, Component Unit Tests, Deleted Requests History and Redownload — Spec, Deletion Services, Deletion Tracking & Audit Trail, Further Notes, Implementation Decisions (+11 more)

### Community 116 - "Torrent Replacement for Underway Requests"
Cohesion: 0.50
Nodes (3): Consequences, Considered Options, Torrent Replacement for Underway Requests

### Community 117 - "Unified Series Domain and TMDB Canonical Authority — Spec"
Cohesion: 0.13
Nodes (14): Architectural Shape, Automated Waitlist Monitoring & Up Next Tracking, Further Notes, Implementation Decisions, Legacy Data Migration & System Health, Out of Scope, Problem Statement, Prowlarr Dual-Query Release Discovery (+6 more)

### Community 118 - "middleware/auth.ts"
Cohesion: 0.11
Nodes (22): invites, User, authMiddleware(), fastify, @fastify/jwt, FastifyJWT, FastifyRequest, loginSchema (+14 more)

### Community 119 - "WatcherPoller"
Cohesion: 0.09
Nodes (19): FastifyInstance, WatcherAppOptions, WatcherDatabase, waitlistCoRequesters, AutoDownloadSubmitter, AutoDownloadSubmitterLogger, AutoDownloadSubmitterOptions, WatcherPoller (+11 more)

### Community 120 - "watcherPoller.ts"
Cohesion: 0.16
Nodes (11): WatchRequest, WatcherPollerLogger, waitlistCreateRoutes(), CreateWaitlistBody, normalizeTitle(), WaterfallDeps, WaterfallResult, WaterfallStopReason (+3 more)

### Community 121 - "queuePromoter.ts"
Cohesion: 0.17
Nodes (9): apps_api_src_db_index_systemconfig, HardlinkRecoveryResult, runHardlinkingRecovery(), AnilistMigrationOptions, AnilistMigrationResult, runLegacyAnilistMigration(), PollerLogger, resolvePollerNotificationRecipients() (+1 more)

### Community 122 - "Waitlist Manual Request Shortcut and Tracker Diagnostics — Spec"
Cohesion: 0.12
Nodes (15): 1. Watcher Schema & Diagnostics (`apps/watcher`), 2. Watcher Advance Endpoint (`apps/watcher`), 4. Frontend Decomposition & Waitlist UI (`apps/web`), 5. Fast-Track Request Step 3 Initialization (`apps/web`), Episodic Scope & Lifecycle, Further Notes, Implementation Decisions, Manual Request Shortcut (+7 more)

### Community 123 - "watchParties.ts"
Cohesion: 0.14
Nodes (19): attachJellyfinWebUrl(), createWatchPartySchema, switchMediaSchema, watchPartyRoutes(), formatNotificationMediaTitle(), NotificationContext, resolveDiscordWebhookUrl(), buildWatchPartyEndedPayload() (+11 more)

### Community 124 - "Oracle VPS WireGuard Relay for Jellyfin Exposure — Spec"
Cohesion: 0.12
Nodes (16): 1. Oracle VPS Configuration (`167.126.3.136`), 2. Home Stack Modifications (`docker/docker-compose.yml`), 3. DNS Configuration (Cloudflare), Cloudflare Compliance & Security, Further Notes, Good Test Principles, Implementation Decisions, Infrastructure Cleanliness (+8 more)

### Community 125 - "services/cleanup.ts"
Cohesion: 0.05
Nodes (18): requestCoRequesters, SystemConfig, CleanupCronOptions, ICleanupService, SpaceCheckResult, PruneEpisodeResult, JellyfinAuthResult, IQBittorrentService (+10 more)

### Community 126 - "requestWaitlistIntegration.ts"
Cohesion: 0.60
Nodes (5): advanceWaitlistIfNeeded(), callWatcherEndpoint(), triggerNextSeasonWaitlist(), triggerWaitlistActions(), WaitlistTriggerParams

### Community 127 - "AnimeTmdbConfirmSection.vue"
Cohesion: 0.33
Nodes (6): emit, handleManualSearch(), isManualSearchOpen, manualSearchQuery, props, selectedCandidate

### Community 129 - "Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec"
Cohesion: 0.13
Nodes (14): 1. Seeder & Resolution Diagnostics (`apps/watcher` & `apps/api`), Episodic Waterfall Automation, Further Notes, Good Test Principles, Implementation Decisions, Out of Scope, Preferred Indexer Health & Seeder Qualification, Preferred Indexer Qualification and Episodic Waterfall Chaining — Spec (+6 more)

### Community 130 - "IMetadataService"
Cohesion: 0.07
Nodes (11): resolveArtwork(), DiscoveryCategory, DiscoveryFeedResult, DiscoveryItem, DiscoveryService, DiscoveryServiceOptions, extractTitleAndYear(), IMetadataService (+3 more)

### Community 131 - "Unified Series Domain and TMDB Canonical Authority"
Cohesion: 0.33
Nodes (5): Consequences, Considered Options, Context, Decision, Unified Series Domain and TMDB Canonical Authority

### Community 132 - "Implementation Decisions"
Cohesion: 0.14
Nodes (11): Dependency diagram, Implementation Decisions, Out of Scope, Problem Statement, Recommended Implementation Order, Spec: Codebase Health, Architecture Hardening & Residual Refactoring, Testing Decisions, User Stories (+3 more)

### Community 133 - "CoRequesterPicker.vue"
Cohesion: 0.67
Nodes (3): emit, props, toggleUser()

### Community 134 - "src/config.ts"
Cohesion: 0.28
Nodes (6): AppConfig, configSchema, FORBIDDEN_JWT_DEV_DEFAULT, _resetConfigForTesting(), testConfigDefaults, ValidateConfigOptions

### Community 135 - "promoteQueuedRequests"
Cohesion: 0.28
Nodes (6): markAllQueuedWaitingForSpace(), promoteQueuedRequests(), ADR-0023: Soft-Queue on Percentage Disk Threshold Instead of Hard Reject, Consequences, Context, Decision

### Community 136 - "Watch Party SyncPlay Integration and In-Place Party Timeline — Spec"
Cohesion: 0.15
Nodes (12): 1. UI Entry Points & Discoverability, 2. Media Selection & Creation Modal (`CreateWatchPartyModal.vue`), 3. Immediate Post-Creation Player Handoff, Further Notes, Good Test Principles, Out of Scope, Problem Statement, Solution (+4 more)

### Community 137 - "api/src/index.ts"
Cohesion: 0.13
Nodes (14): app, __dirname, envPaths, __filename, app, __dirname, envPaths, __filename (+6 more)

### Community 138 - "useRequestReleases"
Cohesion: 0.27
Nodes (8): useRequestReleases(), checkCacheForCandidates(), extractInfoHash(), fetchReleasesForCandidate(), getCandidateCacheStatus(), getSearchTitles(), reloadReleasesSilently(), searchReleasesApi()

### Community 139 - "AGENTS.md — Media Download Manager Instructions"
Cohesion: 0.50
Nodes (3): AGENTS.md — Media Download Manager Instructions, Architectural Rules, Issue Tracking & Task Management

### Community 140 - "upNext.test.ts"
Cohesion: 0.11
Nodes (10): MetadataCandidate, apps_api_src_services_prowlarr_iprowlarrservice, apps_api_src_services_prowlarr_releasecandidate, apps_api_src_services_prowlarr_searchreleasesoptions, apps_api_src_services_prowlarr_searchreleasesresult, DummyJellyfinService, MockMetadataService, TorrentParsed (+2 more)

### Community 142 - "IWatchPartyRepository"
Cohesion: 0.13
Nodes (6): NewWatchPartyRoom, WatchPartyRoom, watchPartyRooms, IWatchPartyRepository, WatchPartyRepository, WatchPartyRoomWithHost

### Community 143 - "Decision"
Cohesion: 0.20
Nodes (9): 1. Native Jellyfin SyncPlay Launch Bridge, 2. Eligible Media Scope, 3. In-Place Media Switching & Discord Party Timeline, 4. Context-Specific Discord Channel Routing, 5. Room Persistence & Automated Cleanup, ADR-0025: Watch Party SyncPlay Integration & In-Place Timeline Progression, Consequences, Context (+1 more)

### Community 146 - "Specification: Watch Party SyncPlay Token Auth, Deep Link & Cross-Platform TV Bridge"
Cohesion: 0.17
Nodes (11): Acceptance Criteria, Background & Problem Statement, Cross-Platform TV Participation & Canonical Handoff, Deep Link & Discord Routing, Implementation Architecture, Jellyfin User Token & SyncPlay Provisioning, Slice 1: Backend Jellyfin User Token Storage, Migration, SyncPlay Provisioning & Canonical Launch URL, Slice 2: Shareable Discord Deep Link `/party/:id` & Auto-Lobby Routing (+3 more)

### Community 147 - "InviteView.vue"
Cohesion: 0.06
Nodes (28): ApiError, apiRequest(), app, routes, pinia, apps_web_src_style, authStore, confirmPassword (+20 more)

### Community 148 - "AdminFeaturesTab.vue"
Cohesion: 0.22
Nodes (10): automationFlags, discoveryFlags, downloadsFlags, emit, flagConfirmModal, HIGH_IMPACT_FLAGS, HIGH_IMPACT_MESSAGES, onConfirmDisable() (+2 more)

### Community 152 - "Decision"
Cohesion: 0.22
Nodes (8): 1. Authenticated User Token Storage for SyncPlay, 2. Canonical Backend-Driven Jellyfin Launch URL, 3. Dedicated `/party/:id` Route & Auto-Lobby State, 4. Cross-Platform TV Guidance & AirPlay Launch Bridge, ADR-0027: Jellyfin SyncPlay Token Authentication, Canonical Handoff & Cross-Platform TV Bridge, Consequences, Context, Decision

### Community 154 - "clearSelection"
Cohesion: 0.40
Nodes (6): clearSelection(), executeDelete(), executeMove(), fetchLibrary(), handleLibraryEpisodePruned(), switchCategory()

### Community 156 - "ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure"
Cohesion: 0.40
Nodes (4): ADR-0026: Oracle VPS WireGuard Relay for Jellyfin Exposure, Consequences, Context, Decision

### Community 157 - "ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining"
Cohesion: 0.25
Nodes (7): 1. Preferred Indexer Qualification, 2. Resolution Gating & 720p Fallback, 3. Episodic Waterfall Chaining Engine, ADR-0024: Preferred Indexer Qualification and Episodic Waterfall Chaining, Consequences, Context, Decision

### Community 159 - "streamer/src/routes/streams.ts"
Cohesion: 0.60
Nodes (4): assertPublicTracker(), hasPasskey(), isKnownPrivateTrackerName(), streamRoutes()

### Community 160 - "streamer/src/db/index.ts"
Cohesion: 0.20
Nodes (13): apps_streamer_src_db_index_ephemeralstreams, getStreamerDatabasePath(), initStreamerDatabase(), StreamerDatabase, apps_streamer_src_db_index_systemconfig, EphemeralStream, ephemeralStreams, NewEphemeralStream (+5 more)

### Community 165 - "libraryPathBuilder.ts"
Cohesion: 0.38
Nodes (4): buildLibraryPath(), BuildLibraryPathParams, padNumber(), sanitizePathSegment()

### Community 166 - "api/src/utils/seriesQueryBuilder.ts"
Cohesion: 0.47
Nodes (4): buildSeriesSearchQueries(), hasCjkCharacters(), SeriesQueryOptions, SeriesQueryParam

### Community 167 - "requestDedup.ts"
Cohesion: 0.32
Nodes (6): addCoRequester(), DedupMatchParams, findMatchingCanonicalRequest(), globalRequestMutex, KeyedMutex, toRepo()

### Community 168 - "RequestStep1Input.vue"
Cohesion: 0.38
Nodes (6): customQueryInputRef, emit, fileInputRef, isDragging, onFileDrop(), onFileInputChange()

### Community 169 - "useStreamPlayback"
Cohesion: 0.40
Nodes (3): useStreamPlayback(), handleInstantStream(), handleStreamPlaybackError()

### Community 170 - "Implementation Decisions"
Cohesion: 0.33
Nodes (6): 1. Database Schema (`apps/api`), 2. Jellyfin Service SyncPlay Extension (`apps/api`), 4. Watch Party API Routes (`apps/api/src/routes/watchParties.ts`), 5. Frontend Components & Views (`apps/web`), 6. Background Teardown Job (`apps/api/src/jobs/watchPartyCleanup.ts`), Implementation Decisions

### Community 171 - "TorrentManualInput.vue"
Cohesion: 0.60
Nodes (4): emit, fileInputRef, onClear(), onFileChange()

### Community 172 - "User Stories"
Cohesion: 0.33
Nodes (6): Discord Social Integration & Channel Routing, In-Place Media Switching & Binge-Watching, Lifecycle & Teardown, Party Creation & Discovery, Playback & Jellyfin Handoff, User Stories

## Knowledge Gaps
- **1055 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+1050 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1527 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IRequestsRepository` connect `serviceContainer.ts` to `IMetadataService`, `Implementation Decisions`, `animeSeasonal.test.ts`, `requestDedup.ts`, `promoteQueuedRequests`, `DownloadRequest`, `api/src/db/index.ts`, `Deleted Requests History and Redownload — Spec`, `requestStateMachine.ts`, `upNext.ts`, `queuePromoter.ts`, `services/cleanup.ts`, `useRequestSubmit`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `AnimeSeasonService` connect `animeSeasonal.test.ts` to `serviceContainer.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `IJellyfinService` connect `serviceContainer.ts` to `animeSeasonal.test.ts`, `ref_node_path`, `ref_fastify`, `Implementation Decisions`, `upNext.test.ts`, `DummyJellyfinService`, `.refreshPlayHistory`, `.pruneEpisode`, `api/src/db/index.ts`, `JellyfinService`, `requestStateMachine.ts`, `MockJellyfinService`, `BaseMetadataService`, `DummyJellyfin`, `services/cleanup.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `IJellyfinService` (e.g. with `Solution` and `2. Jellyfin Service SyncPlay Extension (`apps/api`)`) actually correct?**
  _`IJellyfinService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `IRequestsRepository` (e.g. with `Rules for Agents` and `Repository & Query Layer`) actually correct?**
  _`IRequestsRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _1055 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `WatchPartyLobbyModal.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.08547008547008547 - nodes in this community are weakly interconnected._