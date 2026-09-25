import { FastifyPluginAsync } from 'fastify';

export const listRoutes: FastifyPluginAsync = async (app) => {
  // GET /requests — list requests
  app.get('/', async (request, reply) => {
    const isAdmin = request.currentUser!.role === 'admin';
    const currentUserId = request.currentUser!.id;
    const callerRole = request.currentUser!.role;

    const query = request.query as { status?: string } | undefined;
    if (query?.status === 'deleted') {
      const list = app.requestsRepo.findDeleted(currentUserId, { isAdmin, isTrusted: callerRole === 'trusted' });
      return reply.send({ requests: list });
    }

    if (isAdmin) {
      const list = app.requestsRepo.findAll(currentUserId, true);
      return reply.send({ requests: list });
    }

    const list = app.requestsRepo.findAllForUser(currentUserId);

    const filtered = list.filter((item) => {
      if (item.mediaType === 'private') {
        return callerRole === 'trusted' && item.userId === currentUserId;
      }
      return true;
    });

    return reply.send({ requests: filtered });
  });

  // GET /requests/:id — get single request
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    const callerRole = request.currentUser!.role;
    const isAdmin = callerRole === 'admin';
    const isPrimary = item.userId === request.currentUser!.id;

    if (item.mediaType === 'private') {
      if (!isAdmin && !(callerRole === 'trusted' && isPrimary)) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Download request not found',
        });
      }
    }

    let isCoRequester = false;

    if (!isAdmin && !isPrimary) {
      isCoRequester = app.requestsRepo.isCoRequester(item.id, request.currentUser!.id);
    }

    if (!isAdmin && !isPrimary && !isCoRequester) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    return reply.send({
      request: {
        ...item,
        isPrimaryRequester: isPrimary,
      },
    });
  });
};
