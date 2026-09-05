import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DiscordNotifier,
  ResendNotifier,
  NotificationService,
  NotificationPayload,
} from '../src/services/notifications';

describe('DiscordNotifier & ResendNotifier (Ticket 15)', () => {
  const originalEnv = process.env;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DISCORD_WEBHOOK_URL;
    delete process.env.RESEND_API_KEY;
    delete process.env.JELLYFIN_URL;

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('DiscordNotifier', () => {
    it('sends download.completed event with correct fields, media type, requester, and jellyfin URL', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });

      const webhookUrl = 'https://discord.com/api/webhooks/test/123';
      const notifier = new DiscordNotifier(webhookUrl);

      const payload: NotificationPayload = {
        title: 'Inception',
        requestId: 'req_123',
        mediaType: 'movie',
        requestedBy: 'alice',
        path: '/media/movies/Inception (2010)/Inception.mkv',
        jellyfinUrl: 'http://localhost:8096',
      };

      await notifier.send('download.completed', payload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, options] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(webhookUrl);
      expect(options.method).toBe('POST');
      expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

      const parsedBody = JSON.parse(options.body);
      expect(parsedBody.embeds).toHaveLength(1);

      const embed = parsedBody.embeds[0];
      expect(embed.title).toBe('Download Completed');
      expect(embed.description).toContain('**Inception** has finished downloading');
      expect(embed.color).toBe(0x22c55e); // Green
      expect(embed.fields).toContainEqual({
        name: 'Media Type',
        value: 'MOVIE',
        inline: true,
      });
      expect(embed.fields).toContainEqual({
        name: 'Requested By',
        value: 'alice',
        inline: true,
      });
      expect(embed.fields).toContainEqual({
        name: 'Jellyfin',
        value: '[Open in Jellyfin](http://localhost:8096)',
        inline: false,
      });
      expect(embed.footer.text).toBe('Media Download Manager');
      expect(embed.timestamp).toBeDefined();
    });

    it('sends download.completed with movie year in title and field', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });

      const webhookUrl = 'https://discord.com/api/webhooks/test/123';
      const notifier = new DiscordNotifier(webhookUrl);

      const payload: NotificationPayload = {
        title: 'Inception',
        requestId: 'req_123',
        mediaType: 'movie',
        year: 2010,
        requestedBy: 'alice',
      };

      await notifier.send('download.completed', payload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const parsedBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const embed = parsedBody.embeds[0];

      expect(embed.description).toContain('**Inception (2010)** has finished downloading');
      expect(embed.fields).toContainEqual({
        name: 'Year',
        value: '2010',
        inline: true,
      });
    });

    it('sends download.completed with TV show season and episode in title and fields', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });

      const webhookUrl = 'https://discord.com/api/webhooks/test/123';
      const notifier = new DiscordNotifier(webhookUrl);

      const payload: NotificationPayload = {
        title: 'Breaking Bad',
        requestId: 'req_456',
        mediaType: 'tv_show',
        seasonNumber: 2,
        episodeNumber: 5,
        requestedBy: 'alice',
      };

      await notifier.send('download.completed', payload);

      const parsedBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const embed = parsedBody.embeds[0];

      expect(embed.description).toContain('**Breaking Bad - S02E05** has finished downloading');
      expect(embed.fields).toContainEqual({
        name: 'Season',
        value: '02',
        inline: true,
      });
      expect(embed.fields).toContainEqual({
        name: 'Episode',
        value: '05',
        inline: true,
      });
    });

    it('sends download.completed with TV show season pack in title and fields', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });

      const webhookUrl = 'https://discord.com/api/webhooks/test/123';
      const notifier = new DiscordNotifier(webhookUrl);

      const payload: NotificationPayload = {
        title: 'Attack on Titan',
        requestId: 'req_789',
        mediaType: 'anime',
        seasonNumber: 1,
        episodeNumber: null,
      };

      await notifier.send('download.completed', payload);

      const parsedBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const embed = parsedBody.embeds[0];

      expect(embed.description).toContain('**Attack on Titan - Season 01** has finished downloading');
      expect(embed.fields).toContainEqual({
        name: 'Season',
        value: '01',
        inline: true,
      });
      expect(embed.fields.some((f: any) => f.name === 'Episode')).toBe(false);
    });

    it('prioritizes JELLYFIN_PUBLIC_URL over JELLYFIN_URL', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });

      process.env.JELLYFIN_PUBLIC_URL = 'https://watch.lalamovies.stream';
      process.env.JELLYFIN_URL = 'http://jellyfin:8096';

      const notifier = new DiscordNotifier('https://discord.com/api/webhooks/test/123');

      await notifier.send('download.completed', {
        title: 'Test Movie',
        mediaType: 'movie',
      });

      const parsedBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const embed = parsedBody.embeds[0];

      expect(embed.fields).toContainEqual({
        name: 'Jellyfin',
        value: '[Open in Jellyfin](https://watch.lalamovies.stream)',
        inline: false,
      });
    });

    it('sends cleanup.scheduled event with scheduled time and keep flag notice', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });

      const notifier = new DiscordNotifier('https://discord.com/api/webhooks/test/123');
      const scheduledTime = '2026-09-05T12:00:00.000Z';

      await notifier.send('cleanup.scheduled', {
        title: 'Old Movie (1995)',
        requestId: 'req_999',
        scheduledDeleteAt: scheduledTime,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(fetchMock.mock.calls[0][1].body);
      const embed = parsed.embeds[0];

      expect(embed.title).toBe('Cleanup Warning (24h Notice)');
      expect(embed.color).toBe(0xf59e0b); // Orange
      expect(embed.fields).toContainEqual({
        name: 'Scheduled Deletion',
        value: scheduledTime,
        inline: true,
      });
      expect(embed.fields).toContainEqual(
        expect.objectContaining({
          name: 'Note',
          value: expect.stringContaining('Keep Flag'),
        })
      );
    });

    it('sends cleanup.done event with requester username', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
      });

      const notifier = new DiscordNotifier('https://discord.com/api/webhooks/test/123');

      await notifier.send('cleanup.done', {
        title: 'Old Movie (1995)',
        requestId: 'req_999',
        requestedBy: 'bob',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(fetchMock.mock.calls[0][1].body);
      const embed = parsed.embeds[0];

      expect(embed.title).toBe('Media Cleaned Up');
      expect(embed.color).toBe(0xef4444); // Red
      expect(embed.fields).toContainEqual({
        name: 'Requested By',
        value: 'bob',
        inline: true,
      });
    });

    it('gracefully swallows Discord 4xx HTTP responses and logs error without throwing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const notifier = new DiscordNotifier('https://discord.com/api/webhooks/test/123');

      // Should not throw!
      await expect(
        notifier.send('download.completed', { title: 'Test Media' })
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DiscordNotifier] Webhook returned status 400: Bad Request')
      );
    });

    it('gracefully swallows network/fetch exceptions and logs error without throwing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetchMock.mockRejectedValueOnce(new Error('DNS lookup failed'));

      const notifier = new DiscordNotifier('https://discord.com/api/webhooks/test/123');

      // Should not throw!
      await expect(
        notifier.send('download.completed', { title: 'Test Media' })
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DiscordNotifier] Failed to send webhook:',
        expect.any(Error)
      );
    });

    it('silently no-ops when webhook URL is not configured or empty', async () => {
      // 1. Missing everywhere
      const notifier1 = new DiscordNotifier();
      await expect(
        notifier1.send('download.completed', { title: 'Test Media' })
      ).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();

      // 2. Empty string
      const notifier2 = new DiscordNotifier('   ');
      await expect(
        notifier2.send('download.completed', { title: 'Test Media' })
      ).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();

      // 3. From env var when configured
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/env/456';
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });

      const notifier3 = new DiscordNotifier();
      await notifier3.send('download.completed', { title: 'Env Test' });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/env/456',
        expect.anything()
      );
    });
  });

  describe('ResendNotifier Stub', () => {
    it('logs clear message when RESEND_API_KEY is present', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const notifier = new ResendNotifier('re_test_key_123');
      await notifier.send('download.completed', { title: 'Movie 1' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ResendNotifier] download.completed: Movie 1 (email sending is not yet implemented)'
        )
      );
    });

    it('silently no-ops when RESEND_API_KEY is not configured', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const notifier = new ResendNotifier();
      await notifier.send('download.completed', { title: 'Movie 1' });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('NotificationService composite', () => {
    it('dispatches to both DiscordNotifier and ResendNotifier', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });

      const composite = new NotificationService(
        'https://discord.com/api/webhooks/comp/789',
        're_test_key'
      );

      await composite.send('download.completed', { title: 'Composite Test' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });
});
