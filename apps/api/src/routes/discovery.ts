import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

const discoveryFeedQuerySchema = z.object({
  category: z.enum(['movies', 'tv', 'anime'], {
    message: "category must be one of: 'movies', 'tv', 'anime'",
  }),
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

    const { category } = parseResult.data;

    try {
      const result = await app.discovery.getFeed(category);
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
};
