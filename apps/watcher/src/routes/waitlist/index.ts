import { FastifyPluginAsync } from 'fastify';
import { waitlistCreateRoutes } from './create';
import { waitlistCrudRoutes } from './crud';
import { waitlistMagicLinkRoutes } from './magicLink';
import { waitlistActionRoutes } from './actions';

export const waitlistRoutes: FastifyPluginAsync = async (app) => {
  // Service-key verification hook for watcher (bypassed for magic-link rejection & approval)
  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'GET' && /\/(reject|approve)(\?|$)/.test(request.url)) {
      return;
    }
    if (app.serviceApiKey) {
      const headerKey = request.headers['x-service-key'];
      const providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
      if (!providedKey || providedKey !== app.serviceApiKey) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing X-Service-Key',
        });
      }
    }
  });

  await app.register(waitlistCreateRoutes);
  await app.register(waitlistCrudRoutes);
  await app.register(waitlistMagicLinkRoutes);
  await app.register(waitlistActionRoutes);
};
