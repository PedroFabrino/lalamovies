import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase, users, systemConfig } from '../src/db';
import { RequestsRepository } from '../src/services/requestsRepository';
import { RequestStateMachine, RequestStatus } from '../src/services/requestStateMachine';
import { executeReplaceTorrent } from '../src/services/requestReplaceTorrent';
import { RequestServiceError } from '../src/services/requestServiceTypes';

describe('executeReplaceTorrent (ADR 0018)', () => {
  let sqlite: Database.Database;
  let db: any;
  let requestsRepo: RequestsRepository;
  let stateMachine: RequestStateMachine;

  beforeEach(() => {
    const res = initDatabase(':memory:');
    sqlite = res.sqlite;
    db = res.db;

    db.insert(users).values([
      {
        id: 'user-1',
        jellyfinUserId: 'jf_user-1',
        username: 'alice',
        role: 'user',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-2',
        jellyfinUserId: 'jf_user-2',
        username: 'bob',
        role: 'user',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'admin-1',
        jellyfinUserId: 'jf_admin-1',
        username: 'charlie_admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
    ]).run();

    requestsRepo = new RequestsRepository(db as any);
    stateMachine = new RequestStateMachine(requestsRepo);
  });

  afterEach(() => {
    sqlite.close();
  });

  const createMockServices = (overrides?: any) => {
    const cleanup = {
      isHostDiskSafe: vi.fn().mockReturnValue(true),
      isSpaceSufficient: vi.fn().mockReturnValue({ sufficient: true, percentFree: 50, threshold: 15 }),
      ...(overrides?.cleanup || {}),
    };

    const fileSystem = {
      getStorageFootprintBytes: vi.fn().mockResolvedValue(10 * 1024 * 1024 * 1024),
      ...(overrides?.fileSystem || {}),
    };

    const qbittorrent = {
      getActiveTorrentCount: vi.fn().mockResolvedValue(0),
      addTorrent: vi.fn().mockResolvedValue('new-qb-hash-456'),
      addTorrentFile: vi.fn().mockResolvedValue('new-qb-hash-789'),
      removeTorrent: vi.fn().mockResolvedValue(undefined),
      ...(overrides?.qbittorrent || {}),
    };

    return { cleanup, fileSystem, qbittorrent };
  };

  it('throws 404 when request is not found', async () => {
    const { cleanup, fileSystem, qbittorrent } = createMockServices();

    await expect(
      executeReplaceTorrent({
        input: {
          requestId: 'non-existent',
          userId: 'user-1',
          magnetLink: 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Test',
        },
        db,
        requestsRepo,
        stateMachine,
        cleanup: cleanup as any,
        fileSystem: fileSystem as any,
        qbittorrent: qbittorrent as any,
        stagingPath: '/tmp/staging',
      })
    ).rejects.toThrow(RequestServiceError);
  });

  it('throws 403 Forbidden when caller is not the owner and not an admin', async () => {
    const { cleanup, fileSystem, qbittorrent } = createMockServices();

    const created = requestsRepo.create({
      id: 'req-1',
      userId: 'user-1',
      mediaType: 'movie',
      status: RequestStatus.DOWNLOADING,
      metadataId: 'm-1',
      metadataSource: 'tmdb',
      title: 'Inception',
      requestedAt: new Date().toISOString(),
      magnetLink: 'magnet:?xt=urn:btih:oldoldold',
      qbTorrentHash: 'old-hash-123',
    });

    await expect(
      executeReplaceTorrent({
        input: {
          requestId: created.id,
          userId: 'user-2', // bob trying to replace alice's request
          userRole: 'user',
          magnetLink: 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=New',
        },
        db,
        requestsRepo,
        stateMachine,
        cleanup: cleanup as any,
        fileSystem: fileSystem as any,
        qbittorrent: qbittorrent as any,
        stagingPath: '/tmp/staging',
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'You are not authorized to replace the torrent for this request',
    });
  });

  it('throws 400 when request is in non-eligible status (e.g. seeding, done)', async () => {
    const { cleanup, fileSystem, qbittorrent } = createMockServices();

    const created = requestsRepo.create({
      id: 'req-seeding',
      userId: 'user-1',
      mediaType: 'movie',
      status: RequestStatus.SEEDING,
      metadataId: 'm-2',
      metadataSource: 'tmdb',
      title: 'Interstellar',
      requestedAt: new Date().toISOString(),
      magnetLink: 'magnet:?xt=urn:btih:seedinghash',
    });

    await expect(
      executeReplaceTorrent({
        input: {
          requestId: created.id,
          userId: 'user-1',
          magnetLink: 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=New',
        },
        db,
        requestsRepo,
        stateMachine,
        cleanup: cleanup as any,
        fileSystem: fileSystem as any,
        qbittorrent: qbittorrent as any,
        stagingPath: '/tmp/staging',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Torrent replacement is only permitted for requests in downloading, queued, or error status',
    });
  });

  it('replaces torrent for DOWNLOADING request, purges old qBittorrent torrent, and restarts download', async () => {
    const { cleanup, fileSystem, qbittorrent } = createMockServices();

    const created = requestsRepo.create({
      id: 'req-dl',
      userId: 'user-1',
      mediaType: 'movie',
      status: RequestStatus.DOWNLOADING,
      metadataId: 'm-3',
      metadataSource: 'tmdb',
      title: 'Dunkirk',
      requestedAt: new Date().toISOString(),
      magnetLink: 'magnet:?xt=urn:btih:olddunkirkhash',
      qbTorrentHash: 'old-dunkirk-hash',
    });

    const result = await executeReplaceTorrent({
      input: {
        requestId: created.id,
        userId: 'user-1',
        magnetLink: 'magnet:?xt=urn:btih:1111222233334444555566667777888899990000&dn=NewDunkirk',
      },
      db,
      requestsRepo,
      stateMachine,
      cleanup: cleanup as any,
      fileSystem: fileSystem as any,
      qbittorrent: qbittorrent as any,
      stagingPath: '/tmp/staging',
    });

    expect(qbittorrent.removeTorrent).toHaveBeenCalledWith('old-dunkirk-hash', true);
    expect(qbittorrent.addTorrent).toHaveBeenCalled();
    expect(result.request.status).toBe(RequestStatus.DOWNLOADING);
    expect(result.request.qbTorrentHash).toBe('new-qb-hash-456');
    expect(result.request.magnetLink).toContain('NewDunkirk');
    expect(result.request.id).toBe(created.id);
  });

  it('allows Admin to replace torrent and defers to QUEUED when concurrent slots are full', async () => {
    const { cleanup, fileSystem, qbittorrent } = createMockServices({
      qbittorrent: {
        getActiveTorrentCount: vi.fn().mockResolvedValue(5), // Over limit
      },
    });

    db.insert(systemConfig).values({
      key: 'concurrent_limit',
      value: '2',
    }).onConflictDoUpdate({
      target: systemConfig.key,
      set: { value: '2' },
    }).run();

    const created = requestsRepo.create({
      id: 'req-queued',
      userId: 'user-1',
      mediaType: 'movie',
      status: RequestStatus.QUEUED,
      metadataId: 'm-4',
      metadataSource: 'tmdb',
      title: 'Tenet',
      requestedAt: new Date().toISOString(),
      magnetLink: 'magnet:?xt=urn:btih:oldtenet',
    });

    const result = await executeReplaceTorrent({
      input: {
        requestId: created.id,
        userId: 'admin-1', // admin replacing user-1's request
        userRole: 'admin',
        magnetLink: 'magnet:?xt=urn:btih:2222333344445555666677778888999900001111&dn=NewTenet',
      },
      db,
      requestsRepo,
      stateMachine,
      cleanup: cleanup as any,
      fileSystem: fileSystem as any,
      qbittorrent: qbittorrent as any,
      stagingPath: '/tmp/staging',
    });

    expect(result.request.status).toBe(RequestStatus.QUEUED);
    expect(result.request.deferredReason).toBe('waiting_for_slot');
    expect(result.request.magnetLink).toContain('NewTenet');
  });

  it('replaces torrent for ERROR request and resets error message to null', async () => {
    const { cleanup, fileSystem, qbittorrent } = createMockServices();

    const created = requestsRepo.create({
      id: 'req-error',
      userId: 'user-1',
      mediaType: 'movie',
      status: RequestStatus.ERROR,
      metadataId: 'm-5',
      metadataSource: 'tmdb',
      title: 'Oppenheimer',
      requestedAt: new Date().toISOString(),
      errorMessage: 'Stalled tracker connection: timed out',
      magnetLink: 'magnet:?xt=urn:btih:stalledhash',
      qbTorrentHash: 'stalled-hash',
    });

    const result = await executeReplaceTorrent({
      input: {
        requestId: created.id,
        userId: 'user-1',
        magnetLink: 'magnet:?xt=urn:btih:3333444455556666777788889999000011112222&dn=NewOppenheimer',
      },
      db,
      requestsRepo,
      stateMachine,
      cleanup: cleanup as any,
      fileSystem: fileSystem as any,
      qbittorrent: qbittorrent as any,
      stagingPath: '/tmp/staging',
    });

    expect(qbittorrent.removeTorrent).toHaveBeenCalledWith('stalled-hash', true);
    expect(result.request.status).toBe(RequestStatus.DOWNLOADING);
    expect(result.request.errorMessage).toBeNull();
    expect(result.request.qbTorrentHash).toBe('new-qb-hash-456');
  });
});
