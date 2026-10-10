import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../src/db/schema';
import { RequestsRepository } from '../src/services/requestsRepository';
import { promoteQueuedRequests } from '../src/services/queuePromoter';
import { RequestStatus } from '../src/services/requestStateMachine';

describe('queuePromoter - Disk Safety & Quota Gating', () => {
  let sqlite: Database.Database;
  let db: any;
  let requestsRepo: RequestsRepository;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS download_requests (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        magnet_link TEXT NOT NULL,
        media_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        metadata_id TEXT,
        metadata_source TEXT,
        title TEXT NOT NULL,
        year INTEGER,
        season_number INTEGER,
        episode_number INTEGER,
        jellyfin_path TEXT,
        keep_flag INTEGER NOT NULL DEFAULT 0,
        qb_torrent_hash TEXT,
        error_message TEXT,
        requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        downloaded_at TEXT,
        last_played_at TEXT,
        scheduled_delete_at TEXT,
        size_bytes INTEGER,
        torrent_file_path TEXT,
        deferred_reason TEXT,
        transcription_status TEXT NOT NULL DEFAULT 'none',
        transcription_error TEXT,
        deleted_at TEXT,
        deletion_reason TEXT,
        telegram_snatch_message_id INTEGER
      );
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    requestsRepo = new RequestsRepository(db);
  });

  it('skips promotion and marks queued items as waiting_for_space when host disk is unsafe (<10 GB)', async () => {
    requestsRepo.create({
      id: 'req-1',
      userId: 'user-1',
      magnetLink: 'magnet:?xt=urn:btih:abc',
      mediaType: 'movie',
      title: 'Queued Movie',
      status: RequestStatus.QUEUED,
      deferredReason: 'waiting_for_slot',
      requestedAt: new Date().toISOString(),
      keepFlag: false,
      transcriptionStatus: 'none',
    });

    const addedTorrents: string[] = [];
    const mockQb = {
      getActiveTorrentCount: async () => 0,
      addTorrent: async (link: string) => {
        addedTorrents.push(link);
        return 'hash-1';
      },
      addTorrentFile: async () => 'hash-1',
    };

    await promoteQueuedRequests({
      db,
      requestsRepo,
      qbittorrent: mockQb as any,
      fileSystem: { getStorageFootprintBytes: async () => 0 } as any,
      stateMachine: {} as any,
      stagingPath: '/tmp/staging',
      isHostDiskSafe: () => false,
      isSpaceSufficient: () => ({ sufficient: true }),
    });

    const item = requestsRepo.findById('req-1');
    expect(item?.deferredReason).toBe('waiting_for_space');
    expect(addedTorrents).toHaveLength(0);
  });

  it('skips promotion and marks queued items as waiting_for_space when host disk percentage is below threshold', async () => {
    requestsRepo.create({
      id: 'req-2',
      userId: 'user-1',
      magnetLink: 'magnet:?xt=urn:btih:def',
      mediaType: 'movie',
      title: 'Queued Movie 2',
      status: RequestStatus.QUEUED,
      deferredReason: 'waiting_for_slot',
      requestedAt: new Date().toISOString(),
      keepFlag: false,
      transcriptionStatus: 'none',
    });

    const addedTorrents: string[] = [];
    const mockQb = {
      getActiveTorrentCount: async () => 0,
      addTorrent: async (link: string) => {
        addedTorrents.push(link);
        return 'hash-2';
      },
      addTorrentFile: async () => 'hash-2',
    };

    await promoteQueuedRequests({
      db,
      requestsRepo,
      qbittorrent: mockQb as any,
      fileSystem: { getStorageFootprintBytes: async () => 0 } as any,
      stateMachine: {} as any,
      stagingPath: '/tmp/staging',
      isHostDiskSafe: () => true,
      isSpaceSufficient: () => ({ sufficient: false }),
    });

    const item = requestsRepo.findById('req-2');
    expect(item?.deferredReason).toBe('waiting_for_space');
    expect(addedTorrents).toHaveLength(0);
  });

  it('promotes queued items to downloading when host disk and quota are healthy', async () => {
    requestsRepo.create({
      id: 'req-3',
      userId: 'user-1',
      magnetLink: 'magnet:?xt=urn:btih:ghi',
      mediaType: 'movie',
      title: 'Queued Movie 3',
      status: RequestStatus.QUEUED,
      deferredReason: 'waiting_for_space',
      requestedAt: new Date().toISOString(),
      keepFlag: false,
      transcriptionStatus: 'none',
      sizeBytes: 1024 * 1024,
    });

    const addedTorrents: string[] = [];
    const mockQb = {
      getActiveTorrentCount: async () => 0,
      addTorrent: async (link: string) => {
        addedTorrents.push(link);
        return 'hash-3';
      },
      addTorrentFile: async () => 'hash-3',
    };

    const transitions: any[] = [];
    const mockStateMachine = {
      transition: async (id: string, status: any, opts: any) => {
        transitions.push({ id, status, opts });
        requestsRepo.update(id, {
          status,
          deferredReason: opts?.extraFields?.deferredReason,
          qbTorrentHash: opts?.extraFields?.qbTorrentHash,
        });
        return requestsRepo.findById(id)!;
      },
    };

    await promoteQueuedRequests({
      db,
      requestsRepo,
      qbittorrent: mockQb as any,
      fileSystem: { getStorageFootprintBytes: async () => 0 } as any,
      stateMachine: mockStateMachine as any,
      stagingPath: '/tmp/staging',
      isHostDiskSafe: () => true,
      isSpaceSufficient: () => ({ sufficient: true }),
    });

    expect(addedTorrents).toHaveLength(1);
    expect(transitions).toHaveLength(1);
    expect(transitions[0].status).toBe(RequestStatus.DOWNLOADING);
    const item = requestsRepo.findById('req-3');
    expect(item?.status).toBe(RequestStatus.DOWNLOADING);
    expect(item?.deferredReason).toBeNull();
  });
});
