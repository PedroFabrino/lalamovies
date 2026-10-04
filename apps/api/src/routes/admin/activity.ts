import { FastifyPluginAsync } from 'fastify';

export const adminActivityRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/activity — returns active playback sessions and system telemetry
  app.get('/activity', async (_request, reply) => {
    const sessions = app.sessionMonitoring
      ? await app.sessionMonitoring.getSessions()
      : [];
    const system = app.sessionMonitoring
      ? await app.sessionMonitoring.getSystemMetrics()
      : {
          cpuPercent: 0,
          cpuCores: 1,
          memUsedBytes: 0,
          memTotalBytes: 0,
          gpu: null,
        };
    return reply.send({ sessions, system });
  });

  // POST /admin/activity/sessions/:sessionId/stop — stops an active playback session
  app.post('/activity/sessions/:sessionId/stop', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { message } = (request.body as { message?: string }) || {};

    if (!app.sessionMonitoring) {
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'Session monitoring service not available',
      });
    }

    try {
      await app.sessionMonitoring.stopSession(sessionId, message);
      return reply.send({ success: true, message: 'Playback session terminated successfully' });
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to stop playback session';
      return reply.status(502).send({
        error: 'Bad Gateway',
        message: msg,
      });
    }
  });
};
