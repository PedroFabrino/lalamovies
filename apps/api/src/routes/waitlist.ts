import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { JwtPayload } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlags';
import { normalizeShowTitle } from '../services/upNext';
import { RequestStatus } from '../services/requestStateMachine';
import { parseAnimeTitleAndSeason } from '../utils/animeTitleCleaner';

interface WaitlistRequestBody {
  mediaType?: string;
  targetEpisode?: number | null;
  seasonNumber?: number | null;
  title?: string;
  metadataId?: string;
  requesterUsername?: string;
  requesterEmail?: string;
  [key: string]: unknown;
}

interface WaitlistEntry {
  userId?: string;
  requesterUsername?: string | null;
  [key: string]: unknown;
}

interface WaitlistResponse {
  entries?: WaitlistEntry[];
  [key: string]: unknown;
}

async function waitlistAuth(request: FastifyRequest, reply: FastifyReply) {
  // Allow public access to reject and approve endpoints with magic-link token
  if (request.method === 'GET' && /\/(reject|approve)(\?|$)/.test(request.url)) {
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

  let outgoingBody = request.body as WaitlistRequestBody | null | undefined;
  if (request.method === 'POST' && outgoingBody && typeof outgoingBody === 'object') {
    const postBody: WaitlistRequestBody = {
      ...outgoingBody,
      requesterUsername: outgoingBody.requesterUsername || request.currentUser?.username,
      requesterEmail: outgoingBody.requesterEmail || request.currentUser?.email || undefined,
    };

    // Clean anime/TV show titles that have embedded season suffixes (e.g. "The Apothecary Diaries Season 3")
    if (postBody.title && ['tv_show', 'anime'].includes(postBody.mediaType || '')) {
      const parsed = parseAnimeTitleAndSeason(postBody.title);
      if (parsed.cleanTitle !== postBody.title) {
        postBody.title = parsed.cleanTitle;
        if (
          (postBody.seasonNumber === undefined || postBody.seasonNumber === null || postBody.seasonNumber === 1) &&
          parsed.seasonNumber > 1
        ) {
          postBody.seasonNumber = parsed.seasonNumber;
        }
      }
    }

    outgoingBody = postBody;

    // Auto-detect targetEpisode from download_requests if omitted for tv_show / anime
    if (
      postBody.mediaType &&
      ['tv_show', 'anime'].includes(postBody.mediaType) &&
      (postBody.targetEpisode === undefined || postBody.targetEpisode === null)
    ) {
      const season = postBody.seasonNumber ?? 1;
      const effectiveUserId = request.currentUser?.id || (request.headers['x-user-id'] as string | undefined);

      try {
        const existingReqs = (
          effectiveUserId
            ? request.server.requestsRepo.findByUserId(effectiveUserId, true)
            : request.server.requestsRepo.findByCriteria({ excludeDeleted: true })
        ).filter((r) => ['tv_show', 'anime'].includes(r.mediaType) && r.seasonNumber === season);

        const normBodyTitle = postBody.title ? normalizeShowTitle(postBody.title) : '';
        const matching = existingReqs.filter((r) => {
          if (postBody.metadataId && r.metadataId && String(r.metadataId) === String(postBody.metadataId)) {
            return true;
          }
          if (normBodyTitle && r.title && normalizeShowTitle(r.title) === normBodyTitle) {
            return true;
          }
          return false;
        });

        if (matching.length > 0) {
          let maxEp = 0;
          for (const r of matching) {
            if (typeof r.episodeNumber === 'number' && r.episodeNumber > maxEp) {
              maxEp = r.episodeNumber;
            }
          }
          if (maxEp > 0) {
            postBody.targetEpisode = maxEp + 1;
          }
        }
      } catch (err) {
        request.log.warn(err, 'Failed to auto-detect target episode from download_requests');
      }
    }

    // Guard 1: Already In Library check
    if (subpath === '') {
      if (postBody.mediaType === 'movie') {
        const existingMovies = request.server.requestsRepo.findByCriteria({
          mediaType: 'movie',
          excludeDeleted: true,
        });

        const normTitle = postBody.title ? normalizeShowTitle(postBody.title) : '';
        const matched = existingMovies.find((r) => {
          if (postBody.metadataId && r.metadataId && String(r.metadataId) === String(postBody.metadataId)) {
            return true;
          }
          if (normTitle && r.title && normalizeShowTitle(r.title) === normTitle) {
            return true;
          }
          return false;
        });

        const finishedStatuses: string[] = [
          RequestStatus.DOWNLOADING,
          RequestStatus.HARDLINKING,
          RequestStatus.SEEDING,
          RequestStatus.DONE,
          'completed',
          RequestStatus.QUEUED,
        ];

        if (matched && finishedStatuses.includes(matched.status)) {
          return reply.status(409).send({
            error: 'Already In Library',
            message: `"${postBody.title || matched.title}" is already in your library or download queue.`,
          });
        }
      } else if (postBody.mediaType && ['tv_show', 'anime'].includes(postBody.mediaType)) {
        const season = postBody.seasonNumber ?? 1;
        const episode = postBody.targetEpisode ?? 1;

        const existingShows = request.server.requestsRepo
          .findByCriteria({ excludeDeleted: true })
          .filter(
            (r) =>
              ['tv_show', 'anime'].includes(r.mediaType) &&
              r.seasonNumber === season &&
              r.episodeNumber === episode
          );

        const normTitle = postBody.title ? normalizeShowTitle(postBody.title) : '';
        const matched = existingShows.find((r) => {
          if (postBody.metadataId && r.metadataId && String(r.metadataId) === String(postBody.metadataId)) {
            return true;
          }
          if (normTitle && r.title && normalizeShowTitle(r.title) === normTitle) {
            return true;
          }
          return false;
        });

        const finishedStatuses: string[] = [
          RequestStatus.DOWNLOADING,
          RequestStatus.HARDLINKING,
          RequestStatus.SEEDING,
          RequestStatus.DONE,
          'completed',
          RequestStatus.QUEUED,
        ];

        if (matched && finishedStatuses.includes(matched.status)) {
          return reply.status(409).send({
            error: 'Already In Library',
            message: `"${postBody.title || matched.title}" S${season}E${episode} is already in your library or download queue.`,
          });
        }
      }
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? JSON.stringify(outgoingBody) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    let responseData: unknown;
    if (contentType.includes('application/json')) {
      const json = (await res.json()) as WaitlistResponse;
      if (json && Array.isArray(json.entries)) {
        try {
          const allUsers = request.server.db.select({ id: users.id, username: users.username }).from(users).all();
          const userMap = new Map(allUsers.map((u) => [u.id, u.username]));
          json.entries = json.entries.map((entry: WaitlistEntry) => ({
            ...entry,
            requesterUsername: entry.requesterUsername || (entry.userId ? userMap.get(entry.userId) : null) || null,
          }));
        } catch {
          // Non-blocking fallback if DB lookup fails
        }
      }
      responseData = json;
    } else {
      responseData = await res.text();
    }

    if (res.ok && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      request.server.upNext?.clearCache();
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

  app.post('/', { preHandler: [requireFeature('waitlist')] }, async (request, reply) => {
    return forwardToWatcher(request, reply, '');
  });

  app.get('/', async (request, reply) => {
    return forwardToWatcher(request, reply, '');
  });

  app.get('/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    return forwardToWatcher(request, reply, `/${id}/reject`);
  });

  app.get('/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    return forwardToWatcher(request, reply, `/${id}/approve`);
  });

  app.post('/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    return forwardToWatcher(request, reply, `/${id}/approve`);
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