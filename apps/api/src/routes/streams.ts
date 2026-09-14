import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { JwtPayload } from '../middleware/auth';

async function streamsAuth(request: FastifyRequest, reply: FastifyReply) {
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

  return reply.status(401).send({
    error: 'Unauthorized',
    message: 'Invalid or missing authentication',
  });
}

async function forwardToStreamer(request: FastifyRequest, reply: FastifyReply, subpath: string) {
  const streamerUrl = request.server.streamerUrl || process.env.STREAMER_URL;
  if (!streamerUrl) {
    return reply.status(503).send({
      error: 'Service Unavailable',
      message: 'Streamer service not configured',
    });
  }

  const cleanStreamerUrl = streamerUrl.replace(/\/$/, '');
  const urlObj = new URL(request.raw.url || request.url, 'http://localhost');
  const query = urlObj.search;
  const targetUrl = `${cleanStreamerUrl}/streams${subpath}${query}`;

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

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? JSON.stringify(request.body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    let responseData: any;
    if (contentType.includes('application/json')) {
      responseData = await res.json();
    } else {
      responseData = await res.text();
    }

    return reply.status(res.status).send(responseData);
  } catch (err) {
    request.server.log.error(err, 'Failed to proxy request to Streamer service');
    return reply.status(503).send({
      error: 'Service Unavailable',
      message: 'Streamer service unavailable',
    });
  }
}

export const streamsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', streamsAuth);

  app.all('/', async (request, reply) => {
    return forwardToStreamer(request, reply, '');
  });

  app.all('/*', async (request, reply) => {
    const wildcard = (request.params as { '*': string })['*'];
    return forwardToStreamer(request, reply, wildcard ? `/${wildcard}` : '');
  });
};
