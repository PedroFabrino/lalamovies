import { describe, it, expect } from 'vitest';
import {
  sortReleaseCandidates,
  ReleaseCandidate,
} from '../src/lib/releaseExplorer';

describe('releaseExplorer - sorting logic', () => {
  const mockCandidates: ReleaseCandidate[] = [
    {
      guid: 'rel-1',
      title: 'Movie.2024.1080p.WEB-DL.x264',
      sizeBytes: 4 * 1024 * 1024 * 1024, // 4GB
      formattedSize: '4.0 GB',
      seeders: 15,
      leechers: 2,
      downloadUrl: 'magnet:?xt=urn:btih:rel1',
      indexer: '1337x',
      resolution: '1080p',
      codec: 'x264',
      source: 'web',
      score: 120,
      isLowHealth: false,
    },
    {
      guid: 'rel-2',
      title: 'Movie.2024.720p.HDTV.x264',
      sizeBytes: 1.5 * 1024 * 1024 * 1024, // 1.5GB
      formattedSize: '1.5 GB',
      seeders: 50,
      leechers: 5,
      downloadUrl: 'magnet:?xt=urn:btih:rel2',
      indexer: 'Nyaa',
      resolution: '720p',
      codec: 'x264',
      source: 'hdtv',
      score: 80,
      isLowHealth: false,
    },
    {
      guid: 'rel-3',
      title: 'Movie.2024.2160p.UHD.Remux',
      sizeBytes: 25 * 1024 * 1024 * 1024, // 25GB
      formattedSize: '25.0 GB',
      seeders: 5,
      leechers: 1,
      downloadUrl: 'magnet:?xt=urn:btih:rel3',
      indexer: 'TorrentGalaxy',
      resolution: '2160p',
      codec: 'x265',
      source: 'remux',
      score: 40,
      isLowHealth: false,
    },
  ];

  it('sorts candidates by score descending by default', () => {
    const sorted = sortReleaseCandidates(mockCandidates, 'score');
    expect(sorted.map((c) => c.guid)).toEqual(['rel-1', 'rel-2', 'rel-3']);
  });

  it('sorts candidates by seeders descending', () => {
    const sorted = sortReleaseCandidates(mockCandidates, 'seeders');
    expect(sorted.map((c) => c.guid)).toEqual(['rel-2', 'rel-1', 'rel-3']);
  });

  it('sorts candidates by file size ascending (smallest first)', () => {
    const sorted = sortReleaseCandidates(mockCandidates, 'size_asc');
    expect(sorted.map((c) => c.guid)).toEqual(['rel-2', 'rel-1', 'rel-3']);
  });

  it('sorts candidates by file size descending (largest first)', () => {
    const sorted = sortReleaseCandidates(mockCandidates, 'size_desc');
    expect(sorted.map((c) => c.guid)).toEqual(['rel-3', 'rel-1', 'rel-2']);
  });
});
