import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import { initDatabase, featureFlags } from './db';
import { AppOptions } from './appTypes';
import { setupServices } from './services/serviceContainer';
import { registerStartupHooks } from './startup/onReady';
import { authRoutes } from './routes/auth';
import { inviteRoutes } from './routes/invites';
import { requestRoutes } from './routes/requests';
import { adminRoutes } from './routes/admin';
import { discoveryRoutes } from './routes/discovery';
import { wsRoutes } from './routes/ws';
import { waitlistRoutes } from './routes/waitlist';
import { streamsRoutes } from './routes/streams';
import { libraryRoutes } from './routes/library';
import { internalRoutes } from './routes/internal';
import { validateConfig, getConfig } from './config';

export * from './appTypes';

export function buildApp(options: AppOptions = {}): FastifyInstance {
  validateConfig();

  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  const { db, sqlite } = initDatabase(options.dbPath, options.runMigrate ?? true);
  const services = setupServices(app, options, db, sqlite);

  app.addHook('onClose', async () => {
    services.poller.stop();
    services.unarchiveDaemon.stop();
    services.cleanupCron.stop();
    services.transcriptionCron.stop();
    sqlite.close();
  });

  registerStartupHooks(app, options);

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  const jwtSecret = options.jwtSecret || getConfig().JWT_SECRET;
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