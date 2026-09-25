import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { featureFlags } from '../../db/schema';

export const adminFeaturesRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/features — returns all feature flags
  app.get('/features', async (_request, reply) => {
    const list = app.db
      .select()
      .from(featureFlags)
      .orderBy(asc(featureFlags.category), asc(featureFlags.id))
      .all();

    return reply.send({ features: list });
  });

  // PATCH /admin/features/:id — updates feature flag status
  app.patch('/features/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      enabled: z.boolean(),
    });

    const parseResult = schema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const { enabled } = parseResult.data;

    const targetFlag = app.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id))
      .get();

    if (!targetFlag) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Feature flag not found',
      });
    }

    const now = new Date().toISOString();
    const userId = request.currentUser?.id || null;

    app.db
      .update(featureFlags)
      .set({
        enabled,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(featureFlags.id, id))
      .run();

    const updated = app.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id))
      .get();

    // Fetch full dictionary
    const allFlags = app.db.select().from(featureFlags).all();
    const flagsMap: Record<string, boolean> = {};
    for (const f of allFlags) {
      flagsMap[f.id] = Boolean(f.enabled);
    }

    // Broadcast real-time WebSocket update (Subtask #88)
    if (typeof app.broadcast === 'function') {
      app.broadcast({
        type: 'feature_flags_updated',
        payload: { flags: flagsMap },
        flags: flagsMap,
      });
    }

    return reply.send({ feature: updated, flags: flagsMap });
  });
};
