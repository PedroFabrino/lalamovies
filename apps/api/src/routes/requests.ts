import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { systemConfig } from '../db/schema';
import { MetadataApiError } from '../services/metadata';

const searchMetadataSchema = z.object({
  magnetLink: z.string().min(1, 'Magnet link is required'),
  mediaType: z.enum(['movie', 'tv_show', 'anime']),
  query: z.string().optional(),
});

export const requestRoutes: FastifyPluginAsync = async (app) => {
  // All /requests routes require authentication
  app.addHook('preHandler', authMiddleware);

  app.post('/search-metadata', async (request, reply) => {
    const parseResult = searchMetadataSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const { magnetLink, mediaType, query: explicitQuery } = parseResult.data;

    // Use explicit query if supplied, otherwise parse from magnet link
    const searchQuery =
      explicitQuery && explicitQuery.trim().length > 0
        ? explicitQuery.trim()
        : app.metadata.extractTitleFromMagnet(magnetLink);

    if (!searchQuery) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Could not extract search query from magnet link',
      });
    }

    try {
      if (mediaType === 'anime') {
        const candidates = await app.metadata.searchAniList(searchQuery);
        return reply.send({
          query: searchQuery,
          mediaType,
          candidates,
        });
      }

      // Check system_config for tmdb_api_key first
      const configRow = app.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'tmdb_api_key'))
        .get();

      const apiKey = configRow?.value || process.env.TMDB_API_KEY;

      const candidates = await app.metadata.searchTMDB(searchQuery, mediaType, apiKey);
      return reply.send({
        query: searchQuery,
        mediaType,
        candidates,
      });
    } catch (err) {
      if (err instanceof MetadataApiError) {
        return reply.status(err.statusCode).send({
          error: 'Bad Gateway',
          message: err.message,
        });
      }

      request.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search metadata',
      });
    }
  });
};