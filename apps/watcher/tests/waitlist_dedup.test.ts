import { describe, it, expect } from 'vitest';
import { buildWatcherApp } from '../src/app';

describe('Watcher Waitlist Deduplication Hardening', () => {
  it('deduplicates across metadata sources by normalized title and prevents duplicate season entries for the same user', async () => {
    const app = buildWatcherApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });

    // 1. User adds anime with anilist source as episodic S1E1
    const res1 = await app.inject({
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
        metadataId: '177432',
        metadataSource: 'anilist',
        title: 'A Wild Last Boss Appeared!',
        seasonNumber: 1,
        targetEpisode: null,
      },
    });
    expect(resSameUserSeasonPack.statusCode).toBe(200);
    expect(resSameUserSeasonPack.json().entry.id).toBe(firstEntry.id);

    // 3. Same user tries to add with TMDB metadataId and source, but same normalized title
    const resSameUserTmdbSource = await app.inject({
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
    expect(resSameUserTmdbSource.statusCode).toBe(200);
    expect(resSameUserTmdbSource.json().entry.id).toBe(firstEntry.id);

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

    // 3. User tries to add from Anime tab as anime with same normalized title but anilist metadata
    const res3 = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'anime',
        metadataId: '172192',
        metadataSource: 'anilist',
        title: "A Returner's Magic Should Be Special",
        seasonNumber: 2,
        targetEpisode: 1,
      },
    });
    expect(res3.statusCode).toBe(200);
    expect(res3.json().entry.id).toBe(existingEntry.id);

    await app.close();
  });
});
