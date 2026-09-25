import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { invites, users, User } from '../../db/schema';
import { requireFeature } from '../../middleware/featureFlags';

const acceptInviteSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const inviteAcceptRoutes: FastifyPluginAsync = async (app) => {
  // GET /invites/:token (Public metadata check)
  app.get('/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const invite = app.db
      .select({
        id: invites.id,
        token: invites.token,
        role: invites.role,
        expiresAt: invites.expiresAt,
        usedAt: invites.usedAt,
        revokedAt: invites.revokedAt,
        createdByUserId: invites.createdByUserId,
        creatorUsername: users.username,
      })
      .from(invites)
      .leftJoin(users, eq(invites.createdByUserId, users.id))
      .where(eq(invites.token, token))
      .get();

    if (!invite) {
      return reply.status(404).send({
        valid: false,
        reason: 'not_found',
        message: 'Invite not found',
      });
    }

    if (invite.revokedAt) {
      return reply.status(400).send({
        valid: false,
        reason: 'revoked',
        message: 'This invite has been revoked by the creator',
      });
    }

    if (invite.usedAt) {
      return reply.status(400).send({
        valid: false,
        reason: 'used',
        message: 'This invite has already been used',
      });
    }

    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      return reply.status(400).send({
        valid: false,
        reason: 'expired',
        message: 'This invite has expired',
      });
    }

    return reply.send({
      valid: true,
      token: invite.token,
      role: invite.role,
      expiresAt: invite.expiresAt,
      creatorUsername: invite.creatorUsername || undefined,
    });
  });

  // POST /invites/:token/accept (Public accept)
  app.post(
    '/:token/accept',
    { preHandler: [requireFeature('user_invites')] },
    async (request, reply) => {
      const { token } = request.params as { token: string };

      const parseResult = acceptInviteSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: parseResult.error.issues[0]?.message || 'Invalid request body',
        });
      }

      const { username, password } = parseResult.data;

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

      if (invite.revokedAt) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'This invite has been revoked by the creator',
        });
      }

      if (invite.usedAt) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'This invite has already been used',
        });
      }

      if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'This invite has expired',
        });
      }

      const existingUser = app.db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .get();

      if (existingUser) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Username is already taken',
        });
      }

      const userRole = (invite.role as 'user' | 'trusted') || 'user';

      // 1. Create Jellyfin user
      let jellyfinUserId: string;
      try {
        jellyfinUserId = await app.jellyfin.createUser(username, password);
      } catch (err) {
        request.log.error(err);
        return reply.status(502).send({
          error: 'Bad Gateway',
          message: 'Failed to create user account on media server',
        });
      }

      if (app.jellyfin.setUserLibraryAccess) {
        try {
          await app.jellyfin.setUserLibraryAccess(jellyfinUserId, userRole);
        } catch (err) {
          request.log.error(err, 'Failed to configure library access on media server');
          try {
            await app.jellyfin.deleteUser(jellyfinUserId);
          } catch (rollbackErr) {
            request.log.error(rollbackErr, 'Failed to rollback Jellyfin user');
          }
          return reply.status(502).send({
            error: 'Bad Gateway',
            message: 'Failed to configure library access on media server',
          });
        }
      }

      // 2. Create local DB user with attribution (with rollback if DB fails)
      const newUser: User = {
        id: randomUUID(),
        jellyfinUserId,
        username,
        email: null,
        role: userRole,
        invitedByUserId: invite.createdByUserId,
        inviteId: invite.id,
        invitesEnabled: true,
        createdAt: new Date().toISOString(),
      };

      try {
        app.db.transaction((tx) => {
          tx.insert(users).values(newUser).run();
          // Only single-use invites (with explicit expiresAt) are marked usedAt
          if (invite.expiresAt !== null) {
            tx.update(invites)
              .set({ usedAt: new Date().toISOString() })
              .where(eq(invites.id, invite.id))
              .run();
          }
        });
      } catch (dbErr) {
        request.log.error(dbErr, 'DB insert failed, rolling back Jellyfin user creation');
        try {
          await app.jellyfin.deleteUser(jellyfinUserId);
        } catch (rollbackErr) {
          request.log.error(rollbackErr, 'Failed to rollback Jellyfin user');
        }
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to complete user registration',
        });
      }

      // 3. Issue JWT cookie so user is logged in immediately
      const jwtToken = app.jwt.sign(
        {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          jellyfinUserId: newUser.jellyfinUserId,
        },
        { expiresIn: '7d' }
      );

      reply.setCookie('token', jwtToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.status(201).send({
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
        token: jwtToken,
      });
    }
  );
};
