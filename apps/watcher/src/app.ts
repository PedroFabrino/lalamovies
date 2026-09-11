import Fastify, { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { initWatcherDatabase, WatcherDatabase } from './db';
import { waitlistRoutes } from './routes/waitlist';
import { ReleaseGatingService } from './services/releaseGating';
import { WatcherProwlarrService } from './services/prowlarr';
import { WatcherPoller } from './jobs/watcherPoller';
import { AutoDownloadSubmitter } from './jobs/autoDownloadSubmitter';
import { EpisodicTrackingService } from './services/episodicTracking';

export interface WatcherAppOptions {
  dbPath?: string;
  serviceApiKey?: string;
  tmdbApiKey?: string;
  prowlarrUrl?: string;
  prowlarrApiKey?: string;
  pollIntervalHours?: number;
  startCrons?: boolean;
  startPoller?: boolean;
  startSubmitter?: boolean;
  mainApiUrl?: string;
  notifyGraceHours?: number;
  submitSchedule?: string;
  releaseGatingService?: ReleaseGatingService;
  prowlarrService?: WatcherProwlarrService;
  watcherPoller?: WatcherPoller;
  autoDownloadSubmitter?: AutoDownloadSubmitter;
  episodicTrackingService?: EpisodicTrackingService;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: WatcherDatabase;
    sqlite: Database.Database;
    serviceApiKey?: string;
    tmdbApiKey?: string;
    releaseGating: ReleaseGatingService;
    prowlarr: WatcherProwlarrService;
    poller: WatcherPoller;
    submitter: AutoDownloadSubmitter;
    episodic: EpisodicTrackingService;
  }
}

export function buildWatcherApp(options: WatcherAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  const { db, sqlite } = initWatcherDatabase(options.dbPath);
  const serviceApiKey = options.serviceApiKey ?? process.env.SERVICE_API_KEY;
  const tmdbApiKey = options.tmdbApiKey ?? process.env.TMDB_API_KEY;

  const releaseGating =
    options.releaseGatingService ??
    new ReleaseGatingService({
      db,
      tmdbApiKey,
      logger: {
        info: (msg) => app.log.info(msg),
        warn: (msg) => app.log.warn(msg),
        error: (msg, err) => app.log.error(err, msg),
      },
    });

  if (options.startCrons) {
    releaseGating.startCrons();
  }

  const prowlarr =
    options.prowlarrService ??
    new WatcherProwlarrService({
      prowlarrUrl: options.prowlarrUrl,
      apiKey: options.prowlarrApiKey,
    });

  const poller =
    options.watcherPoller ??
    new WatcherPoller({
      db,
      prowlarrService: prowlarr,
      pollIntervalHours: options.pollIntervalHours,
      logger: {
        info: (msg) => app.log.info(msg),
        warn: (msg) => app.log.warn(msg),
        error: (msg, err) => app.log.error(err, msg),
      },
    });

  if (options.startPoller) {
    poller.start();
  }

  const episodic =
    options.episodicTrackingService ??
    new EpisodicTrackingService({
      db,
      tmdbApiKey,
      logger: {
        info: (msg) => app.log.info(msg),
        warn: (msg) => app.log.warn(msg),
        error: (msg, err) => app.log.error(err, msg),
      },
    });

  const submitter =
    options.autoDownloadSubmitter ??
    new AutoDownloadSubmitter({
      db,
      mainApiUrl: options.mainApiUrl,
      serviceApiKey,
      tmdbApiKey,
      graceHours: options.notifyGraceHours,
      schedule: options.submitSchedule,
      episodicService: episodic,
      logger: {
        info: (msg) => app.log.info(msg),
        warn: (msg) => app.log.warn(msg),
        error: (msg, err) => app.log.error(err, msg),
      },
    });

  if (options.startSubmitter) {
    submitter.start();
  }

  app.decorate('db', db);
  app.decorate('sqlite', sqlite);
  app.decorate('serviceApiKey', serviceApiKey);
  app.decorate('tmdbApiKey', tmdbApiKey);
  app.decorate('releaseGating', releaseGating);
  app.decorate('prowlarr', prowlarr);
  app.decorate('poller', poller);
  app.decorate('submitter', submitter);
  app.decorate('episodic', episodic);

  app.addHook('onClose', async () => {
    poller.stop();
    submitter.stop();
    releaseGating.stopCrons();
    sqlite.close();
  });

  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  app.register(waitlistRoutes, { prefix: '/waitlist' });

  return app;
}