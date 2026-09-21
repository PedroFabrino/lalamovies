import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { initDatabase, AppDatabase, systemConfig, featureFlags, users } from './db';
import { IJellyfinService, JellyfinService } from './services/jellyfin';
import { IMetadataService, MetadataService } from './services/metadata';
import { IQBittorrentService, QBittorrentService } from './services/qbittorrent';
import { ICleanupService, CleanupService } from './services/cleanup';
import { INotificationService, NotificationService } from './services/notifications';
import { IFileSystemService, FileSystemService } from './services/fileSystem';
import { IProwlarrService, ProwlarrService } from './services/prowlarr';
import { IDiscoveryService, DiscoveryService } from './services/discovery';
import { IUpNextService, UpNextService } from './services/upNext';
import { DownloadPoller } from './jobs/downloadPoller';
import { CleanupCron } from './jobs/cleanupCron';
import { TranscriptionCron } from './jobs/transcriptionCron';
import { authRoutes } from './routes/auth';
import { inviteRoutes } from './routes/invites';
import { requestRoutes } from './routes/requests';
import { adminRoutes } from './routes/admin';
import { discoveryRoutes } from './routes/discovery';
import { wsRoutes, BroadcastFunction } from './routes/ws';
import { waitlistRoutes } from './routes/waitlist';
import { streamsRoutes } from './routes/streams';
import { libraryRoutes } from './routes/library';
import { internalRoutes } from './routes/internal';
import { isFeatureEnabled } from './middleware/featureFlags';
import { ISubtitleInspectionService, SubtitleInspectionService } from './services/subtitleInspection';
import { ISubgenService, SubgenService } from './services/subgen';
import { OpenSubtitlesService } from './services/openSubtitles';
import { IUnarchiveService, UnarchiveService } from './services/unarchive';
import { UnarchiveDaemon } from './jobs/unarchiveDaemon';
import { runCorruptedArchiveRecovery } from './services/unarchiveRecovery';
import { runHardlinkingRecovery } from './services/hardlinkRecovery';
import { IRequestStateMachine, RequestStateMachine } from './services/requestStateMachine';
import { IRequestsRepository, RequestsRepository } from './services/requestsRepository';
import { validateConfig, config } from './config';


export interface AppOptions {
  dbPath?: string;
  runMigrate?: boolean;
  jellyfinService?: IJellyfinService;
  metadataService?: IMetadataService;
  qbittorrentService?: IQBittorrentService;
  cleanupService?: ICleanupService;
  notificationService?: INotificationService;
  fileSystemService?: IFileSystemService;
  prowlarrService?: IProwlarrService;
  discoveryService?: IDiscoveryService;
  upNextService?: IUpNextService;
  downloadPoller?: DownloadPoller;
  unarchiveService?: IUnarchiveService;
  unarchiveDaemon?: UnarchiveDaemon;
  cleanupCron?: CleanupCron;
  transcriptionCron?: TranscriptionCron;
  startPoller?: boolean;
  startUnarchiveDaemon?: boolean;
  startCleanupCron?: boolean;
  startTranscriptionCron?: boolean;
  jwtSecret?: string;
  serviceApiKey?: string;
  watcherUrl?: string;
  streamerUrl?: string;
  subtitleInspectionService?: ISubtitleInspectionService;
  subgenService?: ISubgenService;
  openSubtitlesService?: OpenSubtitlesService;
  openSubtitlesApiKey?: string;
  stateMachine?: IRequestStateMachine;
  requestsRepo?: IRequestsRepository;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: AppDatabase;
    sqlite: Database.Database;
    jellyfin: IJellyfinService;
    metadata: IMetadataService;
    qbittorrent: IQBittorrentService;
    cleanup: ICleanupService;
    notifications: INotificationService;
    cleanupCron: CleanupCron;
    transcriptionCron: TranscriptionCron;
    fileSystem: IFileSystemService;
    prowlarr: IProwlarrService;
    discovery: IDiscoveryService;
    upNext: IUpNextService;
    poller: DownloadPoller;
    broadcast: BroadcastFunction;
    serviceApiKey?: string;
    watcherUrl?: string;
    streamerUrl?: string;
    subtitleInspection: ISubtitleInspectionService;
    subgen: ISubgenService;
    openSubtitles: OpenSubtitlesService;
    unarchive: IUnarchiveService;
    unarchiveDaemon: UnarchiveDaemon;
    stateMachine: IRequestStateMachine;
    requestsRepo: IRequestsRepository;
  }
}


export function buildApp(options: AppOptions = {}): FastifyInstance {
  validateConfig();

  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  const { db, sqlite } = initDatabase(options.dbPath, options.runMigrate ?? true);
  const qbittorrent = options.qbittorrentService ?? new QBittorrentService();
  const jellyfin =
    options.jellyfinService ??
    new JellyfinService(undefined, undefined, () => {
      const row = db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'jellyfin_api_key'))
        .get();
      return row?.value || process.env.JELLYFIN_API_KEY || '';
    });
  const notifications =
    options.notificationService ??
    new NotificationService({
      isDiscordEnabled: () => isFeatureEnabled(db, 'discord_notifications'),
    });
  const fileSystem = options.fileSystemService ?? new FileSystemService();
  const requestsRepo = options.requestsRepo ?? new RequestsRepository(db);
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

  const poller =
    options.downloadPoller ??
    new DownloadPoller({
      db,
      requestsRepo,
      qbittorrent,
      fileSystem,
      jellyfin,
      stateMachine,
      subtitleInspection,
      openSubtitles,
      unarchiveService: unarchive,
      notificationService: notifications,
      logger: {
        info: (msg: string) => app.log.info(msg),
        error: (msg: string, err?: unknown) => app.log.error(err, msg),
      },
      broadcast: (msg) => {
        if (typeof app.broadcast === 'function') {
          app.broadcast(msg);
        }
      },
    });

  if (options.startPoller) {
    poller.start();
  }

  const unarchiveDaemon =
    options.unarchiveDaemon ??
    new UnarchiveDaemon({
      db,
      requestsRepo,
      unarchiveService: unarchive,
      fileSystem,
      jellyfin,
      stateMachine,
      qbittorrent,
      subtitleInspection,
      notificationService: notifications,
      logger: {
        info: (msg: string) => app.log.info(msg),
        error: (msg: string, err?: unknown) => app.log.error(err, msg),
      },
      broadcast: (msg) => {
        if (typeof app.broadcast === 'function') {
          app.broadcast(msg);
        }
      },
    });

  if (options.startUnarchiveDaemon ?? options.startPoller) {
    unarchiveDaemon.start();
  }

  const cleanupCron =
    options.cleanupCron ??
    new CleanupCron({
      cleanupService: cleanup,
      isCleanupEnabled: () => isFeatureEnabled(db, 'automated_cleanup'),
      logger: {
        info: (msg: string) => app.log.info(msg),
        error: (msg: string, err?: unknown) => app.log.error(err, msg),
      },
    });

  if (options.startCleanupCron) {
    cleanupCron.start();
  }

  const transcriptionCron =
    options.transcriptionCron ??
    new TranscriptionCron({
      db,
      requestsRepo,
      subgen,
      isTranscriptionEnabled: () => isFeatureEnabled(db, 'transcription_enabled'),
      logger: {
        info: (msg: string) => app.log.info(msg),
        warn: (msg: string) => app.log.warn(msg),
        error: (msg: string, err?: unknown) => app.log.error(err, msg),
      },
      broadcast: (msg) => {
        if (typeof app.broadcast === 'function') {
          app.broadcast(msg);
        }
      },
    });

  if (options.startTranscriptionCron) {
    transcriptionCron.start();
  }

  const cachedPrivateLibrary = db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, 'jellyfin_private_library_id'))
    .get();
  if (cachedPrivateLibrary?.value && jellyfin.setPrivateLibraryId) {
    jellyfin.setPrivateLibraryId(cachedPrivateLibrary.value);
  }

  app.decorate('db', db);
  app.decorate('sqlite', sqlite);
  app.decorate('jellyfin', jellyfin);
  app.decorate('metadata', metadata);
  app.decorate('qbittorrent', qbittorrent);
  app.decorate('cleanup', cleanup);
  app.decorate('notifications', notifications);
  app.decorate('cleanupCron', cleanupCron);
  app.decorate('transcriptionCron', transcriptionCron);
  app.decorate('fileSystem', fileSystem);
  app.decorate('prowlarr', prowlarr);
  app.decorate('discovery', discovery);
  app.decorate('upNext', upNext);
  app.decorate('poller', poller);
  app.decorate('subtitleInspection', subtitleInspection);
  app.decorate('subgen', subgen);
  app.decorate('openSubtitles', openSubtitles);
  app.decorate('unarchive', unarchive);
  app.decorate('unarchiveDaemon', unarchiveDaemon);

  app.decorate('stateMachine', stateMachine);
  app.decorate('requestsRepo', requestsRepo);


  app.decorate('serviceApiKey', serviceApiKey);
  app.decorate('watcherUrl', watcherUrl);
  app.decorate('streamerUrl', streamerUrl);

  app.addHook('onClose', async () => {
    poller.stop();
    unarchiveDaemon.stop();
    cleanupCron.stop();
    transcriptionCron.stop();
    sqlite.close();
  });

  app.addHook('onReady', async () => {
    if (jellyfin.ensureStreamLibrary) {
      try {
        const libraryId = await jellyfin.ensureStreamLibrary();
        if (libraryId) {
          const existing = db
            .select()
            .from(systemConfig)
            .where(eq(systemConfig.key, 'stream_library_id'))
            .get();
          if (existing) {
            db.update(systemConfig)
              .set({ value: libraryId })
              .where(eq(systemConfig.key, 'stream_library_id'))
              .run();
          } else {
            db.insert(systemConfig)
              .values({ key: 'stream_library_id', value: libraryId })
              .run();
          }
          app.log.info(`Stream library ensured in Jellyfin with ID ${libraryId}`);
        }
      } catch (err) {
        app.log.warn(`Could not ensure Stream library in Jellyfin on startup: ${(err as Error).message}`);
      }
    }

    if (jellyfin.discoverPrivateLibraryId) {
      try {
        const libraryId = await jellyfin.discoverPrivateLibraryId();
        if (libraryId) {
          const existing = db
            .select()
            .from(systemConfig)
            .where(eq(systemConfig.key, 'jellyfin_private_library_id'))
            .get();
          if (existing) {
            db.update(systemConfig)
              .set({ value: libraryId })
              .where(eq(systemConfig.key, 'jellyfin_private_library_id'))
              .run();
          } else {
            db.insert(systemConfig)
              .values({ key: 'jellyfin_private_library_id', value: libraryId })
              .run();
          }
          app.log.info(`Private library discovered in Jellyfin with ID ${libraryId}`);

          if (jellyfin.syncAllUserPermissions) {
            const allUsers = db
              .select({ jellyfinUserId: users.jellyfinUserId, role: users.role })
              .from(users)
              .all();
            await jellyfin.syncAllUserPermissions(
              allUsers as Array<{ jellyfinUserId: string | null; role: 'user' | 'trusted' | 'admin' }>
            );
            app.log.info(`Enforced private library access control for ${allUsers.length} users`);
          }
        } else {
          app.log.warn('Private Library not found in Jellyfin — create a library pointing at /media/private to enable access control');
        }
      } catch (err) {
        app.log.warn(`Could not discover Private library in Jellyfin on startup: ${(err as Error).message}`);
      }
    }

    if (options.startPoller) {
      setImmediate(() => {
        runCorruptedArchiveRecovery({
          db,
          unarchiveService: unarchive,
          fileSystem,
          jellyfin,
          stateMachine,
          logger: {
            info: (msg) => app.log.info(msg),
            warn: (msg) => app.log.warn(msg),
            error: (msg, err) => app.log.error(err, msg),
          },
        })
          .then((recoveryRes) => {
            if (recoveryRes.recoveredCount > 0) {
              app.log.info(
                `Startup corrupted archive recovery finished: recovered ${recoveryRes.recoveredCount} items`
              );
            }
          })
          .catch((recErr) => {
            app.log.warn(recErr, 'Non-fatal error in startup corrupted archive recovery');
          });

        runHardlinkingRecovery({
          db,
          fileSystem,
          requestsRepo,
          stateMachine,
          logger: {
            info: (msg) => app.log.info(msg),
            warn: (msg) => app.log.warn(msg),
            error: (msg, err) => app.log.error(err, msg),
          },
        })
          .then((hlRes) => {
            if (hlRes.recoveredCount > 0 || hlRes.failedCount > 0) {
              app.log.info(
                `Startup hardlink recovery finished: recovered ${hlRes.recoveredCount}, failed ${hlRes.failedCount} items`
              );
            }
          })
          .catch((hlErr) => {
            app.log.warn(hlErr, 'Non-fatal error in startup hardlink recovery');
          });
      });
    }
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  const jwtSecret = options.jwtSecret || config.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }

  app.register(fastifyCookie);
  app.register(fastifyJwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  app.register(fastifyWebsocket);

  app.get('/health', async () => {
    return { ok: true };
  });

  const getPublicFeatures = async () => {
    try {
      const rows = app.db.select().from(featureFlags).all();
      const flagsMap: Record<string, boolean> = {};
      for (const row of rows) {
        flagsMap[row.id] = Boolean(row.enabled);
      }
      return flagsMap;
    } catch {
      return {};
    }
  };

  app.get('/features', getPublicFeatures);
  app.get('/api/features', getPublicFeatures);

  app.register(authRoutes, { prefix: '/auth' });
  app.register(inviteRoutes, { prefix: '/invites' });
  app.register(requestRoutes, { prefix: '/requests' });
  app.register(requestRoutes, { prefix: '/api/requests' });
  app.register(adminRoutes, { prefix: '/admin' });
  app.register(adminRoutes, { prefix: '/api/admin' });
  app.register(discoveryRoutes, { prefix: '/discovery' });
  app.register(discoveryRoutes, { prefix: '/api/discovery' });
  app.register(waitlistRoutes, { prefix: '/waitlist' });
  app.register(waitlistRoutes, { prefix: '/api/waitlist' });
  app.register(streamsRoutes, { prefix: '/streams' });
  app.register(streamsRoutes, { prefix: '/api/streams' });
  app.register(libraryRoutes, { prefix: '/library' });
  app.register(libraryRoutes, { prefix: '/api/library' });
  app.register(internalRoutes, { prefix: '/internal' });
  app.register(internalRoutes, { prefix: '/api/internal' });
  app.register(wsRoutes);

  return app;
}