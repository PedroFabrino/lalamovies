import { FastifyPluginAsync } from 'fastify';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { watchRequests, WatchRequest } from '../db/schema';
import { evaluateInitialStatus } from '../services/releaseGating';
import { verifyMagicLinkToken, deleteDiscordMessage, sendWaitlistCancelNotification } from '../services/notifications';

interface CreateWaitlistBody {
  mediaType: 'movie' | 'tv_show' | 'anime';
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  targetEpisode?: number | null;
  userId?: string;
  status?: WatchRequest['status'];
  isNextSeason?: boolean;
  posterUrl?: string | null;
  requesterUsername?: string | null;
  requesterEmail?: string | null;
  tmdbReleaseDate?: string | null;
}

export const waitlistRoutes: FastifyPluginAsync = async (app) => {
  // Service-key verification hook for watcher (bypassed for magic-link rejection)
  app.addHook('preHandler', async (request, reply) => {
    if (/\/reject(\?|$)/.test(request.url)) {
      return;
    }
    if (app.serviceApiKey) {
      const headerKey = request.headers['x-service-key'];
      const providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
      if (!providedKey || providedKey !== app.serviceApiKey) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing X-Service-Key',
        });
      }
    }
  });

  // GET /waitlist/active-episodic?userId=
  app.get('/active-episodic', async (request, reply) => {
    const query = request.query as { userId?: string };
    const effectiveUserId = query.userId || (request.headers['x-user-id'] as string);

    if (!effectiveUserId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'userId is required',
      });
    }

    const list = app.db
      .select()
      .from(watchRequests)
      .where(
        and(
          eq(watchRequests.userId, effectiveUserId),
          inArray(watchRequests.mediaType, ['tv_show', 'anime']),
          inArray(watchRequests.status, ['pending_release', 'checking', 'notified', 'triggered'])
        )
      )
      .orderBy(desc(watchRequests.createdAt))
      .all();

    return reply.send({ entries: list });
  });

  // POST /waitlist
  app.post('/', async (request, reply) => {
    const body = request.body as CreateWaitlistBody | undefined;
    if (!body) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Request body is required',
      });
    }

    const headerUserId = request.headers['x-user-id'] as string | undefined;
    const userId = headerUserId || body.userId;

    if (!userId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'userId is required',
      });
    }

    if (!body.mediaType || !['movie', 'tv_show', 'anime'].includes(body.mediaType)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valid mediaType (movie, tv_show, anime) is required',
      });
    }

    if (!body.metadataId || !body.metadataSource || !body.title) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'metadataId, metadataSource, and title are required',
      });
    }

    const now = new Date().toISOString();
    let initialStatus: WatchRequest['status'] = body.status || 'checking';
    let tmdbReleaseDate: string | null = null;

    if (!body.status && app.releaseGating) {
      try {
        const fetchedDate = body.tmdbReleaseDate || await app.releaseGating.fetchReleaseDate(
          body.mediaType,
          body.metadataId,
          body.seasonNumber,
          body.targetEpisode
        );
        const evaluated = evaluateInitialStatus(fetchedDate, undefined, Boolean(body.isNextSeason));
        initialStatus = evaluated.status;
        tmdbReleaseDate = evaluated.tmdbReleaseDate;
      } catch (err) {
        app.log.warn(err, 'Failed to fetch release date from TMDB, defaulting to checking');
        initialStatus = body.isNextSeason ? 'pending_release' : 'checking';
      }
    }

    const newEntry: WatchRequest = {
      id: randomUUID(),
      userId,
      mediaType: body.mediaType,
      metadataId: body.metadataId,
      metadataSource: body.metadataSource,
      title: body.title,
      year: body.year ?? null,
      seasonNumber: body.seasonNumber ?? null,
      targetEpisode: body.targetEpisode ?? (body.mediaType === 'movie' ? null : 1),
      triggeredCount: 0,
      failureCount: 0,
      status: initialStatus,
      tmdbReleaseDate,
      prowlarrReleaseTitle: null,
      prowlarrReleaseMagnet: null,
      prowlarrReleaseScore: null,
      discordMessageId: null,
      notifyAt: null,
      posterUrl: body.posterUrl ?? null,
      requesterUsername: body.requesterUsername ?? null,
      requesterEmail: body.requesterEmail ?? null,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      cancelledBy: null,
    };

    app.db.insert(watchRequests).values(newEntry).run();

    return reply.status(201).send({ entry: newEntry, ...newEntry });
  });

  // GET /waitlist?userId=&status=
  app.get('/', async (request, reply) => {
    const query = request.query as { userId?: string; status?: string };
    const callerId = request.headers['x-user-id'] as string | undefined;
    const callerRole = request.headers['x-user-role'] as string | undefined;

    let targetUserId: string | undefined;
    if (callerRole === 'admin') {
      targetUserId = query.userId;
    } else {
      targetUserId = callerId || query.userId;
    }

    const conditions = [];
    if (targetUserId) {
      conditions.push(eq(watchRequests.userId, targetUserId));
    }
    if (query.status) {
      conditions.push(eq(watchRequests.status, query.status as WatchRequest['status']));
    }

    const list = app.db
      .select()
      .from(watchRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(watchRequests.createdAt))
      .all();

    return reply.send({ entries: list });
  });

  // GET /waitlist/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const callerId = request.headers['x-user-id'] as string | undefined;
    const callerRole = request.headers['x-user-role'] as string | undefined;

    const entry = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Waitlist entry not found',
      });
    }

    if (callerId && callerRole !== 'admin' && entry.userId !== callerId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Cannot access another user entry',
      });
    }

    return reply.send({ entry, ...entry });
  });

  // DELETE /waitlist/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const callerId = request.headers['x-user-id'] as string | undefined;
    const callerRole = request.headers['x-user-role'] as string | undefined;
    const body = request.body as { cancelledBy?: string } | undefined;

    const entry = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Waitlist entry not found',
      });
    }

    if (callerId && callerRole !== 'admin' && entry.userId !== callerId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Cannot cancel another user entry',
      });
    }

    const cancelledBy = callerId || body?.cancelledBy || 'unknown';
    const now = new Date().toISOString();

    // If entry was in notified state with Discord message outstanding, delete the message
    if (entry.status === 'notified' && entry.discordMessageId) {
      await deleteDiscordMessage(entry.discordMessageId, undefined, app.log);
    }

    // If cancelled by an admin (cancelledBy !== entry.userId), send cancel notification without exposing admin identity
    if (cancelledBy !== entry.userId) {
      await sendWaitlistCancelNotification({
        title: entry.title,
        year: entry.year,
        recipientEmail: entry.requesterEmail,
        logger: app.log,
      });
    }

    app.db
      .update(watchRequests)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy,
        updatedAt: now,
      })
      .where(eq(watchRequests.id, id))
      .run();

    const updated = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    return reply.send({ ok: true, entry: updated, ...updated });
  });

  // GET /waitlist/:id/reject?token=
  app.get('/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { token?: string };
    const token = query.token;

    if (!token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing rejection token',
      });
    }

    const secret = process.env.MAGIC_LINK_SECRET || 'magic-link-secret-default-change-me';
    const graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    const verification = verifyMagicLinkToken(token, id, secret, graceHours);

    if (!verification.valid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or tampered rejection token',
      });
    }

    if (verification.expired) {
      return reply.status(410).send({
        error: 'Gone',
        message: 'Rejection grace period has expired',
      });
    }

    const entry = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Waitlist entry not found',
      });
    }

    // Delete Discord message if it exists
    if (entry.discordMessageId) {
      await deleteDiscordMessage(
        entry.discordMessageId,
        process.env.WAITLIST_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL,
        {
          warn: (msg: string) => app.log.warn(msg),
        }
      );
    }

    const now = new Date().toISOString();
    app.db
      .update(watchRequests)
      .set({
        status: 'checking',
        failureCount: 0,
        notifyAt: null,
        prowlarrReleaseTitle: null,
        prowlarrReleaseMagnet: null,
        prowlarrReleaseScore: null,
        discordMessageId: null,
        updatedAt: now,
      })
      .where(eq(watchRequests.id, id))
      .run();

    const updated = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    return reply.status(200).send({
      ok: true,
      message: 'Waitlist release rejected successfully. Entry reset to checking.',
      entry: updated,
      ...updated,
    });
  });

  // POST /waitlist/poll-now - trigger immediate release check and promotion
  app.post('/poll-now', async (request, reply) => {
    try {
      const promoted = await app.releaseGating?.promoteDueEntries();
      const pollResult = await app.poller?.pollOnce();
      return reply.send({
        ok: true,
        promoted: promoted || 0,
        polled: pollResult?.polled || 0,
        notified: pollResult?.notified || 0,
      });
    } catch (err: any) {
      app.log.error(err, 'Failed running poll-now');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message,
      });
    }
  });

  // POST /waitlist/:id/check - force immediate check of a specific waitlist entry
  app.post('/:id/check', async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Waitlist entry not found',
      });
    }

    const now = new Date().toISOString();
    if (entry.status === 'pending_release') {
      app.db
        .update(watchRequests)
        .set({
          status: 'checking',
          updatedAt: now,
        })
        .where(eq(watchRequests.id, id))
        .run();
    }

    try {
      await app.poller?.pollOnce();
    } catch (err: any) {
      app.log.warn(err, 'Manual poller tick failed');
    }

    const updated = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    return reply.send({ ok: true, entry: updated });
  });
};