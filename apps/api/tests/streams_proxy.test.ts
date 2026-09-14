import { describe, it, expect, vi } from 'vitest';
import { buildApp } from '../src/app';

describe('Streams Proxy Routes', () => {
  it('rejects /streams requests when unauthenticated with 401', async () => {
    const app = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
      serviceApiKey: 'secret',
      streamerUrl: 'http://localhost:3002',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/streams',
    });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 503 when streamerUrl is not configured', async () => {
    const app = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
      serviceApiKey: 'secret',
      streamerUrl: undefined,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/streams',
      headers: {
        'x-service-key': 'secret',
      },
    });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({
      error: 'Service Unavailable',
      message: 'Streamer service not configured',
    });
    await app.close();
  });

  it('forwards requests to streamer service with x-service-key', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ streams: [{ id: '123' }] }),
    });
    global.fetch = fetchMock;

    try {
      const app = buildApp({
        dbPath: ':memory:',
        startPoller: false,
        startCleanupCron: false,
        serviceApiKey: 'secret-key',
        streamerUrl: 'http://localhost:3002',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/streams?active=true',
        headers: {
          'x-service-key': 'secret-key',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ streams: [{ id: '123' }] });
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3002/streams?active=true',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-service-key': 'secret-key',
          }),
        })
      );

      await app.close();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
