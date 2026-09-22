import { FastifyPluginAsync } from 'fastify';
import { requireFeature } from '../../middleware/featureFlags';
import { RequestServiceError } from '../../services/requestServiceTypes';
import { createRequestSchema } from './schemas';

export const createRoutes: FastifyPluginAsync = async (app) => {
  // POST /requests — create download request
  app.post('/', { preHandler: [requireFeature('manual_torrents')] }, async (request, reply) => {
    const parseResult = createRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    try {
      const result = await app.requestService.createRequest({
        ...parseResult.data,
        userId: request.currentUser!.id,
        userRole: request.currentUser!.role,
      });

      return reply.status(result.isExisting ? 200 : 201).send({ request: result.request });
    } catch (err) {
      if (err instanceof RequestServiceError) {
        return reply.status(err.statusCode).send({
          error: err.error,
          message: err.message,
        });
      }
      throw err;
    }
  });
};
