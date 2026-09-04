import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import Database from 'better-sqlite3';
import { initDatabase, AppDatabase } from './db';
import { IJellyfinService, JellyfinService } from './services/jellyfin';
import { IMetadataService, MetadataService } from './services/metadata';
import { IQBittorrentService, QBittorrentService } from './services/qbittorrent';
import { ICleanupService, CleanupService } from './services/cleanup';
import { IFileSystemService, FileSystemService } from './services/fileSystem';
import { DownloadPoller } from './jobs/downloadPoller';
import { authRoutes } from './routes/auth';
import { inviteRoutes } from './routes/invites';
import { requestRoutes } from './routes/requests';
import { wsRoutes, BroadcastFunction } from './routes/ws';

export interface AppOptions {
  dbPath?: string;
  runMigrate?: boolean;
  jellyfinService?: IJellyfinService;
  metadataService?: IMetadataService;
  qbittorrentService?: IQBittorrentService;
  cleanupService?: ICleanupService;
  fileSystemService?: IFileSystemService;
  downloadPoller?: DownloadPoller;
  startPoller?: boolean;
  jwtSecret?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: AppDatabase;
    sqlite: Database.Database;
    jellyfin: IJellyfinService;
    metadata: IMetadataService;
    qbittorrent: IQBittorrentService;
    cleanup: ICleanupService;
    fileSystem: IFileSystemService;
    poller: DownloadPoller;
    broadcast: BroadcastFunction;
  }
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  const { db, sqlite } = initDatabase(options.dbPath, options.runMigrate ?? true);
  const qbittorrent = options.qbittorrentService ?? new QBittorrentService();
  const cleanup = options.cleanupService ?? new CleanupService(db, qbittorrent);
  const fileSystem = options.fileSystemService ?? new FileSystemService();
  const jellyfin = options.jellyfinService ?? new JellyfinService();
  const metadata = options.metadataService ?? new MetadataService();

  const poller =
    options.downloadPoller ??
    new DownloadPoller({
      db,
      qbittorrent,
      fileSystem,
      jellyfin,
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

  app.decorate('db', db);
  app.decorate('sqlite', sqlite);
  app.decorate('jellyfin', jellyfin);
  app.decorate('metadata', metadata);
  app.decorate('qbittorrent', qbittorrent);
  app.decorate('cleanup', cleanup);
  app.decorate('fileSystem', fileSystem);
  app.decorate('poller', poller);

  app.addHook('onClose', async () => {
    poller.stop();
    sqlite.close();
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || 'super-secret-jwt-key-for-development-32chars';

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

  app.register(authRoutes, { prefix: '/auth' });
  app.register(inviteRoutes, { prefix: '/invites' });
  app.register(requestRoutes, { prefix: '/requests' });
  app.register(wsRoutes);

  return app;
}