import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildSeriesSearchQueries } from '../src/utils/seriesQueryBuilder';
import { ProwlarrService } from '../src/services/prowlarr';

describe('Prowlarr Parallel Dual-Query Indexer Search (Ticket 02)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildSeriesSearchQueries', () => {
    it('generates multi-category queries for episodic media targeting [5000, 5070, 2070]', () => {
      const queries = buildSeriesSearchQueries({
        title: 'Frieren: Beyond Journey\'s End',
        seasonNumber: 1,
        episodeNumber: 1,
      });

      expect(queries.length).toBeGreaterThan(0);
      for (const q of queries) {
        expect(q.categories).toEqual([5000, 5070, 2070]);
      }
    });

    it('generates both standard S01E01 and absolute episode numbering (- 01, 01) for episode searches', () => {
      const queries = buildSeriesSearchQueries({
        title: 'Solo Leveling',
        seasonNumber: 1,
        episodeNumber: 5,
      });

      const queryStrings = queries.map((q) => q.query);
      expect(queryStrings).toContain('Solo Leveling S01E05');
      expect(queryStrings).toContain('Solo Leveling - 05');
      expect(queryStrings).toContain('Solo Leveling 05');
    });

    it('generates parallel queries for both English and Romaji title variants', () => {
      const queries = buildSeriesSearchQueries({
        title: 'Sousou no Frieren',
        englishTitle: 'Frieren: Beyond Journey\'s End',
        romajiTitle: 'Sousou no Frieren',
        seasonNumber: 1,
        episodeNumber: 1,
      });

      const queryStrings = queries.map((q) => q.query);
      // Romaji / primary
      expect(queryStrings).toContain('Sousou no Frieren S01E01');
      expect(queryStrings).toContain('Sousou no Frieren - 01');
      // English
      expect(queryStrings).toContain('Frieren: Beyond Journey\'s End S01E01');
      expect(queryStrings).toContain('Frieren: Beyond Journey\'s End - 01');
    });

    it('generates season pack query S01 and plain title fallback for Season 1', () => {
      const queries = buildSeriesSearchQueries({
        title: 'Chainsaw Man',
        seasonNumber: 1,
      });

      const queryStrings = queries.map((q) => q.query);
      expect(queryStrings).toContain('Chainsaw Man S01');
      expect(queryStrings).toContain('Chainsaw Man');
    });

    it('generates season pack query S02 without plain title for Season 2', () => {
      const queries = buildSeriesSearchQueries({
        title: 'Jujutsu Kaisen',
        seasonNumber: 2,
      });

      const queryStrings = queries.map((q) => q.query);
      expect(queryStrings).toContain('Jujutsu Kaisen S02');
      expect(queryStrings).not.toContain('Jujutsu Kaisen');
    });
  });

  describe('ProwlarrService parallel dual search execution', () => {
    it('executes parallel queries and deduplicates release candidates by infoHash', async () => {
      const service = new ProwlarrService('http://localhost:9696', 'test-key');

      const mockTorrents = [
        {
          guid: 'g1',
          title: 'Frieren S01E01 1080p Web',
          infoHash: 'abcdef1234567890abcdef1234567890abcdef12',
          size: 1400000000,
          seeders: 50,
          leechers: 5,
          downloadUrl: 'magnet:?xt=urn:btih:abcdef1234567890abcdef1234567890abcdef12',
          indexer: 'Nyaa',
        },
        {
          guid: 'g2',
          title: 'Frieren - 01 [1080p]',
          // Same infoHash returned from alternative query syntax
          infoHash: 'abcdef1234567890abcdef1234567890abcdef12',
          size: 1400000000,
          seeders: 50,
          leechers: 5,
          downloadUrl: 'magnet:?xt=urn:btih:abcdef1234567890abcdef1234567890abcdef12',
          indexer: 'SubsPlease',
        },
        {
          guid: 'g3',
          title: 'Frieren S01E01 720p HDTV',
          infoHash: '1111111111111111111111111111111111111111',
          size: 800000000,
          seeders: 20,
          leechers: 2,
          downloadUrl: 'magnet:?xt=urn:btih:1111111111111111111111111111111111111111',
          indexer: 'EZTV',
        },
      ];

      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('/api/v1/indexer')) {
          return {
            ok: true,
            json: async () => [],
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => mockTorrents,
        } as Response;
      });

      const res = await service.searchReleases({
        mediaType: 'anime',
        title: 'Frieren',
        seasonNumber: 1,
        episodeNumber: 1,
      });

      expect(res.isConfigured).toBe(true);
      expect(res.isReachable).toBe(true);
      // infoHash 'abcdef...' must only appear once in candidates
      const matchingHash = res.candidates.filter(
        (c) => c.infoHash?.toLowerCase() === 'abcdef1234567890abcdef1234567890abcdef12'
      );
      expect(matchingHash).toHaveLength(1);
      // Total candidates deduplicated
      expect(res.candidates).toHaveLength(2);
    });

    it('gracefully handles partial tracker failures without losing candidates from working queries', async () => {
      const service = new ProwlarrService('http://localhost:9696', 'test-key');

      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('/api/v1/indexer')) {
          return { ok: true, json: async () => [] } as Response;
        }
        // Simulate failure on absolute syntax query but success on standard query
        if (decodeURIComponent(u).includes('- 01')) {
          throw new Error('Tracker timeout');
        }
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              guid: 'g-standard',
              title: 'Show S01E01 1080p',
              infoHash: '2222222222222222222222222222222222222222',
              size: 1500000000,
              seeders: 30,
              downloadUrl: 'magnet:?xt=urn:btih:2222222222222222222222222222222222222222',
              indexer: 'WorkingTracker',
            },
          ],
        } as Response;
      });

      const res = await service.searchReleases({
        mediaType: 'tv_show',
        title: 'Show',
        seasonNumber: 1,
        episodeNumber: 1,
      });

      expect(res.candidates).toHaveLength(1);
      expect(res.candidates[0].title).toBe('Show S01E01 1080p');
    });
  });
});
