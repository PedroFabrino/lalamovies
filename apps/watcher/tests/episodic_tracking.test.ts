import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildWatcherApp } from '../src/app';
import { watchRequests } from '../src/db/schema';
import { EpisodicTrackingService } from '../src/services/episodicTracking';
import { AutoDownloadSubmitter } from '../src/jobs/autoDownloadSubmitter';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';

describe('Episodic Tracking & Next Target Advancement (Ticket 07)', () => {
  const TMDB_API_KEY = 'test-tmdb-key-999';
  let app: FastifyInstance;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    process.env.TMDB_API_KEY = TMDB_API_KEY;
    process.env.SERVICE_API_KEY = 'test-service-key';

    app = buildWatcherApp({
      dbPath: ':memory:',
      tmdbApiKey: TMDB_API_KEY,
      serviceApiKey: 'test-service-key',
    });
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('EpisodicTrackingService', () => {
    it('advances target_episode and resets to checking when next_episode_to_air is non-null and triggered_count < episode_count', async () => {
      const entryId = 'tv-entry-1';
      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-alice',
        mediaType: 'tv_show',
        metadataId: '1399', // Game of Thrones
        metadataSource: 'tmdb',
        title: 'Game of Thrones',
        year: 2011,
        seasonNumber: 1,
        targetEpisode: 1,
        triggeredCount: 0,
        status: 'notified',
        notifyAt: new Date().toISOString(),
        prowlarrReleaseTitle: 'Game.of.Thrones.S01E01.1080p',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:got01',
        prowlarrReleaseScore: 120,
        discordMessageId: 'msg-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).run();

      // Mock TMDB season 1 response (10 episodes)
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('/season/1')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              episodes: Array.from({ length: 10 }, (_, i) => ({ episode_number: i + 1 })),
            }),
          };
        }
        if (url.includes('/tv/1399')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              next_episode_to_air: {
                id: 9999,
                name: 'The Kingsroad',
                episode_number: 2,
                season_number: 1,
                air_date: '2011-04-24',
              },
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const service = new EpisodicTrackingService({
        db: app.db,
        tmdbApiKey: TMDB_API_KEY,
      });

      const updated = await service.advanceEntry(entryId, 1);
      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('checking');
      expect(updated?.targetEpisode).toBe(2);
      expect(updated?.triggeredCount).toBe(1);
      expect(updated?.notifyAt).toBeNull();
      expect(updated?.prowlarrReleaseTitle).toBeNull();
      expect(updated?.prowlarrReleaseMagnet).toBeNull();
      expect(updated?.prowlarrReleaseScore).toBeNull();
      expect(updated?.discordMessageId).toBeNull();
    });

    it('transitions to completed when next_episode_to_air is null (season ended)', async () => {
      const entryId = 'tv-entry-season-end';
      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-alice',
        mediaType: 'tv_show',
        metadataId: '1399',
        metadataSource: 'tmdb',
        title: 'Game of Thrones',
        year: 2011,
        seasonNumber: 1,
        targetEpisode: 10,
        triggeredCount: 9,
        status: 'notified',
        notifyAt: new Date().toISOString(),
        prowlarrReleaseTitle: 'Game.of.Thrones.S01E10.1080p',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:got10',
        prowlarrReleaseScore: 120,
        discordMessageId: 'msg-10',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).run();

      // Mock TMDB season: 10 episodes, but next_episode_to_air is null
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('/season/1')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              episodes: Array.from({ length: 10 }, (_, i) => ({ episode_number: i + 1 })),
            }),
          };
        }
        if (url.includes('/tv/1399')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              next_episode_to_air: null,
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const service = new EpisodicTrackingService({
        db: app.db,
        tmdbApiKey: TMDB_API_KEY,
      });

      const updated = await service.advanceEntry(entryId, 10);
      expect(updated?.status).toBe('completed');
      expect(updated?.triggeredCount).toBe(10);
      expect(updated?.notifyAt).toBeNull();
      expect(updated?.prowlarrReleaseTitle).toBeNull();
    });

    it('transitions to completed when triggered_count >= episode_count even if next_episode_to_air exists for next season', async () => {
      const entryId = 'tv-entry-all-triggered';
      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-bob',
        mediaType: 'anime',
        metadataId: '85937', // Demon Slayer
        metadataSource: 'tmdb',
        title: 'Demon Slayer',
        year: 2019,
        seasonNumber: 1,
        targetEpisode: 26,
        triggeredCount: 25,
        status: 'notified',
        notifyAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).run();

      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('/season/1')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              episodes: Array.from({ length: 26 }, (_, i) => ({ episode_number: i + 1 })),
            }),
          };
        }
        if (url.includes('/tv/85937')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              next_episode_to_air: {
                season_number: 2,
                episode_number: 1,
              },
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const service = new EpisodicTrackingService({
        db: app.db,
        tmdbApiKey: TMDB_API_KEY,
      });

      // 26 episodes triggered >= 26 total season episodes
      const updated = await service.advanceEntry(entryId, 26);
      expect(updated?.status).toBe('completed');
      expect(updated?.triggeredCount).toBe(26);
    });
  });

  describe('AutoDownloadSubmitter Integration with Episodic Tracking', () => {
    it('submits auto-download, deletes discord message, and advances next episode target to checking', async () => {
      const expiredNotifyAt = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
      const entryId = 'entry-auto-tv';

      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-alice',
        mediaType: 'tv_show',
        metadataId: '60625', // Rick and Morty
        metadataSource: 'tmdb',
        title: 'Rick and Morty',
        year: 2013,
        seasonNumber: 1,
        targetEpisode: 3,
        triggeredCount: 2,
        status: 'notified',
        notifyAt: expiredNotifyAt,
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:rickS01E03',
        discordMessageId: 'discord-msg-rick',
        createdAt: expiredNotifyAt,
        updatedAt: expiredNotifyAt,
      }).run();

      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        // Main API POST /requests
        if (url.includes('/requests') && init?.method === 'POST') {
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: 'req-123' }),
          };
        }
        // Discord DELETE
        if (url.includes('/messages/discord-msg-rick')) {
          return { ok: true, status: 204 };
        }
        // TMDB season
        if (url.includes('/season/1')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              episodes: Array.from({ length: 11 }, (_, i) => ({ episode_number: i + 1 })),
            }),
          };
        }
        // TMDB show
        if (url.includes('/tv/60625')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              next_episode_to_air: {
                episode_number: 4,
                season_number: 1,
              },
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const submitter = new AutoDownloadSubmitter({
        db: app.db,
        mainApiUrl: 'http://localhost:3000',
        serviceApiKey: 'test-service-key',
        tmdbApiKey: TMDB_API_KEY,
        graceHours: 6,
        webhookUrl: 'https://discord.com/api/webhooks/test/url',
      });

      const result = await submitter.submitOnce();
      expect(result.triggered).toBe(1);

      const updated = app.db.select().from(watchRequests).where(eq(watchRequests.id, entryId)).get();
      expect(updated?.status).toBe('checking');
      expect(updated?.targetEpisode).toBe(4);
      expect(updated?.triggeredCount).toBe(3);
      expect(updated?.discordMessageId).toBeNull();
      expect(updated?.notifyAt).toBeNull();
    });
  });

  describe('GET /waitlist/active-episodic Endpoint', () => {
    it('returns only active episodic entries (checking, notified, triggered) for the caller', async () => {
      app.db.insert(watchRequests).values([
        // Active tv show 1 -> checking
        {
          id: 'tv-1',
          userId: 'user-alice',
          mediaType: 'tv_show',
          metadataId: '100',
          metadataSource: 'tmdb',
          title: 'Active TV 1',
          status: 'checking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Active anime -> notified
        {
          id: 'anime-1',
          userId: 'user-alice',
          mediaType: 'anime',
          metadataId: '200',
          metadataSource: 'tmdb',
          title: 'Active Anime 1',
          status: 'notified',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Active tv show 2 -> triggered
        {
          id: 'tv-2',
          userId: 'user-alice',
          mediaType: 'tv_show',
          metadataId: '300',
          metadataSource: 'tmdb',
          title: 'Active TV 2',
          status: 'triggered',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Completed tv show -> NOT active
        {
          id: 'tv-completed',
          userId: 'user-alice',
          mediaType: 'tv_show',
          metadataId: '400',
          metadataSource: 'tmdb',
          title: 'Completed TV',
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Movie -> NOT episodic
        {
          id: 'movie-1',
          userId: 'user-alice',
          mediaType: 'movie',
          metadataId: '500',
          metadataSource: 'tmdb',
          title: 'Active Movie',
          status: 'checking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Other user entry -> NOT alice
        {
          id: 'tv-bob',
          userId: 'user-bob',
          mediaType: 'tv_show',
          metadataId: '600',
          metadataSource: 'tmdb',
          title: 'Bob TV',
          status: 'checking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]).run();

      const res = await app.inject({
        method: 'GET',
        url: '/waitlist/active-episodic?userId=user-alice',
        headers: {
          'x-service-key': 'test-service-key',
        },
      });

      expect(res.statusCode).toBe(200);
      const entries = res.json().entries;
      expect(entries.length).toBe(3);
      const titles = entries.map((e: any) => e.title);
      expect(titles).toContain('Active TV 1');
      expect(titles).toContain('Active Anime 1');
      expect(titles).toContain('Active TV 2');
      expect(titles).not.toContain('Completed TV');
      expect(titles).not.toContain('Active Movie');
      expect(titles).not.toContain('Bob TV');
    });
  });
});
