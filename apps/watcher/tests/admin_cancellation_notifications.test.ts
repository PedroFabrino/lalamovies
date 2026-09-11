import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildWatcherApp } from '../src/app';
import { watchRequests } from '../src/db/schema';
import {
  deleteDiscordMessage,
  sendWaitlistCancelNotification,
  ResendNotifier,
} from '../src/services/notifications';
import { FastifyInstance } from 'fastify';

describe('Admin Cancellation & Requester Notification (Ticket 10)', () => {
  const SERVICE_KEY = 'service-key-admin-test';
  let app: FastifyInstance;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    app = buildWatcherApp({
      dbPath: ':memory:',
      serviceApiKey: SERVICE_KEY,
    });
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.WAITLIST_DISCORD_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL;
    delete process.env.RESEND_API_KEY;
  });

  describe('sendWaitlistCancelNotification', () => {
    it('sends Discord cancel notification without exposing admin identity', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

      const ok = await sendWaitlistCancelNotification({
        title: 'Megalopolis',
        year: 2024,
        webhookUrl: 'https://discord.com/api/webhooks/123/abc',
      });

      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, req] = fetchMock.mock.calls[0];
      expect(url).toBe('https://discord.com/api/webhooks/123/abc');
      const body = JSON.parse(req.body);
      expect(body.content).toBe('Your Waitlist Entry for Megalopolis (2024) was cancelled by an admin.');
      expect(body.embeds[0].title).toBe('Waitlist Entry Cancelled');
      expect(body.embeds[0].description).toBe('Your Waitlist Entry for Megalopolis (2024) was cancelled by an admin.');
      // Ensure admin identity is NOT leaked in message
      expect(JSON.stringify(body)).not.toContain('admin-user-id');
    });

    it('invokes ResendNotifier when RESEND_API_KEY is present', async () => {
      process.env.RESEND_API_KEY = 're_test_98765';
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendWaitlistCancelNotification({
        title: 'Tron: Ares',
        year: 2025,
        recipientEmail: 'user@example.com',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ResendNotifier] waitlist.cancelled: Your Waitlist Entry for Tron: Ares (2025) was cancelled by an admin.')
      );
    });
  });

  describe('DELETE /waitlist/:id Cancellation Workflow', () => {
    it('sends Discord notification and deletes stored Discord message when cancelled by admin', async () => {
      process.env.WAITLIST_DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/cancel/webhook';
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      // Insert entry belonging to user-bob in notified state with discord message
      app.db.insert(watchRequests).values({
        id: 'entry-bob-1',
        userId: 'user-bob',
        mediaType: 'movie',
        metadataId: '500',
        metadataSource: 'tmdb',
        title: 'Gladiator II',
        year: 2024,
        status: 'notified',
        discordMessageId: 'discord-msg-999',
        requesterUsername: 'bob',
        requesterEmail: 'bob@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).run();

      // Admin cancels bob's entry
      const res = await app.inject({
        method: 'DELETE',
        url: '/waitlist/entry-bob-1',
        headers: {
          'x-service-key': SERVICE_KEY,
          'x-user-id': 'admin-alice',
          'x-user-role': 'admin',
        },
      });

      expect(res.statusCode).toBe(200);

      // Verify DB entry updated to cancelled with cancelledBy = admin-alice
      const entry = app.db.select().from(watchRequests).where(watchRequests.id === 'entry-bob-1' as any).get();
      expect(entry?.status).toBe('cancelled');
      expect(entry?.cancelledBy).toBe('admin-alice');

      // Verify Discord message deletion was called for discord-msg-999
      const deleteCall = fetchMock.mock.calls.find(([url, req]: any[]) =>
        url.includes('/messages/discord-msg-999') && req.method === 'DELETE'
      );
      expect(deleteCall).toBeDefined();

      // Verify Discord cancel notification was posted
      const postCall = fetchMock.mock.calls.find(([url, req]: any[]) =>
        url === 'https://discord.com/api/webhooks/cancel/webhook' && req.method === 'POST'
      );
      expect(postCall).toBeDefined();
      const cancelBody = JSON.parse(postCall[1].body);
      expect(cancelBody.content).toContain('Your Waitlist Entry for Gladiator II (2024) was cancelled by an admin.');
      expect(JSON.stringify(cancelBody)).not.toContain('admin-alice');
    });

    it('does NOT send admin cancel notification when user cancels their own entry', async () => {
      process.env.WAITLIST_DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/cancel/webhook';
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      app.db.insert(watchRequests).values({
        id: 'entry-self-1',
        userId: 'user-bob',
        mediaType: 'movie',
        metadataId: '501',
        metadataSource: 'tmdb',
        title: 'Superman',
        year: 2025,
        status: 'checking',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).run();

      // User bob cancels his own entry
      const res = await app.inject({
        method: 'DELETE',
        url: '/waitlist/entry-self-1',
        headers: {
          'x-service-key': SERVICE_KEY,
          'x-user-id': 'user-bob',
          'x-user-role': 'user',
        },
      });

      expect(res.statusCode).toBe(200);

      // Verify no notification post occurred
      const postCall = fetchMock.mock.calls.find(([url, req]: any[]) =>
        url === 'https://discord.com/api/webhooks/cancel/webhook' && req.method === 'POST'
      );
      expect(postCall).toBeUndefined();
    });
  });
});
