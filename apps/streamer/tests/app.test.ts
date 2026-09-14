import { describe, it, expect } from 'vitest';
import { buildStreamerApp } from '../src/app';

describe('Streamer Service Health & Auth', () => {
  it('GET /health returns { status: "ok" } with 200 without auth', async () => {
    const app = buildStreamerApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('rejects unauthenticated requests to /streams with 401', async () => {
    const app = buildStreamerApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });
    const response = await app.inject({
      method: 'GET',
      url: '/streams',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'Unauthorized',
      message: 'Invalid or missing X-Service-Key',
    });
    await app.close();
  });

  it('rejects invalid X-Service-Key with 401', async () => {
    const app = buildStreamerApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });
    const response = await app.inject({
      method: 'GET',
      url: '/streams',
      headers: {
        'x-service-key': 'wrong-key',
      },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('accepts valid X-Service-Key on /streams', async () => {
    const app = buildStreamerApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });
    const response = await app.inject({
      method: 'GET',
      url: '/streams',
      headers: {
        'x-service-key': 'test-secret',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ streams: [] });
    await app.close();
  });
});
