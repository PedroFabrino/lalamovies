import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { eq, count } from 'drizzle-orm';
import { users, User } from '../db/schema';
import { InvalidCredentialsError } from '../services/jellyfin';
import { authMiddleware } from '../middleware/auth';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const { username, password } = parseResult.data;

    try {
      const authResult = await app.jellyfin.authenticateUser(username, password);

      // Check if user already exists
      let user = app.db
        .select()
        .from(users)
        .where(eq(users.jellyfinUserId, authResult.userId))
        .get();

      if (!user) {
        user = app.db
          .select()
          .from(users)
          .where(eq(users.username, authResult.username))
          .get();

        if (user) {
          // Update jellyfinUserId
          app.db
            .update(users)
            .set({ jellyfinUserId: authResult.userId })
            .where(eq(users.id, user.id))
            .run();
          user.jellyfinUserId = authResult.userId;
        }
      }

      if (!user) {
        // First user to log in becomes admin if there are zero admins
        const adminCountResult = app.db
          .select({ total: count() })
          .from(users)
          .where(eq(users.role, 'admin'))
          .get();

        const role: 'user' | 'admin' = (adminCountResult?.total ?? 0) === 0 ? 'admin' : 'user';

        const newUser: User = {
          id: randomUUID(),
          jellyfinUserId: authResult.userId,
          username: authResult.username,
          email: null,
          role,
          createdAt: new Date().toISOString(),
        };

        app.db.insert(users).values(newUser).run();
        user = newUser;
      }

      const token = app.jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          jellyfinUserId: user.jellyfinUserId,
        },
        { expiresIn: '7d' }
      );

      reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid Jellyfin username or password',
        });
      }

      request.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to authenticate with Jellyfin',
      });
    }
  });

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return reply.send({ ok: true });
  });

  app.get('/me', { preHandler: [authMiddleware] }, async (request, reply) => {
    let token = request.cookies?.token;
    if (!token && request.currentUser) {
      token = app.jwt.sign(
        {
          id: request.currentUser.id,
          username: request.currentUser.username,
          role: request.currentUser.role,
          jellyfinUserId: request.currentUser.jellyfinUserId,
        },
        { expiresIn: '7d' }
      );
    }
    return reply.send({
      user: request.currentUser,
      token,
    });
  });
};