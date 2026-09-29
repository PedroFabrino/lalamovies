import { describe, it, expect, vi } from 'vitest';
import { initWatcherDatabase } from '../src/db';
import { watchRequests } from '../src/db/schema';
import { WatcherProwlarrService } from '../src/services/prowlarr';
import { WatcherPoller } from '../src/jobs/watcherPoller';
import { buildWatcherApp } from '../src/app';
import { eq } from 'drizzle-orm';

describe('Watcher Diagnostics Integration (#189)', () => {
  it('updates lastCheckResult in database when polling an entry with 0 releases', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
    vi.spyOn(mockProwlarr, 'searchForEntry').mockResolvedValue([]);

    const now = new Date().toISOString();
    db.insert(watchRequests).values({
      id: 'entry-check-0',
      userId: 'u1',
      mediaType: 'anime',
      metadataId: '100',
      metadataSource: 'tmdb',
      title: 'Solo Leveling',
      seasonNumber: 1,
      targetEpisode: 5,
      status: 'checking',
      createdAt: now,
      updatedAt: now,
    }).run();

    const poller = new WatcherPoller({
      db,
      prowlarrService: mockProwlarr,
    });

    const entry = db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-check-0')).get()!;
    const res = await poller.pollEntry(entry);

    expect(res.notified).toBe(false);
    expect(res.diagnostic).toBe('0 releases found on indexers');

    const updated = db.select().from(watchRequests).where(eq(watchRequests.id, 'entry-check-0')).get()!;
    expect(updated.lastCheckResult).toBe('0 releases found on indexers');

    sqlite.close();
  });

  it('updates lastCheckResult when releases fail quality criteria and returns it in POST /waitlist/:id/check', async () => {
    const { db, sqlite } = initWatcherDatabase(':memory:');
    const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
    vi.spyOn(mockProwlarr, 'searchForEntry').mockResolvedValue([
      {
        guid: 'c1',
        title: 'Trapped in a Dating Sim S02E02 720p',
        sizeBytes: 1000000000,
        formattedSize: '1 GB',
        seeders: 2, // < 10 seeders
        leechers: 1,
        downloadUrl: 'magnet:?xt=urn:btih:c1',
        indexer: 'Tracker',
        resolution: '720p',
        codec: 'x264',
        source: 'web',
        score: 110,
        publishDate: new Date().toISOString(),
      },
    ]);

    const now = new Date().toISOString();
    db.insert(watchRequests).values({
      id: 'entry-check-gate',
      userId: 'u1',
      mediaType: 'anime',
      metadataId: '200',
      metadataSource: 'tmdb',
      title: 'Trapped in a Dating Sim',
      seasonNumber: 2,
      targetEpisode: 2,
      status: 'checking',
      createdAt: now,
      updatedAt: now,
    }).run();

    const poller = new WatcherPoller({
      db,
      prowlarrService: mockProwlarr,
    });

    const app = buildWatcherApp({
      dbPath: ':memory:',
      watcherPoller: poller,
      prowlarrService: mockProwlarr,
    });

    // Override app.db and app.poller with our in-memory test instance
    app.db = db;
    app.poller = poller;

    const response = await app.inject({
      method: 'POST',
      url: '/waitlist/entry-check-gate/check',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.message).toBe('Found 1 releases (1 matched S02E02), 0 met seed/quality criteria');
    expect(body.entry.lastCheckResult).toBe('Found 1 releases (1 matched S02E02), 0 met seed/quality criteria');

    await app.close();
    sqlite.close();
  });
});
