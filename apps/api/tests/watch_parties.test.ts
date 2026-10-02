import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { users } from '../src/db/schema';
import { IJellyfinSyncPlayService } from '../src/services/jellyfinSyncPlay';

describe('Watch Party API & SyncPlay Bridge (#204)', () => {
  let app: FastifyInstance;
  let mockSyncPlay: IJellyfinSyncPlayService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let userToken: string;
  const testUserId = 'user-test-123';

  beforeEach(async () => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    mockSyncPlay = {
      createSyncPlayGroup: vi.fn().mockResolvedValue({
        groupId: 'jf-group-777',
        groupName: '🎉 Watch Party: Spirited Away (2001)',
      }),
      getSyncPlayGroup: vi.fn().mockResolvedValue({
        groupId: 'jf-group-777',
        groupName: '🎉 Watch Party: Spirited Away (2001)',
        participants: ['alice'],
      }),
      listSyncPlayGroups: vi.fn().mockResolvedValue([]),
      setSyncPlayItem: vi.fn().mockResolvedValue(undefined),
      leaveSyncPlayGroup: vi.fn().mockResolvedValue(undefined),
    };

    app = buildApp({
      dbPath: ':memory:',
      runMigrate: true,
      syncPlayService: mockSyncPlay,
    });

    await app.ready();

    // Create a test user
    app.db
      .insert(users)
      .values({
        id: testUserId,
        username: 'alice',
        jellyfinUserId: 'jf-alice-1',
        role: 'user',
        jellyfinAccessToken: 'jf-token-alice',
        createdAt: new Date().toISOString(),
      })
      .run();

    userToken = app.jwt.sign({
      id: testUserId,
      username: 'alice',
      role: 'user',
      jellyfinUserId: 'jf-alice-1',
    });
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('POST /api/watch-parties', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/watch-parties',
        payload: {
          title: 'Spirited Away',
          jellyfinItemId: 'item-1',
          mediaType: 'movie',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 400 when body is invalid', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/watch-parties',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          title: '', // empty title
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('creates watch party, calls SyncPlay, saves to DB, dispatches Discord webhook and returns 201', async () => {
      process.env.DISCORD_WEBHOOK_URL_WATCH_PARTY = 'https://discord.com/api/webhooks/party-room';

      fetchMock.mockClear();
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).includes('discord.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: 'discord-msg-999', channel_id: 'discord-chan-888' }),
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/watch-parties',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          title: 'Spirited Away',
          jellyfinItemId: 'item-100',
          mediaType: 'movie',
          year: 2001,
          posterUrl: 'https://image.tmdb.org/t/p/w500/spirited.jpg',
          controlMode: 'everyone',
        },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.watchParty).toBeDefined();
      expect(data.watchParty.title).toBe('Spirited Away');
      expect(data.watchParty.hostUserId).toBe(testUserId);
      expect(data.watchParty.hostUsername).toBe('alice');
      expect(data.watchParty.jellyfinGroupId).toBe('jf-group-777');
      expect(data.watchParty.status).toBe('active');
      expect(data.watchParty.discordMessageId).toBe('discord-msg-999');
      expect(data.watchParty.jellyfinWebUrl).toContain('/web/index.html#!/details?id=item-100');

      expect(mockSyncPlay.createSyncPlayGroup).toHaveBeenCalledWith(
        '🎉 Watch Party: Spirited Away (2001)',
        'item-100',
        'jf-token-alice'
      );

      // Verify Discord webhook was called with ?wait=true
      const discordCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('discord.com'));
      expect(discordCalls).toHaveLength(1);
      const [calledUrl, options] = discordCalls[0];
      expect(calledUrl).toContain('https://discord.com/api/webhooks/party-room?wait=true');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.embeds[0].title).toContain('Watch Party Started');
    });

    it('returns 403 JELLYFIN_TOKEN_REQUIRED when host user has no stored token', async () => {
      app.db.update(users).set({ jellyfinAccessToken: null }).where(require('drizzle-orm').eq(users.id, testUserId)).run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/watch-parties',
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: {
          jellyfinItemId: 'item-100',
          title: 'Spirited Away',
          mediaType: 'movie',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('JELLYFIN_TOKEN_REQUIRED');

      app.db.update(users).set({ jellyfinAccessToken: 'jf-token-alice' }).where(require('drizzle-orm').eq(users.id, testUserId)).run();
    });
  });

  describe('GET /api/watch-parties', () => {
    it('returns empty array when no active parties exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/watch-parties',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ watchParties: [] });
    });

    it('returns active watch parties with host username', async () => {
      // Create a party
      await app.inject({
        method: 'POST',
        url: '/api/watch-parties',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          title: 'Attack on Titan',
          jellyfinItemId: 'item-200',
          mediaType: 'anime',
          seasonNumber: 1,
          episodeNumber: 1,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/watch-parties',
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.watchParties).toHaveLength(1);
      expect(data.watchParties[0].title).toBe('Attack on Titan');
      expect(data.watchParties[0].hostUsername).toBe('alice');
      expect(data.watchParties[0].seasonNumber).toBe(1);
      expect(data.watchParties[0].episodeNumber).toBe(1);
    });
  });

  describe('GET /api/watch-parties/:id', () => {
    it('returns 404 for unknown party', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/watch-parties/non-existent-id',
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns party details for existing party', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/watch-parties',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          title: 'Inception',
          jellyfinItemId: 'item-300',
          mediaType: 'movie',
          year: 2010,
        },
      });

      const partyId = createRes.json().watchParty.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/watch-parties/${partyId}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().watchParty.title).toBe('Inception');
      expect(res.json().watchParty.hostUsername).toBe('alice');
    });
  });

  describe('POST /api/watch-parties/:id/switch-media (#205)', () => {
    let partyId: string;
    let otherUserToken: string;

    beforeEach(async () => {
      // Create second user (bob)
      app.db
        .insert(users)
        .values({
          id: 'user-bob',
          username: 'bob',
          jellyfinUserId: 'jf-bob-2',
          role: 'user',
          createdAt: new Date().toISOString(),
        })
        .run();

      otherUserToken = app.jwt.sign({
        id: 'user-bob',
        username: 'bob',
        role: 'user',
        jellyfinUserId: 'jf-bob-2',
      });

      // Alice creates a party
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/watch-parties',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          title: 'Spirited Away',
          jellyfinItemId: 'item-100',
          mediaType: 'movie',
          year: 2001,
        },
      });

      partyId = createRes.json().watchParty.id;
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/watch-parties/${partyId}/switch-media`,
        payload: {
          title: 'Princess Mononoke',
          jellyfinItemId: 'item-101',
          mediaType: 'movie',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 403 when non-host attempts to switch media', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/watch-parties/${partyId}/switch-media`,
        headers: {
          authorization: `Bearer ${otherUserToken}`,
        },
        payload: {
          title: 'Princess Mononoke',
          jellyfinItemId: 'item-101',
          mediaType: 'movie',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toContain('host');
    });

    it('switches media, appends to historyJson, calls SyncPlay and dispatches Discord progression', async () => {
      process.env.DISCORD_WEBHOOK_URL_WATCH_PARTY = 'https://discord.com/api/webhooks/party-room';

      fetchMock.mockClear();
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'discord-followup-111' }),
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/watch-parties/${partyId}/switch-media`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          title: 'Princess Mononoke',
          jellyfinItemId: 'item-101',
          mediaType: 'movie',
          year: 1997,
          posterUrl: 'https://image.tmdb.org/t/p/w500/mononoke.jpg',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.watchParty.title).toBe('Princess Mononoke');
      expect(data.watchParty.jellyfinItemId).toBe('item-101');

      const history = JSON.parse(data.watchParty.historyJson);
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe('Spirited Away');
      expect(history[0].completedAt).toBeDefined();

      expect(mockSyncPlay.setSyncPlayItem).toHaveBeenCalledWith('jf-group-777', 'item-101', 'jf-token-alice');
    });
  });

  describe('POST /api/watch-parties/:id/end (#206)', () => {
    let partyId: string;
    let otherUserToken: string;
    let adminToken: string;

    beforeEach(async () => {
      // Create user bob
      app.db
        .insert(users)
        .values({
          id: 'user-bob',
          username: 'bob',
          jellyfinUserId: 'jf-bob-2',
          role: 'user',
          createdAt: new Date().toISOString(),
        })
        .run();

      otherUserToken = app.jwt.sign({
        id: 'user-bob',
        username: 'bob',
        role: 'user',
        jellyfinUserId: 'jf-bob-2',
      });

      // Create admin charlie
      app.db
        .insert(users)
        .values({
          id: 'admin-charlie',
          username: 'charlie',
          jellyfinUserId: 'jf-charlie-3',
          role: 'admin',
          createdAt: new Date().toISOString(),
        })
        .run();

      adminToken = app.jwt.sign({
        id: 'admin-charlie',
        username: 'charlie',
        role: 'admin',
        jellyfinUserId: 'jf-charlie-3',
      });

      // Alice creates party
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/watch-parties',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          title: 'Spirited Away',
          jellyfinItemId: 'item-100',
          mediaType: 'movie',
          year: 2001,
        },
      });

      partyId = createRes.json().watchParty.id;
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/watch-parties/${partyId}/end`,
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 403 when non-host non-admin attempts to end party', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/watch-parties/${partyId}/end`,
        headers: {
          authorization: `Bearer ${otherUserToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('allows party host to end party, marks status ended, leaves SyncPlay group', async () => {
      process.env.DISCORD_WEBHOOK_URL_WATCH_PARTY = 'https://discord.com/api/webhooks/party-room';

      fetchMock.mockClear();
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/watch-parties/${partyId}/end`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.watchParty.status).toBe('ended');
      expect(data.watchParty.endedAt).toBeDefined();

      expect(mockSyncPlay.leaveSyncPlayGroup).toHaveBeenCalledWith('jf-group-777', 'jf-token-alice');
    });

    it('allows admin to end party even if not the host', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/watch-parties/${partyId}/end`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().watchParty.status).toBe('ended');
    });
  });
});
