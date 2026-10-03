import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PosterService } from '../src/services/posterService';

describe('PosterService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdm-poster-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('fetches and writes poster.jpg for TMDB series', async () => {
    const fakeImageBytes = Buffer.from('fake-jpeg-data');

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('api.themoviedb.org/3/tv/270603')) {
        return {
          ok: true,
          json: async () => ({ poster_path: '/bADzMfofNWYdxLnlqNuMkO6du34.jpg' }),
        };
      }
      if (url.includes('image.tmdb.org/t/p/w500/bADzMfofNWYdxLnlqNuMkO6du34.jpg')) {
        return {
          ok: true,
          arrayBuffer: async () => new Uint8Array(fakeImageBytes).buffer,
        };

      }
      return { ok: false, status: 404 };
    });

    const service = new PosterService(mockFetch as unknown as typeof fetch);
    const result = await service.ensureLocalPoster(tempDir, {
      metadataSource: 'tmdb',
      metadataId: '270603',
      mediaType: 'anime',
      tmdbApiKey: 'test-api-key',
    });

    expect(result).toBe(true);
    const savedPoster = path.join(tempDir, 'poster.jpg');
    expect(fs.existsSync(savedPoster)).toBe(true);
    expect(fs.readFileSync(savedPoster).toString()).toBe('fake-jpeg-data');
  });

  it('skips download if poster.jpg already exists', async () => {
    const posterPath = path.join(tempDir, 'poster.jpg');
    fs.writeFileSync(posterPath, 'already-existing-poster');

    const mockFetch = vi.fn();
    const service = new PosterService(mockFetch as unknown as typeof fetch);

    const result = await service.ensureLocalPoster(tempDir, {
      metadataSource: 'tmdb',
      metadataId: '270603',
      mediaType: 'anime',
      tmdbApiKey: 'test-api-key',
    });

    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(fs.readFileSync(posterPath).toString()).toBe('already-existing-poster');
  });

  it('fetches and writes poster.jpg for AniList media', async () => {
    const fakeImageBytes = Buffer.from('anilist-image-data');

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('graphql.anilist.co')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              Media: {
                coverImage: {
                  extraLarge: 'https://images.anilist.co/cover/123.jpg',
                },
              },
            },
          }),
        };
      }
      if (url.includes('images.anilist.co/cover/123.jpg')) {
        return {
          ok: true,
          arrayBuffer: async () => new Uint8Array(fakeImageBytes).buffer,
        };

      }
      return { ok: false, status: 404 };
    });

    const service = new PosterService(mockFetch as unknown as typeof fetch);
    const result = await service.ensureLocalPoster(tempDir, {
      metadataSource: 'anilist',
      metadataId: '123',
      mediaType: 'anime',
    });

    expect(result).toBe(true);
    const savedPoster = path.join(tempDir, 'poster.jpg');
    expect(fs.existsSync(savedPoster)).toBe(true);
    expect(fs.readFileSync(savedPoster).toString()).toBe('anilist-image-data');
  });

  it('returns false and does not throw on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const service = new PosterService(mockFetch as unknown as typeof fetch);

    const result = await service.ensureLocalPoster(tempDir, {
      metadataSource: 'tmdb',
      metadataId: '270603',
      mediaType: 'anime',
      tmdbApiKey: 'test-api-key',
    });

    expect(result).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'poster.jpg'))).toBe(false);
  });
});
