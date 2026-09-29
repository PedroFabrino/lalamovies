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
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });
    expect(result.iterations).toBe(1);
    expect(result.stoppedBecause).toBe('completed');
    expect(mockPoll).not.toHaveBeenCalled();
  });

  it('advances, polls once, and stops when no qualifying release found', async () => {
    const ep2 = makeEntry({ targetEpisode: 2, status: 'checking' });
    mockAdvance.mockResolvedValueOnce(ep2);
    mockPoll.mockResolvedValueOnce({ notified: false, diagnostic: 'Found 0 releases' });

    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });

    expect(result.iterations).toBe(1);
    expect(result.stoppedBecause).toBe('no_release_found');
    expect(mockAdvance).toHaveBeenCalledOnce();
    expect(mockPoll).toHaveBeenCalledWith(ep2);
  });

  it('advances, polls once, and stops with release_found when qualifying release found', async () => {
    const ep9 = makeEntry({ targetEpisode: 9, status: 'checking' });
    const initialE9 = makeEntry({ targetEpisode: 9, status: 'checking' });

    mockPoll.mockResolvedValueOnce({ notified: true, diagnostic: 'Found 1 qualifying release' });

    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      initialEntry: initialE9,
      skipFirstAdvance: true,
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });

    expect(result.iterations).toBe(1);
    expect(result.stoppedBecause).toBe('release_found');
    expect(mockAdvance).not.toHaveBeenCalled();
    expect(mockPoll).toHaveBeenCalledWith(expect.objectContaining({ targetEpisode: 9 }));
  });

  it('stops when poll returns notified=false and entry is in pending_release (future episode)', async () => {
    const ep2Future = makeEntry({ targetEpisode: 2, status: 'pending_release' });
    mockAdvance.mockResolvedValueOnce(ep2Future);

    const result = await executeEpisodicWaterfall({
      entryId: 'entry-1',
      advance: mockAdvance,
      poll: mockPoll,
      logger: mockLogger,
    });

    expect(result.iterations).toBe(1);
    expect(result.stoppedBecause).toBe('pending_release');
    expect(mockPoll).not.toHaveBeenCalled();
  });
});
