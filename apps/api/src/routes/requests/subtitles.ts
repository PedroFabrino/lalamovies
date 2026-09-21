import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const subtitlesRoutes: FastifyPluginAsync = async (app) => {
  // GET /requests/:id/subtitles — query OpenSubtitles for completed download
  app.get('/:id/subtitles', async (request, reply) => {
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

    if (item.mediaType === 'private' && !isAdmin && (!isTrusted || !isOwner)) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    if (item.status !== 'seeding' && item.status !== 'done') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Subtitles can only be searched for completed downloads',
      });
    }

    if (!app.openSubtitles?.isConfigured()) {
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'OpenSubtitles service is not configured',
      });
    }

    const subtitles = await app.openSubtitles.searchSubtitles({
      tmdbId: item.metadataSource === 'tmdb' ? item.metadataId : undefined,
      title: item.title,
      year: item.year,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
    });

    return reply.send({ subtitles });
  });

  // POST /requests/:id/subtitles/fetch — download and apply specific or best subtitle(s)
  app.post('/:id/subtitles/fetch', async (request, reply) => {
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

    if (item.mediaType === 'private' && !isAdmin && (!isTrusted || !isOwner)) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    if (item.status !== 'seeding' && item.status !== 'done') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Subtitles can only be fetched for completed downloads',
      });
    }

    if (!app.openSubtitles?.isConfigured()) {
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'OpenSubtitles service is not configured',
      });
    }

    if (!item.jellyfinPath) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Media file path not found for request',
      });
    }

    const bodySchema = z.object({
      fileId: z.union([z.string(), z.number()]).optional(),
      fileIds: z.array(z.union([z.string(), z.number()])).optional(),
    });

    const parsed = bodySchema.safeParse(request.body || {});
    const { fileId, fileIds } = parsed.success
      ? parsed.data
      : { fileId: undefined, fileIds: undefined };

    let success = false;
    let count = 1;

    if (fileIds && fileIds.length > 0) {
      const writtenCount = await app.openSubtitles.downloadAndWriteMultiple(
        fileIds,
        item.jellyfinPath
      );
      success = writtenCount > 0;
      count = writtenCount;
    } else if (fileId) {
      const destPath = item.jellyfinPath.replace(/\.[a-zA-Z0-9]{2,4}$/, '.pt-BR.srt');
      success = await app.openSubtitles.downloadAndWrite(fileId, destPath);
    } else {
      const destPath = item.jellyfinPath.replace(/\.[a-zA-Z0-9]{2,4}$/, '.pt-BR.srt');
      success = await app.openSubtitles.fetchBest(
        {
          tmdbId: item.metadataSource === 'tmdb' ? item.metadataId : undefined,
          title: item.title,
          year: item.year,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
        },
        destPath
      );
    }

    if (!success) {
      return reply.status(502).send({
        error: 'Bad Gateway',
        message: 'Failed to download subtitle from OpenSubtitles',
      });
    }

    if (app.jellyfin?.refreshLibrary) {
      await app.jellyfin.refreshLibrary();
    }

    return reply.send({ success: true, count });
  });
};
