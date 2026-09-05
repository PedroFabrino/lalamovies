import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { buildApp } from '../src/app';
import { IJellyfinService } from '../src/services/jellyfin';
import { IQBittorrentService } from '../src/services/qbittorrent';

class DummyJellyfin implements IJellyfinService {
  async authenticateUser(username: string) {
    return { accessToken: 't', userId: 'u', username, isAdmin: false };
  }
  async createUser() { return 'u'; }
  async deleteUser() {}
}

class DummyQB implements IQBittorrentService {
  async addTorrent() { return 'h'; }
  async getActiveTorrentCount() { return 0; }
  async getTorrentStatus() { return null; }
  async removeTorrent() {}
}

describe('WebSocket Progress Feed (/ws)', () => {
  let app: FastifyInstance;
  let port: number;
  let validToken: string;

  beforeEach(async () => {
    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new DummyJellyfin(),
      qbittorrentService: new DummyQB(),
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address() as any;
    port = address.port;

    validToken = app.jwt.sign({
      id: 'usr_1',
      username: 'ws_user',
      role: 'user',
      jellyfinUserId: 'jf_1',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects connection without token with code 4401', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const closeCode = await new Promise<number>((resolve) => {
      ws.on('close', (code) => resolve(code));
    });
    expect(closeCode).toBe(4401);
  });

  it('rejects connection with invalid token with code 4401', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=invalid_token`);
    const closeCode = await new Promise<number>((resolve) => {
      ws.on('close', (code) => resolve(code));
    });
    expect(closeCode).toBe(4401);
  });

  it('accepts connection with valid token in query param and receives broadcast messages', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${validToken}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', (err) => reject(err));
    });

    const messagePromise = new Promise<any>((resolve) => {
      ws.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    // Broadcast test message
    app.broadcast({
      type: 'progress',
      requestId: 'req_123',
      progress: 45,
      speedBps: 2048000,
      etaSeconds: 60,
    });

    const received = await messagePromise;
    expect(received).toEqual({
      type: 'progress',
      requestId: 'req_123',
      progress: 45,
      speedBps: 2048000,
      etaSeconds: 60,
    });

    ws.close();
  });

  it('accepts connection with valid token in Cookie header and receives status broadcast', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
      headers: {
        Cookie: `token=${validToken}`,
      },
    });

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', (err) => reject(err));
    });

    const messagePromise = new Promise<any>((resolve) => {
      ws.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    app.broadcast({
      type: 'status',
      requestId: 'req_456',
      status: 'seeding',
    });

    const received = await messagePromise;
    expect(received).toEqual({
      type: 'status',
      requestId: 'req_456',
      status: 'seeding',
    });

    ws.close();
  });

  it('rejects connection with forbidden origin', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${validToken}`, {
      headers: {
        Origin: 'https://malicious-site.example.com',
      },
    });

    const closeCode = await new Promise<number>((resolve) => {
      ws.on('close', (code) => resolve(code));
    });
    expect(closeCode).toBe(4403);
  });

  it('accepts connection from lalamovies.stream origin', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${validToken}`, {
      headers: {
        Origin: 'https://lalamovies.stream',
      },
    });

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', (err) => reject(err));
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('accepts connection from vercel.app origin', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${validToken}`, {
      headers: {
        Origin: 'https://preview-deploy.vercel.app',
      },
    });

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', (err) => reject(err));
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });
});