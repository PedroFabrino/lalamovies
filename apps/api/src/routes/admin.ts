import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { authMiddleware, adminGuard } from '../middleware/auth';
import { users, systemConfig, downloadRequests } from '../db/schema';

const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // All /admin routes require authentication and admin role
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', adminGuard);

  // GET /admin/users — returns all Users with id, username, email, role, createdAt
  app.get('/users', async (_request, reply) => {
    const list = app.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt))
      .all();

    return reply.send({ users: list });
  });

  // PATCH /admin/users/:id/role — promotes or demotes a User; cannot demote self
  app.patch('/users/:id/role', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateRoleSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid role',
      });
    }

    const { role } = parseResult.data;

    if (id === request.currentUser!.id && role !== 'admin') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Cannot demote yourself',
      });
    }

    const targetUser = app.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get();

    if (!targetUser) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    app.db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .run();

    return reply.send({
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        role,
        createdAt: targetUser.createdAt,
      },
    });
  });

  // DELETE /admin/users/:id — removes User record from DB; cannot delete self
  app.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (id === request.currentUser!.id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Cannot delete yourself',
      });
    }

    const targetUser = app.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get();

    if (!targetUser) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    app.db.delete(users).where(eq(users.id, id)).run();

    return reply.send({ ok: true });
  });

  // GET /admin/config — returns all system_config key-value pairs
  app.get('/config', async (_request, reply) => {
    const rows = app.db.select().from(systemConfig).all();
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return reply.send({ config });
  });

  // PUT /admin/config — accepts partial map of config keys to update
  app.put('/config', async (request, reply) => {
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
      if (key === 'concurrent_limit') {
        const num = Number(val);
        if (!Number.isInteger(num) || num < 1) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'concurrent_limit must be a positive integer >= 1',
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
  });

  // POST /admin/cleanup — triggers CleanupService.checkDiskAndClean() immediately
  app.post('/cleanup', async (_request, reply) => {
    const scheduled = app.cleanup.checkDiskAndClean
      ? await app.cleanup.checkDiskAndClean()
      : [];
    return reply.send({ scheduled });
  });

  // POST /admin/cleanup/:requestId — triggers CleanupService.cleanItem(requestId) immediately
  app.post('/cleanup/:requestId', async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const item = app.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, requestId))
      .get();

    if (!item) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Download request not found',
      });
    }

    await app.cleanup.cleanItem(requestId);
    return reply.send({ ok: true });
  });

  // GET /admin/cleanup/candidates — returns current Cleanup candidates in priority order (LRU first)
  app.get('/cleanup/candidates', async (_request, reply) => {
    const candidates = app.cleanup.getCandidates
      ? await app.cleanup.getCandidates()
      : [];
    return reply.send({ candidates });
  });

  // GET /admin/disk — returns disk usage and thresholds
  app.get('/disk', async (_request, reply) => {
    const percentFree = app.cleanup.getPercentFree ? app.cleanup.getPercentFree() : 100;
    const warnRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'disk_warn_threshold'))
      .get();
    const rejectRow = app.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, 'disk_reject_threshold'))
      .get();

    return reply.send({
      percentFree,
      percentUsed: Math.max(0, 100 - percentFree),
      warnThreshold: warnRow ? parseInt(warnRow.value, 10) : 20,
      rejectThreshold: rejectRow ? parseInt(rejectRow.value, 10) : 15,
    });
  });
};
