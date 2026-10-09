import { describe, it, expect } from 'vitest';
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
  });
});
