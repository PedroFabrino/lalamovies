import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { initDatabase, users, systemConfig } from '../src/db';
import { RequestsRepository } from '../src/services/requestsRepository';
import { RequestService } from '../src/services/requestService';
import { RequestStatus } from '../src/services/requestStateMachine';
import { RequestServiceError } from '../src/services/requestServiceTypes';

describe('RequestService', () => {
  let sqlite: Database.Database;
  let db: any;
  let requestsRepo: RequestsRepository;

  beforeEach(() => {
    const res = initDatabase(':memory:');
    sqlite = res.sqlite;
    db = res.db;

    db.insert(users).values({
      id: 'user-1',
      jellyfinUserId: 'jf_user-1',
      username: 'testuser',
      role: 'user',
      createdAt: new Date().toISOString(),
    }).run();

    requestsRepo = new RequestsRepository(db as any);
  });

  afterEach(() => {
    sqlite.close();
  });

  const createService = (overrides?: Partial<any>) => {
    const defaultStateMachine = {
      transition: vi.fn().mockImplementation(async (id, status, opts) => {
        requestsRepo.setStatus(id, status, opts?.extraFields);
        return requestsRepo.findById(id)!;
      }),
    };

    const defaultCleanup = {
      isHostDiskSafe: vi.fn().mockReturnValue(true),
      isSpaceSufficient: vi.fn().mockReturnValue({ sufficient: true, percentFree: 50, threshold: 15 }),
    };

    const defaultFileSystem = {
      getStorageFootprintBytes: vi.fn().mockResolvedValue(10 * 1024 * 1024 * 1024),
      processAndHardlinkTorrent: vi.fn().mockResolvedValue({ destPath: '/media/movies/Test (2025)/Test.mkv' }),
      buildLibraryPath: vi.fn().mockReturnValue('/media/movies/Stream.mkv'),
      hardlink: vi.fn().mockResolvedValue(undefined),
    };

    const defaultQbittorrent = {
      getActiveTorrentCount: vi.fn().mockResolvedValue(0),
      addTorrent: vi.fn().mockResolvedValue('hash123'),
      addTorrentFile: vi.fn().mockResolvedValue('hash123'),
      getAllTorrents: vi.fn().mockResolvedValue([]),
    };

    const defaultJellyfin = {
      getPublicJellyfinUrl: vi.fn().mockReturnValue('http://jellyfin.local'),
      safeRefresh: vi.fn().mockResolvedValue(undefined),
    };

    return new RequestService({
      db: db as any,
      requestsRepo,
      stateMachine: overrides?.stateMachine || (defaultStateMachine as any),
      cleanup: overrides?.cleanup || (defaultCleanup as any),
      fileSystem: overrides?.fileSystem || (defaultFileSystem as any),
      qbittorrent: overrides?.qbittorrent || (defaultQbittorrent as any),
      jellyfin: overrides?.jellyfin || (defaultJellyfin as any),
      stagingPath: '/tmp/staging',
      logger: { warn: vi.fn(), error: vi.fn() },
      ...overrides,
    });
  };

  describe('createRequest', () => {
    it('rejects private request from regular user with 401', async () => {
      const service = createService();
      await expect(
        service.createRequest({
          userId: 'user-1',
          userRole: 'user',
          mediaType: 'private',
          metadataId: '100',
          metadataSource: 'tmdb',
          title: 'Private Movie',
          magnetLink: 'magnet:?xt=urn:btih:abc',
        })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejects private request with non-tmdb source with 400', async () => {
      const service = createService();
      await expect(
        service.createRequest({
          userId: 'user-1',
          userRole: 'admin',
          mediaType: 'private',
          metadataId: '100',
          metadataSource: 'anilist',
          title: 'Private Movie',
          magnetLink: 'magnet:?xt=urn:btih:abc',
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects if disk safety check fails with 422', async () => {
      const service = createService({
        cleanup: {
          isHostDiskSafe: () => false,
          isSpaceSufficient: () => ({ sufficient: true, percentFree: 50, threshold: 15 }),
        },
      });

      await expect(
        service.createRequest({
          userId: 'user-1',
          userRole: 'user',
          mediaType: 'movie',
          metadataId: '100',
          metadataSource: 'tmdb',
          title: 'Test Movie',
          magnetLink: 'magnet:?xt=urn:btih:abc',
        })
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('returns existing canonical request with isExisting=true and adds co-requester', async () => {
      const service = createService();
      db.insert(users).values({
        id: 'other-user',
        jellyfinUserId: 'jf_other-user',
        username: 'otheruser',
        role: 'user',
        createdAt: new Date().toISOString(),
      }).run();

      const existing = requestsRepo.create({
        id: 'existing-1',
        userId: 'other-user',
        magnetLink: 'magnet:?xt=urn:btih:old',
        mediaType: 'movie',
        status: RequestStatus.DOWNLOADING,
        metadataId: '200',
        metadataSource: 'tmdb',
        title: 'Existing Movie',
        requestedAt: new Date().toISOString(),
      });

      const res = await service.createRequest({
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '200',
        metadataSource: 'tmdb',
        title: 'Existing Movie',
        magnetLink: 'magnet:?xt=urn:btih:new',
      });

      expect(res.isExisting).toBe(true);
      expect(res.request.id).toBe(existing.id);

      const isCo = requestsRepo.isCoRequester(existing.id, 'user-1');
      expect(isCo).toBe(true);
    });

    it('dispatches to qBittorrent and transitions to DOWNLOADING when slots available', async () => {
      const service = createService();
      const res = await service.createRequest({
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '300',
        metadataSource: 'tmdb',
        title: 'New Movie',
        magnetLink: 'magnet:?xt=urn:btih:abc300',
      });

      expect(res.isExisting).toBe(false);
      expect(res.request.status).toBe(RequestStatus.DOWNLOADING);
      expect(res.request.qbTorrentHash).toBe('hash123');
    });

    it('queues with deferredReason waiting_for_slot when concurrent limit reached', async () => {
      db.update(systemConfig)
        .set({ value: '1' })
        .where(eq(systemConfig.key, 'concurrent_limit'))
        .run();
      const service = createService({
        qbittorrent: {
          getActiveTorrentCount: vi.fn().mockResolvedValue(1),
          addTorrent: vi.fn(),
        },
      });

      const res = await service.createRequest({
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '301',
        metadataSource: 'tmdb',
        title: 'Queued Movie',
        magnetLink: 'magnet:?xt=urn:btih:abc301',
      });

      expect(res.isExisting).toBe(false);
      expect(res.request.status).toBe(RequestStatus.QUEUED);
      expect(res.request.deferredReason).toBe('waiting_for_slot');
    });
  });

  describe('createBatchRequests', () => {
    it('creates batch items and dispatches up to available slot count', async () => {
      db.update(systemConfig)
        .set({ value: '1' })
        .where(eq(systemConfig.key, 'concurrent_limit'))
        .run();
      let activeCount = 0;
      const qbittorrent = {
        getActiveTorrentCount: vi.fn().mockImplementation(async () => activeCount),
        addTorrent: vi.fn().mockImplementation(async () => {
          activeCount++;
          return 'hash-batch-1';
        }),
      };

      const service = createService({ qbittorrent });
      const res = await service.createBatchRequests({
        userId: 'user-1',
        items: [
          {
            title: 'Ep 1',
            mediaType: 'tv_show',
            metadataId: '400',
            metadataSource: 'tmdb',
            magnetLink: 'magnet:?xt=urn:btih:ep1',
            seasonNumber: 1,
            episodeNumber: 1,
          },
          {
            title: 'Ep 2',
            mediaType: 'tv_show',
            metadataId: '400',
            metadataSource: 'tmdb',
            magnetLink: 'magnet:?xt=urn:btih:ep2',
            seasonNumber: 1,
            episodeNumber: 2,
          },
        ],
      });

      expect(res.count).toBe(2);
      expect(res.requests[0].status).toBe(RequestStatus.DOWNLOADING);
      expect(res.requests[1].status).toBe(RequestStatus.QUEUED);
      expect(res.requests[1].deferredReason).toBe('waiting_for_slot');
    });
  });

  describe('retryRequest', () => {
    it('throws 404 if request not found', async () => {
      const service = createService();
      await expect(service.retryRequest('non-existent')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 if request not in error state', async () => {
      const service = createService();
      requestsRepo.create({
        id: 'req-active',
        userId: 'user-1',
        magnetLink: 'magnet:?xt=urn:btih:active',
        mediaType: 'movie',
        status: RequestStatus.DOWNLOADING,
        metadataId: '500',
        metadataSource: 'tmdb',
        title: 'Active Item',
        requestedAt: new Date().toISOString(),
      });

      await expect(service.retryRequest('req-active')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('resets to downloading when media is incomplete on disk', async () => {
      const service = createService();
      requestsRepo.create({
        id: 'req-err-1',
        userId: 'user-1',
        magnetLink: 'magnet:?xt=urn:btih:err1',
        mediaType: 'movie',
        status: RequestStatus.ERROR,
        metadataId: '501',
        metadataSource: 'tmdb',
        title: 'Error Item',
        requestedAt: new Date().toISOString(),
      });

      const res = await service.retryRequest('req-err-1');
      expect(res.request.status).toBe(RequestStatus.DOWNLOADING);
      expect(res.message).toBe('Request reset to downloading');
    });
  });

  describe('promoteFromStream', () => {
    it('creates completed request and hardlinks media', async () => {
      const service = createService();
      const res = await service.promoteFromStream({
        userId: 'user-1',
        mediaType: 'movie',
        metadataId: '600',
        metadataSource: 'tmdb',
        title: 'Streamed Movie',
        stagingPath: '/staging/stream.mkv',
      });

      expect(res.status).toBe('completed');
      expect(res.jellyfinPath).toBe('/media/movies/Stream.mkv');
      const saved = requestsRepo.findById(res.requestId);
      expect(saved).toBeDefined();
      expect(saved?.status).toBe(RequestStatus.DONE);
    });
  });
});
