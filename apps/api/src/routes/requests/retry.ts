import { FastifyPluginAsync } from 'fastify';
import { adminGuard } from '../../middleware/auth';
import { RequestServiceError } from '../../services/requestServiceTypes';

export const retryRoutes: FastifyPluginAsync = async (app) => {
  // POST /requests/:id/retry — admin retry failed request
  app.post('/:id/retry', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await app.requestService.retryRequest(id);
      return reply.send(result);
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
