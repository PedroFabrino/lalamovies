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
  // Service-key verification hook for watcher (bypassed for magic-link rejection & approval)
  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'GET' && /\/(reject|approve)(\?|$)/.test(request.url)) {
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

    // Guard 3: Duplicate active waitlist check
    const existingActive = app.db
      .select()
      .from(watchRequests)
      .where(
        and(
          eq(watchRequests.userId, userId),
          eq(watchRequests.mediaType, body.mediaType),
          eq(watchRequests.metadataId, body.metadataId),
          inArray(watchRequests.status, ['pending_release', 'checking', 'notified'])
        )
      )
      .all();

    if (body.mediaType === 'movie') {
      if (existingActive.length > 0) {
        return reply.status(409).send({
          error: 'Duplicate Entry',
          message: `"${body.title}" is already on your active waitlist.`,
        });
      }
    } else {
      const targetSeason = body.seasonNumber ?? 1;
      const targetEp = body.targetEpisode ?? 1;
      const duplicateEp = existingActive.find(
        (e) => (e.seasonNumber ?? 1) === targetSeason && (e.targetEpisode ?? 1) === targetEp
      );
      if (duplicateEp) {
        return reply.status(409).send({
          error: 'Duplicate Entry',
          message: `"${body.title}" S${targetSeason}E${targetEp} is already on your active waitlist.`,
        });
      }
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

    const graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    const entriesWithGrace = list.map((entry) => ({
      ...entry,
      graceHours,
    }));

    return reply.send({ entries: entriesWithGrace });
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

    const graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    return reply.send({ entry: { ...entry, graceHours }, ...entry, graceHours });
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

    const wantsHtml = Boolean(
      typeof request.headers.accept === 'string' &&
        request.headers.accept.includes('text/html') &&
        !request.headers.accept.includes('application/json')
    );

    if (!token) {
      if (wantsHtml) {
        return reply.status(401).type('text/html').send(renderStatusHtml({
          icon: '⚠️',
          title: 'Missing Rejection Token',
          subtitle: 'This rejection link is incomplete or invalid.',
        }));
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing rejection token',
      });
    }

    const secret = process.env.MAGIC_LINK_SECRET || 'magic-link-secret-default-change-me';
    const graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    const verification = verifyMagicLinkToken(token, id, secret, graceHours);

    if (!verification.valid) {
      if (wantsHtml) {
        return reply.status(401).type('text/html').send(renderStatusHtml({
          icon: '🚫',
          title: 'Invalid Rejection Link',
          subtitle: 'The signature on this rejection token is invalid or tampered.',
        }));
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or tampered rejection token',
      });
    }

    if (verification.expired) {
      if (wantsHtml) {
        return reply.status(410).type('text/html').send(renderStatusHtml({
          icon: '⏳',
          title: 'Rejection Period Expired',
          subtitle: `The ${graceHours}-hour rejection grace period has expired. Auto-download may have already triggered.`,
        }));
      }
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

    if (wantsHtml) {
      return reply.type('text/html').send(renderStatusHtml({
        icon: '🗑️',
        title: 'Release Rejected',
        subtitle: `"${entry.title}" has been reset to checking trackers for a different release.`,
      }));
    }

    return reply.status(200).send({
      ok: true,
      message: 'Waitlist release rejected successfully. Entry reset to checking.',
      entry: updated,
      ...updated,
    });
  });

  // GET /waitlist/:id/approve?token=
  app.get('/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { token?: string };
    const token = query.token;
    const wantsHtml = Boolean(
      typeof request.headers.accept === 'string' &&
        request.headers.accept.includes('text/html') &&
        !request.headers.accept.includes('application/json')
    );

    if (!token) {
      if (wantsHtml) {
        return reply.status(401).type('text/html').send(renderStatusHtml({
          icon: '⚠️',
          title: 'Missing Approval Token',
          subtitle: 'This approval link is incomplete or invalid.',
        }));
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing approval token',
      });
    }

    const secret = process.env.MAGIC_LINK_SECRET || 'magic-link-secret-default-change-me';
    const graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    const verification = verifyMagicLinkToken(token, id, secret, graceHours);

    if (!verification.valid) {
      if (wantsHtml) {
        return reply.status(401).type('text/html').send(renderStatusHtml({
          icon: '🚫',
          title: 'Invalid Approval Link',
          subtitle: 'The signature on this approval token is invalid or tampered.',
        }));
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or tampered approval token',
      });
    }

    if (verification.expired) {
      if (wantsHtml) {
        return reply.status(410).type('text/html').send(renderStatusHtml({
          icon: '⏳',
          title: 'Approval Period Expired',
          subtitle: `The ${graceHours}-hour approval window for this release has passed. Auto-download may have already triggered.`,
        }));
      }
      return reply.status(410).send({
        error: 'Gone',
        message: 'Approval grace period has expired',
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

    if (entry.status === 'triggered' || entry.status === 'completed') {
      if (wantsHtml) {
        return reply.type('text/html').send(renderStatusHtml({
          icon: '⚡',
          title: 'Already Downloading',
          subtitle: `"${entry.title}" is already being downloaded.`,
          releaseTitle: entry.prowlarrReleaseTitle,
        }));
      }
      return reply.send({
        ok: true,
        message: 'Release is already being downloaded',
        entry,
        ...entry,
      });
    }

    if (!entry.prowlarrReleaseMagnet) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Entry has no release magnet available to download',
      });
    }

    const submitResult = await app.submitter.submitEntry(entry);
    if (!submitResult.success) {
      if (wantsHtml) {
        return reply.status(500).type('text/html').send(renderStatusHtml({
          icon: '❌',
          title: 'Submission Failed',
          subtitle: submitResult.error || 'Failed to trigger download queue.',
        }));
      }
      return reply.status(500).send({
        error: 'Download Submission Failed',
        message: submitResult.error || 'Failed to submit download request to Main API',
      });
    }

    const updated = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    if (wantsHtml) {
      return reply.type('text/html').send(renderStatusHtml({
        icon: '✅',
        title: 'Download Approved!',
        subtitle: `Auto-download grace period bypassed. We have started downloading "${entry.title}".`,
        releaseTitle: entry.prowlarrReleaseTitle,
      }));
    }

    return reply.status(200).send({
      ok: true,
      message: 'Waitlist release approved successfully and sent to download queue.',
      entry: updated,
      ...updated,
    });
  });

  // POST /waitlist/:id/approve
  app.post('/:id/approve', async (request, reply) => {
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

    if (entry.status !== 'notified') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: `Cannot approve entry in '${entry.status}' status (must be 'notified')`,
      });
    }

    if (!entry.prowlarrReleaseMagnet) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Entry has no release magnet available to download',
      });
    }

    const submitResult = await app.submitter.submitEntry(entry);
    if (!submitResult.success) {
      return reply.status(500).send({
        error: 'Download Submission Failed',
        message: submitResult.error || 'Failed to submit download request to Main API',
      });
    }

    const updated = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, id))
      .get();

    return reply.status(200).send({
      ok: true,
      message: 'Waitlist release approved successfully and sent to download queue.',
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

function renderStatusHtml(options: {
  icon: string;
  title: string;
  subtitle: string;
  releaseTitle?: string | null;
  frontendUrl?: string;
}): string {
  const frontend = (options.frontendUrl || process.env.FRONTEND_URL || 'https://lalamovies.stream').replace(/\/+$/, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${options.title} — Media Download Manager</title>
  <style>
    body {
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 56px;
      height: 56px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      font-size: 1.75rem;
    }
    h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; }
    p { color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; margin: 0 0 1.5rem; }
    .release {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-family: monospace;
      font-size: 0.75rem;
      color: #38bdf8;
      word-break: break-all;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-block;
      background: #4f46e5;
      color: #ffffff;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      transition: background 0.15s;
    }
    .btn:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${options.icon}</div>
    <h1>${options.title}</h1>
    <p>${options.subtitle}</p>
    ${options.releaseTitle ? `<div class="release">${options.releaseTitle}</div>` : ''}
    <a href="${frontend}/waitlist" class="btn">Return to Waitlist</a>
  </div>
</body>
</html>`;
}