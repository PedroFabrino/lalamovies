import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { JwtPayload } from '../middleware/auth';
import { isKnownPrivateIndexer, hasPasskey } from '../services/prowlarr';
import { isFeatureEnabled } from '../middleware/featureFlags';

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
  if (request.method === 'POST' && subpath === '') {
    if (!isFeatureEnabled(request.server.db, 'streaming')) {
      return reply.status(503).send({
        error: 'FEATURE_DISABLED',
        code: 'FEATURE_DISABLED',
        message: "Feature 'streaming' is temporarily disabled",
      });
    }
  }

  const streamerUrl = request.server.streamerUrl || process.env.STREAMER_URL;
  if (!streamerUrl) {
    return reply.status(503).send({
      error: 'Service Unavailable',
      message: 'Streamer service not configured',
    });
  }

  // Airgap validation: prevent any private tracker releases from reaching cloud debrid
  if (request.method === 'POST' && subpath === '') {
    const body = request.body as {
      isPrivateTracker?: boolean;
      indexer?: string;
      magnetLink?: string;
      downloadUrl?: string;
    } | null;

    if (body) {
      if (body.isPrivateTracker === true) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Releases from private trackers cannot be streamed via cloud debrid',
        });
      }
      if (body.indexer && isKnownPrivateIndexer(body.indexer)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Releases from private trackers cannot be streamed via cloud debrid',
        });
      }
      if (body.indexer && request.server.prowlarr?.isIndexerPrivate?.(body.indexer)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Releases from private trackers cannot be streamed via cloud debrid',
        });
      }
      const magnetOrUrl = body.magnetLink || body.downloadUrl;
      if (magnetOrUrl) {
        if (hasPasskey(magnetOrUrl)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Private tracker announce passkey detected. Streaming barred to prevent security leaks',
          });
        }
        const indexerMatch = magnetOrUrl.match(/(?:\/indexer\/|\/api\/v1\/indexer\/)(\d+)/i);
        if (indexerMatch && request.server.prowlarr?.isIndexerPrivate?.(Number(indexerMatch[1]))) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Releases from private trackers cannot be streamed via cloud debrid',
          });
        }
      }
    }
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
    let responseData: unknown;
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
