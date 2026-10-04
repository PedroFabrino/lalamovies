import { FastifyInstance } from 'fastify';
import { AppOptions } from '../appTypes';
import { AppDatabase } from '../db';
import { DownloadPoller } from '../jobs/downloadPoller';
import { UnarchiveDaemon } from '../jobs/unarchiveDaemon';
import { CleanupCron } from '../jobs/cleanupCron';
import { TranscriptionCron } from '../jobs/transcriptionCron';
import { WatchPartyCleanupJob } from '../jobs/watchPartyCleanup';
import { isFeatureEnabled } from '../middleware/featureFlags';
import { ICleanupService } from './cleanup';
import { IFileSystemService } from './fileSystem';
import { IJellyfinService } from './jellyfin';
import { INotificationService } from './notifications';
import { IQBittorrentService } from './qbittorrent';
import { IRequestsRepository } from './requestsRepository';
import { IEpisodesRepository } from './episodesRepository';
import { IRequestStateMachine } from './requestStateMachine';
import { ISubtitleInspectionService } from './subtitleInspection';
import { ISubgenService } from './subgen';
import { OpenSubtitlesService } from './openSubtitles';
import { IUnarchiveService } from './unarchive';
import { IWatchPartyRepository } from './watchPartyRepository';
import { IJellyfinSyncPlayService } from './jellyfinSyncPlay';

export interface JobServicesContext {
  db: AppDatabase;
  requestsRepo: IRequestsRepository;
  episodesRepo: IEpisodesRepository;
  qbittorrent: IQBittorrentService;
  fileSystem: IFileSystemService;
  jellyfin: IJellyfinService;
  stateMachine: IRequestStateMachine;
  subtitleInspection: ISubtitleInspectionService;
  openSubtitles: OpenSubtitlesService;
  unarchive: IUnarchiveService;
  notifications: INotificationService;
  cleanup: ICleanupService;
  subgen: ISubgenService;
  watchPartyRepo: IWatchPartyRepository;
  syncPlay: IJellyfinSyncPlayService;
}

export interface CreatedJobs {
  poller: DownloadPoller;
  unarchiveDaemon: UnarchiveDaemon;
  cleanupCron: CleanupCron;
  transcriptionCron: TranscriptionCron;
  watchPartyCleanup: WatchPartyCleanupJob;
}

export function setupJobs(
  app: FastifyInstance,
  options: AppOptions,
  ctx: JobServicesContext
): CreatedJobs {
  const poller =
    options.downloadPoller ??
    new DownloadPoller({
      db: ctx.db,
      requestsRepo: ctx.requestsRepo,
      episodesRepo: ctx.episodesRepo,
      qbittorrent: ctx.qbittorrent,
      fileSystem: ctx.fileSystem,
      jellyfin: ctx.jellyfin,
      stateMachine: ctx.stateMachine,
      subtitleInspection: ctx.subtitleInspection,
      openSubtitles: ctx.openSubtitles,
      unarchiveService: ctx.unarchive,
      notificationService: ctx.notifications,
      logger: {
        info: (msg: string) => app.log.info(msg),
        error: (msg: string, err?: unknown) => app.log.error(err, msg),
      },
      broadcast: (msg) => {
        if (typeof app.broadcast === 'function') {
          app.broadcast(msg);
        }
      },
      isHostDiskSafe: ctx.cleanup.isHostDiskSafe ? () => ctx.cleanup.isHostDiskSafe!() : undefined,
      isSpaceSufficient: ctx.cleanup.isSpaceSufficient ? () => ctx.cleanup.isSpaceSufficient() : undefined,
    });

  if (options.startPoller) {
    poller.start();
  }

  const unarchiveDaemon =
    options.unarchiveDaemon ??
    new UnarchiveDaemon({
      db: ctx.db,
      requestsRepo: ctx.requestsRepo,
      unarchiveService: ctx.unarchive,
      fileSystem: ctx.fileSystem,
      jellyfin: ctx.jellyfin,
      stateMachine: ctx.stateMachine,
      qbittorrent: ctx.qbittorrent,
      subtitleInspection: ctx.subtitleInspection,
      notificationService: ctx.notifications,
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
      cleanupService: ctx.cleanup,
      isCleanupEnabled: () => isFeatureEnabled(ctx.db, 'automated_cleanup'),
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
      db: ctx.db,
      requestsRepo: ctx.requestsRepo,
      subgen: ctx.subgen,
      isTranscriptionEnabled: () => isFeatureEnabled(ctx.db, 'transcription_enabled'),
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

  const watchPartyCleanup =
    options.watchPartyCleanupJob ??
    new WatchPartyCleanupJob({
      watchPartyRepo: ctx.watchPartyRepo,
      syncPlay: ctx.syncPlay,
      broadcast: (msg) => {
        if (typeof app.broadcast === 'function') app.broadcast(msg);
      },
      logger: {
        info: (msg) => app.log.info(msg),
        warn: (msg) => app.log.warn(msg),
        error: (msg, err) => app.log.error(err, msg),
      },
    });

  if (options.startWatchPartyCleanup ?? (process.env.NODE_ENV !== 'test')) {
    watchPartyCleanup.start();
  }

  return {
    poller,
    unarchiveDaemon,
    cleanupCron,
    transcriptionCron,
    watchPartyCleanup,
  };
}
