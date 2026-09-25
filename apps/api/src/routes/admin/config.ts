import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { systemConfig } from '../../db/schema';

export const adminConfigRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/config — returns all system_config key-value pairs
  app.get('/config', async (_request, reply) => {
    const rows = app.db.select().from(systemConfig).all();
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return reply.send({ config });
  });

  const updateConfigHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Request body must be an object',
      });
    }

    const updates: Record<string, unknown> =
      typeof body.config === 'object' && body.config !== null
        ? (body.config as Record<string, unknown>)
        : body;

    // Validate numeric thresholds and limits
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'concurrent_limit' || key === 'storage_quota_gb') {
        const num = Number(val);
        if (!Number.isInteger(num) || num < 1) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `${key} must be a positive integer >= 1`,
          });
        }
      } else if (key === 'disk_warn_threshold' || key === 'disk_reject_threshold') {
        const num = Number(val);
        if (!Number.isInteger(num) || num <= 0 || num > 100) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `${key} must be a positive integer between 1 and 100`,
          });
        }
      } else if (key === 'transcription_window_start' || key === 'transcription_window_end') {
        const str = String(val);
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(str)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `${key} must be in HH:MM format (e.g. 02:00)`,
          });
        }
      }
    }

    for (const [key, val] of Object.entries(updates)) {
      const stringVal = String(val);
      const existing = app.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, key))
        .get();

      if (existing) {
        app.db
          .update(systemConfig)
          .set({ value: stringVal })
          .where(eq(systemConfig.key, key))
          .run();
      } else {
        app.db
          .insert(systemConfig)
          .values({ key, value: stringVal })
          .run();
      }
    }

    const rows = app.db.select().from(systemConfig).all();
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return reply.send({ config });
  };

  // PUT /admin/config — accepts partial map of config keys to update
  app.put('/config', updateConfigHandler);

  // PATCH /admin/config — accepts partial map of config keys to update
  app.patch('/config', updateConfigHandler);
};
