import { FastifyPluginAsync } from 'fastify';
import { requireFeature } from '../../middleware/featureFlags';
import { RequestServiceError } from '../../services/requestServiceTypes';
import { batchRequestSchema } from './schemas';

export const batchRoutes: FastifyPluginAsync = async (app) => {
  // POST /requests/batch — create batch download requests
  app.post('/batch', { preHandler: [requireFeature('batch_uploads')] }, async (request, reply) => {
    const parseResult = batchRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    try {
      const result = await app.requestService.createBatchRequests({
        ...parseResult.data,
        userId: request.currentUser!.id,
        userRole: request.currentUser!.role,
      });

      return reply.status(201).send({
        requests: result.requests,
        count: result.count,
      });
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
