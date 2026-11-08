import fs from 'node:fs';
import path from 'node:path';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const VIDEO_EXT_REGEX = /\.(mkv|mp4|avi|ts|mov|webm|m4v)$/i;

function resolveTargetVideoPath(
  jellyfinPath: string,
  mediaType: string,
  seasonNumber: number | null | undefined,
  episodeNumber: number | null | undefined
): { videoPath: string | null; isSeasonPackDir: boolean } {
  try {
    if (!fs.existsSync(jellyfinPath) || !fs.statSync(jellyfinPath).isDirectory()) {
      return { videoPath: jellyfinPath, isSeasonPackDir: false };
    }

    const isSeasonPack =
      (mediaType === 'tv_show' || mediaType === 'anime') &&
      seasonNumber != null &&
      episodeNumber == null;

    if (!isSeasonPack) {
      const entries = fs.readdirSync(jellyfinPath);
      const videoFiles = entries.filter((entry) => VIDEO_EXT_REGEX.test(entry));
      if (videoFiles.length === 1) {
        return { videoPath: path.join(jellyfinPath, videoFiles[0]), isSeasonPackDir: false };
      }
    }

    return { videoPath: null, isSeasonPackDir: true };
  } catch {
    return { videoPath: jellyfinPath, isSeasonPackDir: false };
  }
}

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

    const querySchema = z.object({
      title: z.string().optional(),
      query: z.string().optional(),
    });

    const parsedQuery = querySchema.safeParse(request.query || {});
    const customTitle = (parsedQuery.success ? (parsedQuery.data.title || parsedQuery.data.query) : undefined)?.trim();
    const effectiveTitle = customTitle || item.title;

    const subtitles = await app.openSubtitles.searchSubtitles({
      tmdbId: customTitle ? undefined : (item.metadataSource === 'tmdb' ? item.metadataId : undefined),
      title: effectiveTitle,
      year: customTitle ? undefined : item.year,
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

    const { videoPath: targetMediaPath, isSeasonPackDir } = resolveTargetVideoPath(
      item.jellyfinPath,
      item.mediaType,
      item.seasonNumber,
      item.episodeNumber
    );

    if (isSeasonPackDir || !targetMediaPath) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Subtitles cannot be applied directly to a season pack directory. Please select individual episodes in the Media Library.',
      });
    }

    const bodySchema = z.object({
      fileId: z.union([z.string(), z.number()]).optional(),
      fileIds: z.array(z.union([z.string(), z.number()])).optional(),
      title: z.string().optional(),
    });

    const parsed = bodySchema.safeParse(request.body || {});
    const { fileId, fileIds, title: customTitle } = parsed.success
      ? parsed.data
      : { fileId: undefined, fileIds: undefined, title: undefined };

    const effectiveTitle = customTitle?.trim() || item.title;
    app.openSubtitles.setFallbackContext?.({
      title: effectiveTitle,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
    });

    let success = false;
    let count = 1;

    if (fileIds && fileIds.length > 0) {
      const writtenCount = await app.openSubtitles.downloadAndWriteMultiple(
        fileIds,
        targetMediaPath
      );
      success = writtenCount > 0;
      count = writtenCount;
    } else if (fileId) {
      const destPath = targetMediaPath.replace(/\.[a-zA-Z0-9]{2,4}$/, '.pt-BR.srt');
      success = await app.openSubtitles.downloadAndWrite(fileId, destPath);
    } else {
      const destPath = targetMediaPath.replace(/\.[a-zA-Z0-9]{2,4}$/, '.pt-BR.srt');
      const searchParams = {
        tmdbId: customTitle ? undefined : (item.metadataSource === 'tmdb' ? item.metadataId : undefined),
        title: effectiveTitle,
        year: customTitle ? undefined : item.year,
        seasonNumber: item.seasonNumber,
        episodeNumber: item.episodeNumber,
      };
      success = await app.openSubtitles.fetchBest(searchParams, destPath);
      if (!success && typeof app.openSubtitles.searchSubtitles === 'function') {
        const available = await app.openSubtitles.searchSubtitles(searchParams);
        if (available.length === 0) {
          return reply.status(404).send({
            error: 'Not Found',
            message: `No matching pt-BR subtitles found on OpenSubtitles for "${effectiveTitle}"`,
          });
        }
      }
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
