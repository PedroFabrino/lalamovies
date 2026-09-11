import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildWatcherApp } from '../src/app';
import { watchRequests } from '../src/db/schema';
import {
  generateMagicLinkToken,
  verifyMagicLinkToken,
  deleteDiscordMessage,
  sendWaitlistNotification,
} from '../src/services/notifications';
import { FastifyInstance } from 'fastify';

describe('Grace-Window Notifications and Magic-Link Rejection (Ticket 05)', () => {
  const SECRET = 'test-magic-link-secret-12345';
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
    });
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('HMAC Magic Link Token Functions', () => {
    it('generates a valid token and successfully verifies it within grace window', () => {
      const entryId = 'entry-123';
      const notifyAt = new Date().toISOString();

      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);
      expect(token).toContain('.');

      const result = verifyMagicLinkToken(token, entryId, SECRET, 6);
      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
      expect(result.payload?.id).toBe(entryId);
      expect(result.payload?.notifyAt).toBe(notifyAt);
    });

    it('identifies token as expired when past grace window', () => {
      const entryId = 'entry-123';
      // 7 hours ago
      const notifyAt = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();

      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);
      const result = verifyMagicLinkToken(token, entryId, SECRET, 6);

      expect(result.valid).toBe(true);
      expect(result.expired).toBe(true);
      expect(result.payload?.id).toBe(entryId);
    });

    it('rejects tampered signature', () => {
      const entryId = 'entry-123';
      const notifyAt = new Date().toISOString();

      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);
      const [payload, sig] = token.split('.');
      const tamperedToken = `${payload}.${sig.slice(0, -2)}xx`;

      const result = verifyMagicLinkToken(tamperedToken, entryId, SECRET, 6);
      expect(result.valid).toBe(false);
    });

    it('rejects token when used for a different entry ID', () => {
      const entryId = 'entry-123';
      const notifyAt = new Date().toISOString();

      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);
      const result = verifyMagicLinkToken(token, 'other-entry-456', SECRET, 6);

      expect(result.valid).toBe(false);
    });

    it('rejects malformed token strings', () => {
      expect(verifyMagicLinkToken('', 'entry-123', SECRET).valid).toBe(false);
      expect(verifyMagicLinkToken('no-dot-token', 'entry-123', SECRET).valid).toBe(false);
      expect(verifyMagicLinkToken('a.b.c', 'entry-123', SECRET).valid).toBe(false);
    });
  });

  describe('Discord Webhook Notifications & Deletion', () => {
    it('sends waitlist notification with wait=true and returns discord message id', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'discord-msg-999' }),
      });

      const notifyAt = new Date().toISOString();
      const messageId = await sendWaitlistNotification({
        id: 'entry-123',
        title: 'Oppenheimer',
        year: 2023,
        mediaType: 'movie',
        releaseTitle: 'Oppenheimer.2023.1080p.BluRay.x264',
        score: 150,
        notifyAt,
        secret: SECRET,
        webhookUrl: 'https://discord.com/api/webhooks/test/channel',
        frontendUrl: 'https://lalamovies.stream',
        graceHours: 6,
        requesterMention: '<@111222>',
        adminRoleMention: '<@&333444>',
      });

      expect(messageId).toBe('discord-msg-999');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://discord.com/api/webhooks/test/channel?wait=true');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.content).toContain('<@111222>');
      expect(body.content).toContain('<@&333444>');
      expect(body.content).toContain('Oppenheimer (2023)');
      expect(body.embeds[0].title).toContain('Oppenheimer (2023)');
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({ name: 'Found Release', value: 'Oppenheimer.2023.1080p.BluRay.x264' })
      );
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({ name: 'Grace Period', value: '6 hours' })
      );
      expect(body.embeds[0].fields[3].value).toContain('/waitlist/entry-123/reject?token=');
    });

    it('deletes discord message via DELETE endpoint', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await deleteDiscordMessage(
        'discord-msg-999',
        'https://discord.com/api/webhooks/123/token'
      );
      expect(result).toBe(true);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://discord.com/api/webhooks/123/token/messages/discord-msg-999');
      expect(options.method).toBe('DELETE');
    });

    it('handles 404 on Discord message deletion gracefully (message already deleted)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await deleteDiscordMessage(
        'discord-msg-999',
        'https://discord.com/api/webhooks/123/token'
      );
      expect(result).toBe(true);
    });

    it('handles Discord deletion errors without throwing', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network offline'));

      const result = await deleteDiscordMessage(
        'discord-msg-999',
        'https://discord.com/api/webhooks/123/token'
      );
      expect(result).toBe(false);
    });
  });

  describe('GET /waitlist/:id/reject Endpoint', () => {
    it('returns 401 when token query param is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/waitlist/entry-123/reject',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().message).toContain('Missing rejection token');
    });

    it('returns 401 when token is invalid or tampered', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/waitlist/entry-123/reject?token=invalid.token.here',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().message).toContain('Invalid or tampered rejection token');
    });

    it('returns 410 when token is past the grace period', async () => {
      const entryId = 'entry-past-grace';
      // 8 hours ago
      const notifyAt = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);

      const res = await app.inject({
        method: 'GET',
        url: `/waitlist/${entryId}/reject?token=${encodeURIComponent(token)}`,
      });

      expect(res.statusCode).toBe(410);
      expect(res.json().message).toContain('expired');
    });

    it('resets entry to checking, clears release/notify fields, deletes discord message, and returns 200', async () => {
      const entryId = 'entry-notified-1';
      const notifyAt = new Date().toISOString();

      // Seed notified entry
      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-alice',
        mediaType: 'movie',
        metadataId: 'tmdb-101',
        metadataSource: 'tmdb',
        title: 'Dune: Part Two',
        year: 2024,
        seasonNumber: null,
        targetEpisode: null,
        triggeredCount: 0,
        status: 'notified',
        tmdbReleaseDate: '2024-03-01',
        prowlarrReleaseTitle: 'Dune.Part.Two.2024.1080p.WEB-DL',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:xyz',
        prowlarrReleaseScore: 120,
        discordMessageId: 'discord-msg-888',
        notifyAt,
        createdAt: notifyAt,
        updatedAt: notifyAt,
        cancelledAt: null,
        cancelledBy: null,
      }).run();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      process.env.WAITLIST_DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/url';
      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);

      const res = await app.inject({
        method: 'GET',
        url: `/waitlist/${entryId}/reject?token=${encodeURIComponent(token)}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.ok).toBe(true);
      expect(body.entry.status).toBe('checking');
      expect(body.entry.notifyAt).toBeNull();
      expect(body.entry.prowlarrReleaseTitle).toBeNull();
      expect(body.entry.prowlarrReleaseMagnet).toBeNull();
      expect(body.entry.prowlarrReleaseScore).toBeNull();
      expect(body.entry.discordMessageId).toBeNull();

      // Verify Discord DELETE was requested
      expect(fetchMock).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test/url/messages/discord-msg-888',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('does not block state reset if Discord message deletion fails', async () => {
      const entryId = 'entry-notified-2';
      const notifyAt = new Date().toISOString();

      app.db.insert(watchRequests).values({
        id: entryId,
        userId: 'user-bob',
        mediaType: 'movie',
        metadataId: 'tmdb-102',
        metadataSource: 'tmdb',
        title: 'Interstellar 2',
        year: 2026,
        seasonNumber: null,
        targetEpisode: null,
        triggeredCount: 0,
        status: 'notified',
        tmdbReleaseDate: '2026-01-01',
        prowlarrReleaseTitle: 'Interstellar.2.1080p',
        prowlarrReleaseMagnet: 'magnet:?xt=urn:btih:abc',
        prowlarrReleaseScore: 110,
        discordMessageId: 'discord-msg-fail',
        notifyAt,
        createdAt: notifyAt,
        updatedAt: notifyAt,
        cancelledAt: null,
        cancelledBy: null,
      }).run();

      // Discord returns 500 error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      process.env.WAITLIST_DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/url';
      const token = generateMagicLinkToken(entryId, notifyAt, SECRET);

      const res = await app.inject({
        method: 'GET',
        url: `/waitlist/${entryId}/reject?token=${encodeURIComponent(token)}`,
      });

      // Still succeeds with 200 and entry is reset
      expect(res.statusCode).toBe(200);
      const updated = res.json().entry;
      expect(updated.status).toBe('checking');
      expect(updated.notifyAt).toBeNull();
      expect(updated.discordMessageId).toBeNull();
    });
  });
});
