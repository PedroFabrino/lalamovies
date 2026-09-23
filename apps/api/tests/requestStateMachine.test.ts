import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initDatabase, users, downloadRequests } from '../src/db';
import { RequestsRepository } from '../src/services/requestsRepository';
import {
  RequestStateMachine,
  RequestStatus,
  InvalidTransitionError,
} from '../src/services/requestStateMachine';
import type { IRequestsRepository } from '../src/services/requestsRepository';
import type { IJellyfinService } from '../src/services/jellyfin';
import type { INotificationService } from '../src/services/notifications';
import type { NewDownloadRequest } from '../src/db';

// ── helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();

function makeDb() {
  return initDatabase(':memory:');
}

function seedUser(db: ReturnType<typeof makeDb>['db'], id = 'usr_1') {
  db.insert(users).values({ id, jellyfinUserId: `jf_${id}`, username: id, createdAt: NOW }).run();
}

function baseRequest(overrides: Partial<NewDownloadRequest> = {}): NewDownloadRequest {
  return {
    id: 'req_1',
    userId: 'usr_1',
    magnetLink: 'magnet:?xt=urn:btih:abc',
    mediaType: 'movie',
    status: 'queued',
    metadataId: '550',
    metadataSource: 'tmdb',
    title: 'Fight Club',
    year: 1999,
    seasonNumber: null,
    episodeNumber: null,
    jellyfinPath: null,
    keepFlag: false,
    qbTorrentHash: null,
    errorMessage: null,
    requestedAt: NOW,
    downloadedAt: null,
    lastPlayedAt: null,
    scheduledDeleteAt: null,
    sizeBytes: null,
    torrentFilePath: null,
    deferredReason: null,
    transcriptionStatus: 'none',
    transcriptionError: null,
    ...overrides,
  };
}

// ── State machine factory ─────────────────────────────────────────────────────

function makeStateMachine(
  repo: IRequestsRepository,
  broadcastFn?: (msg: object) => void,
  jellyfin?: Partial<IJellyfinService>,
  notifications?: Partial<INotificationService>
) {
  return new RequestStateMachine(
    repo,
    broadcastFn,
    jellyfin as IJellyfinService | undefined,
    notifications as INotificationService | undefined
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RequestStatus constants', () => {
  it('are plain strings', () => {
    expect(RequestStatus.QUEUED).toBe('queued');
    expect(RequestStatus.DOWNLOADING).toBe('downloading');
    expect(RequestStatus.HARDLINKING).toBe('hardlinking');
    expect(RequestStatus.UNARCHIVING).toBe('unarchiving');
    expect(RequestStatus.SEEDING).toBe('seeding');
    expect(RequestStatus.DONE).toBe('done');
    expect(RequestStatus.ERROR).toBe('error');
    expect(RequestStatus.DELETED).toBe('deleted');
  });
});

describe('RequestStateMachine', () => {
  let dbInstance: ReturnType<typeof makeDb>;
  let repo: RequestsRepository;

  beforeEach(() => {
    dbInstance = makeDb();
    repo = new RequestsRepository(dbInstance.db);
    seedUser(dbInstance.db);
  });

  afterEach(() => {
    dbInstance.sqlite.close();
    vi.restoreAllMocks();
  });

  // ── throws on unknown request ─────────────────────────────────────────────

  it('throws when request does not exist', async () => {
    const sm = makeStateMachine(repo);
    await expect(sm.transition('nonexistent', RequestStatus.DOWNLOADING)).rejects.toThrow(
      'Request not found: nonexistent'
    );
  });

  // ── valid transitions ─────────────────────────────────────────────────────

  const validPaths: [string, string][] = [
    [RequestStatus.QUEUED, RequestStatus.DOWNLOADING],
    [RequestStatus.QUEUED, RequestStatus.ERROR],
    [RequestStatus.QUEUED, RequestStatus.DELETED],
    [RequestStatus.DOWNLOADING, RequestStatus.HARDLINKING],
    [RequestStatus.DOWNLOADING, RequestStatus.UNARCHIVING],
    [RequestStatus.DOWNLOADING, RequestStatus.ERROR],
    [RequestStatus.DOWNLOADING, RequestStatus.DELETED],
    [RequestStatus.HARDLINKING, RequestStatus.SEEDING],
    [RequestStatus.HARDLINKING, RequestStatus.ERROR],
    [RequestStatus.UNARCHIVING, RequestStatus.SEEDING],
    [RequestStatus.UNARCHIVING, RequestStatus.ERROR],
    [RequestStatus.SEEDING, RequestStatus.DONE],
    [RequestStatus.SEEDING, RequestStatus.ERROR],
    [RequestStatus.SEEDING, RequestStatus.DELETED],
    [RequestStatus.DONE, RequestStatus.DELETED],
    [RequestStatus.ERROR, RequestStatus.QUEUED],
    [RequestStatus.ERROR, RequestStatus.DOWNLOADING],
    [RequestStatus.ERROR, RequestStatus.SEEDING],
    [RequestStatus.ERROR, RequestStatus.DELETED],
    [RequestStatus.DOWNLOADING, RequestStatus.QUEUED],
    [RequestStatus.DOWNLOADING, RequestStatus.DOWNLOADING],
    [RequestStatus.QUEUED, RequestStatus.QUEUED],
  ];

  for (const [from, to] of validPaths) {
    it(`allows ${from} → ${to}`, async () => {
      repo.create(baseRequest({ status: from as any }));
      const sm = makeStateMachine(repo);
      const updated = await sm.transition('req_1', to as any);
      expect(updated.status).toBe(to);
      expect(repo.findById('req_1')?.status).toBe(to);
    });
  }

  // ── invalid transitions ───────────────────────────────────────────────────

  const invalidPaths: [string, string][] = [
    [RequestStatus.QUEUED, RequestStatus.SEEDING],
    [RequestStatus.QUEUED, RequestStatus.DONE],
    [RequestStatus.DOWNLOADING, RequestStatus.SEEDING],
    [RequestStatus.DOWNLOADING, RequestStatus.DONE],
    [RequestStatus.HARDLINKING, RequestStatus.DOWNLOADING],
    [RequestStatus.SEEDING, RequestStatus.DOWNLOADING],
    [RequestStatus.DONE, RequestStatus.QUEUED],
    [RequestStatus.DELETED, RequestStatus.QUEUED],
    [RequestStatus.DELETED, RequestStatus.ERROR],
  ];

  for (const [from, to] of invalidPaths) {
    it(`rejects ${from} → ${to} with InvalidTransitionError`, async () => {
      repo.create(baseRequest({ status: from as any }));
      const sm = makeStateMachine(repo);
      await expect(sm.transition('req_1', to as any)).rejects.toThrow(InvalidTransitionError);
    });
  }

  it('InvalidTransitionError carries from/to status', async () => {
    repo.create(baseRequest({ status: 'done' }));
    const sm = makeStateMachine(repo);
    try {
      await sm.transition('req_1', RequestStatus.QUEUED);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidTransitionError);
      const err = e as InvalidTransitionError;
      expect(err.fromStatus).toBe('done');
      expect(err.toStatus).toBe('queued');
    }
  });

  // ── broadcast side effect ─────────────────────────────────────────────────

  it('broadcasts when broadcast=true (default)', async () => {
    repo.create(baseRequest());
    const broadcastFn = vi.fn();
    const sm = makeStateMachine(repo, broadcastFn);
    await sm.transition('req_1', RequestStatus.DOWNLOADING);
    expect(broadcastFn).toHaveBeenCalledOnce();
    expect(broadcastFn).toHaveBeenCalledWith({
      type: 'status',
      requestId: 'req_1',
      status: 'downloading',
    });
  });

  it('skips broadcast when broadcast=false', async () => {
    repo.create(baseRequest());
    const broadcastFn = vi.fn();
    const sm = makeStateMachine(repo, broadcastFn);
    await sm.transition('req_1', RequestStatus.DOWNLOADING, { broadcast: false });
    expect(broadcastFn).not.toHaveBeenCalled();
  });

  it('does not throw when no broadcastFn provided', async () => {
    repo.create(baseRequest());
    const sm = makeStateMachine(repo); // no broadcast
    await expect(sm.transition('req_1', RequestStatus.DOWNLOADING)).resolves.toBeDefined();
  });

  // ── jellyfin safeRefresh side effect ─────────────────────────────────────

  it('calls safeRefresh when refreshJellyfin=true', async () => {
    repo.create(baseRequest());
    const safeRefresh = vi.fn().mockResolvedValue(undefined);
    const sm = makeStateMachine(repo, undefined, { safeRefresh, getPublicJellyfinUrl: () => undefined });
    await sm.transition('req_1', RequestStatus.DOWNLOADING, { refreshJellyfin: true });
    expect(safeRefresh).toHaveBeenCalledOnce();
  });

  it('does not call safeRefresh when refreshJellyfin=false (default)', async () => {
    repo.create(baseRequest());
    const safeRefresh = vi.fn();
    const sm = makeStateMachine(repo, undefined, { safeRefresh, getPublicJellyfinUrl: () => undefined });
    await sm.transition('req_1', RequestStatus.DOWNLOADING);
    expect(safeRefresh).not.toHaveBeenCalled();
  });

  // ── notification side effect ──────────────────────────────────────────────

  it('sends notification when sendNotification+notificationPayload provided', async () => {
    repo.create(baseRequest());
    const send = vi.fn().mockResolvedValue(undefined);
    const sm = makeStateMachine(repo, undefined, undefined, { send });
    const payload = { title: 'Fight Club', requestId: 'req_1', mediaType: 'movie' as const };
    await sm.transition('req_1', RequestStatus.DOWNLOADING, {
      sendNotification: 'download.completed',
      notificationPayload: payload,
    });
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith('download.completed', payload);
  });

  it('does not send notification when sendNotification absent', async () => {
    repo.create(baseRequest());
    const send = vi.fn();
    const sm = makeStateMachine(repo, undefined, undefined, { send });
    await sm.transition('req_1', RequestStatus.DOWNLOADING);
    expect(send).not.toHaveBeenCalled();
  });

  it('does not send notification when notificationPayload absent', async () => {
    repo.create(baseRequest());
    const send = vi.fn();
    const sm = makeStateMachine(repo, undefined, undefined, { send });
    await sm.transition('req_1', RequestStatus.DOWNLOADING, {
      sendNotification: 'download.completed',
      // notificationPayload intentionally omitted
    });
    expect(send).not.toHaveBeenCalled();
  });

  // ── all three side effects together ──────────────────────────────────────

  it('fires all three side effects when all options set', async () => {
    repo.create(baseRequest());
    const broadcastFn = vi.fn();
    const safeRefresh = vi.fn().mockResolvedValue(undefined);
    const send = vi.fn().mockResolvedValue(undefined);
    const sm = makeStateMachine(
      repo,
      broadcastFn,
      { safeRefresh, getPublicJellyfinUrl: () => undefined },
      { send }
    );
    const payload = { title: 'Fight Club', requestId: 'req_1', mediaType: 'movie' as const };
    await sm.transition('req_1', RequestStatus.DOWNLOADING, {
      refreshJellyfin: true,
      sendNotification: 'download.completed',
      notificationPayload: payload,
    });
    expect(broadcastFn).toHaveBeenCalledOnce();
    expect(safeRefresh).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledOnce();
  });

  // ── returned value ────────────────────────────────────────────────────────

  it('returns the updated request after transition', async () => {
    repo.create(baseRequest());
    const sm = makeStateMachine(repo);
    const updated = await sm.transition('req_1', RequestStatus.DOWNLOADING);
    expect(updated.id).toBe('req_1');
    expect(updated.status).toBe('downloading');
    expect(updated.title).toBe('Fight Club');
  });

  // ── extraFields and extraBroadcastFields ──────────────────────────────────

  it('persists extraFields atomically during transition', async () => {
    repo.create(baseRequest());
    const sm = makeStateMachine(repo);
    const updated = await sm.transition('req_1', RequestStatus.DOWNLOADING, {
      extraFields: {
        qbTorrentHash: 'hash_abc',
        errorMessage: null,
      },
    });
    expect(updated.status).toBe('downloading');
    expect(updated.qbTorrentHash).toBe('hash_abc');
    expect(repo.findById('req_1')?.qbTorrentHash).toBe('hash_abc');
  });

  it('includes extraBroadcastFields in broadcast message', async () => {
    repo.create(baseRequest({ status: 'hardlinking' }));
    const broadcastFn = vi.fn();
    const sm = makeStateMachine(repo, broadcastFn);
    await sm.transition('req_1', RequestStatus.SEEDING, {
      extraBroadcastFields: { transcriptionStatus: 'pending' },
    });
    expect(broadcastFn).toHaveBeenCalledWith({
      type: 'status',
      requestId: 'req_1',
      status: 'seeding',
      transcriptionStatus: 'pending',
    });
  });

  // ── side-effect retry and error observability (#129) ───────────────────────

  describe('post-transition side-effect retries (#129)', () => {
    it('retries Jellyfin refresh once on initial failure and sends notification on retry success', async () => {
      repo.create(baseRequest());
      let callCount = 0;
      const safeRefresh = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient Jellyfin 503');
        }
      });
      const send = vi.fn().mockResolvedValue(undefined);
      const logger = { error: vi.fn(), warn: vi.fn() };
      const sm = new RequestStateMachine(
        repo,
        undefined,
        { safeRefresh, getPublicJellyfinUrl: () => undefined },
        { send },
        logger,
        1 // 1ms delay for tests
      );

      const payload = { title: 'Fight Club', requestId: 'req_1', mediaType: 'movie' as const };
      const updated = await sm.transition('req_1', RequestStatus.DOWNLOADING, {
        refreshJellyfin: true,
        sendNotification: 'download.completed',
        notificationPayload: payload,
      });

      expect(updated.status).toBe('downloading');
      expect(safeRefresh).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenCalledOnce();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs structured error when Jellyfin fails twice, but still attempts notification', async () => {
      repo.create(baseRequest());
      const safeRefresh = vi.fn().mockRejectedValue(new Error('Persistent Jellyfin 500'));
      const send = vi.fn().mockResolvedValue(undefined);
      const logger = { error: vi.fn(), warn: vi.fn() };
      const sm = new RequestStateMachine(
        repo,
        undefined,
        { safeRefresh, getPublicJellyfinUrl: () => undefined },
        { send },
        logger,
        1
      );

      const payload = { title: 'Fight Club', requestId: 'req_1', mediaType: 'movie' as const };
      const updated = await sm.transition('req_1', RequestStatus.DOWNLOADING, {
        refreshJellyfin: true,
        sendNotification: 'download.completed',
        notificationPayload: payload,
      });

      expect(updated.status).toBe('downloading');
      expect(safeRefresh).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Jellyfin refresh failed after retry',
          requestId: 'req_1',
          toStatus: 'downloading',
          error: 'Persistent Jellyfin 500',
        })
      );
      expect(send).toHaveBeenCalledOnce();
    });

    it('logs structured error when notification fails twice and does not throw from transition', async () => {
      repo.create(baseRequest());
      const send = vi.fn().mockRejectedValue(new Error('Persistent Discord API error'));
      const logger = { error: vi.fn(), warn: vi.fn() };
      const sm = new RequestStateMachine(
        repo,
        undefined,
        undefined,
        { send },
        logger,
        1
      );

      const payload = { title: 'Fight Club', requestId: 'req_1', mediaType: 'movie' as const };
      const updated = await sm.transition('req_1', RequestStatus.DOWNLOADING, {
        sendNotification: 'download.completed',
        notificationPayload: payload,
      });

      expect(updated.status).toBe('downloading');
      expect(send).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Notification delivery failed after retry',
          requestId: 'req_1',
          toStatus: 'downloading',
          error: 'Persistent Discord API error',
        })
      );
    });
  });
});

