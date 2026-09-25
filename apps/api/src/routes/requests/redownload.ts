import { FastifyPluginAsync } from 'fastify';
import { RequestServiceError } from '../../services/requestServiceTypes';

export const redownloadRoutes: FastifyPluginAsync = async (app) => {
  // POST /requests/:id/redownload — redownload a deleted request
  app.post('/:id/redownload', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUserId = request.currentUser!.id;
    const callerRole = request.currentUser!.role;
    const isAdmin = callerRole === 'admin';

    const item = app.requestsRepo.findById(id);
    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    if (!isAdmin && item.userId !== currentUserId) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    if (item.status !== 'deleted') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Only deleted requests can be redownloaded',
      });
    }

    // Check if an active request or existing media already exists
    const activeCandidates = app.requestsRepo.findByMetadataId(item.metadataId);
    const hasActiveMatch = activeCandidates.some((act) => {
      if (act.metadataSource !== item.metadataSource) return false;
      const actIsPrivate = act.mediaType === 'private';
      const itemIsPrivate = item.mediaType === 'private';
      if (actIsPrivate !== itemIsPrivate) return false;

      const isLive = ['queued', 'downloading', 'hardlinking', 'unarchiving', 'seeding', 'done'].includes(act.status) || Boolean(act.jellyfinPath);
      if (!isLive) return false;

      if (item.mediaType === 'movie' || (itemIsPrivate && item.seasonNumber == null && item.episodeNumber == null)) {
        return true;
      }
      const isSingleEp = item.seasonNumber != null && item.episodeNumber != null;
      if (isSingleEp) {
        return (act.seasonNumber === item.seasonNumber && act.episodeNumber == null) ||
               (act.seasonNumber === item.seasonNumber && act.episodeNumber === item.episodeNumber);
      }
      return act.seasonNumber === item.seasonNumber && act.episodeNumber == null;
    });

    if (hasActiveMatch) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'An active download or library item already exists for this title',
      });
    }

    const body = (request.body as { magnetLink?: string; torrentFileBase64?: string } | undefined) || {};
    const magnetLink = body.magnetLink?.trim() || item.magnetLink;
    const torrentFileBase64 = body.torrentFileBase64;

    try {
      const result = await app.requestService.createRequest({
        userId: currentUserId,
        userRole: callerRole,
        mediaType: item.mediaType,
        metadataId: item.metadataId,
        metadataSource: item.metadataSource,
        title: item.title,
        year: item.year ?? undefined,
        seasonNumber: item.seasonNumber ?? undefined,
        episodeNumber: item.episodeNumber ?? undefined,
        magnetLink,
        torrentFileBase64,
      });

      return reply.status(201).send({ request: result.request });
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
