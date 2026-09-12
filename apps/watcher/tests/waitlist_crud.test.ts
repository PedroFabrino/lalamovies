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

  it('deduplicates active entries across users and manages co-requesters', async () => {
    const app = buildWatcherApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });

    // 1. Fresh add for movie by user-1 -> 201 Created
    const res1 = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'movie',
        metadataId: 'm-dup-1',
        metadataSource: 'tmdb',
        title: 'Duplicate Movie Test',
        year: 2026,
      },
    });
    expect(res1.statusCode).toBe(201);
    const movieEntry = res1.json().entry;
    expect(movieEntry.userId).toBe('user-1');
    expect(movieEntry.coRequesterCount).toBe(0);

    // 2. Duplicate add for same movie by SAME user (user-1) -> 200 OK (idempotent, coRequesterCount = 0)
    const resSameUser = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'movie',
        metadataId: 'm-dup-1',
        metadataSource: 'tmdb',
        title: 'Duplicate Movie Test',
        year: 2026,
      },
    });
    expect(resSameUser.statusCode).toBe(200);
    expect(resSameUser.json().entry.id).toBe(movieEntry.id);
    expect(resSameUser.json().entry.coRequesterCount).toBe(0);

    // 3. Duplicate add for same movie by NEW user (user-2) -> 200 OK (adds to co-requesters, coRequesterCount = 1)
    const resNewUser = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
      },
      payload: {
        mediaType: 'movie',
        metadataId: 'm-dup-1',
        metadataSource: 'tmdb',
        title: 'Duplicate Movie Test',
        year: 2026,
      },
    });
    expect(resNewUser.statusCode).toBe(200);
    expect(resNewUser.json().entry.id).toBe(movieEntry.id);
    expect(resNewUser.json().entry.coRequesterCount).toBe(1);

    // 4. User-2 sees the entry in their waitlist list (GET /waitlist)
    const listUser2 = await app.inject({
      method: 'GET',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
        'x-user-role': 'user',
      },
    });
    expect(listUser2.statusCode).toBe(200);
    const user2Entries = listUser2.json().entries;
    expect(user2Entries.some((e: any) => e.id === movieEntry.id)).toBe(true);
    expect(user2Entries.find((e: any) => e.id === movieEntry.id).coRequesterCount).toBe(1);

    // 5. User-2 can view entry details (GET /waitlist/:id)
    const getUser2 = await app.inject({
      method: 'GET',
      url: `/waitlist/${movieEntry.id}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
        'x-user-role': 'user',
      },
    });
    expect(getUser2.statusCode).toBe(200);
    expect(getUser2.json().entry.coRequesterCount).toBe(1);

    // 6. User-2 cancels their co-requester status (DELETE /waitlist/:id)
    const deleteCoReq = await app.inject({
      method: 'DELETE',
      url: `/waitlist/${movieEntry.id}`,
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
        'x-user-role': 'user',
      },
    });
    expect(deleteCoReq.statusCode).toBe(200);

    // Verify entry still exists and is not cancelled for user-1
    const listUser1 = await app.inject({
      method: 'GET',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
    });
    const entryAfterCoReqRemoval = listUser1.json().entries.find((e: any) => e.id === movieEntry.id);
    expect(entryAfterCoReqRemoval).toBeDefined();
    expect(entryAfterCoReqRemoval.status).not.toBe('cancelled');
    expect(entryAfterCoReqRemoval.coRequesterCount).toBe(0);

    await app.close();
  });

  it('respects season pack asymmetry when adding episodic waitlist entries', async () => {
    const app = buildWatcherApp({ dbPath: ':memory:', serviceApiKey: 'test-secret' });

    // 1. user-1 adds Season 1 pack (targetEpisode = null)
    const resS1Pack = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: 'tv-show-10',
        metadataSource: 'tmdb',
        title: 'Asymmetry Show',
        seasonNumber: 1,
        targetEpisode: null,
      },
    });
    expect(resS1Pack.statusCode).toBe(201);
    const s1PackId = resS1Pack.json().entry.id;

    // 2. user-2 adds S01E02 -> Season pack covers episode! Returns existing S1 pack and adds user-2 as co-requester
    const resS1E2 = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: 'tv-show-10',
        metadataSource: 'tmdb',
        title: 'Asymmetry Show',
        seasonNumber: 1,
        targetEpisode: 2,
      },
    });
    expect(resS1E2.statusCode).toBe(200);
    expect(resS1E2.json().entry.id).toBe(s1PackId);
    expect(resS1E2.json().entry.coRequesterCount).toBe(1);

    // 3. user-1 adds S02E01 (single episode)
    const resS2E1 = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: 'tv-show-10',
        metadataSource: 'tmdb',
        title: 'Asymmetry Show',
        seasonNumber: 2,
        targetEpisode: 1,
      },
    });
    expect(resS2E1.statusCode).toBe(201);
    const s2E1Id = resS2E1.json().entry.id;

    // 4. user-2 adds Season 2 pack -> Single episode does NOT cover season pack! Creates new S2 pack entry (201)
    const resS2Pack = await app.inject({
      method: 'POST',
      url: '/waitlist',
      headers: {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-2',
      },
      payload: {
        mediaType: 'tv_show',
        metadataId: 'tv-show-10',
        metadataSource: 'tmdb',
        title: 'Asymmetry Show',
        seasonNumber: 2,
        targetEpisode: null,
      },
    });
    expect(resS2Pack.statusCode).toBe(201);
    expect(resS2Pack.json().entry.id).not.toBe(s2E1Id);

    await app.close();
  });
});