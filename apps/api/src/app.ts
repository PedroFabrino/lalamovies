import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import Database from 'better-sqlite3';
import { initDatabase, AppDatabase } from './db';
import { IJellyfinService, JellyfinService } from './services/jellyfin';
import { IMetadataService, MetadataService } from './services/metadata';
import { IQBittorrentService, QBittorrentService } from './services/qbittorrent';
import { ICleanupService, CleanupService } from './services/cleanup';
import { authRoutes } from './routes/auth';
import { inviteRoutes } from './routes/invites';
import { requestRoutes } from './routes/requests';

export interface AppOptions {
  dbPath?: string;
  runMigrate?: boolean;
  jellyfinService?: IJellyfinService;
  metadataService?: IMetadataService;
  qbittorrentService?: IQBittorrentService;
  cleanupService?: ICleanupService;
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
  }
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  const { db, sqlite } = initDatabase(options.dbPath, options.runMigrate ?? true);
  const qbittorrent = options.qbittorrentService ?? new QBittorrentService();
  const cleanup = options.cleanupService ?? new CleanupService(db, qbittorrent);

  app.decorate('db', db);
  app.decorate('sqlite', sqlite);
  app.decorate('jellyfin', options.jellyfinService ?? new JellyfinService());
  app.decorate('metadata', options.metadataService ?? new MetadataService());
  app.decorate('qbittorrent', qbittorrent);
  app.decorate('cleanup', cleanup);

  app.addHook('onClose', async () => {
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

  app.get('/health', async () => {
    return { ok: true };
  });

  app.register(authRoutes, { prefix: '/auth' });
  app.register(inviteRoutes, { prefix: '/invites' });
  app.register(requestRoutes, { prefix: '/requests' });

  return app;
}