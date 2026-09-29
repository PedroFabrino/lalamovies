import { describe, it, expect } from 'vitest';
import { evaluateCandidatesDiagnostic } from '../src/utils/candidateDiagnostics';
import type { ProwlarrSearchResult } from '../src/services/prowlarr';

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
    const candidates: ProwlarrSearchResult[] = [
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
    const candidates: ProwlarrSearchResult[] = [
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
        seeders: 3, // seeders < 10 fails
        source: 'web',
      },
    ];

    const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
    expect(result.diagnostic).toBe('Found 4 releases (3 matched S02E02), 0 met seed/quality criteria');
    expect(result.qualifying).toHaveLength(0);
  });

  it('reports "Found N releases, 0 met seed/quality criteria" for movies when releases fail gates', () => {
    const candidates: ProwlarrSearchResult[] = [
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
    const candidates: ProwlarrSearchResult[] = [
      {
        title: 'Trapped in a Dating Sim S02E02 1080p WEB-DL',
        downloadUrl: 'magnet:?xt=urn:btih:1',
        score: 150,
        seeders: 30,
        source: 'web',
      },
      {
        title: 'Trapped in a Dating Sim S02E02 720p WEB-DL',
        downloadUrl: 'magnet:?xt=urn:btih:2',
        score: 120,
        seeders: 15,
        source: 'web',
      },
    ];

    const result = evaluateCandidatesDiagnostic(episodicEntry, candidates);
    expect(result.diagnostic).toBe('Found 2 qualifying releases; selecting top scored');
    expect(result.qualifying).toHaveLength(2);
  });
});
