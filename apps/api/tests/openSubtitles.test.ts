import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { OpenSubtitlesService } from '../src/services/openSubtitles';

describe('OpenSubtitlesService', () => {
  let tmpDir: string;
  const mockApiKey = 'test-opensubtitles-key';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opensubtitles-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('reports isConfigured correctly based on API key presence', () => {
    const serviceWithKey = new OpenSubtitlesService({ apiKey: mockApiKey });
    const serviceWithoutKey = new OpenSubtitlesService({ apiKey: '' });

    expect(serviceWithKey.isConfigured()).toBe(true);
    expect(serviceWithoutKey.isConfigured()).toBe(false);
  });

  it('returns empty array and does not call API when not configured', async () => {
    const fetchMock = vi.fn();
    const service = new OpenSubtitlesService({ apiKey: '', fetchFn: fetchMock });

    const results = await service.searchSubtitles({ title: 'Inception', year: 2010 });
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches subtitles and returns top 5 results ranked by download count', async () => {
    const mockResponse = {
      data: [
        {
          id: 'sub-1',
          attributes: {
            subtitle_id: 's1',
            download_count: 5000,
            upload_date: '2023-01-01T12:00:00Z',
            release: 'Inception.2010.720p',
            uploader: { name: 'Alice' },
            files: [{ file_id: 101, file_name: 'inc720.srt' }],
          },
        },
        {
          id: 'sub-2',
          attributes: {
            subtitle_id: 's2',
            download_count: 15000,
            upload_date: '2023-01-02T12:00:00Z',
            release: 'Inception.2010.1080p',
            uploader: { name: 'Bob' },
            files: [{ file_id: 102, file_name: 'inc1080.srt' }],
          },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const service = new OpenSubtitlesService({ apiKey: mockApiKey, fetchFn: fetchMock });
    const results = await service.searchSubtitles({ title: 'Inception', tmdbId: '27205', year: 2010 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('https://api.opensubtitles.com/api/v1/subtitles');
    expect(url).toContain('languages=pt-br');
    expect(url).toContain('tmdb_id=27205');
    expect(options.headers['Api-Key']).toBe(mockApiKey);

    expect(results).toHaveLength(2);
    // Should be sorted by downloadCount descending
    expect(results[0].fileId).toBe(102);
    expect(results[0].downloadCount).toBe(15000);
    expect(results[0].uploaderName).toBe('Bob');
    expect(results[1].fileId).toBe(101);
  });

  it('downloadAndWrite fetches download link, downloads subtitle text, and writes file', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ link: 'https://download.opensubtitles.com/file/102.srt' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '1\n00:00:01,000 --> 00:00:04,000\nLegenda de teste',
      });

    const service = new OpenSubtitlesService({ apiKey: mockApiKey, fetchFn: fetchMock });
    const destPath = path.join(tmpDir, 'Inception (2010).pt-BR.srt');

    const success = await service.downloadAndWrite(102, destPath);

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fs.existsSync(destPath)).toBe(true);
    expect(fs.readFileSync(destPath, 'utf8')).toContain('Legenda de teste');
  });

  it('fetchBest finds highest-ranked subtitle and writes to destination path', async () => {
    const searchResponse = {
      data: [
        {
          id: 'sub-1',
          attributes: {
            download_count: 9999,
            release: 'TopRelease',
            uploader: { name: 'TopUploader' },
            files: [{ file_id: 555 }],
          },
        },
      ],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => searchResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ link: 'https://download.opensubtitles.com/file/555.srt' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '1\n00:00:00,000 --> 00:00:02,000\nBest subtitle',
      });

    const service = new OpenSubtitlesService({ apiKey: mockApiKey, fetchFn: fetchMock });
    const destPath = path.join(tmpDir, 'Movie (2020).pt-BR.srt');

    const success = await service.fetchBest({ title: 'Movie', year: 2020 }, destPath);

    expect(success).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);
    expect(fs.readFileSync(destPath, 'utf8')).toContain('Best subtitle');
  });

  it('downloadAndWriteMultiple saves primary as .pt-BR.srt and subsequent as .pt-BR.2.srt', async () => {
    const fetchMock = vi
      .fn()
      // Subtitle 1 link & download
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ link: 'https://download.opensubtitles.com/file/1.srt' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => 'Subtitle 1 content',
      })
      // Subtitle 2 link & download
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ link: 'https://download.opensubtitles.com/file/2.srt' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => 'Subtitle 2 content',
      });

    const service = new OpenSubtitlesService({ apiKey: mockApiKey, fetchFn: fetchMock });
    const baseVideoPath = path.join(tmpDir, 'Show.S01E01.mkv');

    const writtenCount = await service.downloadAndWriteMultiple([101, 102], baseVideoPath);

    expect(writtenCount).toBe(2);
    const sub1 = path.join(tmpDir, 'Show.S01E01.pt-BR.srt');
    const sub2 = path.join(tmpDir, 'Show.S01E01.pt-BR.2.srt');

    expect(fs.existsSync(sub1)).toBe(true);
    expect(fs.readFileSync(sub1, 'utf8')).toBe('Subtitle 1 content');
    expect(fs.existsSync(sub2)).toBe(true);
    expect(fs.readFileSync(sub2, 'utf8')).toBe('Subtitle 2 content');
  });

  it('catches and logs network or API failures without throwing', async () => {
    const loggerMock = { warn: vi.fn(), error: vi.fn() };
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network offline'));

    const service = new OpenSubtitlesService({
      apiKey: mockApiKey,
      fetchFn: fetchMock,
      logger: loggerMock,
    });

    const results = await service.searchSubtitles({ title: 'Crash' });
    expect(results).toEqual([]);
    expect(loggerMock.warn).toHaveBeenCalled();

    const writeSuccess = await service.downloadAndWrite(999, path.join(tmpDir, 'test.srt'));
    expect(writeSuccess).toBe(false);
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it('searches episodic content by query and season/episode omitting tmdb_id and year', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'sub-ep',
            attributes: {
              download_count: 800,
              upload_date: '2024-01-01',
              release: 'Scrubs.S02E05.720p',
              files: [{ file_id: 205 }],
            },
          },
        ],
      }),
    });

    const service = new OpenSubtitlesService({ apiKey: mockApiKey, fetchFn: fetchMock });
    const results = await service.searchSubtitles({
      title: 'Scrubs',
      tmdbId: '295778',
      year: 2026,
      seasonNumber: 2,
      episodeNumber: 5,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('query=Scrubs');
    expect(url).toContain('season_number=2');
    expect(url).toContain('episode_number=5');
    // For episodic requests, year and tmdb_id should NOT be attached
    expect(url).not.toContain('tmdb_id=');
    expect(url).not.toContain('year=');
    expect(results).toHaveLength(1);
    expect(results[0].fileId).toBe(205);
  });

  it('falls back to search without tmdb_id/year when initial search yields 0 results', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'sub-fallback',
              attributes: {
                download_count: 500,
                release: 'Movie.Fallback.1080p',
                files: [{ file_id: 301 }],
              },
            },
          ],
        }),
      });

    const service = new OpenSubtitlesService({ apiKey: mockApiKey, fetchFn: fetchMock });
    const results = await service.searchSubtitles({
      title: 'Movie Title',
      tmdbId: '99999',
      year: 2020,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl] = fetchMock.mock.calls[0];
    const [secondUrl] = fetchMock.mock.calls[1];
    expect(firstUrl).toContain('tmdb_id=99999');
    expect(firstUrl).not.toContain('query=');
    expect(secondUrl).not.toContain('tmdb_id=');
    expect(secondUrl).toContain('query=Movie+Title');
    expect(results).toHaveLength(1);
    expect(results[0].fileId).toBe(301);
  });

  it('combines download_count and new_download_count when ranking results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'sub-old',
            attributes: {
              download_count: 100,
              new_download_count: 0,
              release: 'Old.Release',
              files: [{ file_id: 1 }],
            },
          },
          {
            id: 'sub-new',
            attributes: {
              download_count: 0,
              new_download_count: 351,
              release: 'New.Release',
              files: [{ file_id: 2 }],
            },
          },
        ],
      }),
    });

    const service = new OpenSubtitlesService({ apiKey: mockApiKey, fetchFn: fetchMock });
    const results = await service.searchSubtitles({ title: 'Lioness', seasonNumber: 3, episodeNumber: 1 });

    expect(results).toHaveLength(2);
    expect(results[0].fileId).toBe(2);
    expect(results[0].downloadCount).toBe(351);
  });

  it('falls back to rest.opensubtitles.org when v1 download returns HTTP 406 quota exceeded', async () => {
    const zlib = await import('node:zlib');
    const gzPayload = zlib.gzipSync(Buffer.from('1\n00:00:01,000 --> 00:00:03,000\nLegenda via fallback\n', 'utf8'));

    const fetchMock = vi
      .fn()
      // 1. v1 search
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'sub-1',
              attributes: {
                new_download_count: 351,
                release: 'Lioness.S03E01.1080p',
                feature_details: {
                  imdb_id: 37923403,
                  parent_imdb_id: 13111078,
                  season_number: 3,
                  episode_number: 1,
                },
                files: [{ file_id: 12698521, file_name: 'Lioness.S03E01.1080p' }],
              },
            },
          ],
        }),
      })
      // 2. v1 POST /download -> HTTP 406 quota exceeded
      .mockResolvedValueOnce({
        ok: false,
        status: 406,
        statusText: 'Not Acceptable',
        text: async () => '{"message":"You have downloaded your allowed 5 subtitles for 24h"}',
      })
      // 3. Legacy rest.opensubtitles.org search by imdbid
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            IDSubtitleFile: '1962511026',
            SubFileName: 'Lioness.S03E01.srt',
            MovieReleaseName: 'Lioness.S03E01.1080p',
            SubDownloadsCnt: '351',
            SubDownloadLink: 'https://dl.opensubtitles.org/en/download/src-api/filead/1962511026.gz',
          },
        ],
      })
      // 4. Legacy .gz download
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => gzPayload.buffer.slice(gzPayload.byteOffset, gzPayload.byteOffset + gzPayload.byteLength),
      });

    const service = new OpenSubtitlesService({ apiKey: mockApiKey, fetchFn: fetchMock });
    const searchRes = await service.searchSubtitles({
      title: 'Lioness',
      seasonNumber: 3,
      episodeNumber: 1,
    });
    expect(searchRes).toHaveLength(1);

    const destPath = path.join(tmpDir, 'Lioness S03E01.pt-BR.srt');
    const ok = await service.downloadAndWrite(12698521, destPath);

    expect(ok).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);
    expect(fs.readFileSync(destPath, 'utf8')).toContain('Legenda via fallback');
  });
});
