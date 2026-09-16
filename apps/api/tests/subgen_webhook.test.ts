import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { downloadRequests, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { SubgenService } from '../src/services/subgen';

describe('Subgen Client Service & Completion Webhook (Subtask #101)', () => {
  let app: FastifyInstance;
  const mockBroadcast = vi.fn();
  const mockJellyfinRefresh = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    mockBroadcast.mockClear();
    mockJellyfinRefresh.mockClear();

    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      jellyfinService: {
        refreshLibrary: mockJellyfinRefresh,
      } as any,
    });
    await app.ready();
    vi.spyOn(app, 'broadcast').mockImplementation(mockBroadcast);

    app.db.insert(users).values({
      id: 'usr_subgen',
      username: 'subgen_user',
      jellyfinUserId: 'jf_subgen',
      role: 'trusted',
      createdAt: new Date().toISOString(),
    }).run();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('SubgenService', () => {
    it('dispatches HTTP POST request to /batch endpoint with encoded file path', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'OK',
      });

      const service = new SubgenService({
        subgenUrl: 'http://custom-subgen:9000',
        fetchFn: mockFetch as any,
      });

      const targetPath = '/media_data/media/private/Test Movie (2024)/Test Movie (2024).mkv';
      await service.triggerBatch(targetPath);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(`http://custom-subgen:9000/batch?directory=${encodeURIComponent(targetPath)}`);
      expect(options.method).toBe('POST');
    });

    it('throws error when Subgen returns non-200 HTTP status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'CUDA out of memory',
      });

      const service = new SubgenService({
        subgenUrl: 'http://custom-subgen:9000',
        fetchFn: mockFetch as any,
      });

      await expect(service.triggerBatch('/media/test.mkv')).rejects.toThrow(
        'Subgen request failed with status 500: CUDA out of memory'
      );
    });
  });

  describe('POST /internal/subgen/webhook', () => {
    it('returns 400 when file is missing in payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/internal/subgen/webhook',
        payload: { event: 'completed' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 200 with matched: false when file does not match any request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/internal/subgen/webhook',
        payload: {
          file: '/media_data/media/movies/Unrelated Movie/Unrelated.mkv',
          event: 'completed',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.matched).toBe(false);
    });

    it('updates request to completed, clears error, calls jellyfin refresh, and broadcasts event on completion', async () => {
      const jellyfinPath = '/media_data/media/private/Japanese Anime (2023)/Japanese Anime (2023).mkv';
      app.db.insert(downloadRequests).values({
        id: 'req_webhook_1',
        userId: 'usr_subgen',
        magnetLink: 'magnet:?xt=urn:btih:webhook1',
        mediaType: 'private',
        status: 'seeding',
        metadataId: 'wh_1',
        metadataSource: 'tmdb',
        title: 'Japanese Anime',
        jellyfinPath,
        transcriptionStatus: 'transcribing',
        transcriptionError: 'Old error',
        requestedAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/internal/subgen/webhook',
        payload: {
          file: jellyfinPath,
          subtitle: '/media_data/media/private/Japanese Anime (2023)/Japanese Anime (2023).en.srt',
          language: 'en',
          event: 'completed',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.matched).toBe(true);
      expect(body.status).toBe('completed');
      expect(body.requestId).toBe('req_webhook_1');

      // Assert DB state
      const updated = app.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, 'req_webhook_1'))
        .get();
      expect(updated?.transcriptionStatus).toBe('completed');
      expect(updated?.transcriptionError).toBeNull();

      // Assert Jellyfin refresh was called
      expect(mockJellyfinRefresh).toHaveBeenCalled();

      // Assert WebSocket broadcast was sent
      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transcription_updated',
          requestId: 'req_webhook_1',
          status: 'completed',
        })
      );
    });

    it('updates request to failed with diagnostic message when failure webhook arrives', async () => {
      const jellyfinPath = '/media_data/media/private/Failed Movie (2024)/Failed Movie (2024).mkv';
      app.db.insert(downloadRequests).values({
        id: 'req_webhook_fail',
        userId: 'usr_subgen',
        magnetLink: 'magnet:?xt=urn:btih:webhookfail',
        mediaType: 'private',
        status: 'seeding',
        metadataId: 'wh_2',
        metadataSource: 'tmdb',
        title: 'Failed Movie',
        jellyfinPath,
        transcriptionStatus: 'transcribing',
        requestedAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/internal/subgen/webhook',
        payload: {
          file: jellyfinPath,
          event: 'failed',
          error: 'Whisper process crashed with CUDA error',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('failed');

      const updated = app.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.id, 'req_webhook_fail'))
        .get();
      expect(updated?.transcriptionStatus).toBe('failed');
      expect(updated?.transcriptionError).toBe('Whisper process crashed with CUDA error');

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transcription_updated',
          requestId: 'req_webhook_fail',
          status: 'failed',
          error: 'Whisper process crashed with CUDA error',
        })
      );
    });
  });
});
