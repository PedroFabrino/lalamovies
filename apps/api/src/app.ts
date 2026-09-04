import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
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
