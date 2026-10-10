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

      if (user) {
        app.db
          .update(users)
          .set({
            jellyfinAccessToken: authResult.accessToken,
          })
          .where(eq(users.id, user.id))
          .run();
        user.jellyfinAccessToken = authResult.accessToken;
      }

      if (!user) {
        user = app.db
          .select()
          .from(users)
          .where(eq(users.username, authResult.username))
          .get();

        if (user) {
          // Update jellyfinUserId and jellyfinAccessToken
          app.db
            .update(users)
            .set({
              jellyfinUserId: authResult.userId,
              jellyfinAccessToken: authResult.accessToken,
            })
            .where(eq(users.id, user.id))
            .run();
          user.jellyfinUserId = authResult.userId;
          user.jellyfinAccessToken = authResult.accessToken;
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
          invitedByUserId: null,
          inviteId: null,
          invitesEnabled: true,
          jellyfinAccessToken: authResult.accessToken,
          telegramChatId: null,
          personalGeminiApiKey: null,
          telegramReportMessageId: null,
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
          hasJellyfinToken: Boolean(user.jellyfinAccessToken),
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

  const jellyfinTokenSchema = z.object({
    password: z.string().min(1, 'Password is required'),
  });

  app.post('/jellyfin-token', { preHandler: [authMiddleware] }, async (request, reply) => {
    const parseResult = jellyfinTokenSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const currentUser = request.currentUser;
    if (!currentUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const authResult = await app.jellyfin.authenticateUser(currentUser.username, parseResult.data.password);
      app.db
        .update(users)
        .set({ jellyfinAccessToken: authResult.accessToken })
        .where(eq(users.id, currentUser.id))
        .run();

      return reply.send({ ok: true, hasJellyfinToken: true });
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid Jellyfin password',
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
    const user = request.currentUser;
    return reply.send({
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            hasJellyfinToken: Boolean(user.jellyfinAccessToken),
            telegramChatId: user.telegramChatId || null,
            hasPersonalGeminiKey: Boolean(user.personalGeminiApiKey),
            createdAt: user.createdAt,
          }
        : null,
      token,
    });
  });

  // POST /auth/telegram-pairing/code
  app.post('/telegram-pairing/code', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.currentUser;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const result = app.telegramPairing.generateCode(user.id);
    return reply.send(result);
  });

  // POST /auth/telegram-pairing/claim
  const claimSchema = z.object({
    token: z.string().min(1, 'Token is required'),
  });

  app.post('/telegram-pairing/claim', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.currentUser;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = claimSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid claim payload',
      });
    }

    const { token } = parseResult.data;
    const chatId = app.telegramPairing.consumeAuthSession(token);
    if (!chatId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Sessão de vinculação inválida ou expirada',
      });
    }

    // Clear chatId if already bound to another user
    const existing = app.requestsRepo.findUserByTelegramChatId(chatId);
    if (existing && existing.id !== user.id) {
      app.requestsRepo.setTelegramChatId(existing.id, null);
    }

    app.requestsRepo.setTelegramChatId(user.id, chatId);

    // Notify user in Telegram if bot token is configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: `🎉 *Conta Vinculada com Sucesso!*\n\nOlá *${user.username}*, sua conta foi vinculada ao Telegram via navegador.\n\nAgora você pode pedir downloads por aqui! Experimente enviar:\n• _"Baixe o filme Interestelar"_\n• _"Baixe a série Lanternas"_\n• ou use comandos como /filme, /serie, /status`,
          parse_mode: 'Markdown',
        }),
      }).catch(() => {});
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'mdm_download_bot';

    return reply.send({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      chatId,
      botUsername,
    });
  });

  // DELETE /auth/telegram-pairing
  app.delete('/telegram-pairing', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.currentUser;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    app.requestsRepo.setTelegramChatId(user.id, null);

    return reply.send({ ok: true });
  });
};