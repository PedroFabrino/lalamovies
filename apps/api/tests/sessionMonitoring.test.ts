import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { users } from '../src/db/schema';
import {
  ISessionMonitoringService,
  PlaybackSession,
  SessionMonitoringService,
} from '../src/services/sessionMonitoringService';
import { MockJellyfinService } from './fixtures/mockJellyfin';
import { MockQBittorrentService } from './fixtures/mockQBittorrent';

class FakeSessionMonitoringService implements ISessionMonitoringService {
  public sessions: PlaybackSession[] = [];
  public stopCalls: Array<{ sessionId: string; message?: string }> = [];

  async getSessions(): Promise<PlaybackSession[]> {
    return this.sessions;
  }

  async stopSession(sessionId: string, message?: string): Promise<void> {
    this.stopCalls.push({ sessionId, message });
  }
}

describe('SessionMonitoringService (Unit)', () => {
  it('maps DirectPlay, DirectStream, and Transcode sessions correctly', async () => {
    const rawSessions = [
      {
        Id: 'sess-1',
        UserName: 'Alexandre',
        Client: 'Jellyfin for WebOS',
        DeviceName: 'LG Smart TV',
        NowPlayingItem: {
          Id: 'item-1',
          Name: 'Hunger Games',
          Type: 'Movie',
          RunTimeTicks: 70000000000,
        },
        PlayState: {
          PositionTicks: 50000000000,
          IsPaused: false,
          PlayMethod: 'DirectPlay',
        },
      },
      {
        Id: 'sess-2',
        UserName: 'Bob',
        Client: 'Jellyfin Web',
        DeviceName: 'Chrome',
        NowPlayingItem: {
          Id: 'item-2',
          Name: 'Anime Episode 1',
          SeriesName: 'Frieren',
          IndexNumber: 1,
          ParentIndexNumber: 1,
          Type: 'Episode',
        },
        PlayState: {
          PositionTicks: 1000000000,
          IsPaused: true,
          PlayMethod: 'Transcode',
        },
        TranscodingInfo: {
          AudioCodec: 'aac',
          VideoCodec: 'h264',
          Bitrate: 8000000,
          HardwareAccelerationType: 'nvenc',
          TranscodeReasons: ['ContainerBitrateExceedsLimit'],
          IsVideoDirect: false,
          IsAudioDirect: true,
        },
      },
      {
        Id: 'sess-idle',
        UserName: 'IdleUser',
        Client: 'Android',
        DeviceName: 'Pixel',
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => rawSessions,
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new SessionMonitoringService('http://mock-jellyfin:8096', 'mock-key');
    const sessions = await service.getSessions();

    expect(sessions).toHaveLength(2);

    expect(sessions[0].id).toBe('sess-1');
    expect(sessions[0].userName).toBe('Alexandre');
    expect(sessions[0].playMethod).toBe('DirectPlay');
    expect(sessions[0].isHardwareAccelerated).toBe(false);

    expect(sessions[1].id).toBe('sess-2');
    expect(sessions[1].userName).toBe('Bob');
    expect(sessions[1].playMethod).toBe('Transcode');
    expect(sessions[1].isHardwareAccelerated).toBe(true);
    expect(sessions[1].bandwidthBps).toBe(8000000);
    expect(sessions[1].nowPlayingItem?.seriesName).toBe('Frieren');

    vi.unstubAllGlobals();
  });

  it('handles fetch failure gracefully by returning empty array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const service = new SessionMonitoringService('http://mock-jellyfin:8096', 'mock-key');
    const sessions = await service.getSessions();
    expect(sessions).toEqual([]);
    vi.unstubAllGlobals();
  });

  it('stopSession broadcasts message if provided, then stops playback', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new SessionMonitoringService('http://mock-jellyfin:8096', 'mock-key');
    await service.stopSession('sess-1', 'Server maintenance in 5 minutes');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/Sessions/sess-1/Message');
    expect(fetchMock.mock.calls[1][0]).toContain('/Sessions/sess-1/Playing/Stop');

    vi.unstubAllGlobals();
  });
});

describe('Admin Activity Routes (GET /admin/activity & POST /admin/activity/sessions/:id/stop)', () => {
  let app: FastifyInstance;
  let fakeMonitoring: FakeSessionMonitoringService;
  let adminCookie: string;
  let regularUserCookie: string;

  beforeEach(async () => {
    fakeMonitoring = new FakeSessionMonitoringService();
    fakeMonitoring.sessions = [
      {
        id: 's-123',
        userName: 'Alexandre',
        client: 'Jellyfin Web',
        deviceName: 'Chrome',
        playMethod: 'DirectPlay',
        isHardwareAccelerated: false,
        nowPlayingItem: {
          id: 'item-1',
          name: 'Movie Name',
          type: 'Movie',
        },
      },
    ];

    app = buildApp({
      dbPath: ':memory:',
      jellyfinService: new MockJellyfinService(),
      qbittorrentService: new MockQBittorrentService(),
      sessionMonitoringService: fakeMonitoring,
      jwtSecret: 'test-jwt-secret-key-32-characters-minimum',
    });

    await app.ready();

    // 1. Create first user -> Admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin_alice', password: 'password123' },
    });
    adminCookie = `token=${adminRes.cookies[0].value}`;

    // 2. Create second user -> Regular
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'user_bob', password: 'password123' },
    });
    regularUserCookie = `token=${userRes.cookies[0].value}`;
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/activity',
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects non-admin users with 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/activity',
      headers: { cookie: regularUserCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns active sessions for admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/activity',
      headers: { cookie: adminCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].id).toBe('s-123');
    expect(body.sessions[0].userName).toBe('Alexandre');
  });

  it('stops playback session when admin calls stop endpoint', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/activity/sessions/s-123/stop',
      headers: { cookie: adminCookie },
      payload: { message: 'Stopping now' },
    });

    expect(res.statusCode).toBe(200);
    expect(fakeMonitoring.stopCalls).toHaveLength(1);
    expect(fakeMonitoring.stopCalls[0]).toEqual({
      sessionId: 's-123',
      message: 'Stopping now',
    });
  });
});
