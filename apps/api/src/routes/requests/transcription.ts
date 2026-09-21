import { FastifyPluginAsync } from 'fastify';

export const transcriptionRoutes: FastifyPluginAsync = async (app) => {
  // POST /requests/:id/transcribe — manually queue or re-run subtitle transcription
  app.post('/:id/transcribe', async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    const currentUser = request.currentUser!;
    const isAdmin = currentUser.role === 'admin';
    const isTrusted = currentUser.role === 'trusted';
    const isOwner = item.userId === currentUser.id;
    const isPrivate = item.mediaType === 'private';

    if (!isAdmin && (!isTrusted || !isOwner || !isPrivate)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only admins or trusted owners of private media can trigger transcription',
      });
    }

    app.requestsRepo.update(id, {
      transcriptionStatus: 'pending',
      transcriptionError: null,
    });

    const updated = app.requestsRepo.findById(id);

    app.broadcast?.({
      type: 'transcription_updated',
      requestId: id,
      status: 'pending',
    });

    // Trigger transcription immediately if admin or within off-peak window
    app.transcriptionCron?.runOnce({ force: isAdmin, targetRequestId: id }).catch((err) => {
      request.log.error(err, `Failed to run immediate transcription for request ${id}`);
    });

    return reply.send({ request: updated });
  });
};
