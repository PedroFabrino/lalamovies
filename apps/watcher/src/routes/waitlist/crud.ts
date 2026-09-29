import { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { watchRequests, WatchRequest, waitlistCoRequesters } from '../../db/schema';
import { deleteDiscordMessage, sendWaitlistCancelNotification } from '../../services/notifications';

export const waitlistCrudRoutes: FastifyPluginAsync = async (app) => {
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

  // GET /waitlist?userId=&status=&allUsers=
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
      const coReqWaitlistIds = app.db
        .select({ waitlistId: waitlistCoRequesters.waitlistId })
        .from(waitlistCoRequesters)
        .where(eq(waitlistCoRequesters.userId, targetUserId))
        .all()
        .map((r) => r.waitlistId);

      if (coReqWaitlistIds.length > 0) {
        conditions.push(
          or(
            eq(watchRequests.userId, targetUserId),
            inArray(watchRequests.id, coReqWaitlistIds)
          )
        );
      } else {
        conditions.push(eq(watchRequests.userId, targetUserId));
      }
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

    const allCoReqs = app.db
      .select({ waitlistId: waitlistCoRequesters.waitlistId })
      .from(waitlistCoRequesters)
      .all();
    const countMap = new Map<string, number>();
    for (const cr of allCoReqs) {
      countMap.set(cr.waitlistId, (countMap.get(cr.waitlistId) || 0) + 1);
    }

    const graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    const entriesWithGrace = list.map((entry) => ({
      ...entry,
      coRequesterCount: countMap.get(entry.id) || 0,
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

    const isCoRequester = callerId
      ? app.db
          .select()
          .from(waitlistCoRequesters)
          .where(
            and(
              eq(waitlistCoRequesters.waitlistId, id),
              eq(waitlistCoRequesters.userId, callerId)
            )
          )
          .get() !== undefined
      : false;

    if (callerId && callerRole !== 'admin' && entry.userId !== callerId && !isCoRequester) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Cannot access another user entry',
      });
    }

    const coReqCount = app.db
      .select({ waitlistId: waitlistCoRequesters.waitlistId })
      .from(waitlistCoRequesters)
      .where(eq(waitlistCoRequesters.waitlistId, id))
      .all().length;

    const graceHours = Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    return reply.send({
      entry: { ...entry, coRequesterCount: coReqCount, graceHours },
      ...entry,
      coRequesterCount: coReqCount,
      graceHours,
    });
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
      const isCoRequester = app.db
        .select()
        .from(waitlistCoRequesters)
        .where(
          and(
            eq(waitlistCoRequesters.waitlistId, id),
            eq(waitlistCoRequesters.userId, callerId)
          )
        )
        .get() !== undefined;

      if (isCoRequester) {
        app.db
          .delete(waitlistCoRequesters)
          .where(
            and(
              eq(waitlistCoRequesters.waitlistId, id),
              eq(waitlistCoRequesters.userId, callerId)
            )
          )
          .run();
        return reply.send({ ok: true, message: 'Removed from co-requesters' });
      }

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
};
