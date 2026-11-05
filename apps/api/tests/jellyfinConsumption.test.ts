import { describe, it, expect, vi } from 'vitest';
import { JellyfinService } from '../src/services/jellyfin';

describe('JellyfinService.getPlayHistory 90% consumption threshold', () => {
  it('requests RunTimeTicks and correctly evaluates isFullyConsumed per item', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        Items: [
          {
            Path: '/media/movies/CompletedMovie.mkv',
            RunTimeTicks: 100000,
            UserData: {
              LastPlayedDate: '2026-10-01T12:00:00.000Z',
              PlaybackPositionTicks: 95000, // 95%
              Played: false,
            },
          },
          {
            Path: '/media/movies/ExplicitlyPlayedMovie.mkv',
            RunTimeTicks: 100000,
            UserData: {
              LastPlayedDate: '2026-10-02T12:00:00.000Z',
              Played: true,
            },
          },
          {
            Path: '/media/movies/PausedEarlyMovie.mkv',
            RunTimeTicks: 100000,
            UserData: {
              LastPlayedDate: '2026-10-03T12:00:00.000Z',
              PlaybackPositionTicks: 25000, // 25%
              Played: false,
            },
          },
        ],
      }),
    } as Response);

    const service = new JellyfinService('http://localhost:8096', 'mock_api_key');
    const history = await service.getPlayHistory('user_123');

    // Verify RunTimeTicks is requested in URL
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('Fields=UserData,Path,RunTimeTicks'),
      expect.any(Object)
    );

    // 95% watched -> fully consumed
    expect(history['/media/movies/CompletedMovie.mkv']).toEqual({
      lastPlayedDate: '2026-10-01T12:00:00.000Z',
      isFullyConsumed: true,
    });

    // Played = true -> fully consumed
    expect(history['/media/movies/ExplicitlyPlayedMovie.mkv']).toEqual({
      lastPlayedDate: '2026-10-02T12:00:00.000Z',
      isFullyConsumed: true,
    });

    // 25% watched -> activity timestamp tracked, but NOT fully consumed
    expect(history['/media/movies/PausedEarlyMovie.mkv']).toEqual({
      lastPlayedDate: '2026-10-03T12:00:00.000Z',
      isFullyConsumed: false,
    });

    fetchSpy.mockRestore();
  });
});
