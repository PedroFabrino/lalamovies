import { FastifyPluginAsync } from 'fastify';
import { adminGuard } from '../../middleware/auth';

export { createRoutes } from './create';
export { batchRoutes } from './batch';
export { listRoutes } from './list';
export { retryRoutes } from './retry';
export { promoteRoutes } from './promote';

export const lifecycleRoutes: FastifyPluginAsync = async (app) => {
  // PATCH /requests/:id/keep — admin toggle keepFlag
  app.patch('/:id/keep', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    if (item.mediaType === 'private') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Cannot toggle keep flag for private media requests; private requests have a permanent keep flag.',
      });
    }

    const newKeepFlag = !item.keepFlag;
    app.requestsRepo.update(id, { keepFlag: newKeepFlag });

    item.keepFlag = newKeepFlag;
    return reply.send({ request: item });
  });

  // DELETE /requests/:id — delete/cleanup request
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    const isAdmin = request.currentUser!.role === 'admin';
    if (!isAdmin && item.userId !== request.currentUser!.id) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    await app.cleanup.cleanItem(id);
    return reply.send({ ok: true });
  });
};

export const mutationRoutes = lifecycleRoutes;
