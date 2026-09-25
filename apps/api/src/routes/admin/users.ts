import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { users } from '../../db/schema';
import { alias } from 'drizzle-orm/sqlite-core';

const updateRoleSchema = z.object({
  role: z.enum(['user', 'trusted', 'admin']),
});

const updateInvitesPermissionSchema = z.object({
  invitesEnabled: z.boolean(),
});

export const adminUsersRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/users — returns all Users with inviter referral attribution
  app.get('/users', async (_request, reply) => {
    const inviter = alias(users, 'inviter');

    const list = app.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        invitesEnabled: users.invitesEnabled,
        invitedByUserId: users.invitedByUserId,
        invitedByUsername: inviter.username,
      })
      .from(users)
      .leftJoin(inviter, eq(users.invitedByUserId, inviter.id))
      .orderBy(asc(users.createdAt))
      .all();

    const formatted = list.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      invitesEnabled: u.invitesEnabled ?? true,
      invitedBy: u.invitedByUserId && u.invitedByUsername
        ? { id: u.invitedByUserId, username: u.invitedByUsername }
        : null,
    }));

    return reply.send({ users: formatted });
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

    if (role !== targetUser.role && targetUser.jellyfinUserId && app.jellyfin.setUserLibraryAccess) {
      try {
        await app.jellyfin.setUserLibraryAccess(targetUser.jellyfinUserId, role);
      } catch (err) {
        request.log.error(err, 'Failed to update Jellyfin user library access');
        return reply.status(502).send({
          error: 'Bad Gateway',
          message: 'Failed to update user library access on media server',
        });
      }
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
        invitesEnabled: targetUser.invitesEnabled ?? true,
      },
    });
  });

  // PATCH /admin/users/:id/invites-permission — toggle user invite privileges
  app.patch('/users/:id/invites-permission', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateInvitesPermissionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid invitesEnabled parameter',
      });
    }

    const { invitesEnabled } = parseResult.data;

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
      .set({ invitesEnabled })
      .where(eq(users.id, id))
      .run();

    return reply.send({
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        createdAt: targetUser.createdAt,
        invitesEnabled,
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
};
