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
});
