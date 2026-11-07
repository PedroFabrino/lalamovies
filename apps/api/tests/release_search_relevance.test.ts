import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProwlarrService } from '../src/services/prowlarr';
import { scoreRelease, parseReleaseTitle } from '../src/services/prowlarr/prowlarrScoring';
import { buildSeriesSearchQueries } from '../src/utils/seriesQueryBuilder';

describe('Release Search Relevance & Stray Series Guard', () => {
  const prowlarr = new ProwlarrService('http://localhost:9696', 'mock-key');

  describe('scoreRelease - show title relevance', () => {
    it('penalizes or rejects releases from unrelated shows that match only the season/episode', () => {
      const candidateRick = {
        title: 'Rick and Morty S06E04 1080p 10bit WEBRip 6CH x265 HEVC-PSA',
        sizeBytes: 188.4 * 1024 * 1024,
        seeders: 58,
        resolution: '1080p' as const,
        codec: 'x265' as const,
        source: 'web' as const,
      };

      const candidateSlowHorses = {
        title: 'Slow Horses S06E04 1080p WEBRip 10Bit DDP5 1 x265 NeoNoir',
        sizeBytes: 626.2 * 1024 * 1024,
        seeders: 1650,
        resolution: '1080p' as const,
        codec: 'x265' as const,
        source: 'web' as const,
      };

      const candidateJoJo = {
        title: 'JoJo no Kimyou na Bouken Steel Ball Run 04 [1080p NF WEBRip HEVC AAC][MultiSub][E88C7F41]',
        sizeBytes: 724.3 * 1024 * 1024,
        seeders: 315,
        resolution: '1080p' as const,
        codec: 'x265' as const,
        source: 'web' as const,
      };

      // Scoring when searching for JoJo's Bizarre Adventure Season 6 Episode 4
      const options = {
        mediaType: 'anime' as const,
        isSingleEpisode: true,
        seasonNumber: 6,
        episodeNumber: 4,
        title: "JoJo's Bizarre Adventure",
        aliases: ['Steel Ball Run', 'JoJo no Kimyou na Bouken'],
      };

      const scoreRick = scoreRelease(candidateRick, options);
      const scoreSlow = scoreRelease(candidateSlowHorses, options);
      const scoreJoJo = scoreRelease(candidateJoJo, options);

      // Stray releases from completely different shows MUST NOT have high/positive scores
      expect(scoreRick.score).toBeLessThanOrEqual(0);
      expect(scoreSlow.score).toBeLessThanOrEqual(0);

      // Legitimate release for JoJo / Steel Ball Run must have high positive score
      expect(scoreJoJo.score).toBeGreaterThan(150);
      expect(scoreJoJo.score).toBeGreaterThan(scoreRick.score);
      expect(scoreJoJo.score).toBeGreaterThan(scoreSlow.score);
    });
  });

  describe('buildSeriesSearchQueries - season name & CJK handling', () => {
    it('includes season subtitle when provided (e.g. Steel Ball Run for S06)', () => {
      const queries = buildSeriesSearchQueries({
        title: "JoJo's Bizarre Adventure",
        seasonNumber: 6,
        episodeNumber: 3,
        seasonName: 'Steel Ball Run',
      });

      const queryStrings = queries.map((q) => q.query);
      const hasSteelBallRun = queryStrings.some((q) => q.toLowerCase().includes('steel ball run'));
      expect(hasSteelBallRun).toBe(true);
    });

    it('expands slash titles like Ranma 1/2 into hyphen/space variants for season packs', () => {
      const queries = buildSeriesSearchQueries({
        title: 'Ranma 1/2',
        seasonNumber: 2,
        englishTitle: 'Ranma 1/2',
      });
      const queryStrings = queries.map((q) => q.query);
      expect(queryStrings).toEqual(expect.arrayContaining([
        'Ranma 1/2 S02',
        'Ranma 1-2 S02',
        'Ranma 1 2 S02',
      ]));
    });
  });

  describe('scoreRelease - Ranma S02 preferred pack vs false episode channel layouts', () => {
    const originalRegex = process.env.PREFERRED_INDEXER_REGEX;

    beforeEach(() => {
      process.env.PREFERRED_INDEXER_REGEX = 'bj[-_ ]?share';
      delete process.env.PREFERRED_INDEXER_MIN_SEEDERS;
    });

    afterEach(() => {
      if (originalRegex === undefined) delete process.env.PREFERRED_INDEXER_REGEX;
      else process.env.PREFERRED_INDEXER_REGEX = originalRegex;
    });

    it('scores BJ-Share S02 pack above public packs and keeps AAC.2.0 season packs positive', () => {
      const options = {
        mediaType: 'anime' as const,
        isSingleEpisode: false,
        seasonNumber: 2,
        title: 'Ranma 1/2',
        aliases: ['らんま 1/2'],
      };

      const preferred = scoreRelease({
        title: 'Ranma.1.2.S02.1080p.AMZN.WEB-DL.DDP2.0.H.264.DUAL-OLYMPUS',
        sizeBytes: 36.8 * 1024 * 1024 * 1024,
        seeders: 3,
        indexer: 'BJ-Share',
        ...parseReleaseTitle('Ranma.1.2.S02.1080p.AMZN.WEB-DL.DDP2.0.H.264.DUAL-OLYMPUS'),
        isPreferred: true,
      }, options);

      const publicPack = scoreRelease({
        title: '[ToonsHub] Ranma 1-2 2024 S02 1080p AMZN WEB-DL DDP2.0 H.264 (Season 2)',
        sizeBytes: 11.6 * 1024 * 1024 * 1024,
        seeders: 49,
        indexer: 'Nyaa.si',
        ...parseReleaseTitle('[ToonsHub] Ranma 1-2 2024 S02 1080p AMZN WEB-DL DDP2.0 H.264 (Season 2)'),
      }, options);

      const aacChannelPack = scoreRelease({
        title: 'Ranma.1.2.2024.S02.MULTi.VFi.1080p.WEBRip.AAC.2.0.x265-TARDiS',
        sizeBytes: 4.6 * 1024 * 1024 * 1024,
        seeders: 12,
        indexer: 'Nyaa.si',
        ...parseReleaseTitle('Ranma.1.2.2024.S02.MULTi.VFi.1080p.WEBRip.AAC.2.0.x265-TARDiS'),
      }, options);

      expect(preferred.score).toBeGreaterThan(300);
      expect(preferred.score).toBeGreaterThan(publicPack.score);
      expect(publicPack.score).toBeGreaterThan(150);
      // Previously ~37 because AAC.2.0 was parsed as episode 0 (-150 pack penalty)
      expect(aacChannelPack.score).toBeGreaterThan(150);
    });
  });
});
