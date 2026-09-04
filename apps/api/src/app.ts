import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import { initDatabase, AppDatabase } from './db';

export interface AppOptions {
  dbPath?: string;
  runMigrate?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: AppDatabase;
    sqlite: Database.Database;
  }
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  const { db, sqlite } = initDatabase(options.dbPath, options.runMigrate ?? true);

  app.decorate('db', db);
  app.decorate('sqlite', sqlite);

  app.addHook('onClose', async () => {
    sqlite.close();
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.get('/health', async () => {
    return { ok: true };
  });

  return app;
}