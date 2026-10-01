import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveDiscordWebhookUrl,
  NotificationContext,
} from '../src/services/notifications';
import {
  buildWatchPartyStartPayload,
  buildWatchPartyProgressionPayload,
  buildWatchPartyEndedPayload,
  WatchPartyNotificationContext,
} from '../src/services/watchPartyNotifications';

describe('Discord Channel Routing & Watch Party Payloads (#203)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DISCORD_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL_WATCH_PARTY;
    delete process.env.WAITLIST_DISCORD_WEBHOOK_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('resolveDiscordWebhookUrl', () => {
    it('returns overrideUrl if provided regardless of context', () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/main';
      const override = 'https://discord.com/api/webhooks/override';
      expect(resolveDiscordWebhookUrl('watch_party', override)).toBe(override);
      expect(resolveDiscordWebhookUrl('waitlist', override)).toBe(override);
      expect(resolveDiscordWebhookUrl('default', override)).toBe(override);
    });

    it('resolves dedicated watch_party webhook when set', () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/main';
      process.env.DISCORD_WEBHOOK_URL_WATCH_PARTY = 'https://discord.com/api/webhooks/party';

      expect(resolveDiscordWebhookUrl('watch_party')).toBe('https://discord.com/api/webhooks/party');
    });

    it('falls back to DISCORD_WEBHOOK_URL for watch_party when dedicated is empty or unset', () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/main';
      delete process.env.DISCORD_WEBHOOK_URL_WATCH_PARTY;

      expect(resolveDiscordWebhookUrl('watch_party')).toBe('https://discord.com/api/webhooks/main');

      process.env.DISCORD_WEBHOOK_URL_WATCH_PARTY = '   ';
      expect(resolveDiscordWebhookUrl('watch_party')).toBe('https://discord.com/api/webhooks/main');
    });

    it('resolves dedicated waitlist webhook when set', () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/main';
      process.env.WAITLIST_DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/waitlist';

      expect(resolveDiscordWebhookUrl('waitlist')).toBe('https://discord.com/api/webhooks/waitlist');
    });

    it('falls back to DISCORD_WEBHOOK_URL for waitlist when dedicated is empty or unset', () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/main';
      delete process.env.WAITLIST_DISCORD_WEBHOOK_URL;

      expect(resolveDiscordWebhookUrl('waitlist')).toBe('https://discord.com/api/webhooks/main');

      process.env.WAITLIST_DISCORD_WEBHOOK_URL = '';
      expect(resolveDiscordWebhookUrl('waitlist')).toBe('https://discord.com/api/webhooks/main');
    });

    it('resolves DISCORD_WEBHOOK_URL for default context', () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/main';
      expect(resolveDiscordWebhookUrl('default')).toBe('https://discord.com/api/webhooks/main');
    });

    it('returns undefined if no webhooks are configured', () => {
      expect(resolveDiscordWebhookUrl('watch_party')).toBeUndefined();
      expect(resolveDiscordWebhookUrl('waitlist')).toBeUndefined();
      expect(resolveDiscordWebhookUrl('default')).toBeUndefined();
    });
  });

  describe('Watch Party Payload Builders', () => {
    const baseContext: WatchPartyNotificationContext = {
      roomId: 'room-123',
      hostUsername: 'alice',
      title: 'Spirited Away',
      mediaType: 'movie',
      year: 2001,
      posterUrl: 'https://image.tmdb.org/t/p/w500/spirited.jpg',
      controlMode: 'everyone',
      appBaseUrl: 'http://localhost:5173',
    };

    it('builds watch party start payload with correct fields and embed', () => {
      const payload = buildWatchPartyStartPayload(baseContext);

      expect(payload.embeds).toHaveLength(1);
      const embed = payload.embeds[0];
      expect(embed.title).toContain('Watch Party Started');
      expect(embed.description).toContain('Spirited Away (2001)');
      expect(embed.description).toContain('alice');
      expect(embed.thumbnail?.url).toBe(baseContext.posterUrl);

      const fieldMap = Object.fromEntries(embed.fields?.map((f) => [f.name, f.value]) || []);
      expect(fieldMap['Host']).toBe('alice');
      expect(fieldMap['Control Mode']).toBe('Democratic (Everyone)');
      expect(fieldMap['Watch Party']).toContain('http://localhost:5173/party/room-123');
    });

    it('builds episodic series start payload with season and episode numbers', () => {
      const seriesContext: WatchPartyNotificationContext = {
        roomId: 'room-456',
        hostUsername: 'bob',
        title: 'Attack on Titan',
        mediaType: 'anime',
        seasonNumber: 1,
        episodeNumber: 1,
        controlMode: 'host_only',
        appBaseUrl: 'http://localhost:5173',
      };

      const payload = buildWatchPartyStartPayload(seriesContext);
      const embed = payload.embeds[0];
      expect(embed.description).toContain('Attack on Titan - S01E01');
      const fieldMap = Object.fromEntries(embed.fields?.map((f) => [f.name, f.value]) || []);
      expect(fieldMap['Control Mode']).toBe('Host Only');
    });

    it('builds timeline progression payloads with finished card update and new now-playing card', () => {
      const progression = buildWatchPartyProgressionPayload({
        ...baseContext,
        previousMedia: {
          title: 'Spirited Away',
          seasonNumber: null,
          episodeNumber: null,
          completedAt: '2026-10-01T20:00:00Z',
        },
        title: 'Princess Mononoke',
        year: 1997,
        posterUrl: 'https://image.tmdb.org/t/p/w500/mononoke.jpg',
      });

      // Updated original embed marking finished
      expect(progression.finishedCardUpdate.embeds).toHaveLength(1);
      const finishedEmbed = progression.finishedCardUpdate.embeds[0];
      expect(finishedEmbed.title).toContain('Spirited Away');
      expect(finishedEmbed.title).toContain('Finished');

      // Follow-up card for next media
      expect(progression.nowPlayingCard.embeds).toHaveLength(1);
      const nextEmbed = progression.nowPlayingCard.embeds[0];
      expect(nextEmbed.title).toContain('Now Playing: Princess Mononoke (1997)');
      expect(nextEmbed.thumbnail?.url).toBe('https://image.tmdb.org/t/p/w500/mononoke.jpg');
    });

    it('builds watch party ended payload with summary', () => {
      const payload = buildWatchPartyEndedPayload({
        ...baseContext,
        historyCount: 3,
      });

      expect(payload.embeds).toHaveLength(1);
      const embed = payload.embeds[0];
      expect(embed.title).toContain('Party Ended');
      expect(embed.description).toContain('alice');
      const fieldMap = Object.fromEntries(embed.fields?.map((f) => [f.name, f.value]) || []);
      expect(fieldMap['Total Titles Watched']).toBe('3');
    });
  });
});
