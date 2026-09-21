import fs from 'node:fs';
import path from 'node:path';
import { FastifyPluginAsync } from 'fastify';
import { adminGuard } from '../../middleware/auth';
import { TorrentInfo } from '../../services/qbittorrent';
import { RequestStatus } from '../../services/requestStateMachine';

export const retryRoutes: FastifyPluginAsync = async (app) => {
  // POST /requests/:id/retry — admin retry failed request
  app.post('/:id/retry', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const item = app.requestsRepo.findById(id);

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    if (item.status !== 'error') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Only requests in error state can be retried',
      });
    }

    const stagingPath = process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads', 'staging');
    let destPath = item.jellyfinPath;
    let isComplete = false;
    let torrentSize = item.sizeBytes;

    if (destPath && fs.existsSync(destPath)) {
      isComplete = true;
    }

    // If not found at jellyfinPath, check qBittorrent & staging
    if (!isComplete && item.qbTorrentHash) {
      try {
        const torrents = app.qbittorrent.getAllTorrents ? await app.qbittorrent.getAllTorrents() : [];
        const found = torrents.find((t: TorrentInfo) => t.hash.toLowerCase() === item.qbTorrentHash?.toLowerCase());
        if (found) {
          torrentSize = found.size;
          if (found.progress === 1 || found.state.includes('complete') || found.state.includes('upload') || found.state.includes('seed')) {
            // Attempt hardlink move
            let files: Array<{ name: string; size: number }> = [];
            if (app.qbittorrent.getTorrentFiles) {
              files = await app.qbittorrent.getTorrentFiles(item.qbTorrentHash);
            }

            try {
              const existingShowFolder = app.requestsRepo.findExistingSeriesFolder({
                metadataId: item.metadataId,
                mediaType: item.mediaType,
                excludeRequestId: item.id,
              });

              const result = await app.fileSystem.processAndHardlinkTorrent({
                request: item,
                torrentStatus: { name: found.name },
                files,
                stagingPath,
                existingShowFolder,
                subtitleInspection: app.subtitleInspection,
              });
              destPath = result.destPath;
              isComplete = true;
            } catch (hardlinkErr) {
              const errMsg = (hardlinkErr as Error).message || 'Failed to process and hardlink torrent';
              app.requestsRepo.markError(id, errMsg);
              return reply.status(502).send({
                error: 'Bad Gateway',
                message: `Failed to process and hardlink torrent: ${errMsg}`,
              });
            }
          }
        }
      } catch (checkErr) {
        app.log.warn(`Error verifying torrent/files for retry: ${(checkErr as Error).message}`);
      }
    }

    if (isComplete && destPath && fs.existsSync(destPath)) {
      let requestedBy: string | undefined;
      if (item.userId) {
        requestedBy = app.requestsRepo.findRequesterUsername(item.userId);
      }

      const downloadedAt = item.downloadedAt || new Date().toISOString();
      const updated = await app.stateMachine.transition(id, RequestStatus.SEEDING, {
        broadcast: true,
        refreshJellyfin: true,
        extraFields: {
          jellyfinPath: destPath,
          downloadedAt,
          errorMessage: null,
          sizeBytes: torrentSize,
        },
        sendNotification: app.notifications ? 'download.completed' : undefined,
        notificationPayload: app.notifications
          ? {
              title: item.title,
              requestId: item.id,
              mediaType: item.mediaType,
              year: item.year,
              seasonNumber: item.seasonNumber,
              episodeNumber: item.episodeNumber,
              requestedBy,
              path: destPath,
              jellyfinUrl:
                typeof app.jellyfin.getPublicJellyfinUrl === 'function'
                  ? app.jellyfin.getPublicJellyfinUrl()
                  : undefined,
            }
          : undefined,
      });

      return reply.send({ request: updated, message: 'Request successfully completed and synced to Jellyfin' });
    } else {
      // Torrent is incomplete or missing from disk; reset to downloading
      const updated = await app.stateMachine.transition(id, RequestStatus.DOWNLOADING, {
        broadcast: true,
        extraFields: {
          errorMessage: null,
        },
      });

      return reply.send({ request: updated, message: 'Request reset to downloading' });
    }
  });
};
