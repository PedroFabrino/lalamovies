import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DownloadRequest } from '../../db/schema';
import { RequestStatus } from '../../services/requestStateMachine';

const promoteSchema = z.object({
  userId: z.string().min(1),
  mediaType: z.enum(['movie', 'tv_show', 'anime']),
  metadataId: z.string().min(1),
  metadataSource: z.enum(['tmdb', 'anilist']),
  title: z.string().min(1),
  year: z.number().int().optional().nullable(),
  seasonNumber: z.number().int().optional().nullable(),
  episodeNumber: z.number().int().optional().nullable(),
  stagingPath: z.string().min(1),
  sizeBytes: z.number().optional().nullable(),
});

export const promoteRoutes: FastifyPluginAsync = async (app) => {
  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const serviceKey = app.serviceApiKey;
    const headerKey = request.headers['x-service-key'];
    const providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    const isServiceAuth = Boolean(serviceKey && providedKey === serviceKey);
    const isAdmin = request.currentUser?.role === 'admin';

    if (!isServiceAuth && !isAdmin) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing authorization',
      });
    }

    const parsed = promoteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parsed.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const data = parsed.data;
    const requestId = randomUUID();
    const now = new Date().toISOString();

    const ext = path.extname(data.stagingPath) || '.mkv';
    let destPath = '';
    try {
      destPath = app.fileSystem.buildLibraryPath({
        mediaType: data.mediaType,
        title: data.title,
        year: data.year,
        seasonNumber: data.seasonNumber,
        episodeNumber: data.episodeNumber,
        ext,
      });

      if (fs.existsSync(data.stagingPath)) {
        app.fileSystem.hardlink(data.stagingPath, destPath);
      }
    } catch (err) {
      app.log.warn(err, 'Failed to hardlink stream promotion file');
    }

    const initialRequest: DownloadRequest = {
      id: requestId,
      userId: data.userId,
      magnetLink: 'promoted-from-stream',
      mediaType: data.mediaType,
      status: RequestStatus.SEEDING,
      metadataId: data.metadataId,
      metadataSource: data.metadataSource,
      title: data.title,
      year: data.year ?? null,
      seasonNumber: data.seasonNumber ?? null,
      episodeNumber: data.episodeNumber ?? null,
      jellyfinPath: destPath || null,
      keepFlag: false,
      qbTorrentHash: null,
      errorMessage: null,
      requestedAt: now,
      downloadedAt: now,
      lastPlayedAt: null,
      scheduledDeleteAt: null,
      sizeBytes: data.sizeBytes ?? null,
      torrentFilePath: null,
      deferredReason: null,
      transcriptionStatus: 'none',
      transcriptionError: null,
    };

    app.requestsRepo.create(initialRequest);

    try {
      await app.stateMachine.transition(requestId, RequestStatus.DONE, {
        refreshJellyfin: true,
        broadcast: true,
      });
    } catch (transitionErr) {
      app.log.warn(transitionErr, 'State machine transition for promoted stream encountered non-fatal error');
    }

    return reply.status(201).send({
      requestId,
      jellyfinPath: destPath,
      status: 'completed',
    });
  };

  // Support both /from-stream (existing caller API) and /promote-from-stream (ticket spec)
  app.post('/from-stream', handler);
  app.post('/promote-from-stream', handler);
};
