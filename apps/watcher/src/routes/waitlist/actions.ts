import { FastifyPluginAsync } from 'fastify';

export const waitlistActionRoutes: FastifyPluginAsync = async (app) => {
  // POST /waitlist/poll-now - trigger immediate release check and promotion
  app.post('/poll-now', async (request, reply) => {
    try {
      const result = await app.checker.pollNow();
      return reply.send(result);
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
    const result = await app.checker.checkAndDiagnoseEntry(id);

    if (!result) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Waitlist entry not found',
      });
    }

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
