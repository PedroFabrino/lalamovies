import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomBytes, randomUUID } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { invites, users, User } from '../db/schema';
import { authMiddleware, adminGuard } from '../middleware/auth';

const acceptInviteSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const inviteRoutes: FastifyPluginAsync = async (app) => {
  // POST /invites (admin only)
  app.post('/', { preHandler: [authMiddleware, adminGuard] }, async (request, reply) => {
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const newInvite = {
      id: randomUUID(),
      token,
      createdByUserId: request.currentUser!.id,
      expiresAt,
      usedAt: null,
    };

    app.db.insert(invites).values(newInvite).run();

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/invite/${token}`;

    return reply.status(201).send({
      invite: newInvite,
      url,
    });
  });

  // GET /invites (admin only)
  app.get('/', { preHandler: [authMiddleware, adminGuard] }, async (_request, reply) => {
    const list = app.db
      .select({
        id: invites.id,
        token: invites.token,
        createdByUserId: invites.createdByUserId,
        creatorUsername: users.username,
        expiresAt: invites.expiresAt,
        usedAt: invites.usedAt,
      })
      .from(invites)
      .leftJoin(users, eq(invites.createdByUserId, users.id))
      .orderBy(desc(invites.expiresAt))
      .all();

    const now = new Date();
    const result = list.map((item) => {
      let status: 'used' | 'expired' | 'pending' = 'pending';
      if (item.usedAt) {
        status = 'used';
      } else if (now > new Date(item.expiresAt)) {
        status = 'expired';
      }
      return {
        ...item,
        status,
      };
    });

    return reply.send({ invites: result });
  });

  // GET /invites/:token (public metadata check)
  app.get('/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const invite = app.db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .get();

    if (!invite) {
      return reply.status(404).send({
        valid: false,
        reason: 'not_found',
        message: 'Invite not found',
      });
    }

    if (invite.usedAt) {
      return reply.status(400).send({
        valid: false,
        reason: 'used',
        message: 'This invite has already been used',
      });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return reply.status(400).send({
        valid: false,
        reason: 'expired',
        message: 'This invite has expired',
      });
    }

    return reply.send({
      valid: true,
      token: invite.token,
      expiresAt: invite.expiresAt,
    });
  });

  // POST /invites/:token/accept (public accept)
  app.post('/:token/accept', async (request, reply) => {
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

    if (invite.usedAt) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'This invite has already been used',
      });
    }

    if (new Date() > new Date(invite.expiresAt)) {
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

    // 2. Create local DB user and mark invite used (with rollback if DB fails)
    const newUser: User = {
      id: randomUUID(),
      jellyfinUserId,
      username,
      email: null,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    try {
      app.db.transaction((tx) => {
        tx.insert(users).values(newUser).run();
        tx.update(invites)
          .set({ usedAt: new Date().toISOString() })
          .where(eq(invites.id, invite.id))
          .run();
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