import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDatabase, users } from '../src/db';
import { RequestsRepository } from '../src/services/requestsRepository';
import type { NewDownloadRequest } from '../src/db';

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
  const id = overrides.id || 'req_1';
  return {
    id,
    userId: 'usr_1',
    magnetLink: 'magnet:?xt=urn:btih:abc',
    mediaType: 'movie',
    status: 'queued',
    metadataId: `meta_${id}`,
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

describe('RequestsRepository — New Query & Mutation Methods', () => {
  let dbInstance: ReturnType<typeof makeDb>;
  let repo: RequestsRepository;

  beforeEach(() => {
    dbInstance = makeDb();
    repo = new RequestsRepository(dbInstance.db);
    seedUser(dbInstance.db, 'usr_1');
    seedUser(dbInstance.db, 'usr_2');
  });

  afterEach(() => {
    dbInstance.sqlite.close();
  });

  describe('findByUserId', () => {
    it('returns requests for specified user, respecting excludeDeleted flag', () => {
      repo.create(baseRequest({ id: 'r1', userId: 'usr_1', status: 'seeding' }));
      repo.create(baseRequest({ id: 'r2', userId: 'usr_1', status: 'deleted' }));
      repo.create(baseRequest({ id: 'r3', userId: 'usr_2', status: 'seeding' }));

      const allForUser = repo.findByUserId('usr_1');
      expect(allForUser.map((r) => r.id)).toEqual(['r1', 'r2']);

      const nonDeleted = repo.findByUserId('usr_1', true);
      expect(nonDeleted.map((r) => r.id)).toEqual(['r1']);
    });
  });

  describe('findByCriteria', () => {
    it('filters by status, mediaType, keepFlag, and timestamps', () => {
      repo.create(
        baseRequest({
          id: 'r1',
          status: 'seeding',
          mediaType: 'movie',
          keepFlag: false,
          downloadedAt: '2026-09-01T00:00:00.000Z',
          scheduledDeleteAt: null,
        })
      );
      repo.create(
        baseRequest({
          id: 'r2',
          status: 'seeding',
          mediaType: 'tv_show',
          keepFlag: true,
          downloadedAt: '2026-09-10T00:00:00.000Z',
          scheduledDeleteAt: '2026-09-20T00:00:00.000Z',
        })
      );
      repo.create(
        baseRequest({
          id: 'r3',
          status: 'deleted',
          mediaType: 'movie',
          keepFlag: false,
        })
      );

      const seedingNoKeep = repo.findByCriteria({
        status: 'seeding',
        keepFlag: false,
        scheduledDeleteAtNull: true,
      });
      expect(seedingNoKeep.map((r) => r.id)).toEqual(['r1']);

      const scheduledBefore = repo.findByCriteria({
        status: 'seeding',
        scheduledDeleteAtBefore: '2026-09-21T00:00:00.000Z',
      });
      expect(scheduledBefore.map((r) => r.id)).toEqual(['r2']);

      const moviesExcludeDeleted = repo.findByCriteria({
        mediaType: 'movie',
        excludeDeleted: true,
      });
      expect(moviesExcludeDeleted.map((r) => r.id)).toEqual(['r1']);
    });
  });

  describe('transcription methods', () => {
    it('sets transcription status with optional extraFields', () => {
      repo.create(baseRequest({ id: 'r1', transcriptionStatus: 'none' }));

      repo.setTranscriptionStatus('r1', 'transcribing');
      expect(repo.findById('r1')?.transcriptionStatus).toBe('transcribing');

      repo.setTranscriptionStatus('r1', 'failed', {
        transcriptionError: 'Audio decoding failed',
      });
      const updated = repo.findById('r1');
      expect(updated?.transcriptionStatus).toBe('failed');
      expect(updated?.transcriptionError).toBe('Audio decoding failed');
    });

    it('finds requests by transcription status', () => {
      repo.create(baseRequest({ id: 'r1', transcriptionStatus: 'transcribing' }));
      repo.create(baseRequest({ id: 'r2', transcriptionStatus: 'pending' }));
      repo.create(
        baseRequest({ id: 'r3', transcriptionStatus: 'transcribing', status: 'deleted' })
      );

      const transcribing = repo.findByTranscriptionStatus('transcribing');
      expect(transcribing.map((r) => r.id)).toEqual(['r1']);
    });

    it('finds pending transcription requests by mediaType ordered by requestedAt asc', () => {
      repo.create(
        baseRequest({
          id: 'r1',
          mediaType: 'private',
          transcriptionStatus: 'pending',
          requestedAt: '2026-09-10T00:00:00.000Z',
        })
      );
      repo.create(
        baseRequest({
          id: 'r2',
          mediaType: 'private',
          transcriptionStatus: 'pending',
          requestedAt: '2026-09-05T00:00:00.000Z',
        })
      );
      repo.create(
        baseRequest({
          id: 'r3',
          mediaType: 'movie',
          transcriptionStatus: 'pending',
          requestedAt: '2026-09-01T00:00:00.000Z',
        })
      );

      const privatePending = repo.findPendingTranscriptionByType('private');
      expect(privatePending.map((r) => r.id)).toEqual(['r2', 'r1']);
    });
  });

  describe('findByMetadataId', () => {
    it('queries by metadataId, optional season/episode, and excludes deleted by default', () => {
      repo.create(
        baseRequest({
          id: 'r1',
          metadataId: '100',
          mediaType: 'tv_show',
          seasonNumber: 1,
          episodeNumber: 1,
          status: 'seeding',
        })
      );
      repo.create(
        baseRequest({
          id: 'r2',
          metadataId: '100',
          mediaType: 'tv_show',
          seasonNumber: 1,
          episodeNumber: null,
          status: 'seeding',
        })
      );
      repo.create(
        baseRequest({
          id: 'r3',
          metadataId: '100',
          mediaType: 'tv_show',
          seasonNumber: 2,
          episodeNumber: 1,
          status: 'deleted',
        })
      );

      const byMeta = repo.findByMetadataId('100');
      expect(byMeta.map((r) => r.id)).toEqual(['r1', 'r2']);

      const season1 = repo.findByMetadataId('100', 1);
      expect(season1.map((r) => r.id)).toEqual(['r1', 'r2']);

      const season1Ep1 = repo.findByMetadataId('100', 1, 1);
      expect(season1Ep1.map((r) => r.id)).toEqual(['r1']);
    });
  });

  describe('findWithTorrentHash', () => {
    it('returns matching request by qbTorrentHash', () => {
      repo.create(baseRequest({ id: 'r1', qbTorrentHash: 'hash_abc123' }));
      repo.create(
        baseRequest({ id: 'r2', qbTorrentHash: 'hash_deleted', status: 'deleted' })
      );

      expect(repo.findWithTorrentHash('hash_abc123')?.id).toBe('r1');
      expect(repo.findWithTorrentHash('hash_deleted')).toBeUndefined();
      expect(repo.findWithTorrentHash('non_existent')).toBeUndefined();
    });
  });
});
