import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { TelegramPairingService } from '../src/services/telegramPairingService';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Telegram Pairing Integration', () => {
  let app: FastifyInstance;
  let mockJellyfin: MockJellyfinService;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    mockJellyfin = new MockJellyfinService();
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: mockJellyfin,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
      serviceApiKey: 'test-service-key',
    });

    await app.ready();

    // Log in as user to get token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });
    expect(loginRes.statusCode).toBe(200);
    const body = loginRes.json();
    userId = body.user.id;

    const cookieHeader = loginRes.headers['set-cookie'] as string;
    const match = cookieHeader.match(/token=([^;]+)/);
    authToken = match ? match[1] : '';
  });

  afterEach(async () => {
    await app.close();
  });

  describe('TelegramPairingService Unit', () => {
    it('generates 6-character code and consumes it', () => {
      const service = new TelegramPairingService(60000);
      const { code, expiresInSeconds } = service.generateCode('user-1');
      expect(code).toHaveLength(6);
      expect(expiresInSeconds).toBe(60);

      expect(service.verifyAndConsumeCode(code)).toBe('user-1');
      // Already consumed
      expect(service.verifyAndConsumeCode(code)).toBeNull();
    });

    it('expires codes past TTL', () => {
      const service = new TelegramPairingService(-1000); // already expired
      const { code } = service.generateCode('user-2');
      expect(service.verifyAndConsumeCode(code)).toBeNull();
    });

    it('creates and consumes auth sessions', () => {
      const service = new TelegramPairingService(60000, 900000);
      const { token, expiresInSeconds } = service.createAuthSession('chat-123');
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(10);
      expect(expiresInSeconds).toBe(900);

      expect(service.peekAuthSession(token)).toBe('chat-123');
      expect(service.consumeAuthSession(token)).toBe('chat-123');
      // Once consumed, cannot be reused
      expect(service.consumeAuthSession(token)).toBeNull();
    });

    it('expires auth sessions past TTL', () => {
      const service = new TelegramPairingService(60000, -1000); // expired session
      const { token } = service.createAuthSession('chat-expired');
      expect(service.consumeAuthSession(token)).toBeNull();
    });
  });

  describe('API Endpoints', () => {
    it('requires authentication for POST /auth/telegram-pairing/code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/code',
      });
      expect(res.statusCode).toBe(401);
    });

    it('generates a pairing code for authenticated user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/code',
        headers: {
          cookie: `token=${authToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.code).toBeDefined();
      expect(data.code).toHaveLength(6);
      expect(data.expiresInSeconds).toBe(600);
    });

    it('successfully pairs via POST /internal/telegram/pair', async () => {
      const codeRes = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/code',
        headers: {
          cookie: `token=${authToken}`,
        },
      });
      const { code } = codeRes.json();

      // Pair via internal endpoint
      const pairRes = await app.inject({
        method: 'POST',
        url: '/internal/telegram/pair',
        payload: {
          code,
          chatId: '123456789',
        },
      });

      expect(pairRes.statusCode).toBe(200);
      const pairData = pairRes.json();
      expect(pairData.ok).toBe(true);
      expect(pairData.user.id).toBe(userId);
      expect(pairData.user.username).toBe('alice');

      // Verify user lookup
      const userRes = await app.inject({
        method: 'GET',
        url: '/internal/telegram/user/123456789',
      });
      expect(userRes.statusCode).toBe(200);
      expect(userRes.json().user.id).toBe(userId);
      expect(userRes.json().user.username).toBe('alice');

      // Verify GET /auth/me reflects telegramChatId
      const meRes = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          cookie: `token=${authToken}`,
        },
      });
      expect(meRes.statusCode).toBe(200);
      expect(meRes.json().user.telegramChatId).toBe('123456789');
    });

    it('rejects invalid or expired code in POST /internal/telegram/pair', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/internal/telegram/pair',
        payload: {
          code: 'INVALID',
          chatId: '123456789',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('inválido ou expirado');
    });

    it('updates and clears personal Gemini API key', async () => {
      // Pair user first
      const codeRes = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/code',
        headers: { cookie: `token=${authToken}` },
      });
      await app.inject({
        method: 'POST',
        url: '/internal/telegram/pair',
        payload: { code: codeRes.json().code, chatId: '987654321' },
      });

      // Update Gemini key
      const updateRes = await app.inject({
        method: 'PUT',
        url: '/users/me/gemini-api-key',
        headers: { cookie: `token=${authToken}` },
        payload: { apiKey: 'AIzaSyTestKey123456' },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json().hasPersonalGeminiKey).toBe(true);

      // Verify reflected on internal endpoint
      const userRes = await app.inject({
        method: 'GET',
        url: '/internal/telegram/user/987654321',
      });
      expect(userRes.statusCode).toBe(200);
      expect(userRes.json().user.personalGeminiApiKey).toBe('AIzaSyTestKey123456');

      // Clear Gemini key
      const clearRes = await app.inject({
        method: 'PUT',
        url: '/users/me/gemini-api-key',
        headers: { cookie: `token=${authToken}` },
        payload: { apiKey: '' },
      });
      expect(clearRes.statusCode).toBe(200);
      expect(clearRes.json().hasPersonalGeminiKey).toBe(false);

      const userAfterRes = await app.inject({
        method: 'GET',
        url: '/internal/telegram/user/987654321',
      });
      expect(userAfterRes.json().user.personalGeminiApiKey).toBeNull();
    });

    it('unlinks telegram pairing via DELETE /auth/telegram-pairing', async () => {
      const codeRes = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/code',
        headers: { cookie: `token=${authToken}` },
      });
      await app.inject({
        method: 'POST',
        url: '/internal/telegram/pair',
        payload: { code: codeRes.json().code, chatId: '555666777' },
      });

      const delRes = await app.inject({
        method: 'DELETE',
        url: '/auth/telegram-pairing',
        headers: { cookie: `token=${authToken}` },
      });
      expect(delRes.statusCode).toBe(200);

      const userRes = await app.inject({
        method: 'GET',
        url: '/internal/telegram/user/555666777',
      });
      expect(userRes.statusCode).toBe(404);
    });

    it('returns telegram config including globalGeminiApiKey feature status', async () => {
      const configRes = await app.inject({
        method: 'GET',
        url: '/internal/telegram/config',
      });
      expect(configRes.statusCode).toBe(200);
      expect(typeof configRes.json().globalGeminiApiKey).toBe('boolean');
    });

    it('allows updating personal gemini key via PUT /internal/telegram/user/:chatId/gemini-api-key', async () => {
      const codeRes = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/code',
        headers: { cookie: `token=${authToken}` },
      });
      await app.inject({
        method: 'POST',
        url: '/internal/telegram/pair',
        payload: { code: codeRes.json().code, chatId: '444333222' },
      });

      const setKeyRes = await app.inject({
        method: 'PUT',
        url: '/internal/telegram/user/444333222/gemini-api-key',
        payload: { apiKey: 'AIzaSyBotTest' },
      });
      expect(setKeyRes.statusCode).toBe(200);
      expect(setKeyRes.json().hasKey).toBe(true);

      const userRes = await app.inject({
        method: 'GET',
        url: '/internal/telegram/user/444333222',
      });
      expect(userRes.json().user.personalGeminiApiKey).toBe('AIzaSyBotTest');

      // Clear key
      const clearRes = await app.inject({
        method: 'PUT',
        url: '/internal/telegram/user/444333222/gemini-api-key',
        payload: { apiKey: '' },
      });
      expect(clearRes.statusCode).toBe(200);
      expect(clearRes.json().hasKey).toBe(false);

      const userAfterRes = await app.inject({
        method: 'GET',
        url: '/internal/telegram/user/444333222',
      });
      expect(userAfterRes.json().user.personalGeminiApiKey).toBeNull();
    });

    it('creates an auth session via POST /internal/telegram/auth-session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/internal/telegram/auth-session',
        headers: { 'x-service-key': 'test-service-key' },
        payload: { chatId: '888999111' },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.ok).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.url).toContain('/telegram-auth?token=');
      expect(data.url).toContain(data.token);
      expect(data.expiresInSeconds).toBe(900);
    });

    it('requires authentication for POST /auth/telegram-pairing/claim', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/claim',
        payload: { token: 'any-token' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects invalid or expired token on POST /auth/telegram-pairing/claim', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/claim',
        headers: { cookie: `token=${authToken}` },
        payload: { token: 'invalid-nonexistent-token' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('inválida ou expirada');
    });

    it('successfully claims auth session and binds telegramChatId to user', async () => {
      // 1. Create auth session
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/internal/telegram/auth-session',
        headers: { 'x-service-key': 'test-service-key' },
        payload: { chatId: '777888999' },
      });
      expect(sessionRes.statusCode).toBe(200);
      const { token } = sessionRes.json();

      // 2. Claim session with authenticated user
      const claimRes = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/claim',
        headers: { cookie: `token=${authToken}` },
        payload: { token },
      });

      expect(claimRes.statusCode).toBe(200);
      const claimData = claimRes.json();
      expect(claimData.ok).toBe(true);
      expect(claimData.user.id).toBe(userId);
      expect(claimData.chatId).toBe('777888999');

      // 3. Verify user lookup via telegram chatId
      const userRes = await app.inject({
        method: 'GET',
        url: '/internal/telegram/user/777888999',
      });
      expect(userRes.statusCode).toBe(200);
      expect(userRes.json().user.id).toBe(userId);
      expect(userRes.json().user.telegramChatId).toBe('777888999');

      // 4. Token cannot be claimed a second time
      const secondClaimRes = await app.inject({
        method: 'POST',
        url: '/auth/telegram-pairing/claim',
        headers: { cookie: `token=${authToken}` },
        payload: { token },
      });
      expect(secondClaimRes.statusCode).toBe(400);
    });
  });
});
