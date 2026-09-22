import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RequestServiceError } from '../../services/requestServiceTypes';

const promoteSchema = z.object({
  userId: z.string().min(1),
  mediaType: z.enum(['movie', 'tv_show', 'anime']),
  metadataId: z.string().min(1),
  metadataSource: z.enum(['tmdb', 'anilist']),
  title: z.string().min(1),
  year: z.number().int().optional().nullable(),
  seasonNumber: z.number().int().optional().nullable(),
  episodeNumber: z.number().int().optional().nullable(),
  stagingPath: z.string().min(1),
  sizeBytes: z.number().optional().nullable(),
});

export const promoteRoutes: FastifyPluginAsync = async (app) => {
  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const serviceKey = app.serviceApiKey;
    const headerKey = request.headers['x-service-key'];
    const providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    const isServiceAuth = Boolean(serviceKey && providedKey === serviceKey);
    const isAdmin = request.currentUser?.role === 'admin';

    if (!isServiceAuth && !isAdmin) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing authorization',
      });
    }

    const parsed = promoteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parsed.error.issues[0]?.message || 'Invalid request body',
      });
    }

    try {
      const result = await app.requestService.promoteFromStream(parsed.data);
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof RequestServiceError) {
        return reply.status(err.statusCode).send({
          error: err.error,
          message: err.message,
        });
      }
      throw err;
    }
  };

  // Support both /from-stream (existing caller API) and /promote-from-stream (ticket spec)
  app.post('/from-stream', handler);
  app.post('/promote-from-stream', handler);
};
