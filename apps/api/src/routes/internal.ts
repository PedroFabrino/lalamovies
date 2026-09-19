import path from 'node:path';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, ne } from 'drizzle-orm';
import { downloadRequests } from '../db/schema';

const subgenWebhookSchema = z.object({
  file: z.string().min(1, 'File path is required'),
  subtitle: z.string().optional(),
  language: z.string().optional(),
  event: z.string().optional().default('completed'),
  error: z.string().optional(),
});

function normalize(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase().trim();
}

export const internalRoutes: FastifyPluginAsync = async (app) => {
  // POST /internal/subgen/webhook — Subgen completion or failure callback
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
    const allRequests = app.db
      .select()
      .from(downloadRequests)
      .where(ne(downloadRequests.status, 'deleted'))
      .all();

    const matched = allRequests.find((r) => {
      if (!r.jellyfinPath) return false;
      const normJellyfin = normalize(r.jellyfinPath);
      if (normJellyfin === normFile) return true;
      if (normFile.includes(normJellyfin) || normJellyfin.includes(normFile)) return true;
      const jfBase = path.basename(normJellyfin, path.extname(normJellyfin));
      return jfBase.length > 3 && fileBase.includes(jfBase);
    });

    if (!matched) {
      request.log.warn(`Subgen webhook received for unmapped file: ${file}`);
      return reply.status(200).send({ ok: true, matched: false });
    }

    const isFailure = event === 'failed' || Boolean(error);

    if (isFailure) {
      const errorMsg = error || 'Subgen transcription failed';
      app.db
        .update(downloadRequests)
        .set({
          transcriptionStatus: 'failed',
          transcriptionError: errorMsg,
        })
        .where(eq(downloadRequests.id, matched.id))
        .run();

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
    app.db
      .update(downloadRequests)
      .set({
        transcriptionStatus: 'completed',
        transcriptionError: null,
      })
      .where(eq(downloadRequests.id, matched.id))
      .run();

    if (app.jellyfin.refreshLibrary) {
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
};
