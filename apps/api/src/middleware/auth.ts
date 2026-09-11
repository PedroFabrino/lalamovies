import { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { users, User } from '../db/schema';

export interface JwtPayload {
  id: string;
  username: string;
  role: 'user' | 'admin';
  jellyfinUserId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: User;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<JwtPayload>();
    const user = request.server.db
      .select()
      .from(users)
      .where(eq(users.id, payload.id))
      .get();

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not found' });
    }

    request.currentUser = user;
    return;
  } catch {
    // Check X-Service-Key for internal service-to-service communication
    const serviceKey = request.server.serviceApiKey;
    const headerKey = request.headers['x-service-key'];
    const providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;

    if (serviceKey && providedKey && providedKey === serviceKey) {
      const headerUserId = request.headers['x-user-id'];
      const userId = Array.isArray(headerUserId) ? headerUserId[0] : headerUserId;
      if (userId) {
        const user = request.server.db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .get();
        if (user) {
          request.currentUser = user;
          return;
        }
      }

      const adminUser = request.server.db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .get();
      if (adminUser) {
        request.currentUser = adminUser;
        return;
      }

      const anyUser = request.server.db.select().from(users).get();
      if (anyUser) {
        request.currentUser = anyUser;
        return;
      }
    }

    return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }
}

export async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  if (!request.currentUser) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }

  if (request.currentUser.role !== 'admin') {
    return reply.status(403).send({ error: 'Forbidden', message: 'Admin access required' });
  }
}