import { describe, it, expect } from 'vitest';
import { FileSystemService } from '../src/services/fileSystem';

describe('Collision-Safe Library Pathing (#111)', () => {
  const fsService = new FileSystemService('/media');

  it('disambiguates private releases with identical titles using release/torrent code', () => {
    const path1 = fsService.buildLibraryPath({
      mediaType: 'private',
      title: 'xb',
      disambiguator: 'xb-4050',
      ext: 'mp4',
      mediaBasePath: '/media',
    });

    const path2 = fsService.buildLibraryPath({
      mediaType: 'private',
      title: 'xb',
      disambiguator: 'xb-3987',
      ext: 'mp4',
      mediaBasePath: '/media',
    });

    expect(path1.replace(/\\/g, '/')).toBe('/media/private/xb-4050/xb-4050.mp4');
    expect(path2.replace(/\\/g, '/')).toBe('/media/private/xb-3987/xb-3987.mp4');
    expect(path1).not.toBe(path2);
  });

  it('disambiguates private releases when disambiguator has special characters', () => {
    const p = fsService.buildLibraryPath({
      mediaType: 'private',
      title: 'xb',
      disambiguator: 'xb-4050 [1080p]',
      ext: 'mkv',
      mediaBasePath: '/media',
    });
    expect(p.replace(/\\/g, '/')).toBe('/media/private/xb-4050 [1080p]/xb-4050 [1080p].mkv');
  });

  it('preserves backward-compatibility for private releases without disambiguator', () => {
    const p = fsService.buildLibraryPath({
      mediaType: 'private',
      title: 'Solo Movie',
      year: 2026,
      ext: 'mkv',
      mediaBasePath: '/media',
    });
    expect(p.replace(/\\/g, '/')).toBe('/media/private/Solo Movie (2026)/Solo Movie (2026).mkv');
  });

  it('preserves backward-compatibility for numbered private releases', () => {
    const p = fsService.buildLibraryPath({
      mediaType: 'private',
      title: 'Series Name',
      seasonNumber: 1,
      episodeNumber: 5,
      disambiguator: 'release-ignored-when-numbered',
      ext: 'mkv',
      mediaBasePath: '/media',
    });
    expect(p.replace(/\\/g, '/')).toBe('/media/private/Series Name/Season 01/Series Name S01E05.mkv');
  });

  it('preserves backward-compatibility for movies, shows, and anime', () => {
    const movie = fsService.buildLibraryPath({
      mediaType: 'movie',
      title: 'Inception',
      year: 2010,
      ext: 'mkv',
      mediaBasePath: '/media',
    });
    expect(movie.replace(/\\/g, '/')).toBe('/media/movies/Inception (2010)/Inception (2010).mkv');

    const show = fsService.buildLibraryPath({
      mediaType: 'tv_show',
      title: 'Breaking Bad',
      seasonNumber: 1,
      episodeNumber: 1,
      mediaBasePath: '/media',
    });
    expect(show.replace(/\\/g, '/')).toBe('/media/shows/Breaking Bad/Season 01/Breaking Bad S01E01.mkv');

    const anime = fsService.buildLibraryPath({
      mediaType: 'anime',
      title: 'Frieren',
      seasonNumber: 1,
      episodeNumber: 10,
      mediaBasePath: '/media',
    });
    expect(anime.replace(/\\/g, '/')).toBe('/media/anime/Frieren/Season 01/Frieren S01E10.mkv');
  });
});
