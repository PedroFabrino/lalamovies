import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildStreamerApp } from '../src/app';
import { ephemeralStreams } from '../src/db';
import { DirectDownloader } from '../src/services/httpDownloader';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';

describe('Stream Promotion to Permanent Storage (#53)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'streamer-promo-test-'));
  });

  it('DirectDownloader downloads file and handles resume byte range', async () => {
    const downloader = new DirectDownloader();
    const destDir = path.join(tmpDir, 'downloads');

    // Mock global fetch for downloading
    const originalFetch = global.fetch;
    const mockResponseBody = new Uint8Array([1, 2, 3, 4, 5]);

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      const headers = opts?.headers || {};
      if (headers['Range']) {
        return {
          ok: true,
          status: 206,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array([6, 7]));
              controller.close();
            },
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(mockResponseBody);
            controller.close();
          },
        }),
      };
    }) as any;

    try {
      const filePath = await downloader.downloadFile('https://debrid.example.com/test.mkv', destDir, 'test.mkv');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.statSync(filePath).size).toBe(5);

      // Now resume download with existing partial file
      const resumedPath = await downloader.downloadFile('https://debrid.example.com/test.mkv', destDir, 'test.mkv');
      expect(resumedPath).toBe(filePath);
      expect(fs.statSync(filePath).size).toBe(7);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('POST /streams/:id/promote handles validation errors', async () => {
    const mockDebrid = {
      checkCache: vi.fn(),
      addMagnet: vi.fn(),
      selectFiles: vi.fn(),
      getTorrentInfo: vi.fn(),
      getUnrestrictedLinks: vi.fn(),
      deleteTorrent: vi.fn(),
    };

    const mockJellyfin = {
      ensureStreamLibrary: vi.fn(),
      refreshStreamLibrary: vi.fn(),
      getActiveSessions: vi.fn(),
      findItemByPath: vi.fn(),
    };

    const app = buildStreamerApp({
      dbPath: ':memory:',
      serviceApiKey: 'streamer-key',
      debridService: mockDebrid as any,
      jellyfinService: mockJellyfin as any,
    });

    // 1. Stream not found
    const res404 = await app.inject({
      method: 'POST',
      url: '/streams/non-existent/promote',
      headers: {
        'x-service-key': 'streamer-key',
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
      },
      payload: {
        mediaType: 'movie',
        metadataId: '123',
        metadataSource: 'tmdb',
        title: 'Test Movie',
      },
    });
    expect(res404.statusCode).toBe(404);

    // Insert stream owned by user-1
    app.db
      .insert(ephemeralStreams)
      .values({
        id: 'stream-1',
        userId: 'user-1',
        debridTorrentId: 'rd-torrent-1',
        magnetLink: 'magnet:?xt=urn:btih:test',
        title: 'Test Movie',
        status: 'ready',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      })
      .run();

    // 2. Forbidden: regular user cannot promote someone else's stream
    const res403 = await app.inject({
      method: 'POST',
      url: '/streams/stream-1/promote',
      headers: {
        'x-service-key': 'streamer-key',
        'x-user-id': 'user-2',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'movie',
        metadataId: '123',
        metadataSource: 'tmdb',
        title: 'Test Movie',
      },
    });
    expect(res403.statusCode).toBe(403);

    // 3. Bad request: missing required metadata
    const res400 = await app.inject({
      method: 'POST',
      url: '/streams/stream-1/promote',
      headers: {
        'x-service-key': 'streamer-key',
        'x-user-id': 'user-1',
      },
      payload: {
        title: 'Test Movie',
      },
    });
    expect(res400.statusCode).toBe(400);

    await app.close();
  });

  it('POST /streams/:id/promote executes direct download and forwards to main API', async () => {
    const mockDebrid = {
      checkCache: vi.fn(),
      addMagnet: vi.fn(),
      selectFiles: vi.fn(),
      getTorrentInfo: vi.fn(),
      getUnrestrictedLinks: vi.fn().mockResolvedValue(['https://debrid.example.com/movie.mkv']),
      deleteTorrent: vi.fn(),
    };

    const mockJellyfin = {
      ensureStreamLibrary: vi.fn(),
      refreshStreamLibrary: vi.fn().mockResolvedValue(undefined),
      getActiveSessions: vi.fn(),
      findItemByPath: vi.fn(),
    };

    const downloadedFilePath = path.join(tmpDir, 'downloaded_movie.mkv');
    fs.writeFileSync(downloadedFilePath, 'fake video content');

    const mockDownloader = {
      downloadFile: vi.fn().mockResolvedValue(downloadedFilePath),
    };

    const originalFetch = global.fetch;
    const fetchSpy = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      if (url.includes('/api/requests/from-stream')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            requestId: 'promoted-req-123',
            jellyfinPath: '/media_data/movies/Test Movie (2024)/Test Movie (2024).mkv',
            status: 'completed',
          }),
        };
      }
      return { ok: false, status: 404, text: async () => 'Not found' };
    });
    global.fetch = fetchSpy as any;

    const app = buildStreamerApp({
      dbPath: ':memory:',
      serviceApiKey: 'streamer-key',
      mainApiUrl: 'http://main-api:3000',
      debridService: mockDebrid as any,
      jellyfinService: mockJellyfin as any,
      directDownloader: mockDownloader,
    });

    app.db
      .insert(ephemeralStreams)
      .values({
        id: 'stream-to-promote',
        userId: 'user-1',
        debridTorrentId: 'rd-torrent-99',
        magnetLink: 'magnet:?xt=urn:btih:stream99',
        title: 'Test Movie (2024)',
        status: 'ready',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      })
      .run();

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/streams/stream-to-promote/promote',
        headers: {
          'x-service-key': 'streamer-key',
          'x-user-id': 'user-1',
        },
        payload: {
          mediaType: 'movie',
          metadataId: 'tmdb-999',
          metadataSource: 'tmdb',
          title: 'Test Movie',
          year: 2024,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.status).toBe('promoted');
      expect(data.streamId).toBe('stream-to-promote');
      expect(data.requestId).toBe('promoted-req-123');

      // Check downloader was called with debrid url
      expect(mockDownloader.downloadFile).toHaveBeenCalledWith(
        'https://debrid.example.com/movie.mkv',
        expect.any(String)
      );

      // Check main API called
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://main-api:3000/api/requests/from-stream',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-service-key': 'streamer-key',
          }),
        })
      );

      // Check stream DB status updated to promoted
      const updatedStream = app.db
        .select()
        .from(ephemeralStreams)
        .where(eq(ephemeralStreams.id, 'stream-to-promote'))
        .get();
      expect(updatedStream?.status).toBe('promoted');

      // Check jellyfin stream library refresh triggered
      expect(mockJellyfin.refreshStreamLibrary).toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
      await app.close();
    }
  });
});
