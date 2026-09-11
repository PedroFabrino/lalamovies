import { describe, it, expect } from 'vitest';
import { buildWatcherApp } from '../src/app';

describe('Watcher Waitlist CRUD & Authorization', () => {
  it('creates entry, lists, gets by id, and cancels', async () => {
    const app = buildWatcherApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });

    // 1. Service key check
    const unauthorizedRes = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'wrong-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'movie',
        metadataId: '12345',
        metadataSource: 'tmdb',
        title: 'Spider-Man',
      },
    });
    expect(unauthorizedRes.statusCode).toBe(401);

    // 2. Create entry as user-1
    const createRes = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'movie',
        metadataId: '12345',
        metadataSource: 'tmdb',
        title: 'Spider-Man',
        year: 2026,
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    expect(created.title).toBe('Spider-Man');
    expect(created.userId).toBe('user-1');
    expect(created.status).toBe('checking');
    const entryId = created.id;

    // 3. Create episodic entry as user-1
    await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: '67890',
        metadataSource: 'tmdb',
        title: 'Lioness',
        seasonNumber: 1,
      },
    });

    // 4. Create entry as user-2
    await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
        'x-user-role': 'user',
      },
      payload: {
        mediaType: 'movie',
        metadataId: '99999',
        metadataSource: 'tmdb',
        title: 'Dune 3',
      },
    });

    // 5. List entries as user-1 (sees only user-1 entries)
    const listUser1 = await app.inject({
      method: 'GET',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
    });
    expect(listUser1.statusCode).toBe(200);
    const user1Entries = listUser1.json().entries;
    expect(user1Entries.length).toBe(2);
    expect(user1Entries.every((e: any) => e.userId === 'user-1')).toBe(true);

    // 6. List entries as Admin (sees all entries)
    const listAdmin = await app.inject({
      method: 'GET',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
      },
    });
    expect(listAdmin.statusCode).toBe(200);
    expect(listAdmin.json().entries.length).toBe(3);

    // 7. User-2 tries to access User-1 entry -> 403
    const forbiddenGet = await app.inject({
      method: 'GET',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
        'x-user-role': 'user',
      },
    });
    expect(forbiddenGet.statusCode).toBe(403);

    // 8. User-2 tries to delete User-1 entry -> 403
    const forbiddenDelete = await app.inject({
      method: 'DELETE',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
        'x-user-role': 'user',
      },
    });
    expect(forbiddenDelete.statusCode).toBe(403);

    // 9. Admin deletes User-1 entry -> 200
    const adminDelete = await app.inject({
      method: 'DELETE',
      url: `/waitlist/${entryId}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
      },
    });
    expect(adminDelete.statusCode).toBe(200);
    expect(adminDelete.json().entry.status).toBe('cancelled');
    expect(adminDelete.json().entry.cancelledBy).toBe('admin-1');

    // 10. Check active episodic
    const activeEpisodic = await app.inject({
      method: 'GET',
      url: '/waitlist/active-episodic?userId=user-1',
      headers: {
        'x-service-key': 'test-secret',
      },
    });
    expect(activeEpisodic.statusCode).toBe(200);
    const activeEntries = activeEpisodic.json().entries;
    expect(activeEntries.length).toBe(1);
    expect(activeEntries[0].title).toBe('Lioness');

    await app.close();
  });
});