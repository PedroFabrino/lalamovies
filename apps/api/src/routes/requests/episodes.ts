import { FastifyPluginAsync } from 'fastify';

export const episodesRoutes: FastifyPluginAsync = async (app) => {
  // GET /requests/:id/episodes — list episodes for a request
  app.get('/:id/episodes', async (request, reply) => {
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

    const episodes = app.episodesRepo.findByRequestId(id);
    return reply.send({ episodes });
  });

  // DELETE /requests/:id/episodes/:episodeId — prune individual episode
  app.delete('/:id/episodes/:episodeId', async (request, reply) => {
    const { id, episodeId } = request.params as { id: string; episodeId: string };
    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    const isAdmin = request.currentUser!.role === 'admin';
    const isPrimary = item.userId === request.currentUser!.id;

    if (!isAdmin && !isPrimary) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only the primary requester or an admin can prune an episode',
      });
    }

    const episode = app.episodesRepo.findById(episodeId);
    if (!episode || episode.requestId !== id) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Episode not found for this request',
      });
    }

    const result = await app.episodicPruning.pruneEpisode(episodeId);
    return reply.send({ ok: true, result });
  });

  // PATCH /requests/:id/episodes/:episodeId/keep — toggle keepFlag on individual episode
  app.patch('/:id/episodes/:episodeId/keep', async (request, reply) => {
    const { id, episodeId } = request.params as { id: string; episodeId: string };
    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    const isAdmin = request.currentUser!.role === 'admin';
    const isPrimary = item.userId === request.currentUser!.id;

    if (!isAdmin && !isPrimary) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only the primary requester or an admin can toggle keep on an episode',
      });
    }

    const episode = app.episodesRepo.findById(episodeId);
    if (!episode || episode.requestId !== id) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Episode not found for this request',
      });
    }

    const newKeepFlag = !episode.keepFlag;
    app.episodesRepo.update(episodeId, { keepFlag: newKeepFlag });

    return reply.send({ episode: { ...episode, keepFlag: newKeepFlag } });
  });
};
