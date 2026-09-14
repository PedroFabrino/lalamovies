import Fastify, { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { initStreamerDatabase, StreamerDatabase } from './db';
import { streamRoutes } from './routes/streams';
import { IStreamerJellyfinService, StreamerJellyfinService } from './services/jellyfin';
import { IDebridService, DebridService } from './services/debrid';
import { StreamPoller } from './jobs/streamPoller';
import { EphemeralEvictionCron } from './jobs/ephemeralEvictionCron';

import { IDirectDownloader, DirectDownloader } from './services/httpDownloader';

export interface StreamerAppOptions {
  dbPath?: string;
  serviceApiKey?: string;
  realDebridApiKey?: string;
  jellyfinUrl?: string;
  jellyfinApiKey?: string;
  mainApiUrl?: string;
  jellyfinService?: IStreamerJellyfinService;
  debridService?: IDebridService;
  streamPoller?: StreamPoller;
  evictionCron?: EphemeralEvictionCron;
  directDownloader?: IDirectDownloader;
  startCron?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: StreamerDatabase;
    sqlite: Database.Database;
    serviceApiKey?: string;
    mainApiUrl?: string;
    jellyfin: IStreamerJellyfinService;
    debrid: IDebridService;
    streamPoller: StreamPoller;
    evictionCron: EphemeralEvictionCron;
    directDownloader: IDirectDownloader;
  }
}

export function buildStreamerApp(options: StreamerAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  const { db, sqlite } = initStreamerDatabase(options.dbPath);
  const serviceApiKey = options.serviceApiKey ?? process.env.SERVICE_API_KEY;
  const jellyfin =
    options.jellyfinService ??
    new StreamerJellyfinService({
      baseUrl: options.jellyfinUrl,
      apiKey: options.jellyfinApiKey,
      db,
    });
  const debrid =
    options.debridService ??
    new DebridService(options.realDebridApiKey ?? process.env.REALDEBRID_API_KEY);
  const streamPoller =
    options.streamPoller ??
    new StreamPoller({
      db,
      debrid,
      jellyfin,
      mainApiUrl: options.mainApiUrl,
      serviceApiKey,
    });
    const evictionCron =
    options.evictionCron ??
    new EphemeralEvictionCron({
      db,
      debrid,
      jellyfin,
      logger: {
        info: (msg) => app.log.info(msg),
        error: (msg, err) => app.log.error(err, msg),
      },
    });
  const directDownloader = options.directDownloader ?? new DirectDownloader();
  const mainApiUrl = options.mainApiUrl ?? process.env.MAIN_API_URL;

  app.decorate('db', db);
  app.decorate('sqlite', sqlite);
  app.decorate('serviceApiKey', serviceApiKey);
  app.decorate('mainApiUrl', mainApiUrl);
  app.decorate('jellyfin', jellyfin);
  app.decorate('debrid', debrid);
  app.decorate('streamPoller', streamPoller);
  app.decorate('evictionCron', evictionCron);
  app.decorate('directDownloader', directDownloader);

  if (options.startCron) {
    evictionCron.start();
  }

  app.addHook('onClose', async () => {
    evictionCron.stop();
    sqlite.close();
  });

  app.addHook('preHandler', async (request, reply) => {
    const pathname = request.url.split('?')[0];
    if (pathname === '/health') {
      return;
    }

    const headerKey = request.headers['x-service-key'];
    const providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;

    if (!serviceApiKey || !providedKey || providedKey !== serviceApiKey) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing X-Service-Key',
      });
    }
  });

  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  app.register(streamRoutes, { prefix: '/streams' });

  return app;
}
