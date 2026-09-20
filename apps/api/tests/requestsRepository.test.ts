import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, users, downloadRequests } from '../src/db';
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
});
