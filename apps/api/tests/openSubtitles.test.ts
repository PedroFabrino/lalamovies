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
});
