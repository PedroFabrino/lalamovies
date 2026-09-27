import { describe, it, expect } from 'vitest';
import { buildWatcherApp } from '../src/app';

describe('Watcher Waitlist Deduplication Hardening', () => {
  it('rejects waitlist submission when metadataSource is not tmdb', async () => {
    const app = buildWatcherApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });

    const res = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'anime',
        metadataId: '177432',
        metadataSource: 'anilist',
        title: 'A Wild Last Boss Appeared!',
        seasonNumber: 1,
        targetEpisode: 1,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('tmdb');

    await app.close();
  });

  it('deduplicates across metadata entries by normalized title and prevents duplicate season entries for the same user', async () => {
    const app = buildWatcherApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });

    // 1. User adds anime with TMDB source as episodic S1E1
    const res1 = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'anime',
        metadataId: 'tmdb-999888',
        metadataSource: 'tmdb',
        title: 'A Wild Last Boss Appeared!',
        seasonNumber: 1,
        targetEpisode: 1,
      },
    });
    expect(res1.statusCode).toBe(201);
    const firstEntry = res1.json().entry;

    // 2. Same user tries to add the same anime again as Season Pack (targetEpisode: null)
    const resSameUserSeasonPack = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'anime',
        metadataId: 'tmdb-999888',
        metadataSource: 'tmdb',
        title: 'A Wild Last Boss Appeared!',
        seasonNumber: 1,
        targetEpisode: null,
      },
    });
    expect(resSameUserSeasonPack.statusCode).toBe(200);
    expect(resSameUserSeasonPack.json().entry.id).toBe(firstEntry.id);

    // 3. Same user tries to add with different TMDB metadataId, but same normalized title
    const resSameUserDifferentId = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'anime',
        metadataId: 'tmdb-777666',
        metadataSource: 'tmdb',
        title: 'A Wild Last Boss Appeared!',
        seasonNumber: 1,
        targetEpisode: 1,
      },
    });
    expect(resSameUserDifferentId.statusCode).toBe(200);
    expect(resSameUserDifferentId.json().entry.id).toBe(firstEntry.id);

    await app.close();
  });

  it('deduplicates across mediaType series variants (tv_show vs anime) for same show and season', async () => {
    const app = buildWatcherApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });

    // 1. User adds show as tv_show from Discovery or Search
    const res1 = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '230050',
        metadataSource: 'tmdb',
        title: "A Returner's Magic Should Be Special",
        seasonNumber: 2,
        targetEpisode: 1,
      },
    });
    expect(res1.statusCode).toBe(201);
    const existingEntry = res1.json().entry;

    // 2. User tries to add from Anime tab as anime with the same TMDB ID
    const res2 = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'anime',
        metadataId: '230050',
        metadataSource: 'tmdb',
        title: "A Returner's Magic Should Be Special",
        seasonNumber: 2,
        targetEpisode: 1,
      },
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().entry.id).toBe(existingEntry.id);

    await app.close();
  });

  it('prevents duplicate active entry when user adds episode 1 while already tracking episode 2 of the same season', async () => {
    const app = buildWatcherApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });

    // 1. User has anime tracking Season 1 Episode 2
    const res1 = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'anime',
        metadataId: '313346',
        metadataSource: 'tmdb',
        title: 'The Laid-Off Cheat-Granting Mage Enjoys a Second Lease on Life',
        seasonNumber: 1,
        targetEpisode: 2,
      },
    });
    expect(res1.statusCode).toBe(201);
    const existingEntry = res1.json().entry;
    expect(existingEntry.targetEpisode).toBe(2);

    // 2. User tries to add Season 1 Episode 1 (e.g. from UI or re-request)
    const res2 = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'anime',
        metadataId: '313346',
        metadataSource: 'tmdb',
        title: 'The Laid-Off Cheat-Granting Mage Enjoys a Second Lease on Life',
        seasonNumber: 1,
        targetEpisode: 1,
      },
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().entry.id).toBe(existingEntry.id);

    // Verify only 1 row exists in waitlist for user
    const listRes = await app.inject({
      method: 'GET',
      url: '/waitlist?userId=user-1',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().entries).toHaveLength(1);

    await app.close();
  });
});
