import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeEpisodicWaterfall } from '../src/services/episodicWaterfall';
import type { WatchRequest } from '../src/db/schema';

// Minimal WatchRequest mock for waterfall tests
function makeEntry(overrides: Partial<WatchRequest> = {}): WatchRequest {
  return {
    id: 'entry-1',
    userId: 'user-1',
    mediaType: 'anime',
    metadataId: '12345',
    metadataSource: 'tmdb',
    title: 'Trapped in a Dating Sim',
    year: 2023,
    seasonNumber: 2,
    targetEpisode: 1,
    triggeredCount: 0,
    failureCount: 0,
    status: 'checking',
    tmdbReleaseDate: null,
    prowlarrReleaseTitle: null,
    prowlarrReleaseMagnet: null,
    prowlarrReleaseScore: null,
    discordMessageId: null,
    notifyAt: null,
    posterUrl: null,
    requesterUsername: null,
    requesterEmail: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cancelledAt: null,
    cancelledBy: null,
    graceOverrideHours: null,
    lastCheckResult: null,
    ...overrides,
  };
}

describe('executeEpisodicWaterfall (#200)', () => {
  const mockAdvance = vi.fn();
  const mockPoll = vi.fn();
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops immediately when entry is a movie (non-episodic)', async () => {
    const entry = makeEntry({ mediaType: 'movie', targetEpisode: null });
    const result = await executeEpisodicWaterfall({
      entryId: entry.id,
      initialEntry: entry,
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });
    expect(result.iterations).toBe(0);
    expect(mockAdvance).not.toHaveBeenCalled();
    expect(mockPoll).not.toHaveBeenCalled();
  });

  it('stops when advance returns null (entry not found)', async () => {
    mockAdvance.mockResolvedValueOnce(null);
    const result = await executeEpisodicWaterfall({
      entryId: 'missing',
      initialEntry: makeEntry(),
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });
    expect(result.iterations).toBe(1);
    expect(result.stoppedBecause).toBe('entry_not_found');
    expect(mockPoll).not.toHaveBeenCalled();
  });

  it('stops when advanced entry has status=completed (season finished)', async () => {
    const completed = makeEntry({ status: 'completed', targetEpisode: 4 });
    mockAdvance.mockResolvedValueOnce(completed);
    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      initialEntry: makeEntry({ targetEpisode: 3 }),
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });
    expect(result.iterations).toBe(1);
    expect(result.stoppedBecause).toBe('completed');
    expect(mockPoll).not.toHaveBeenCalled();
  });

  it('polls after advancing — stops when no qualifying release found', async () => {
    const ep2 = makeEntry({ targetEpisode: 2, status: 'checking' });
    mockAdvance.mockResolvedValueOnce(ep2);
    mockPoll.mockResolvedValueOnce({ notified: false, diagnostic: 'Found 0 releases' });

    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      initialEntry: makeEntry({ targetEpisode: 1 }),
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });

    expect(result.iterations).toBe(1);
    expect(result.stoppedBecause).toBe('no_release_found');
    expect(mockAdvance).toHaveBeenCalledOnce();
    expect(mockPoll).toHaveBeenCalledWith(ep2);
  });

  it('loops: advances again when qualifying release found', async () => {
    const ep2 = makeEntry({ targetEpisode: 2, status: 'checking' });
    const ep3 = makeEntry({ targetEpisode: 3, status: 'checking' });
    mockAdvance
      .mockResolvedValueOnce(ep2)
      .mockResolvedValueOnce(ep3);
    mockPoll
      .mockResolvedValueOnce({ notified: true, diagnostic: 'Found 1 qualifying releases; selecting top scored' })
      .mockResolvedValueOnce({ notified: false, diagnostic: 'Found 0 releases' });

    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      initialEntry: makeEntry({ targetEpisode: 1 }),
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });

    expect(result.iterations).toBe(2);
    expect(result.stoppedBecause).toBe('no_release_found');
    expect(mockAdvance).toHaveBeenCalledTimes(2);
    expect(mockPoll).toHaveBeenCalledTimes(2);
  });

  it('stops when poll returns notified=false and entry is in pending_release (future episode)', async () => {
    const ep2Future = makeEntry({ targetEpisode: 2, status: 'pending_release' });
    mockAdvance.mockResolvedValueOnce(ep2Future);
    // Poll won't be called since entry is pending_release (not yet aired)
    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      initialEntry: makeEntry({ targetEpisode: 1 }),
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });

    expect(result.iterations).toBe(1);
    expect(result.stoppedBecause).toBe('pending_release');
    expect(mockPoll).not.toHaveBeenCalled();
  });

  it('caps at 30 iterations to prevent infinite loops', async () => {
    const checkingEntry = makeEntry({ targetEpisode: 2, status: 'checking' });
    // Always advance to same checking entry + always find a release
    mockAdvance.mockResolvedValue(checkingEntry);
    mockPoll.mockResolvedValue({ notified: true, diagnostic: 'Found 1 qualifying' });

    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      initialEntry: makeEntry({ targetEpisode: 1 }),
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
      maxIterations: 30,
    });

    expect(result.iterations).toBe(30);
    expect(result.stoppedBecause).toBe('max_iterations');
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('processes series starting at e08 without skipping e09: checks e09, e10, e11 and stops at e12 when no release found', async () => {
    const ep10 = makeEntry({ targetEpisode: 10, status: 'checking' });
    const ep11 = makeEntry({ targetEpisode: 11, status: 'checking' });
    const ep12 = makeEntry({ targetEpisode: 12, status: 'checking' });

    // initialEntry is e09 (already advanced from e08)
    const initialE09 = makeEntry({ targetEpisode: 9, status: 'checking' });

    mockAdvance
      .mockResolvedValueOnce(ep10)
      .mockResolvedValueOnce(ep11)
      .mockResolvedValueOnce(ep12);

    mockPoll
      .mockResolvedValueOnce({ notified: true, diagnostic: 'Found release for e09' })
      .mockResolvedValueOnce({ notified: true, diagnostic: 'Found release for e10' })
      .mockResolvedValueOnce({ notified: true, diagnostic: 'Found release for e11' })
      .mockResolvedValueOnce({ notified: false, diagnostic: 'No release for e12' });

    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      initialEntry: initialE09,
      skipFirstAdvance: true, // e09 is already the target, don't advance it again
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });

    expect(result.iterations).toBe(4);
    expect(result.stoppedBecause).toBe('no_release_found');
    expect(mockPoll).toHaveBeenCalledTimes(4);
    expect(mockPoll).toHaveBeenNthCalledWith(1, expect.objectContaining({ targetEpisode: 9 }));
    expect(mockPoll).toHaveBeenNthCalledWith(2, expect.objectContaining({ targetEpisode: 10 }));
    expect(mockPoll).toHaveBeenNthCalledWith(3, expect.objectContaining({ targetEpisode: 11 }));
    expect(mockPoll).toHaveBeenNthCalledWith(4, expect.objectContaining({ targetEpisode: 12 }));
  });

  it('successfully processes all 12 episodes of a series from e01 to season completion', async () => {
    const episodes = Array.from({ length: 12 }, (_, i) => makeEntry({ targetEpisode: i + 1, status: 'checking' }));

    episodes.slice(1).forEach((ep) => mockAdvance.mockResolvedValueOnce(ep));
    mockAdvance.mockResolvedValueOnce(makeEntry({ status: 'completed', targetEpisode: 12 }));

    for (let i = 0; i < 12; i++) {
      mockPoll.mockResolvedValueOnce({ notified: true, diagnostic: `Found release e${i + 1}` });
    }

    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      initialEntry: episodes[0], // e01
      skipFirstAdvance: true,
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });

    expect(result.iterations).toBe(13);
    expect(result.stoppedBecause).toBe('completed');
    expect(mockPoll).toHaveBeenCalledTimes(12);
    for (let i = 0; i < 12; i++) {
      expect(mockPoll).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({ targetEpisode: i + 1 }));
    }
  });
});
