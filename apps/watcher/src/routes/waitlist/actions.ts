import { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { watchRequests } from '../../db/schema';

export const waitlistActionRoutes: FastifyPluginAsync = async (app) => {
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
    } catch (err: unknown) {
      app.log.error(err, 'Failed running poll-now');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as Error).message,
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

    const result = await app.checker.checkAndDiagnoseEntry(entry);

    return reply.send({
      ok: true,
      message: result.message,
      entry: result.entry,
    });
  });

  // POST /waitlist/:id/advance - advance episodic entry or complete movie entry
  app.post('/:id/advance', async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = await app.episodic.advanceOrCompleteEntry(id);
    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Waitlist entry not found',
      });
    }

    return reply.send({
      ok: true,
      entry,
    });
  });
};
