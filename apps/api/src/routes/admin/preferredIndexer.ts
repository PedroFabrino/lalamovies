import { FastifyPluginAsync } from 'fastify';

interface UpdateCookieBody {
  cookie?: string;
}

interface TestCookieBody {
  cookie?: string;
}

export const adminPreferredIndexerRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/preferred-indexer/cookie — returns indexer cookie status, health, and preview
  app.get('/preferred-indexer/cookie', async (request, reply) => {
    const { refresh } = request.query as { refresh?: string };
    const forceRefresh = refresh === 'true' || refresh === '1';

    if (!app.prowlarr?.getPreferredIndexerCookieStatus) {
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'Prowlarr service is not available',
      });
    }

    const status = await app.prowlarr.getPreferredIndexerCookieStatus(forceRefresh);
    return reply.send(status);
  });

  // POST /admin/preferred-indexer/cookie/test — tests the current or candidate cookie against Prowlarr
  app.post<{ Body: TestCookieBody }>('/preferred-indexer/cookie/test', async (request, reply) => {
    if (!app.prowlarr?.testPreferredIndexerCookie) {
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'Prowlarr service is not available',
      });
    }

    const cookieOverride = request.body?.cookie;
    const result = await app.prowlarr.testPreferredIndexerCookie(cookieOverride);
    if (!result.ok) {
      return reply.status(400).send(result);
    }
    return reply.send(result);
  });

  // PUT /admin/preferred-indexer/cookie — updates the cookie in Prowlarr and validates it
  app.put<{ Body: UpdateCookieBody }>('/preferred-indexer/cookie', async (request, reply) => {
    const cookie = request.body?.cookie?.trim();
    if (!cookie) {
      return reply.status(400).send({
        ok: false,
        message: 'Cookie string is required',
      });
    }

    if (!app.prowlarr?.updatePreferredIndexerCookie) {
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'Prowlarr service is not available',
      });
    }

    const result = await app.prowlarr.updatePreferredIndexerCookie(cookie);
    if (!result.ok) {
      return reply.status(400).send(result);
    }
    return reply.send(result);
  });
};
