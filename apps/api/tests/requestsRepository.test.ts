import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, users, downloadRequests, requestCoRequesters } from '../src/db';
import { RequestsRepository } from '../src/services/requestsRepository';
import type { NewDownloadRequest } from '../src/db';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeDb() {
  return initDatabase(':memory:');
}

const NOW = new Date().toISOString();

function seedUser(db: ReturnType<typeof makeDb>['db'], id = 'usr_1') {
  db.insert(users)
    .values({ id, jellyfinUserId: `jf_${id}`, username: id, createdAt: NOW })
    .run();
  return id;
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

// ── tests ─────────────────────────────────────────────────────────────────────

describe('RequestsRepository', () => {
  let dbInstance: ReturnType<typeof makeDb>;
  let repo: RequestsRepository;

  beforeEach(() => {
    dbInstance = makeDb();
    repo = new RequestsRepository(dbInstance.db);
    seedUser(dbInstance.db);
  });

  afterEach(() => {
    dbInstance.sqlite.close();
  });

  // findById ----------------------------------------------------------------

  describe('findById', () => {
    it('returns undefined when request does not exist', () => {
      expect(repo.findById('nonexistent')).toBeUndefined();
    });

    it('returns the request when it exists', () => {
      dbInstance.db.insert(downloadRequests).values(baseRequest()).run();
      const found = repo.findById('req_1');
      expect(found).toBeDefined();
      expect(found?.title).toBe('Fight Club');
    });
  });

  // create ------------------------------------------------------------------

  describe('create', () => {
    it('inserts and returns the created request', () => {
      const data = baseRequest();
      const created = repo.create(data);
      expect(created.id).toBe('req_1');
      expect(created.status).toBe('queued');
      expect(created.title).toBe('Fight Club');
    });

    it('applies schema default status when not provided explicitly', () => {
      // status defaults to 'queued' at schema level; omit it from insert
      const data: NewDownloadRequest = { ...baseRequest(), status: undefined };
      const created = repo.create(data);
      expect(created.status).toBe('queued');
    });

    it('persists to DB (findById returns same record)', () => {
      repo.create(baseRequest());
      const found = repo.findById('req_1');
      expect(found?.year).toBe(1999);
    });
  });

  // setStatus ---------------------------------------------------------------

  describe('setStatus', () => {
    beforeEach(() => {
      repo.create(baseRequest());
    });

    it('updates status to downloading', () => {
      repo.setStatus('req_1', 'downloading');
      expect(repo.findById('req_1')?.status).toBe('downloading');
    });

    it('updates status to seeding', () => {
      repo.setStatus('req_1', 'seeding');
      expect(repo.findById('req_1')?.status).toBe('seeding');
    });

    it('is a no-op for unknown id (does not throw)', () => {
      expect(() => repo.setStatus('bad_id', 'error')).not.toThrow();
    });
  });

  // findPending -------------------------------------------------------------

  describe('findPending', () => {
    it('returns empty array when no requests exist', () => {
      expect(repo.findPending()).toHaveLength(0);
    });

    it('returns requests with queued status', () => {
      repo.create(baseRequest({ id: 'req_q', status: 'queued' }));
      const pending = repo.findPending();
      expect(pending.map((r) => r.id)).toContain('req_q');
    });

    it('returns requests with downloading status', () => {
      repo.create(baseRequest({ id: 'req_d', status: 'downloading' }));
      expect(repo.findPending().map((r) => r.id)).toContain('req_d');
    });

    it('returns requests with hardlinking status', () => {
      repo.create(baseRequest({ id: 'req_h', status: 'hardlinking' }));
      expect(repo.findPending().map((r) => r.id)).toContain('req_h');
    });

    it('returns requests with unarchiving status', () => {
      repo.create(baseRequest({ id: 'req_u', status: 'unarchiving' }));
      expect(repo.findPending().map((r) => r.id)).toContain('req_u');
    });

    it('excludes seeding, done, error, deleted', () => {
      const excluded = ['seeding', 'done', 'error', 'deleted'] as const;
      excluded.forEach((status, i) => {
        // Each row needs a distinct metadataId to avoid the partial unique index
        repo.create(baseRequest({ id: `req_ex_${i}`, status, metadataId: `ex_${i}` }));
      });
      const pending = repo.findPending();
      expect(pending).toHaveLength(0);
    });

    it('returns all pending across mixed statuses', () => {
      repo.create(baseRequest({ id: 'req_a', status: 'queued' }));
      repo.create(baseRequest({ id: 'req_b', status: 'downloading', metadataId: '551' }));
      repo.create(baseRequest({ id: 'req_c', status: 'done', metadataId: '552' }));
      const pending = repo.findPending();
      expect(pending).toHaveLength(2);
      expect(pending.map((r) => r.id)).toEqual(expect.arrayContaining(['req_a', 'req_b']));
    });
  });

  // markError ---------------------------------------------------------------

  describe('markError', () => {
    beforeEach(() => {
      repo.create(baseRequest());
    });

    it('sets status to error', () => {
      repo.markError('req_1', 'something went wrong');
      expect(repo.findById('req_1')?.status).toBe('error');
    });

    it('persists the error message', () => {
      repo.markError('req_1', 'disk full');
      expect(repo.findById('req_1')?.errorMessage).toBe('disk full');
    });

    it('does not throw for unknown id', () => {
      expect(() => repo.markError('bad_id', 'err')).not.toThrow();
    });
  });

  // update ------------------------------------------------------------------

  describe('update', () => {
    beforeEach(() => {
      repo.create(baseRequest());
    });

    it('updates arbitrary fields on existing request', () => {
      repo.update('req_1', {
        keepFlag: true,
        qbTorrentHash: 'hash_123',
        deferredReason: 'waiting_for_space',
        transcriptionStatus: 'pending',
      });
      const found = repo.findById('req_1');
      expect(found?.keepFlag).toBe(true);
      expect(found?.qbTorrentHash).toBe('hash_123');
      expect(found?.deferredReason).toBe('waiting_for_space');
      expect(found?.transcriptionStatus).toBe('pending');
    });
  });

  // findByStatus ------------------------------------------------------------

  describe('findByStatus', () => {
    it('returns requests matching status', () => {
      repo.create(baseRequest({ id: 'req_d1', status: 'downloading', metadataId: 'm1' }));
      repo.create(baseRequest({ id: 'req_d2', status: 'downloading', metadataId: 'm2' }));
      repo.create(baseRequest({ id: 'req_q1', status: 'queued', metadataId: 'm3' }));

      const downloading = repo.findByStatus('downloading');
      expect(downloading).toHaveLength(2);
      expect(downloading.map((r) => r.id)).toEqual(expect.arrayContaining(['req_d1', 'req_d2']));
    });

    it('orders by requestedAt asc when requestedAtAsc is specified', () => {
      repo.create(
        baseRequest({
          id: 'req_later',
          status: 'queued',
          metadataId: 'm_late',
          requestedAt: '2026-09-20T12:00:00.000Z',
        })
      );
      repo.create(
        baseRequest({
          id: 'req_earlier',
          status: 'queued',
          metadataId: 'm_early',
          requestedAt: '2026-09-20T10:00:00.000Z',
        })
      );

      const ordered = repo.findByStatus('queued', 'requestedAtAsc');
      expect(ordered.map((r) => r.id)).toEqual(['req_earlier', 'req_later']);
    });
  });

  // findExistingSeriesFolder ------------------------------------------------

  describe('findExistingSeriesFolder', () => {
    it('returns undefined if mediaType is not tv_show or anime', () => {
      repo.create(
        baseRequest({
          id: 'req_mov',
          mediaType: 'movie',
          metadataId: 'tmdb_movie_1',
          jellyfinPath: '/media/movies/Fight Club (1999)/Fight Club.mkv',
        })
      );

      const folder = repo.findExistingSeriesFolder({
        metadataId: 'tmdb_movie_1',
        mediaType: 'movie',
      });
      expect(folder).toBeUndefined();
    });

    it('returns undefined if metadataId is missing', () => {
      const folder = repo.findExistingSeriesFolder({
        metadataId: null,
        mediaType: 'tv_show',
      });
      expect(folder).toBeUndefined();
    });

    it('returns existing folder when prior anime request exists', () => {
      repo.create(
        baseRequest({
          id: 'req_anime_1',
          mediaType: 'anime',
          metadataId: 'anime_123',
          status: 'seeding',
          jellyfinPath: '/media/anime/Dungeon Meshi (2024)/Season 01/Dungeon Meshi S01E01.mkv',
        })
      );

      const folder = repo.findExistingSeriesFolder({
        metadataId: 'anime_123',
        mediaType: 'tv_show',
        excludeRequestId: 'req_anime_2',
      });
      expect(folder).toBe('Dungeon Meshi (2024)');
    });

    it('returns existing folder when prior tv_show request exists', () => {
      repo.create(
        baseRequest({
          id: 'req_show_1',
          mediaType: 'tv_show',
          metadataId: 'show_456',
          status: 'done',
          jellyfinPath: '/media/shows/Breaking Bad (2008)/Season 01/Breaking Bad S01E01.mkv',
        })
      );

      const folder = repo.findExistingSeriesFolder({
        metadataId: 'show_456',
        mediaType: 'tv_show',
      });
      expect(folder).toBe('Breaking Bad (2008)');
    });

    it('excludes excludeRequestId from match', () => {
      repo.create(
        baseRequest({
          id: 'req_current',
          mediaType: 'tv_show',
          metadataId: 'show_789',
          status: 'downloading',
          jellyfinPath: '/media/shows/Severance (2022)/Season 01/Severance S01E01.mkv',
        })
      );

      const folder = repo.findExistingSeriesFolder({
        metadataId: 'show_789',
        mediaType: 'tv_show',
        excludeRequestId: 'req_current',
      });
      expect(folder).toBeUndefined();
    });

    it('excludes deleted requests', () => {
      repo.create(
        baseRequest({
          id: 'req_deleted',
          mediaType: 'tv_show',
          metadataId: 'show_del',
          status: 'deleted',
          jellyfinPath: '/media/shows/Deleted Show/Season 01/ep.mkv',
        })
      );

      const folder = repo.findExistingSeriesFolder({
        metadataId: 'show_del',
        mediaType: 'tv_show',
      });
      expect(folder).toBeUndefined();
    });
  });

  // findAll & findAllForUser --------------------------------------------------

  describe('findAll and findAllForUser', () => {
    it('returns all non-deleted requests with coRequesters for admin', () => {
      seedUser(dbInstance.db, 'usr_2');
      repo.create(baseRequest({ id: 'req_1', userId: 'usr_1', title: 'R1', metadataId: 'meta_1' }));
      repo.create(baseRequest({ id: 'req_2', userId: 'usr_2', title: 'R2', metadataId: 'meta_2', status: 'deleted' }));
      dbInstance.db.insert(requestCoRequesters).values({ requestId: 'req_1', userId: 'usr_2', addedAt: NOW }).run();

      const list = repo.findAll('usr_1', true);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('req_1');
      expect(list[0].isPrimaryRequester).toBe(true);
      expect(list[0].coRequesters).toContain('usr_2');
    });

    it('returns primary and co-requested requests for non-admin', () => {
      seedUser(dbInstance.db, 'usr_2');
      repo.create(baseRequest({ id: 'req_primary', userId: 'usr_1', title: 'Primary', metadataId: 'meta_p' }));
      repo.create(baseRequest({ id: 'req_coreq', userId: 'usr_2', title: 'CoReq', metadataId: 'meta_c' }));
      repo.create(baseRequest({ id: 'req_other', userId: 'usr_2', title: 'Other', metadataId: 'meta_o' }));
      dbInstance.db.insert(requestCoRequesters).values({ requestId: 'req_coreq', userId: 'usr_1', addedAt: NOW }).run();

      const list = repo.findAllForUser('usr_1');
      expect(list).toHaveLength(2);
      const ids = list.map((r) => r.id);
      expect(ids).toContain('req_primary');
      expect(ids).toContain('req_coreq');
      expect(ids).not.toContain('req_other');
    });
  });

  // isCoRequester & findRequesterUsername -------------------------------------

  describe('isCoRequester and findRequesterUsername', () => {
    it('checks co-requester status and retrieves username', () => {
      seedUser(dbInstance.db, 'usr_bob');
      repo.create(baseRequest({ id: 'req_b', userId: 'usr_1', metadataId: 'meta_b' }));
      dbInstance.db.insert(requestCoRequesters).values({ requestId: 'req_b', userId: 'usr_bob', addedAt: NOW }).run();

      expect(repo.isCoRequester('req_b', 'usr_bob')).toBe(true);
      expect(repo.isCoRequester('req_b', 'usr_unknown')).toBe(false);
      expect(repo.findRequesterUsername('usr_bob')).toBe('usr_bob');
      expect(repo.findRequesterUsername('nonexistent')).toBeUndefined();
    });
  });
});
