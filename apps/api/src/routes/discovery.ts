import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

const discoveryFeedQuerySchema = z.object({
  category: z.enum(['movies', 'tv', 'anime'], {
    message: "category must be one of: 'movies', 'tv', 'anime'",
  }),
  refresh: z.enum(['true', 'false']).optional(),
});

export const discoveryRoutes: FastifyPluginAsync = async (app) => {
  // All /discovery routes require authentication
  app.addHook('preHandler', authMiddleware);

  // GET /discovery/feed?category=movies|tv|anime
  app.get('/feed', async (request, reply) => {
    const parseResult = discoveryFeedQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid query parameters',
      });
    }

    const { category, refresh } = parseResult.data;
    const forceRefresh = refresh === 'true';

    try {
      const result = await app.discovery.getFeed(category, forceRefresh);
      if (forceRefresh) {
        reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        reply.header('Cache-Control', 'private, max-age=3600');
      }
      return reply.send(result);
    } catch (err) {
      request.log.error(err, 'Failed to retrieve discovery feed');
      return reply.send({
        available: false,
        items: [],
        error: (err as Error).message,
      });
    }
  });

  // GET /discovery/up-next
  app.get('/up-next', async (request, reply) => {
    const userId = request.currentUser?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not found' });
    }

    try {
      const result = await app.upNext.getUpNext(userId);
      return reply.send(result);
    } catch (err) {
      request.log.error(err, 'Failed to retrieve up-next releases');
      return reply.send({
        available: false,
        items: [],
        error: (err as Error).message,
      });
    }
  });
};
