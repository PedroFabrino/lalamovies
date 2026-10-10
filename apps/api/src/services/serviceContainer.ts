import { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { AppDatabase, systemConfig, users } from '../db';
import { AppOptions } from '../appTypes';
import { IJellyfinService, JellyfinService } from './jellyfin';
import { IMetadataService, MetadataService } from './metadata';
import { IQBittorrentService, QBittorrentService } from './qbittorrent';
import { ICleanupService, CleanupService } from './cleanup';
import { INotificationService, NotificationService } from './notifications';
import { IFileSystemService, FileSystemService } from './fileSystem';
import { IProwlarrService, ProwlarrService } from './prowlarr';
import { IDiscoveryService, DiscoveryService } from './discovery';
import { IUpNextService, UpNextService } from './upNext';
import { ISubtitleInspectionService, SubtitleInspectionService } from './subtitleInspection';
import { ISubgenService, SubgenService } from './subgen';
import { OpenSubtitlesService } from './openSubtitles';
import { IUnarchiveService, UnarchiveService } from './unarchive';
import { IRequestStateMachine, RequestStateMachine } from './requestStateMachine';
import { IRequestsRepository, RequestsRepository } from './requestsRepository';
import { IRequestService } from './requestServiceTypes';
import { RequestService } from './requestService';
import { IAnimeSeasonService } from './animeTypes';
import { AnimeSeasonService } from './animeSeasonService';
import { AnimeHistoryMatcher } from './animeHistoryMatcher';
import { IEpisodesRepository, EpisodesRepository } from './episodesRepository';
import { IEpisodicPruningService, EpisodicPruningService } from './episodicPruningService';
import { IWatchPartyRepository, WatchPartyRepository } from './watchPartyRepository';
import { IJellyfinSyncPlayService, JellyfinSyncPlayService } from './jellyfinSyncPlay';
import { ISessionMonitoringService, SessionMonitoringService } from './sessionMonitoringService';
import { setupJobs } from './serviceContainerJobs';
import { DownloadPoller } from '../jobs/downloadPoller';
import { UnarchiveDaemon } from '../jobs/unarchiveDaemon';
import { CleanupCron } from '../jobs/cleanupCron';
import { TranscriptionCron } from '../jobs/transcriptionCron';
import { WatchPartyCleanupJob } from '../jobs/watchPartyCleanup';
import { isFeatureEnabled } from '../middleware/featureFlags';
import { TelegramPairingService, ITelegramPairingService } from './telegramPairingService';

export interface CreatedServices {
  qbittorrent: IQBittorrentService;
  jellyfin: IJellyfinService;
  notifications: INotificationService;
  fileSystem: IFileSystemService;
  requestsRepo: IRequestsRepository;
  episodesRepo: IEpisodesRepository;
  episodicPruning: IEpisodicPruningService;
  stateMachine: IRequestStateMachine;
  cleanup: ICleanupService;
  metadata: IMetadataService;
  prowlarr: IProwlarrService;
  discovery: IDiscoveryService;
  upNext: IUpNextService;
  animeSeason: IAnimeSeasonService;
  subtitleInspection: ISubtitleInspectionService;
  subgen: ISubgenService;
  openSubtitles: OpenSubtitlesService;
  unarchive: IUnarchiveService;
  requestService: IRequestService;
  poller: DownloadPoller;
  unarchiveDaemon: UnarchiveDaemon;
  cleanupCron: CleanupCron;
  transcriptionCron: TranscriptionCron;
  watchPartyRepo: IWatchPartyRepository;
  syncPlay: IJellyfinSyncPlayService;
  watchPartyCleanup: WatchPartyCleanupJob;
  sessionMonitoring: ISessionMonitoringService;
  telegramPairing: ITelegramPairingService;
}

export function setupServices(
  app: FastifyInstance,
  options: AppOptions,
  db: AppDatabase,
  sqlite: Database.Database
): CreatedServices {
  const qbittorrent = options.qbittorrentService ?? new QBittorrentService();
  const jellyfin = options.jellyfinService ?? new JellyfinService(undefined, undefined, () => {
    const row = db.select().from(systemConfig).where(eq(systemConfig.key, 'jellyfin_api_key')).get();
    return row?.value || process.env.JELLYFIN_API_KEY || '';
  });
  const notifications = options.notificationService ?? new NotificationService({
    isDiscordEnabled: () => isFeatureEnabled(db, 'discord_notifications'),
    getUserTelegramChatId: (userId: string) => {
      const row = db.select({ telegramChatId: users.telegramChatId }).from(users).where(eq(users.id, userId)).get();
      return row?.telegramChatId || null;
    },
  });
  const fileSystem = options.fileSystemService ?? new FileSystemService();
  const requestsRepo = options.requestsRepo ?? new RequestsRepository(db);
  const episodesRepo = options.episodesRepo ?? new EpisodesRepository(db);
  const episodicPruning =
    options.episodicPruningService ??
    new EpisodicPruningService(episodesRepo, requestsRepo, qbittorrent, fileSystem, jellyfin);
  const stateMachine: IRequestStateMachine =
    options.stateMachine ??
    new RequestStateMachine(
      requestsRepo,
      (msg) => {
        if (typeof app.broadcast === 'function') {
          app.broadcast(msg);
        }
      },
      jellyfin,
      notifications,
      {
        error: (msg) => {
          if (typeof msg === 'string') {
            app.log.error(msg);
          } else {
            app.log.error(msg as object);
          }
        },
        warn: (msg) => app.log.warn(msg),
      }
    );

  const cleanup =
    options.cleanupService ??
    new CleanupService({
      db,
      requestsRepo,
      episodesRepo,
      episodicPruningService: episodicPruning,
      qbittorrent,
      jellyfin,
      notificationService: notifications,
      fileSystemService: fileSystem,
      stateMachine,
    });
  const metadata = options.metadataService ?? new MetadataService();
  const prowlarr = options.prowlarrService ?? new ProwlarrService();
  const discovery =
    options.discoveryService ??
    new DiscoveryService({
      prowlarr,
      metadata,
      getTmdbApiKey: () => {
        const row = db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.key, 'tmdb_api_key'))
          .get();
        return row?.value || process.env.TMDB_API_KEY || undefined;
      },
    });

  const serviceApiKey = options.serviceApiKey ?? process.env.SERVICE_API_KEY;
  if (!serviceApiKey) {
    app.log.warn('SERVICE_API_KEY is not set. Waitlist routes will reject all requests.');
  }

  const watcherUrl = options.watcherUrl ?? process.env.WATCHER_URL;
  const streamerUrl = options.streamerUrl ?? process.env.STREAMER_URL;

  const upNext =
    options.upNextService ??
    new UpNextService({
      db,
      requestsRepo,
      prowlarr,
      metadata,
      getTmdbApiKey: () => {
        const row = db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.key, 'tmdb_api_key'))
          .get();
        return row?.value || process.env.TMDB_API_KEY || undefined;
      },
      watcherUrl,
      serviceApiKey,
      logger: {
        warn: (msg: string) => app.log.warn(msg),
      },
    });

  const historyMatcher = new AnimeHistoryMatcher({
    requestsRepo,
    jellyfin,
    logger: {
      warn: (msg: string, extra?: unknown) => app.log.warn({ extra }, msg),
    },
  });

  const animeSeason =
    options.animeSeasonService ??
    new AnimeSeasonService({
      historyMatcher,
      getIsAdult: () =>
        app.db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.key, 'anime_include_adult'))
          .get()?.value === 'true',
      logger: {
        info: (msg: string) => app.log.info(msg),
        warn: (msg: string, extra?: unknown) => app.log.warn({ extra }, msg),
        error: (msg: string, extra?: unknown) => app.log.error(extra, msg),
      },
    });

  const subtitleInspection =
    options.subtitleInspectionService ??
    new SubtitleInspectionService({
      logger: {
        warn: (msg: string) => app.log.warn(msg),
        error: (msg: string, err?: unknown) => app.log.error(err, msg),
      },
    });

  const subgen =
    options.subgenService ??
    new SubgenService({
      logger: {
        info: (msg: string) => app.log.info(msg),
        error: (msg: string, err?: unknown) => app.log.error(err, msg),
      },
    });

  const openSubtitlesApiKey =
    options.openSubtitlesApiKey ??
    (() => {
      const row = db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'opensubtitles_api_key'))
        .get();
      return row?.value || process.env.OPENSUBTITLES_API_KEY || '';
    })();

  const openSubtitles =
    options.openSubtitlesService ??
    new OpenSubtitlesService({
      apiKey: openSubtitlesApiKey,
      logger: {
        info: (msg: string) => app.log.info(msg),
        warn: (msg: string) => app.log.warn(msg),
        error: (msg: string, err?: unknown) => app.log.error(err, msg),
      },
    });

  const unarchive = options.unarchiveService ?? new UnarchiveService();

  const requestService =
    options.requestService ??
    new RequestService({
      db,
      requestsRepo,
      stateMachine,
      cleanup,
      fileSystem,
      qbittorrent,
      jellyfin,
      notifications,
      subtitleInspection,
      watcherUrl: () => app.watcherUrl || process.env.WATCHER_URL,
      serviceApiKey: () => app.serviceApiKey || process.env.SERVICE_API_KEY,
      logger: {
        warn: (msg, ...args) => (app.log.warn as (...a: unknown[]) => void)(msg, ...args),
        error: (msg, ...args) => (app.log.error as (...a: unknown[]) => void)(msg, ...args),
      },
    });

  const cachedPrivateLibrary = db.select().from(systemConfig).where(eq(systemConfig.key, 'jellyfin_private_library_id')).get();
  if (cachedPrivateLibrary?.value && jellyfin.setPrivateLibraryId) {
    jellyfin.setPrivateLibraryId(cachedPrivateLibrary.value);
  }

  const watchPartyRepo = options.watchPartyRepo ?? new WatchPartyRepository(db);
  const syncPlay = options.syncPlayService ?? new JellyfinSyncPlayService(
    options.jellyfinService?.getPublicJellyfinUrl?.() || process.env.JELLYFIN_URL,
    process.env.JELLYFIN_API_KEY
  );

  const { poller, unarchiveDaemon, cleanupCron, transcriptionCron, watchPartyCleanup } =
    setupJobs(app, options, {
      db,
      requestsRepo,
      episodesRepo,
      qbittorrent,
      fileSystem,
      jellyfin,
      stateMachine,
      subtitleInspection,
      openSubtitles,
      unarchive,
      notifications,
      cleanup,
      subgen,
      watchPartyRepo,
      syncPlay,
    });

  const sessionMonitoring =
    options.sessionMonitoringService ??
    new SessionMonitoringService(
      options.jellyfinService?.getPublicJellyfinUrl?.() || process.env.JELLYFIN_URL,
      undefined,
      () => {
        const row = db.select().from(systemConfig).where(eq(systemConfig.key, 'jellyfin_api_key')).get();
        return row?.value || process.env.JELLYFIN_API_KEY || '';
      }
    );

  const telegramPairing = options.telegramPairingService ?? new TelegramPairingService();

  const decorations: Record<string, unknown> = {
    db, sqlite, jellyfin, metadata, qbittorrent, cleanup, notifications,
    cleanupCron, transcriptionCron, fileSystem, prowlarr, discovery,
    upNext, animeSeason, poller, subtitleInspection, subgen, openSubtitles,
    unarchive, unarchiveDaemon, stateMachine, requestsRepo, episodesRepo,
    episodicPruning, requestService, serviceApiKey, watcherUrl, streamerUrl,
    watchPartyRepo, syncPlay, watchPartyCleanup, sessionMonitoring, telegramPairing,
  };
  for (const [key, val] of Object.entries(decorations)) {
    app.decorate(key, val);
  }

  return {
    qbittorrent, jellyfin, notifications, fileSystem, requestsRepo, episodesRepo,
    episodicPruning, stateMachine, cleanup, metadata, prowlarr, discovery,
    upNext, animeSeason, subtitleInspection, subgen, openSubtitles, unarchive,
    requestService, poller, unarchiveDaemon, cleanupCron, transcriptionCron,
    watchPartyRepo, syncPlay, watchPartyCleanup, sessionMonitoring, telegramPairing,
  };
}
