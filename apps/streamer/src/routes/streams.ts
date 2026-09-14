import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { assertPublicTracker } from '../middleware/assertPublicTracker';
import { ephemeralStreams } from '../db';

export const streamRoutes: FastifyPluginAsync = async (app) => {
  // GET /streams/cache-check?hashes=
  app.get('/cache-check', async (request, reply) => {
    const query = request.query as { hashes?: string };
    if (!query.hashes) {
      return reply.send({ cached: {} });
    }

    const hashList = query.hashes
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);

    const cached = await app.debrid.checkCache(hashList);
    return reply.send({ cached });
  });

  // GET /streams — list active ephemeral streams
  app.get('/', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string | undefined;
    const userRole = request.headers['x-user-role'] as string | undefined;

    let query = app.db
      .select()
      .from(ephemeralStreams)
      .where(inArray(ephemeralStreams.status, ['pending', 'ready']))
      .orderBy(desc(ephemeralStreams.createdAt));

    const rows = query.all();

    // If regular user, filter to user's streams
    const filteredRows =
      userRole === 'admin' || !userId
        ? rows
        : rows.filter((r) => r.userId === userId);

    const now = Date.now();
    const streamsWithTimeRemaining = filteredRows.map((s) => {
      const expiresAtMs = new Date(s.expiresAt).getTime();
      const timeRemainingSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
      return {
        ...s,
        timeRemainingSeconds,
      };
    });

    return reply.send({ streams: streamsWithTimeRemaining });
  });

  // GET /streams/:id — get stream details / status
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = app.db
      .select()
      .from(ephemeralStreams)
      .where(eq(ephemeralStreams.id, id))
      .get();

    if (!row) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Stream not found',
      });
    }

    const jellyfinUrl = row.jellyfinItemId
      ? `/web/index.html#!/item?id=${row.jellyfinItemId}`
      : undefined;

    return reply.send({
      stream: {
        ...row,
        jellyfinUrl,
      },
    });
  });

  // POST /streams — create a new ephemeral stream
  app.post('/', { preHandler: [assertPublicTracker] }, async (request, reply) => {
    const body = request.body as {
      magnetLink?: string;
      downloadUrl?: string;
      title?: string;
      isPrivateTracker?: boolean;
      indexer?: string;
      infoHash?: string;
    } | null;

    const source = body?.magnetLink || body?.downloadUrl;

    if (!body || !source || !body.title) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'magnetLink or downloadUrl, and title are required',
      });
    }

    const userId = (request.headers['x-user-id'] as string) || 'default-user';

    try {
      // 1. Add magnet or torrent to Real-Debrid (resolving HTTP download proxy/torrent if needed)
      let debridTorrentId: string;
      let effectiveMagnet = source;

      if (typeof app.debrid.resolveAndAdd === 'function') {
        const result = await app.debrid.resolveAndAdd(source, body.infoHash, body.title);
        debridTorrentId = result.id;
        effectiveMagnet = result.resolvedMagnet || source;
      } else {
        debridTorrentId = await app.debrid.addMagnet(source);
      }

      // 2. Select files on Real-Debrid if metadata already resolved, otherwise StreamPoller handles it
      try {
        const info = await app.debrid.getTorrentInfo(debridTorrentId);
        if (info.status === 'waiting_files_selection') {
          await app.debrid.selectFiles(debridTorrentId, 'all');
        }
      } catch {
        // Non-blocking: StreamPoller will poll and select files once magnet_conversion finishes
      }

      // 3. Record stream row in DB
      const streamId = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      app.db
        .insert(ephemeralStreams)
        .values({
          id: streamId,
          userId,
          debridTorrentId,
          magnetLink: effectiveMagnet,
          title: body.title,
          status: 'pending',
          expiresAt,
          createdAt: now.toISOString(),
        })
        .run();

      // 4. Fire-and-forget polling job
      if (app.streamPoller) {
        app.streamPoller.poll(streamId).catch((err) => {
          app.log.error(err, `StreamPoller error on stream ${streamId}`);
        });
      }

      return reply.status(201).send({
        streamId,
        status: 'pending',
      });
    } catch (err: unknown) {
      app.log.error(err, 'Failed to initialize instant stream');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as Error).message || 'Failed to start instant stream',
      });
    }
  });

  // DELETE /streams/:id — admin on-demand eviction
  app.delete('/:id', async (request, reply) => {
    const userRole = request.headers['x-user-role'] as string | undefined;
    if (userRole !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Admin privileges required to evict streams',
      });
    }

    const { id } = request.params as { id: string };
    const success = await app.evictionCron.evictNow(id);
    if (!success) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Stream not found',
      });
    }

    return reply.send({ ok: true, evicted: id });
  });

  // POST /streams/:id/promote — promote ephemeral stream to permanent library
  app.post('/:id/promote', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string | undefined;
    const userRole = request.headers['x-user-role'] as string | undefined;

    const stream = app.db
      .select()
      .from(ephemeralStreams)
      .where(eq(ephemeralStreams.id, id))
      .get();

    if (!stream) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Stream not found',
      });
    }

    if (userRole !== 'admin' && userId && stream.userId !== userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You can only promote your own streams',
      });
    }

    const body = request.body as {
      mediaType?: 'movie' | 'tv_show' | 'anime';
      metadataId?: string;
      metadataSource?: 'tmdb' | 'anilist';
      title?: string;
      year?: number;
      seasonNumber?: number;
      episodeNumber?: number;
    } | null;

    if (!body || !body.mediaType || !body.metadataId || !body.metadataSource || !body.title) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'mediaType, metadataId, metadataSource, and title are required',
      });
    }

    try {
      // 1. Fetch unrestricted direct download links from Real-Debrid
      const links = await app.debrid.getUnrestrictedLinks(stream.debridTorrentId);
      if (!links || links.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No download links available for this stream from Real-Debrid',
        });
      }

      // 2. Direct HTTP download into staging
      const stagingDir = process.env.STAGING_PATH || '/media_data/downloads/staging';
      const downloadUrl = links[0];
      const downloadedPath = await app.directDownloader.downloadFile(downloadUrl, stagingDir);

      let sizeBytes: number | null = null;
      try {
        if (fs.existsSync(downloadedPath)) {
          sizeBytes = fs.statSync(downloadedPath).size;
        }
      } catch {
        // Non-blocking
      }

      // 3. Call main API to import / hardlink
      const mainApiUrl = app.mainApiUrl || process.env.MAIN_API_URL || 'http://localhost:3000';
      const serviceKey = app.serviceApiKey || process.env.SERVICE_API_KEY;

      const apiRes = await fetch(`${mainApiUrl.replace(/\/+$/, '')}/api/requests/from-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(serviceKey ? { 'x-service-key': serviceKey } : {}),
        },
        body: JSON.stringify({
          userId: stream.userId,
          mediaType: body.mediaType,
          metadataId: body.metadataId,
          metadataSource: body.metadataSource,
          title: body.title,
          year: body.year,
          seasonNumber: body.seasonNumber,
          episodeNumber: body.episodeNumber,
          stagingPath: downloadedPath,
          sizeBytes,
        }),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`Main API promotion failed: HTTP ${apiRes.status} - ${errText}`);
      }

      const result = (await apiRes.json()) as {
        requestId: string;
        jellyfinPath?: string;
        status: string;
      };

      // 4. Update stream status to 'promoted'
      app.db
        .update(ephemeralStreams)
        .set({ status: 'promoted' })
        .where(eq(ephemeralStreams.id, id))
        .run();

      // 5. Trigger Jellyfin stream library refresh
      if (app.jellyfin.refreshStreamLibrary) {
        app.jellyfin.refreshStreamLibrary().catch(() => {});
      }

      return reply.send({
        status: 'promoted',
        streamId: stream.id,
        requestId: result.requestId,
        jellyfinPath: result.jellyfinPath,
      });
    } catch (err: unknown) {
      app.log.error(err, `Failed to promote stream ${id}`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as Error).message || 'Failed to promote stream',
      });
    }
  });
};
