import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildWatcherApp } from '../src/app';
import { watchRequests } from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('POST /waitlist/:id/advance (#191)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('advances episodic series entry in place (targetEpisode N -> N+1)', async () => {
    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
      tmdbApiKey: 'tmdb-secret',
    });

    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'waitlist-series-1',
      userId: 'user-1',
      mediaType: 'anime',
      metadataId: '54321',
      metadataSource: 'tmdb',
      title: 'Trapped in a Dating Sim',
      seasonNumber: 2,
      targetEpisode: 2,
      status: 'checking',
      triggeredCount: 1,
      discordMessageId: 'disc-msg-456',
      createdAt: now,
      updatedAt: now,
    }).run();

    // Mock TMDB season & show responses
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/season/2')) {
        return {
          ok: true,
          json: async () => ({
            episodes: [
              { episode_number: 1, air_date: '2026-01-01' },
              { episode_number: 2, air_date: '2026-01-08' },
              { episode_number: 3, air_date: '2026-01-15' },
              { episode_number: 4, air_date: '2026-01-22' },
            ],
            episode_count: 4,
          }),
        } as any;
      }
      if (url.includes('/tv/54321')) {
        return {
          ok: true,
          json: async () => ({
            next_episode_to_air: { episode_number: 3 },
          }),
        } as any;
      }
      return { ok: false, status: 404 } as any;
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/waitlist-series-1/advance',
      headers: {
        'x-service-key': 'test-secret',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.entry.targetEpisode).toBe(3);
    expect(body.entry.discordMessageId).toBeNull();

    const inDb = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, 'waitlist-series-1'))
      .get()!;
    expect(inDb.targetEpisode).toBe(3);
    expect(inDb.discordMessageId).toBeNull();
  });

  it('marks movie entry as completed upon advance', async () => {
    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
    });

    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'waitlist-movie-1',
      userId: 'user-1',
      mediaType: 'movie',
      metadataId: '99999',
      metadataSource: 'tmdb',
      title: 'Inception 2',
      status: 'checking',
      discordMessageId: 'disc-msg-789',
      prowlarrReleaseTitle: 'Inception.2.1080p',
      createdAt: now,
      updatedAt: now,
    }).run();

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/waitlist-movie-1/advance',
      headers: {
        'x-service-key': 'test-secret',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.entry.status).toBe('completed');
    expect(body.entry.discordMessageId).toBeNull();

    const inDb = app.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, 'waitlist-movie-1'))
      .get()!;
    expect(inDb.status).toBe('completed');
    expect(inDb.discordMessageId).toBeNull();
  });

  it('returns 404 when advancing nonexistent entry', async () => {
    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/nonexistent-id/advance',
      headers: {
        'x-service-key': 'test-secret',
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it('marks series entry as completed when advancing the final episode of the season', async () => {
    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
      tmdbApiKey: 'tmdb-secret',
    });

    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'waitlist-series-finale',
      userId: 'user-1',
      mediaType: 'tv_show',
      metadataId: '54321',
      metadataSource: 'tmdb',
      title: 'Short Series',
      seasonNumber: 1,
      targetEpisode: 4,
      status: 'checking',
      triggeredCount: 3,
      discordMessageId: 'disc-msg-456',
      createdAt: now,
      updatedAt: now,
    }).run();

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/season/1')) {
        return {
          ok: true,
          json: async () => ({
            episodes: [
              { episode_number: 1, air_date: '2026-01-01' },
              { episode_number: 2, air_date: '2026-01-08' },
              { episode_number: 3, air_date: '2026-01-15' },
              { episode_number: 4, air_date: '2026-01-22' },
            ],
            episode_count: 4,
          }),
        } as any;
      }
      if (url.includes('/tv/54321')) {
        return {
          ok: true,
          json: async () => ({
            next_episode_to_air: null,
          }),
        } as any;
      }
      return { ok: false, status: 404 } as any;
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/waitlist-series-finale/advance',
      headers: {
        'x-service-key': 'test-secret',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.entry.status).toBe('completed');
    expect(body.entry.discordMessageId).toBeNull();
  });

  it('advances intermediate episode of concluded series where next_episode_to_air is null', async () => {
    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
      tmdbApiKey: 'tmdb-secret',
    });

    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'waitlist-series-intermediate',
      userId: 'user-1',
      mediaType: 'anime',
      metadataId: '54321',
      metadataSource: 'tmdb',
      title: 'Concluded Anime',
      seasonNumber: 1,
      targetEpisode: 1,
      status: 'checking',
      triggeredCount: 1,
      discordMessageId: 'disc-msg-456',
      createdAt: now,
      updatedAt: now,
    }).run();

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/season/1')) {
        return {
          ok: true,
          json: async () => ({
            episodes: [
              { episode_number: 1, air_date: '2024-01-01' },
              { episode_number: 2, air_date: '2024-01-08' },
              { episode_number: 3, air_date: '2024-01-15' },
            ],
            episode_count: 3,
          }),
        } as any;
      }
      if (url.includes('/tv/54321')) {
        return {
          ok: true,
          json: async () => ({
            next_episode_to_air: null,
          }),
        } as any;
      }
      return { ok: false, status: 404 } as any;
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/waitlist-series-intermediate/advance',
      headers: {
        'x-service-key': 'test-secret',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.entry.targetEpisode).toBe(2);
    expect(body.entry.status).toBe('checking');
  });

  it('falls back to episode_count when TMDB returns empty episodes: []', async () => {
    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
      tmdbApiKey: 'tmdb-secret',
    });

    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'waitlist-empty-episodes-arr',
      userId: 'user-1',
      mediaType: 'tv_show',
      metadataId: '77777',
      metadataSource: 'tmdb',
      title: 'Series With Empty Episodes',
      seasonNumber: 1,
      targetEpisode: 1,
      status: 'checking',
      triggeredCount: 1,
      createdAt: now,
      updatedAt: now,
    }).run();

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/season/1')) {
        return {
          ok: true,
          json: async () => ({
            episodes: [],
            episode_count: 8,
          }),
        } as any;
      }
      if (url.includes('/tv/77777')) {
        return {
          ok: true,
          json: async () => ({
            next_episode_to_air: null,
          }),
        } as any;
      }
      return { ok: false, status: 404 } as any;
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/waitlist-empty-episodes-arr/advance',
      headers: {
        'x-service-key': 'test-secret',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.entry.targetEpisode).toBe(2);
    expect(body.entry.status).toBe('checking');
  });

  it('does not complete ongoing show when TMDB only returns currently-aired episodes and next_episode_to_air exists', async () => {
    const app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'test-secret',
      tmdbApiKey: 'tmdb-secret',
    });

    const now = new Date().toISOString();
    app.db.insert(watchRequests).values({
      id: 'waitlist-ongoing-partial-episodes',
      userId: 'user-1',
      mediaType: 'tv_show',
      metadataId: '88888',
      metadataSource: 'tmdb',
      title: 'Ongoing Show',
      seasonNumber: 1,
      targetEpisode: 2,
      status: 'checking',
      triggeredCount: 2,
      createdAt: now,
      updatedAt: now,
    }).run();

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/season/1')) {
        return {
          ok: true,
          json: async () => ({
            episodes: [
              { episode_number: 1, air_date: '2024-01-01' },
              { episode_number: 2, air_date: '2024-01-08' },
            ],
            episode_count: 2,
          }),
        } as any;
      }
      if (url.includes('/tv/88888')) {
        return {
          ok: true,
          json: async () => ({
            next_episode_to_air: {
              season_number: 1,
              episode_number: 3,
            },
          }),
        } as any;
      }
      return { ok: false, status: 404 } as any;
    });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist/waitlist-ongoing-partial-episodes/advance',
      headers: {
        'x-service-key': 'test-secret',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.entry.targetEpisode).toBe(3);
    expect(body.entry.status).toBe('checking');
  });
});

