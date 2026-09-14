import { describe, it, expect, vi } from 'vitest';
import { buildStreamerApp } from '../src/app';

describe('assertPublicTracker Middleware', () => {
  it('rejects releases marked as isPrivateTracker with HTTP 400', async () => {
    const app = buildStreamerApp({ dbPath: ':memory:', serviceApiKey: 'test-key' });

    const res = await app.inject({
      method: 'POST',
      url: '/streams',
      headers: {
        'x-service-key': 'test-key',
        'content-type': 'application/json',
      },
      payload: {
        isPrivateTracker: true,
        magnetLink: 'magnet:?xt=urn:btih:1234567890abcdef',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: 'Bad Request',
      message: 'Releases from private trackers cannot be streamed via cloud debrid',
    });

    await app.close();
  });

  it('rejects releases with private indexer name like BJ-Share with HTTP 400', async () => {
    const app = buildStreamerApp({ dbPath: ':memory:', serviceApiKey: 'test-key' });

    const res = await app.inject({
      method: 'POST',
      url: '/streams',
      headers: {
        'x-service-key': 'test-key',
        'content-type': 'application/json',
      },
      payload: {
        indexer: 'BJ-Share',
        magnetLink: 'magnet:?xt=urn:btih:1234567890abcdef',
        title: 'An Action Hero',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: 'Bad Request',
      message: 'Releases from private trackers cannot be streamed via cloud debrid',
    });

    await app.close();
  });

  it('rejects magnet links containing announce passkeys with HTTP 400', async () => {
    const app = buildStreamerApp({ dbPath: ':memory:', serviceApiKey: 'test-key' });

    const res = await app.inject({
      method: 'POST',
      url: '/streams',
      headers: {
        'x-service-key': 'test-key',
        'content-type': 'application/json',
      },
      payload: {
        isPrivateTracker: false,
        magnetLink: 'magnet:?xt=urn:btih:1234567890abcdef&tr=http://tracker.com/announce?passkey=secret123',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: 'Bad Request',
      message: 'Private tracker announce passkey detected. Streaming barred to prevent security leaks',
    });

    await app.close();
  });

  it('accepts public release without passkey', async () => {
    const mockDebrid = {
      checkCache: vi.fn(),
      addMagnet: vi.fn().mockResolvedValue('mock-id'),
      selectFiles: vi.fn().mockResolvedValue(undefined),
      getTorrentInfo: vi.fn().mockResolvedValue({ id: '1', status: 'downloaded', filename: 'f', progress: 100, links: [] }),
      getUnrestrictedLinks: vi.fn(),
      deleteTorrent: vi.fn(),
    };

    const app = buildStreamerApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-key',
      debridService: mockDebrid as any,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/streams',
      headers: {
        'x-service-key': 'test-key',
        'content-type': 'application/json',
      },
      payload: {
        isPrivateTracker: false,
        magnetLink: 'magnet:?xt=urn:btih:1234567890abcdef&tr=udp://tracker.opentrackr.org:1337/announce',
        title: 'Public Test Movie',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('pending');
    expect(res.json().streamId).toBeDefined();

    await app.close();
  });
});
