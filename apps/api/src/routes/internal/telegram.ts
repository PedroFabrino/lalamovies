import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { serviceKeyAuth } from '../../middleware/serviceAuth';

const ACTIVE_STATUSES = new Set(['queued', 'downloading', 'hardlinking', 'unarchiving', 'seeding']);
const ACTIVE_WAITLIST_STATUSES = new Set(['pending_release', 'checking', 'notified']);

const reportMessageIdSchema = z.object({
  messageId: z.number().int().nullable(),
});

const snatchMessageIdSchema = z.object({
  messageId: z.number().int().nullable(),
});

export const internalTelegramRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', serviceKeyAuth);

  // GET /telegram/user/:chatId/report
  app.get('/telegram/user/:chatId/report', async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    if (!chatId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ChatId is required' });
    }

    const user = app.requestsRepo.findUserByTelegramChatId(chatId);
    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'Usuário não vinculado' });
    }

    const userRequests = app.requestsRepo.findByUserId(user.id, true);

    const active = userRequests
      .filter((r) => ACTIVE_STATUSES.has(r.status))
      .map((r) => ({
        id: r.id,
        title: r.title,
        mediaType: r.mediaType,
        seasonNumber: r.seasonNumber,
        episodeNumber: r.episodeNumber,
        status: r.status,
      }));

    const completed = userRequests
      .filter((r) => r.status === 'done')
      .sort((a, b) => {
        const timeA = a.downloadedAt ? new Date(a.downloadedAt).getTime() : 0;
        const timeB = b.downloadedAt ? new Date(b.downloadedAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        title: r.title,
        mediaType: r.mediaType,
        seasonNumber: r.seasonNumber,
        episodeNumber: r.episodeNumber,
        status: r.status,
        downloadedAt: r.downloadedAt,
      }));

    let waitlistEntries: Array<{
      id: string;
      title: string;
      mediaType: string;
      seasonNumber: number | null;
      targetEpisode: number | null;
      status: string;
    }> = [];

    const watcherUrl = (app as any).watcherUrl || process.env.WATCHER_URL;
    const serviceApiKey = (app as any).serviceApiKey || process.env.SERVICE_API_KEY;

    if (watcherUrl && serviceApiKey) {
      try {
        const cleanUrl = watcherUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/waitlist?userId=${encodeURIComponent(user.id)}`, {
          headers: { 'x-service-key': serviceApiKey },
        });
        if (res.ok) {
          const body = (await res.json()) as { entries?: any[] };
          const list = Array.isArray(body) ? body : (body.entries || []);
          waitlistEntries = list
            .filter((e) => ACTIVE_WAITLIST_STATUSES.has(e.status))
            .map((e) => ({
              id: e.id,
              title: e.title,
              mediaType: e.mediaType,
              seasonNumber: e.seasonNumber ?? null,
              targetEpisode: e.targetEpisode ?? null,
              status: e.status,
            }));
        }
      } catch (err) {
        request.log.warn(err as object, 'Failed to fetch waitlist entries for telegram report');
      }
    }

    return reply.send({
      telegramReportMessageId: user.telegramReportMessageId ?? null,
      active,
      completed,
      waitlist: waitlistEntries,
    });
  });

  // PUT /telegram/user/:chatId/report-message-id
  app.put('/telegram/user/:chatId/report-message-id', async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    if (!chatId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ChatId is required' });
    }

    const parseResult = reportMessageIdSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid payload',
      });
    }

    const user = app.requestsRepo.findUserByTelegramChatId(chatId);
    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'Usuário não vinculado' });
    }

    const { messageId } = parseResult.data;
    app.requestsRepo.setTelegramReportMessageId(user.id, messageId);

    return reply.send({
      ok: true,
      telegramReportMessageId: messageId,
    });
  });

  // PATCH /telegram/request/:requestId/snatch-message-id
  app.patch('/telegram/request/:requestId/snatch-message-id', async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    if (!requestId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'RequestId is required' });
    }

    const parseResult = snatchMessageIdSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid payload',
      });
    }

    const existingRequest = app.requestsRepo.findById(requestId);
    if (!existingRequest) {
      return reply.status(404).send({ error: 'Not Found', message: 'Download request not found' });
    }

    const { messageId } = parseResult.data;
    app.requestsRepo.setTelegramSnatchMessageId(requestId, messageId);

    return reply.send({
      ok: true,
      requestId,
      telegramSnatchMessageId: messageId,
    });
  });
};
