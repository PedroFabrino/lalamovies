import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { JwtPayload } from '../middleware/auth';

async function waitlistAuth(request: FastifyRequest, reply: FastifyReply) {
  // Allow public access to reject endpoint with magic-link token
  if (/\/reject(\?|$)/.test(request.url)) {
    return;
  }

  // 1. Try JWT authentication first (from cookie or authorization header)
  try {
    const payload = await request.jwtVerify<JwtPayload>();
    const user = request.server.db
      .select()
      .from(users)
      .where(eq(users.id, payload.id))
      .get();
    if (user) {
      request.currentUser = user;
      return;
    }
  } catch {
    // JWT verification failed or not present
  }

  // 2. Check X-Service-Key
  const serviceKey = request.server.serviceApiKey;
  const headerKey = request.headers['x-service-key'];
  const providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;

  if (serviceKey && providedKey && providedKey === serviceKey) {
    return;
  }

  // Neither valid JWT nor valid X-Service-Key
  return reply.status(401).send({
    error: 'Unauthorized',
    message: 'Invalid or missing X-Service-Key',
  });
}

async function forwardToWatcher(request: FastifyRequest, reply: FastifyReply, subpath: string) {
  const watcherUrl = request.server.watcherUrl || process.env.WATCHER_URL;
  if (!watcherUrl) {
    return reply.status(200).send({ status: 'ok' });
  }

  const cleanWatcherUrl = watcherUrl.replace(/\/$/, '');
  const urlObj = new URL(request.raw.url || request.url, 'http://localhost');
  const query = urlObj.search;
  const targetUrl = `${cleanWatcherUrl}/waitlist${subpath}${query}`;

  const headers: Record<string, string> = {};

  const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.body !== undefined && request.body !== null;
  if (hasBody) {
    headers['content-type'] = 'application/json';
  }

  if (request.server.serviceApiKey) {
    headers['x-service-key'] = request.server.serviceApiKey;
  }

  if (request.currentUser) {
    headers['x-user-id'] = request.currentUser.id;
    headers['x-user-role'] = request.currentUser.role;
  } else if (request.headers['x-user-id']) {
    headers['x-user-id'] = request.headers['x-user-id'] as string;
    if (request.headers['x-user-role']) {
      headers['x-user-role'] = request.headers['x-user-role'] as string;
    }
  }

  let outgoingBody = request.body as any;
  if (request.method === 'POST' && outgoingBody && typeof outgoingBody === 'object') {
    if (request.currentUser) {
      outgoingBody = {
        ...outgoingBody,
        requesterUsername: outgoingBody.requesterUsername || request.currentUser.username,
        requesterEmail: outgoingBody.requesterEmail || request.currentUser.email,
      };
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? JSON.stringify(outgoingBody) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    let responseData: any;
    if (contentType.includes('application/json')) {
      responseData = await res.json();
      if (responseData && Array.isArray(responseData.entries)) {
        try {
          const allUsers = request.server.db.select({ id: users.id, username: users.username }).from(users).all();
          const userMap = new Map(allUsers.map((u) => [u.id, u.username]));
          responseData.entries = responseData.entries.map((entry: any) => ({
            ...entry,
            requesterUsername: entry.requesterUsername || userMap.get(entry.userId) || null,
          }));
        } catch {
          // Non-blocking fallback if DB lookup fails
        }
      }
    } else {
      responseData = await res.text();
    }

    return reply.status(res.status).send(responseData);
  } catch (err) {
    request.server.log.error(err, 'Failed to proxy request to Watcher service');
    return reply.status(503).send({
      error: 'Service Unavailable',
      message: 'Watcher service unavailable',
    });
  }
}

export const waitlistRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', waitlistAuth);

  app.post('/', async (request, reply) => {
    return forwardToWatcher(request, reply, '');
  });

  app.get('/', async (request, reply) => {
    return forwardToWatcher(request, reply, '');
  });

  app.get('/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    return forwardToWatcher(request, reply, `/${id}/reject`);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return forwardToWatcher(request, reply, `/${id}`);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return forwardToWatcher(request, reply, `/${id}`);
  });

  app.all('/*', async (request, reply) => {
    const wildcard = (request.params as { '*': string })['*'];
    return forwardToWatcher(request, reply, wildcard ? `/${wildcard}` : '');
  });
};