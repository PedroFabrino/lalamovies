import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { RequestStatus } from '../src/services/requestStateMachine';

describe('Internal Telegram Routes (/internal/telegram)', () => {
  let app: FastifyInstance;
  let mockJellyfin: MockJellyfinService;
  const SERVICE_KEY = 'secret-test-service-key';
  const CHAT_ID = '987654321';
  let userId: string;

  beforeEach(async () => {
    mockJellyfin = new MockJellyfinService();
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: mockJellyfin,
      serviceApiKey: SERVICE_KEY,
    });

    await app.ready();

    userId = 'user-test-alice';
    app.db.insert(users).values({
      id: userId,
      username: 'alice',
      jellyfinUserId: 'jf-alice-test',
      telegramChatId: CHAT_ID,
      createdAt: new Date().toISOString(),
    }).run();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  describe('Service Authentication Middleware', () => {
    it('returns 401 when x-service-key is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/internal/telegram/user/${CHAT_ID}/report`,
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({
        error: 'Unauthorized',
        message: 'Invalid or missing X-Service-Key',
      });
    });

    it('returns 401 when x-service-key is invalid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/internal/telegram/user/${CHAT_ID}/report`,
        headers: { 'x-service-key': 'wrong-key' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /internal/telegram/user/:chatId/report', () => {
    it('returns 404 when user is not paired', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/internal/telegram/user/unpaired-chat-id/report',
        headers: { 'x-service-key': SERVICE_KEY },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({
        error: 'Not Found',
        message: 'Usuário não vinculado',
      });
    });

    it('returns empty lists and null message id when user has no requests', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/internal/telegram/user/${CHAT_ID}/report`,
        headers: { 'x-service-key': SERVICE_KEY },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        telegramReportMessageId: null,
        active: [],
        completed: [],
        waitlist: [],
      });
    });

    it('aggregates active requests and recent completed requests (limit 3, sorted by downloadedAt desc)', async () => {
      // Create active requests
      app.requestsRepo.create({
        id: 'req-active-1',
        userId,
        title: 'Tougen Anki',
        mediaType: 'anime',
        status: RequestStatus.DOWNLOADING,
        magnetLink: 'magnet:?xt=urn:btih:111',
        seasonNumber: 1,
        episodeNumber: 3,
        metadataId: '100',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
      });

      app.requestsRepo.create({
        id: 'req-active-2',
        userId,
        title: 'Severance',
        mediaType: 'tv_show',
        status: RequestStatus.QUEUED,
        magnetLink: 'magnet:?xt=urn:btih:222',
        seasonNumber: 2,
        episodeNumber: 1,
        metadataId: '200',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
      });

      // Create 4 completed requests with different downloadedAt timestamps
      const dates = [
        '2026-10-01T10:00:00.000Z',
        '2026-10-02T10:00:00.000Z',
        '2026-10-03T10:00:00.000Z',
        '2026-10-04T10:00:00.000Z', // newest
      ];

      for (let i = 0; i < 4; i++) {
        app.requestsRepo.create({
          id: `req-done-${i}`,
          userId,
          title: `Movie ${i + 1}`,
          mediaType: 'movie',
          status: RequestStatus.DONE,
          magnetLink: `magnet:?xt=urn:btih:done${i}`,
          downloadedAt: dates[i],
          metadataId: `movie-${i}`,
          metadataSource: 'tmdb',
          requestedAt: new Date().toISOString(),
        });
      }

      // Mock watcher waitlist fetch
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (url: any) => {
        if (typeof url === 'string' && url.includes('/waitlist?userId=')) {
          return new Response(
            JSON.stringify({
              entries: [
                {
                  id: 'wl-1',
                  title: 'Solo Leveling S2',
                  mediaType: 'anime',
                  seasonNumber: 2,
                  targetEpisode: 1,
                  status: 'pending_release',
                },
                {
                  id: 'wl-2',
                  title: 'Old Archived Item',
                  mediaType: 'movie',
                  status: 'completed', // Should be excluded
                },
              ],
            }),
            { status: 200 }
          );
        }
        return origFetch(url);
      });

      // Set watcher URL on app
      (app as any).watcherUrl = 'http://watcher:8001';

      const res = await app.inject({
        method: 'GET',
        url: `/internal/telegram/user/${CHAT_ID}/report`,
        headers: { 'x-service-key': SERVICE_KEY },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      expect(data.active).toHaveLength(2);
      expect(data.active).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'req-active-1', title: 'Tougen Anki', status: 'downloading' }),
          expect.objectContaining({ id: 'req-active-2', title: 'Severance', status: 'queued' }),
        ])
      );

      // Completed is capped at 3, newest first
      expect(data.completed).toHaveLength(3);
      expect(data.completed[0].id).toBe('req-done-3');
      expect(data.completed[1].id).toBe('req-done-2');
      expect(data.completed[2].id).toBe('req-done-1');

      // Waitlist contains only active items
      expect(data.waitlist).toHaveLength(1);
      expect(data.waitlist[0].id).toBe('wl-1');
      expect(data.waitlist[0].title).toBe('Solo Leveling S2');
    });
  });

  describe('PUT /internal/telegram/user/:chatId/report-message-id', () => {
    it('returns 404 when user is not paired', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/internal/telegram/user/unknown-chat/report-message-id',
        headers: { 'x-service-key': SERVICE_KEY },
        payload: { messageId: 42 },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 on invalid payload', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/internal/telegram/user/${CHAT_ID}/report-message-id`,
        headers: { 'x-service-key': SERVICE_KEY },
        payload: { messageId: 'not-a-number' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('persists and updates telegramReportMessageId in database', async () => {
      const putRes = await app.inject({
        method: 'PUT',
        url: `/internal/telegram/user/${CHAT_ID}/report-message-id`,
        headers: { 'x-service-key': SERVICE_KEY },
        payload: { messageId: 777 },
      });
      expect(putRes.statusCode).toBe(200);
      expect(putRes.json()).toEqual({ ok: true, telegramReportMessageId: 777 });

      // Verify report returns the new messageId
      const getRes = await app.inject({
        method: 'GET',
        url: `/internal/telegram/user/${CHAT_ID}/report`,
        headers: { 'x-service-key': SERVICE_KEY },
      });
      expect(getRes.statusCode).toBe(200);
      expect(getRes.json().telegramReportMessageId).toBe(777);

      // Can reset to null
      const nullRes = await app.inject({
        method: 'PUT',
        url: `/internal/telegram/user/${CHAT_ID}/report-message-id`,
        headers: { 'x-service-key': SERVICE_KEY },
        payload: { messageId: null },
      });
      expect(nullRes.statusCode).toBe(200);
      expect(nullRes.json()).toEqual({ ok: true, telegramReportMessageId: null });
    });
  });

  describe('PATCH /internal/telegram/request/:requestId/snatch-message-id', () => {
    it('returns 404 when requestId is not found', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/internal/telegram/request/non-existent-id/snatch-message-id',
        headers: { 'x-service-key': SERVICE_KEY },
        payload: { messageId: 555 },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({
        error: 'Not Found',
        message: 'Download request not found',
      });
    });

    it('returns 400 on invalid payload', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/internal/telegram/request/some-id/snatch-message-id',
        headers: { 'x-service-key': SERVICE_KEY },
        payload: { messageId: 'invalid' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('persists telegramSnatchMessageId on download request', async () => {
      const req = app.requestsRepo.create({
        id: 'req-snatch-test',
        userId,
        title: 'Bleach',
        mediaType: 'anime',
        status: RequestStatus.QUEUED,
        magnetLink: 'magnet:?xt=urn:btih:333',
        metadataId: '300',
        metadataSource: 'tmdb',
        requestedAt: new Date().toISOString(),
      });
      expect(req.telegramSnatchMessageId).toBeNull();

      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/internal/telegram/request/${req.id}/snatch-message-id`,
        headers: { 'x-service-key': SERVICE_KEY },
        payload: { messageId: 1042 },
      });
      expect(patchRes.statusCode).toBe(200);
      expect(patchRes.json()).toEqual({
        ok: true,
        requestId: req.id,
        telegramSnatchMessageId: 1042,
      });

      const updated = app.requestsRepo.findById(req.id);
      expect(updated?.telegramSnatchMessageId).toBe(1042);
    });
  });
});
