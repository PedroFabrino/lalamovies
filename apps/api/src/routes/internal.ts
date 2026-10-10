import path from 'node:path';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

const subgenWebhookSchema = z.object({
  file: z.string().min(1, 'File path is required'),
  subtitle: z.string().optional(),
  language: z.string().optional(),
  event: z.string().optional().default('completed'),
  error: z.string().optional(),
});

export const internalRoutes: FastifyPluginAsync = async (app) => {
  // Helper to normalize paths for robust matching across OS separators
  const normalize = (p: string) => p.replace(/\\/g, '/').toLowerCase();

  // POST /internal/subgen/webhook — completion callback from subgen container
  app.post('/subgen/webhook', async (request, reply) => {
    const parseResult = subgenWebhookSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid webhook payload',
      });
    }

    const { file, event, error } = parseResult.data;
    const normFile = normalize(file);
    const fileBase = path.basename(normFile, path.extname(normFile));

    // Find matching download request
    const allRequests = app.requestsRepo.findByCriteria({ excludeDeleted: true });

    const matched = allRequests.find((r) => {
      if (!r.jellyfinPath) return false;
      const normJellyfin = normalize(r.jellyfinPath);
      if (normJellyfin === normFile) return true;
      if (normFile.includes(normJellyfin) || normJellyfin.includes(normFile)) return true;
      const jfBase = path.basename(normJellyfin, path.extname(normJellyfin));
      return jfBase === fileBase;
    });

    if (!matched) {
      request.log.warn(`Subgen webhook: no matching download request for file ${file}`);
      return reply.send({ ok: true, matched: false });
    }

    if (event === 'failed') {
      const errorMsg = error || 'Subgen transcription failed';
      request.log.error(`Subgen transcription failed for request ${matched.id}: ${errorMsg}`);

      app.requestsRepo.setTranscriptionStatus(matched.id, 'failed', {
        transcriptionError: errorMsg,
      });

      app.broadcast?.({
        type: 'transcription_updated',
        requestId: matched.id,
        status: 'failed',
        error: errorMsg,
      });

      return reply.send({
        ok: true,
        matched: true,
        requestId: matched.id,
        status: 'failed',
      });
    }

    // Successful transcription
    app.requestsRepo.setTranscriptionStatus(matched.id, 'completed', {
      transcriptionError: null,
    });

    if (app.jellyfin.safeRefresh) {
      await app.jellyfin.safeRefresh();
    } else if (app.jellyfin.refreshLibrary) {
      try {
        await app.jellyfin.refreshLibrary();
      } catch (err) {
        request.log.warn(`Failed to refresh Jellyfin library after subtitle creation: ${(err as Error).message}`);
      }
    }

    app.broadcast?.({
      type: 'transcription_updated',
      requestId: matched.id,
      status: 'completed',
    });

    // Run next queued transcription if available
    app.transcriptionCron?.runOnce().catch((err) => {
      request.log.error(err, 'Failed to run next queued transcription from webhook');
    });

    return reply.send({
      ok: true,
      matched: true,
      requestId: matched.id,
      status: 'completed',
    });
  });

  // POST /internal/telegram/pair
  const telegramPairSchema = z.object({
    code: z.string().min(1, 'Code is required'),
    chatId: z.string().min(1, 'ChatId is required'),
  });

  app.post('/telegram/pair', async (request, reply) => {
    const parseResult = telegramPairSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid pair payload',
      });
    }

    const { code, chatId } = parseResult.data;
    const userId = app.telegramPairing.verifyAndConsumeCode(code);
    if (!userId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Código de vinculação inválido ou expirado',
      });
    }

    const targetUser = app.db.select().from(users).where(eq(users.id, userId)).get();
    if (!targetUser) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Usuário não encontrado',
      });
    }

    // Clear chatId if already bound to another user
    const existing = app.db.select().from(users).where(eq(users.telegramChatId, chatId)).get();
    if (existing && existing.id !== targetUser.id) {
      app.db.update(users).set({ telegramChatId: null }).where(eq(users.id, existing.id)).run();
    }

    app.db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, targetUser.id)).run();

    return reply.send({
      ok: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        role: targetUser.role,
      },
    });
  });

  // GET /internal/telegram/user/:chatId
  app.get('/telegram/user/:chatId', async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    if (!chatId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ChatId is required' });
    }

    const user = app.db.select().from(users).where(eq(users.telegramChatId, chatId)).get();
    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Usuário não vinculado',
      });
    }

    return reply.send({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        personalGeminiApiKey: user.personalGeminiApiKey || null,
      },
    });
  });

  // DELETE /internal/telegram/user/:chatId
  app.delete('/telegram/user/:chatId', async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    if (!chatId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ChatId is required' });
    }

    app.db.update(users).set({ telegramChatId: null }).where(eq(users.telegramChatId, chatId)).run();
    return reply.send({ ok: true });
  });
};
