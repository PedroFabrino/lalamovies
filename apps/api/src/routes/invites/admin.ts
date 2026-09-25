import { FastifyPluginAsync } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { invites, users } from '../../db/schema';
import { authMiddleware, adminGuard } from '../../middleware/auth';

export const inviteAdminRoutes: FastifyPluginAsync = async (app) => {
  // GET /invites (Admin only)
  app.get('/', { preHandler: [authMiddleware, adminGuard] }, async (_request, reply) => {
    const list = app.db
      .select({
        id: invites.id,
        token: invites.token,
        role: invites.role,
        createdByUserId: invites.createdByUserId,
        creatorUsername: users.username,
        expiresAt: invites.expiresAt,
        usedAt: invites.usedAt,
        revokedAt: invites.revokedAt,
      })
      .from(invites)
      .leftJoin(users, eq(invites.createdByUserId, users.id))
      .orderBy(desc(invites.id))
      .all();

    // Fetch registered users grouped by inviteId
    const registeredUsers = app.db
      .select({
        inviteId: users.inviteId,
        username: users.username,
      })
      .from(users)
      .all();

    const inviteUsersMap = new Map<string, string[]>();
    for (const u of registeredUsers) {
      if (u.inviteId) {
        const arr = inviteUsersMap.get(u.inviteId) || [];
        arr.push(u.username);
        inviteUsersMap.set(u.inviteId, arr);
      }
    }

    const now = new Date();
    const result = list.map((item) => {
      let status: 'revoked' | 'used' | 'expired' | 'pending' = 'pending';
      if (item.revokedAt) {
        status = 'revoked';
      } else if (item.usedAt) {
        status = 'used';
      } else if (item.expiresAt && now > new Date(item.expiresAt)) {
        status = 'expired';
      }

      const usersForInvite = inviteUsersMap.get(item.id) || [];

      return {
        ...item,
        status,
        usageCount: usersForInvite.length,
        invitedUsers: usersForInvite,
      };
    });

    return reply.send({ invites: result });
  });

  // DELETE /invites/:token (admin only)
  app.delete('/:token', { preHandler: [authMiddleware, adminGuard] }, async (request, reply) => {
    const { token } = request.params as { token: string };

    const invite = app.db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .get();

    if (!invite) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Invite not found',
      });
    }

    app.db.delete(invites).where(eq(invites.token, token)).run();

    return reply.send({ ok: true });
  });
};
