import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MdmApiClient } from '../src/apiClient';

describe('MdmApiClient - searchMetadata', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('queries specified mediaType and attaches mediaType to candidate results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          { id: '284580', title: 'A Certain Dark Item', year: 2026, posterUrl: '/item.jpg' },
        ],
      }),
    });
    global.fetch = fetchMock;

    const client = new MdmApiClient({ baseUrl: 'http://localhost:3000', serviceApiKey: 'test-key' });
    const candidates = await client.searchMetadata('user-1', 'A certain dark item', 'anime');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ query: 'A certain dark item', mediaType: 'anime' })
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].mediaType).toBe('anime');
    expect(candidates[0].id).toBe(284580);
    expect(candidates[0].title).toBe('A Certain Dark Item');
  });

  it('queries across movie, tv_show, and anime when mediaType is unspecified', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, options: any) => {
      const body = JSON.parse(options?.body || '{}');
      if (body.mediaType === 'movie') {
        return {
          ok: true,
          json: async () => ({ candidates: [] }),
        };
      }
      if (body.mediaType === 'tv_show') {
        return {
          ok: true,
          json: async () => ({
            candidates: [{ id: '112527', title: 'Aoashi', year: 2022 }],
          }),
        };
      }
      if (body.mediaType === 'anime') {
        return {
          ok: true,
          json: async () => ({
            candidates: [{ id: '112527', title: 'Aoashi', year: 2022 }],
          }),
        };
      }
      return { ok: false };
    });
    global.fetch = fetchMock;

    const client = new MdmApiClient({ baseUrl: 'http://localhost:3000', serviceApiKey: 'test-key' });
    const candidates = await client.searchMetadata('user-1', 'Aoashi');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe(112527);
    expect(candidates[0].title).toBe('Aoashi');
    // Anime was prioritized over TV show
    expect(candidates[0].mediaType).toBe('anime');
  });

  it('formats createWaitlist payload with metadataId and metadataSource: tmdb', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', message: 'Added to waitlist' }),
    });
    global.fetch = fetchMock;

    const client = new MdmApiClient({ baseUrl: 'http://localhost:3000', serviceApiKey: 'test-key' });
    const res = await client.createWaitlist('user-1', {
      title: 'A Certain Dark Item',
      mediaType: 'anime',
      tmdbId: 284580,
      seasonNumber: 1,
      episodeNumber: 1,
      waitlistNextSeason: true,
      posterUrl: '/poster.jpg',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1]?.body || '{}');
    expect(sentBody.metadataId).toBe('284580');
    expect(sentBody.metadataSource).toBe('tmdb');
    expect(sentBody.title).toBe('A Certain Dark Item');
    expect(sentBody.mediaType).toBe('anime');
    expect(sentBody.targetEpisode).toBe(1);
    expect(sentBody.isNextSeason).toBe(true);
  });

  it('formats createRequest payload with metadataId, metadataSource: tmdb, and magnetLink', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ request: { id: 'req-456' } }),
    });
    global.fetch = fetchMock;

    const client = new MdmApiClient({ baseUrl: 'http://localhost:3000', serviceApiKey: 'test-key' });
    const res = await client.createRequest('user-1', {
      title: 'Aoashi',
      mediaType: 'tv_show',
      downloadUrl: 'magnet:?xt=urn:btih:xyz',
      tmdbId: 112527,
      seasonNumber: 1,
      episodeNumber: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
    expect(res.id).toBe('req-456');
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1]?.body || '{}');
    expect(sentBody.metadataId).toBe('112527');
    expect(sentBody.metadataSource).toBe('tmdb');
    expect(sentBody.magnetLink).toBe('magnet:?xt=urn:btih:xyz');
  });

  it('correctly maps candidates and recommended from search-releases API response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recommended: {
          title: '[Erai-raws] Tougen Anki - 01',
          downloadUrl: 'http://prowlarr/download?id=1',
          indexer: 'Nyaa.si',
          sizeBytes: 800000000,
          seeders: 50,
          resolution: '1080p',
          score: 250,
        },
        candidates: [
          {
            title: '[Erai-raws] Tougen Anki - 01',
            downloadUrl: 'http://prowlarr/download?id=1',
            indexer: 'Nyaa.si',
            sizeBytes: 800000000,
            seeders: 50,
            resolution: '1080p',
            score: 250,
          },
          {
            title: 'Tougen Anki - S01 [2025]',
            downloadUrl: 'magnet:?xt=urn:btih:bj123',
            indexer: 'BJ-Share',
            sizeBytes: 6000000000,
            seeders: 20,
            resolution: '1080p',
            score: 200,
          },
        ],
        totalFound: 2,
      }),
    });
    global.fetch = fetchMock;

    const client = new MdmApiClient({ baseUrl: 'http://localhost:3000', serviceApiKey: 'test-key' });
    const res = await client.searchReleases('user-1', {
      title: 'Tougen Anki',
      mediaType: 'anime',
      seasonNumber: 1,
      episodeNumber: 1,
      romajiTitle: 'Tougen Anki',
      englishTitle: 'Tougen Anki',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.releases).toHaveLength(2);
    expect(res.recommendedRelease).toBeDefined();
    expect(res.recommendedRelease?.title).toBe('[Erai-raws] Tougen Anki - 01');
    expect(res.recommendedRelease?.indexer).toBe('Nyaa.si');
    expect(res.releases[1].indexer).toBe('BJ-Share');
    expect(res.isFutureOrUnreleased).toBe(false);
  });

  describe('Report and Message Tracking methods', () => {
    it('getUserReport fetches user report from internal api', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          telegramReportMessageId: 10,
          active: [],
          completed: [],
          waitlist: [],
        }),
      });
      global.fetch = fetchMock;

      const client = new MdmApiClient({ baseUrl: 'http://localhost:3000', serviceApiKey: 'test-key' });
      const report = await client.getUserReport('chat-123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/internal/telegram/user/chat-123/report',
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-service-key': 'test-key' }),
        })
      );
      expect(report?.telegramReportMessageId).toBe(10);
    });

    it('setUserReportMessageId sends PUT to internal api', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock;

      const client = new MdmApiClient({ baseUrl: 'http://localhost:3000', serviceApiKey: 'test-key' });
      const success = await client.setUserReportMessageId('chat-123', 456);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/internal/telegram/user/chat-123/report-message-id',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ messageId: 456 }),
        })
      );
      expect(success).toBe(true);
    });

    it('setRequestSnatchMessageId sends PATCH to internal api', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock;

      const client = new MdmApiClient({ baseUrl: 'http://localhost:3000', serviceApiKey: 'test-key' });
      const success = await client.setRequestSnatchMessageId('req-999', 888);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/internal/telegram/request/req-999/snatch-message-id',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ messageId: 888 }),
        })
      );
      expect(success).toBe(true);
    });
  });
});

