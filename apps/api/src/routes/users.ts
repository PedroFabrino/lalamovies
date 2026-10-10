import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { authMiddleware } from '../middleware/auth';

const updateGeminiKeySchema = z.object({
  apiKey: z.string().nullable().optional(),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  // PUT /users/me/gemini-api-key
  app.put('/me/gemini-api-key', { preHandler: [authMiddleware] }, async (request, reply) => {
    const user = request.currentUser;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = updateGeminiKeySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const rawKey = parseResult.data.apiKey;
    const cleanedKey = rawKey && rawKey.trim().length > 0 ? rawKey.trim() : null;

    app.db
      .update(users)
      .set({ personalGeminiApiKey: cleanedKey })
      .where(eq(users.id, user.id))
      .run();

    return reply.send({ ok: true, hasPersonalGeminiKey: Boolean(cleanedKey) });
  });
};
