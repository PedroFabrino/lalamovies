import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../src/app';

describe('Waitlist Service Auth Middleware', () => {
  const originalEnvKey = process.env.SERVICE_API_KEY;

  afterEach(() => {
    if (originalEnvKey !== undefined) {
      process.env.SERVICE_API_KEY = originalEnvKey;
    } else {
      delete process.env.SERVICE_API_KEY;
    }
  });

  it('rejects /waitlist routes with 401 when SERVICE_API_KEY is not configured', async () => {
    delete process.env.SERVICE_API_KEY;
    const app = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
      serviceApiKey: undefined,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/waitlist',
      headers: {
        'x-service-key': 'some-key',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: 'Unauthorized',
      message: 'Invalid or missing X-Service-Key',
    });

    const subRes = await app.inject({
      method: 'GET',
      url: '/waitlist/any-id',
      headers: {
        'x-service-key': 'some-key',
      },
    });
    expect(subRes.statusCode).toBe(401);

    await app.close();
  });

  it('rejects requests missing or having invalid X-Service-Key header when configured', async () => {
    const app = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
      serviceApiKey: 'correct-secret-key',
    });

    // Missing header
    const noHeaderRes = await app.inject({
      method: 'GET',
      url: '/waitlist',
    });
    expect(noHeaderRes.statusCode).toBe(401);

    // Invalid header
    const wrongHeaderRes = await app.inject({
      method: 'GET',
      url: '/waitlist',
      headers: {
        'x-service-key': 'wrong-key',
      },
    });
    expect(wrongHeaderRes.statusCode).toBe(401);

    await app.close();
  });

  it('allows requests with matching X-Service-Key header', async () => {
    const app = buildApp({
      dbPath: ':memory:',
      startPoller: false,
      startCleanupCron: false,
      serviceApiKey: 'correct-secret-key',
    });

    const validRes = await app.inject({
      method: 'GET',
      url: '/waitlist',
      headers: {
        'x-service-key': 'correct-secret-key',
      },
    });
    expect(validRes.statusCode).toBe(200);

    const validSubRes = await app.inject({
      method: 'POST',
      url: '/waitlist/subpath',
      headers: {
        'x-service-key': 'correct-secret-key',
      },
    });
    expect(validSubRes.statusCode).toBe(200);

    await app.close();
  });
});
