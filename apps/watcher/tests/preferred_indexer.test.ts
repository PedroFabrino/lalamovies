import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isPreferredIndexer, isQualifiedPreferred } from '../src/utils/preferredIndexer';

describe('preferredIndexer utility (apps/watcher)', () => {
  const originalEnv = process.env.PREFERRED_INDEXER_REGEX;

  beforeEach(() => {
    delete process.env.PREFERRED_INDEXER_REGEX;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PREFERRED_INDEXER_REGEX = originalEnv;
    } else {
      delete process.env.PREFERRED_INDEXER_REGEX;
    }
  });

  describe('isPreferredIndexer', () => {
    it('returns false when PREFERRED_INDEXER_REGEX is unset or empty', () => {
      delete process.env.PREFERRED_INDEXER_REGEX;
      expect(isPreferredIndexer('BJ-Share')).toBe(false);

      process.env.PREFERRED_INDEXER_REGEX = '';
      expect(isPreferredIndexer('BJ-Share')).toBe(false);

      process.env.PREFERRED_INDEXER_REGEX = '   ';
      expect(isPreferredIndexer('BJ-Share')).toBe(false);
    });

    it('matches exact name and case-insensitive variations', () => {
      process.env.PREFERRED_INDEXER_REGEX = 'bj[-_ ]?share';

      expect(isPreferredIndexer('BJ-Share')).toBe(true);
      expect(isPreferredIndexer('bj-share')).toBe(true);
      expect(isPreferredIndexer('BJShare')).toBe(true);
      expect(isPreferredIndexer('bjshare')).toBe(true);
      expect(isPreferredIndexer('BJ Share')).toBe(true);
      expect(isPreferredIndexer('bj_share')).toBe(true);
    });

    it('returns false for non-matching indexers', () => {
      process.env.PREFERRED_INDEXER_REGEX = 'bj[-_ ]?share';

      expect(isPreferredIndexer('Nyaa')).toBe(false);
      expect(isPreferredIndexer('1337x')).toBe(false);
      expect(isPreferredIndexer('IPTorrents')).toBe(false);
    });
  });

  describe('isQualifiedPreferred', () => {
    beforeEach(() => {
      process.env.PREFERRED_INDEXER_REGEX = 'bj[-_ ]?share';
      delete process.env.PREFERRED_INDEXER_MIN_SEEDERS;
    });

    afterEach(() => {
      delete process.env.PREFERRED_INDEXER_MIN_SEEDERS;
    });

    it('returns true when indexer is preferred, seeders >= 3, not CAM (default threshold)', () => {
      expect(isQualifiedPreferred({
        indexer: 'BJ-Share',
        seeders: 3,
        source: 'bluray',
      })).toBe(true);
    });

    it('returns false when seeders < default threshold (3)', () => {
      expect(isQualifiedPreferred({
        indexer: 'BJ-Share',
        seeders: 2,
        source: 'bluray',
      })).toBe(false);
    });

    it('returns false when source is cam', () => {
      expect(isQualifiedPreferred({
        indexer: 'BJ-Share',
        seeders: 10,
        source: 'cam',
      })).toBe(false);
    });

    it('respects PREFERRED_INDEXER_MIN_SEEDERS=1 — 1 seeder qualifies', () => {
      process.env.PREFERRED_INDEXER_MIN_SEEDERS = '1';
      expect(isQualifiedPreferred({
        indexer: 'BJ-Share',
        seeders: 1,
        source: 'web',
      })).toBe(true);
    });

    it('respects PREFERRED_INDEXER_MIN_SEEDERS=1 — 0 seeders still rejected', () => {
      process.env.PREFERRED_INDEXER_MIN_SEEDERS = '1';
      expect(isQualifiedPreferred({
        indexer: 'BJ-Share',
        seeders: 0,
        source: 'web',
      })).toBe(false);
    });

    it('respects PREFERRED_INDEXER_MIN_SEEDERS=2 — 2 qualifies, 1 does not', () => {
      process.env.PREFERRED_INDEXER_MIN_SEEDERS = '2';
      expect(isQualifiedPreferred({
        indexer: 'BJ-Share',
        seeders: 2,
        source: 'web',
      })).toBe(true);
      expect(isQualifiedPreferred({
        indexer: 'BJ-Share',
        seeders: 1,
        source: 'web',
      })).toBe(false);
    });
  });
});
