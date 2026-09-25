import { FastifyPluginAsync } from 'fastify';

export const deletedRoutes: FastifyPluginAsync = async (app) => {
  // GET /requests/deleted — list deleted requests
  app.get('/deleted', async (request, reply) => {
    const currentUserId = request.currentUser!.id;
    const callerRole = request.currentUser!.role;
    const isAdmin = callerRole === 'admin';
    const isTrusted = callerRole === 'trusted';

    const list = app.requestsRepo.findDeleted(currentUserId, { isAdmin, isTrusted });
    return reply.send({ requests: list });
  });
};
