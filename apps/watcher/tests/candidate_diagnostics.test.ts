import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { evaluateCandidatesDiagnostic } from '../src/utils/candidateDiagnostics';
import type { DiagnosticCandidate } from '../src/utils/candidateDiagnostics';

describe('candidateDiagnostics (#189)', () => {
  const episodicEntry = {
    mediaType: 'anime' as const,
    seasonNumber: 2,
    targetEpisode: 2,
  };

  const movieEntry = {
    mediaType: 'movie' as const,
    seasonNumber: null,
    targetEpisode: null,
  };

  it('reports "0 releases found on indexers" when candidates list is empty', () => {
    const result = evaluateCandidatesDiagnostic(episodicEntry, []);
    expect(result.diagnostic).toBe('0 releases found on indexers');
    expect(result.qualifying).toHaveLength(0);
  });

  it('reports "Found N releases, 0 matched S{s}E{e}" when no candidate matches target episode', () => {
    const candidates: DiagnosticCandidate[] = [
      {
        title: 'Trapped in a Dating Sim S02E01 1080p',
        downloadUrl: 'magnet:?xt=urn:btih:1',
        score: 150,
        seeders: 25,
        source: 'web',
      },
      {
        title: 'Trapped in a Dating Sim S01E02 1080p',
        downloadUrl: 'magnet:?xt=urn:btih:2',
        score: 150,
        seeders: 30,
        source: 'web',
      },
    ];

    const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
    expect(result.diagnostic).toBe('Found 2 releases, 0 matched S02E02');
    expect(result.qualifying).toHaveLength(0);
  });

  it('reports "Found N releases (M matched S{s}E{e}), 0 met seed/quality criteria" when matching episode releases fail gates', () => {
    const candidates: DiagnosticCandidate[] = [
      {
        title: 'Trapped in a Dating Sim S02E01 1080p',
        downloadUrl: 'magnet:?xt=urn:btih:1',
        score: 150,
        seeders: 25,
        source: 'web',
      },
      {
        title: 'Trapped in a Dating Sim S02E02 1080p CAM',
        downloadUrl: 'magnet:?xt=urn:btih:2',
        score: 150,
        seeders: 30,
        source: 'cam', // cam fails
      },
      {
        title: 'Trapped in a Dating Sim S02E02 720p',
        downloadUrl: 'magnet:?xt=urn:btih:3',
        score: 80, // score < 100 fails
        seeders: 15,
        source: 'web',
      },
      {
        title: 'Trapped in a Dating Sim S02E02 1080p',
        downloadUrl: 'magnet:?xt=urn:btih:4',
        score: 120,
        seeders: 3, // seeders < 10 fails (public)
        source: 'web',
      },
    ];

    const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
    expect(result.diagnostic).toBe('Found 4 releases (3 matched S02E02), 0 met seed/quality criteria');
    expect(result.qualifying).toHaveLength(0);
  });

  it('reports "Found N releases, 0 met seed/quality criteria" for movies when releases fail gates', () => {
    const candidates: DiagnosticCandidate[] = [
      {
        title: 'Some Movie 2026 CAMRip',
        downloadUrl: 'magnet:?xt=urn:btih:1',
        score: 50,
        seeders: 2,
        source: 'cam',
      },
    ];

    const result = evaluateCandidatesDiagnostic(movieEntry, candidates);
    expect(result.diagnostic).toBe('Found 1 releases, 0 met seed/quality criteria');
    expect(result.qualifying).toHaveLength(0);
  });

  it('reports "Found N qualifying releases; selecting top scored" when qualifying releases exist', () => {
    const candidates: DiagnosticCandidate[] = [
      {
        title: 'Trapped in a Dating Sim S02E02 1080p WEB-DL',
        downloadUrl: 'magnet:?xt=urn:btih:1',
        score: 150,
        seeders: 30,
        source: 'web',
        indexer: 'Nyaa',
        guid: '1',
        sizeBytes: 500 * 1024 * 1024,
        formattedSize: '500 MB',
        leechers: 5,
        resolution: '1080p',
        codec: 'x265',
        isLowHealth: false,
        isPreferred: false,
      },
    ];

    const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
    expect(result.diagnostic).toBe('Found 1 qualifying releases; selecting top scored');
    expect(result.qualifying).toHaveLength(1);
  });
});

describe('candidateDiagnostics — Preferred Indexer Seeder & Resolution Gating (#199)', () => {
  const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const episodicEntry = {
    mediaType: 'anime' as const,
    seasonNumber: 2,
    targetEpisode: 1,
  };

  beforeEach(() => {
    process.env.PREFERRED_INDEXER_REGEX = 'bj[-_ ]?share';
    process.env.PREFERRED_INDEXER_MIN_SEEDERS = '1';
  });

  afterEach(() => {
    delete process.env.PREFERRED_INDEXER_REGEX;
    delete process.env.PREFERRED_INDEXER_MIN_SEEDERS;
  });

  describe('Preferred Indexer seeder bypass', () => {
    it('qualifies a preferred indexer release with 1 seeder when PREFERRED_INDEXER_MIN_SEEDERS=1', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 1080p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 1,
          source: 'web',
          indexer: 'BJ-Share',
        },
      ];
      const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
      expect(result.qualifying).toHaveLength(1);
      expect(result.diagnostic).toBe('Found 1 qualifying releases; selecting top scored');
    });

    it('rejects preferred indexer release with 0 seeders even when PREFERRED_INDEXER_MIN_SEEDERS=1', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 1080p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 0,
          source: 'web',
          indexer: 'BJ-Share',
        },
      ];
      const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
      expect(result.qualifying).toHaveLength(0);
    });

    it('still requires 10 seeders for public (non-preferred) indexers', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 1080p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 5,
          source: 'web',
          indexer: 'Nyaa',
        },
      ];
      const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
      expect(result.qualifying).toHaveLength(0);
    });

    it('always rejects CAM from preferred indexer', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 CAMRip',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 5,
          source: 'cam',
          indexer: 'BJ-Share',
        },
      ];
      const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
      expect(result.qualifying).toHaveLength(0);
    });
  });

  describe('Resolution gating', () => {
    it('qualifies 1080p releases from preferred indexer', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 1080p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 3,
          source: 'web',
          indexer: 'BJ-Share',
        },
      ];
      const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
      expect(result.qualifying).toHaveLength(1);
    });

    it('qualifies 2160p (4K) releases from preferred indexer', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 2160p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 2,
          source: 'web',
          indexer: 'BJ-Share',
        },
      ];
      const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
      expect(result.qualifying).toHaveLength(1);
    });

    it('qualifies 720p for backlog episode (> 24h old) when no 1080p/2160p exists', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 720p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 2,
          source: 'web',
          indexer: 'BJ-Share',
        },
      ];
      const entryWithOldAirDate = { ...episodicEntry, airDate: TWO_DAYS_AGO };
      const result = evaluateCandidatesDiagnostic(entryWithOldAirDate, candidates);
      expect(result.qualifying).toHaveLength(1);
    });

    it('rejects 720p for new episode (< 24h old) during 24-hour priority window', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 720p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 5,
          source: 'web',
          indexer: 'BJ-Share',
        },
      ];
      const entryWithRecentAirDate = { ...episodicEntry, airDate: ONE_HOUR_AGO };
      const result = evaluateCandidatesDiagnostic(entryWithRecentAirDate, candidates);
      expect(result.qualifying).toHaveLength(0);
    });

    it('qualifies 720p for episode with unknown air date (treats as backlog)', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 720p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 2,
          source: 'web',
          indexer: 'BJ-Share',
        },
      ];
      const entryWithNoAirDate = { ...episodicEntry, airDate: undefined };
      const result = evaluateCandidatesDiagnostic(entryWithNoAirDate, candidates);
      expect(result.qualifying).toHaveLength(1);
    });

    it('rejects 720p from preferred indexer when 1080p also exists (prefers higher resolution)', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 1080p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 120,
          seeders: 2,
          source: 'web',
          indexer: 'BJ-Share',
        },
        {
          title: 'Trapped in a Dating Sim S02E01 720p WEB-DL',
          downloadUrl: 'magnet:?xt=urn:btih:2',
          score: 110,
          seeders: 5,
          source: 'web',
          indexer: 'BJ-Share',
        },
      ];
      const entryWithOldAirDate = { ...episodicEntry, airDate: TWO_DAYS_AGO };
      const result = evaluateCandidatesDiagnostic(entryWithOldAirDate, candidates);
      // Only 1080p qualifies — 720p excluded because 1080p exists
      expect(result.qualifying).toHaveLength(1);
      expect(result.qualifying[0].title).toContain('1080p');
    });

    it('rejects 480p from preferred indexer regardless of seeder count', () => {
      const candidates: DiagnosticCandidate[] = [
        {
          title: 'Trapped in a Dating Sim S02E01 480p',
          downloadUrl: 'magnet:?xt=urn:btih:1',
          score: 110,
          seeders: 50,
          source: 'web',
          indexer: 'BJ-Share',
        },
      ];
      const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
      expect(result.qualifying).toHaveLength(0);
    });
  });
});
