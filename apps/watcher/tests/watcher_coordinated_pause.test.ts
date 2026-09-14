import { describe, it, expect, vi } from 'vitest';
import { initWatcherDatabase } from '../src/db';
import { watchRequests } from '../src/db/schema';
import { WatcherProwlarrService } from '../src/services/prowlarr';
import { WatcherPoller } from '../src/jobs/watcherPoller';

describe('Watcher Coordinated Pause (Subtask #91)', () => {
  it('skips Prowlarr queries and enters Coordinated Pause when waitlist is disabled', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
    const searchSpy = vi.spyOn(mockProwlarr, 'searchForEntry').mockResolvedValue([]);

    const now = new Date().toISOString();
    db.insert(watchRequests).values({
      id: 'entry-checking-1',
      userId: 'u1',
      mediaType: 'movie',
      metadataId: '123',
      metadataSource: 'tmdb',
      title: 'Dune: Part Two',
      status: 'checking',
      createdAt: now,
      updatedAt: now,
    }).run();

    const infoLogs: string[] = [];
    const poller = new WatcherPoller({
      db,
      prowlarrService: mockProwlarr,
      isWaitlistEnabled: () => false, // Kill switch active!
      logger: {
        info: (msg) => infoLogs.push(msg),
        warn: vi.fn(),
        error: vi.fn(),
      },
    });

    const result = await poller.pollOnce();

    expect(result.polled).toBe(0);
    expect(result.notified).toBe(0);
    expect(searchSpy).not.toHaveBeenCalled();
    expect(infoLogs.some((log) => log.includes('waitlist feature disabled by kill switch'))).toBe(true);

    sqlite.close();
  });

  it('proceeds with Prowlarr queries when waitlist is enabled', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
    const searchSpy = vi.spyOn(mockProwlarr, 'searchForEntry').mockResolvedValue([]);

    const now = new Date().toISOString();
    db.insert(watchRequests).values({
      id: 'entry-checking-2',
      userId: 'u1',
      mediaType: 'movie',
      metadataId: '124',
      metadataSource: 'tmdb',
      title: 'Oppenheimer',
      status: 'checking',
      createdAt: now,
      updatedAt: now,
    }).run();

    const poller = new WatcherPoller({
      db,
      prowlarrService: mockProwlarr,
      isWaitlistEnabled: () => true,
    });

    await poller.pollOnce();
    expect(searchSpy).toHaveBeenCalled();

    sqlite.close();
  });
});
