import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import Database from 'better-sqlite3';
import { initDatabase, AppDatabase } from './db';
import { IJellyfinService, JellyfinService } from './services/jellyfin';
import { authRoutes } from './routes/auth';

export interface AppOptions {
  dbPath?: string;
  runMigrate?: boolean;
  jellyfinService?: IJellyfinService;
  jwtSecret?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: AppDatabase;
    sqlite: Database.Database;
    jellyfin: IJellyfinService;
  }
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  const { db, sqlite } = initDatabase(options.dbPath, options.runMigrate ?? true);

  app.decorate('db', db);
  app.decorate('sqlite', sqlite);
  app.decorate('jellyfin', options.jellyfinService ?? new JellyfinService());

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

  return app;
}