import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildWatcherApp } from '../src/app';
import { watchRequests } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { generateMagicLinkToken, sendWaitlistNotification } from '../src/services/notifications';
import { FastifyInstance } from 'fastify';

describe('Magic-Link and Web UI Approval & Notification Deduplication', () => {
  const SECRET = 'test-magic-link-secret-approve';
  let app: FastifyInstance;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    process.env.MAGIC_LINK_SECRET = SECRET;
    process.env.NOTIFY_GRACE_HOURS = '6';

    app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: 'service-key-xyz',
      tmdbApiKey: 'test-tmdb-key',
    });
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Discord Embed Action Links', () => {
    it('includes both Approve and Reject URLs in embed actions', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'discord-msg-approval' }),
      });

      const notifyAt = new Date().toISOString();
      const messageId = await sendWaitlistNotification({
        id: 'entry-lioness',
        title: 'Lioness',
        year: 2023,
        mediaType: 'tv_show',
        releaseTitle: 'Lioness 2023 S03E07 1080p',
        score: 180,
        notifyAt,
        secret: SECRET,
        webhookUrl: 'https://discord.com/api/webhooks/test/channel',
        frontendUrl: 'https://lalamovies.stream',
        graceHours: 6,
      });

      expect(messageId).toBe('discord-msg-approval');
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://discord.com/api/webhooks/test/channel?wait=true');

      const body = JSON.parse(options.body);
      const actionsField = body.embeds[0].fields.find((f: any) => f.name === 'Actions');
      expect(actionsField).toBeDefined();
      expect(actionsField.value).toContain('Approve & Download Now');
      expect(actionsField.value).toContain('/waitlist/entry-lioness/approve?token=');
      expect(actionsField.value).toContain('Reject Release');
      expect(actionsField.value).toContain('/waitlist/entry-lioness/reject?token=');
    });
  });

  describe('GET /waitlist/:id/approve Magic-Link Endpoint', () => {
    it('returns 401 when token is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/waitlist/entry-123/approve',
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().message).toContain('Missing approval token');
    });

    it('returns 401 when token is invalid or tampered', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/waitlist/entry-123/approve?token=bad.token',
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().message).toContain('Invalid or tampered');
    });

    it('returns 410 when token is expired past grace period', async () => {
      const entryId = 'entry-expired';
      const notifyAt = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);

      const res = await app.inject({
        method: 'GET',
        url: `/waitlist/${entryId}/approve?token=${encodeURIComponent(token)}`,
      });
      expect(res.statusCode).toBe(410);
      expect(res.json().message).toContain('expired');
    });

    it('submits entry immediately, deletes Discord message, and returns 200 JSON', async () => {
      const entryId = 'entry-approve-1';
      const notifyAt = new Date().toISOString();

      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-bob',
        mediaType: 'movie',
        metadataId: 'tmdb-500',
        metadataSource: 'tmdb',
        title: 'Civil War',
        year: 2024,
        status: 'notified',
        prowlarrReleaseTitle: 'Civil.War.2024.1080p',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:civilwar',
        prowlarrReleaseScore: 180,
        discordMessageId: 'discord-msg-to-delete',
        notifyAt,
        createdAt: notifyAt,
        updatedAt: notifyAt,
      }).run();

      // 1. fetchMock for Main API POST /requests -> returns 201
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'req-123', status: 'downloading' }),
      });

      // 2. fetchMock for Discord message DELETE -> returns 204
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      process.env.WAITLIST_DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/url';
      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);

      const res = await app.inject({
        method: 'GET',
        url: `/waitlist/${entryId}/approve?token=${encodeURIComponent(token)}`,
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.ok).toBe(true);
      expect(json.entry.status).toBe('triggered');
      expect(json.entry.discordMessageId).toBeNull();

      // Main API was called with magnetLink
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/requests'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('magnet:?xt=urn:btih:civilwar'),
        })
      );

      // Discord message was deleted
      expect(fetchMock).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test/url/messages/discord-msg-to-delete',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('renders stylish HTML confirmation page when browser accepts text/html', async () => {
      const entryId = 'entry-approve-html';
      const notifyAt = new Date().toISOString();

      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-bob',
        mediaType: 'movie',
        metadataId: 'tmdb-501',
        metadataSource: 'tmdb',
        title: 'Alien: Romulus',
        year: 2024,
        status: 'notified',
        prowlarrReleaseTitle: 'Alien.Romulus.2024.1080p',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:alien',
        prowlarrReleaseScore: 190,
        discordMessageId: null,
        notifyAt,
        createdAt: notifyAt,
        updatedAt: notifyAt,
      }).run();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
      });

      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);

      const res = await app.inject({
        method: 'GET',
        url: `/waitlist/${entryId}/approve?token=${encodeURIComponent(token)}`,
        headers: {
          accept: 'text/html,application/xhtml+xml',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain('Download Approved!');
      expect(res.body).toContain('Alien.Romulus.2024.1080p');
      expect(res.body).toContain('Return to Waitlist');
    });
  });

  describe('POST /waitlist/:id/approve Web UI Endpoint', () => {
    it('returns 400 when entry is not in notified status', async () => {
      const entryId = 'entry-not-notified';
      const now = new Date().toISOString();

      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-carol',
        mediaType: 'movie',
        metadataId: 'tmdb-600',
        metadataSource: 'tmdb',
        title: 'Gladiator II',
        status: 'checking',
        createdAt: now,
        updatedAt: now,
      }).run();

      const res = await app.inject({
        method: 'POST',
        url: `/waitlist/${entryId}/approve`,
        headers: {
          'x-service-key': 'service-key-xyz',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain("must be 'notified'");
    });

    it('approves notified entry immediately via POST and advances episodic series', async () => {
      const entryId = 'entry-tv-show';
      const now = new Date().toISOString();

      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-carol',
        mediaType: 'tv_show',
        metadataId: '113962',
        metadataSource: 'tmdb',
        title: 'Lioness',
        seasonNumber: 3,
        targetEpisode: 7,
        status: 'notified',
        prowlarrReleaseTitle: 'Lioness 2023 S03E07 1080p',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:lioness-s03e07',
        prowlarrReleaseScore: 180,
        discordMessageId: 'discord-msg-lioness',
        notifyAt: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      // Mock POST /requests (Main API)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
      });

      // Mock Discord delete
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      // Mock TMDB season for episodic tracking advance
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          episodes: [
            { episode_number: 7, air_date: '2026-09-12' },
            { episode_number: 8, air_date: '2026-09-19' },
          ],
        }),
      });

      // Mock TMDB show for next_episode_to_air
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          next_episode_to_air: {
            season_number: 3,
            episode_number: 8,
          },
        }),
      });

      const res = await app.inject({
        method: 'POST',
        url: `/waitlist/${entryId}/approve`,
        headers: {
          'x-service-key': 'service-key-xyz',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.ok).toBe(true);

      const entryInDb = app.db.select().from(watchRequests).where(eq(watchRequests.id, entryId)).get();
      // Since next episode 8 is future (2026-09-19), it advanced to episode 8 and became pending_release
      expect(entryInDb?.targetEpisode).toBe(8);
      expect(entryInDb?.status).toBe('pending_release');
      expect(entryInDb?.tmdbReleaseDate).toBe('2026-09-19');
    });
  });
});
