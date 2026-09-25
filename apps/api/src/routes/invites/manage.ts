import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomBytes, randomUUID } from 'node:crypto';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { invites, users } from '../../db/schema';
import { authMiddleware } from '../../middleware/auth';
import { requireFeature } from '../../middleware/featureFlags';

const createInviteSchema = z.object({
  role: z.enum(['user', 'trusted']).optional(),
  expiryHours: z.number().nonnegative().optional(),
  expiresInHours: z.number().nonnegative().optional(),
});

function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

export const inviteManageRoutes: FastifyPluginAsync = async (app) => {
  // GET /invites/my-link (Authenticated: regular users or admins)
  app.get(
    '/my-link',
    { preHandler: [authMiddleware, requireFeature('user_invites')] },
    async (request, reply) => {
      const currentUserId = request.currentUser!.id;

      // Find active personal invite (revokedAt IS NULL and not expired)
      const userInvites = app.db
        .select()
        .from(invites)
        .where(and(eq(invites.createdByUserId, currentUserId), isNull(invites.revokedAt)))
        .orderBy(desc(invites.id))
        .all();

      const now = new Date();
      const activeInvite = userInvites.find((inv) => {
        if (!inv.expiresAt) return true;
        return new Date(inv.expiresAt) > now;
      }) || null;

      // Get list of friends registered with this user's attribution
      const invitedFriends = app.db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.invitedByUserId, currentUserId))
        .all();

      const frontendUrl = getFrontendUrl();
      const url = activeInvite ? `${frontendUrl}/invite/${activeInvite.token}` : null;

      return reply.send({
        invite: activeInvite,
        url,
        invitedUsers: invitedFriends.map((f) => f.username),
      });
    }
  );

  // POST /invites (Authenticated, non-admin permitted, gated by user_invites)
  app.post(
    '/',
    { preHandler: [authMiddleware, requireFeature('user_invites')] },
    async (request, reply) => {
      const currentUser = request.currentUser!;

      if (currentUser.invitesEnabled === false) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Invite creation has been disabled for your account',
        });
      }

      const parseResult = createInviteSchema.safeParse(request.body || {});
      const data = parseResult.success ? parseResult.data : {};

      // Role safety: Non-admin users are strictly forced to 'user' role
      const role = currentUser.role === 'admin' ? (data.role || 'user') : 'user';

      // For regular users, automatically revoke any existing active invite
      if (currentUser.role !== 'admin') {
        app.db
          .update(invites)
          .set({ revokedAt: new Date().toISOString() })
          .where(and(eq(invites.createdByUserId, currentUser.id), isNull(invites.revokedAt)))
          .run();
      }

      const token = randomBytes(24).toString('hex');
      // Multi-use links do not expire (expiresAt = null); admin invites default to 48h expiry unless 0 or specified
      let expiresAt: string | null = null;
      if (currentUser.role === 'admin') {
        const inputHours = data.expiryHours ?? data.expiresInHours;
        const expiryHours = inputHours !== undefined ? inputHours : 48;
        expiresAt = expiryHours > 0 ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString() : null;
      }

      const newInvite = {
        id: randomUUID(),
        token,
        role,
        createdByUserId: currentUser.id,
        expiresAt,
        usedAt: null,
        revokedAt: null,
      };

      app.db.insert(invites).values(newInvite).run();

      const url = `${getFrontendUrl()}/invite/${token}`;

      return reply.status(201).send({
        invite: newInvite,
        url,
      });
    }
  );

  // POST /invites/:token/revoke (Authenticated: creator or admin)
  app.post(
    '/:token/revoke',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const currentUser = request.currentUser!;

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

      if (currentUser.role !== 'admin' && invite.createdByUserId !== currentUser.id) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You are not authorized to revoke this invite',
        });
      }

      app.db
        .update(invites)
        .set({ revokedAt: new Date().toISOString() })
        .where(eq(invites.token, token))
        .run();

      return reply.send({ ok: true, message: 'Invite revoked' });
    }
  );
};
