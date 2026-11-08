import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initWatcherDatabase } from '../src/db';
import { watchRequests } from '../src/db/schema';
import { WatcherProwlarrService } from '../src/services/prowlarr';
import { WatcherPoller } from '../src/jobs/watcherPoller';
import { AutoDownloadSubmitter } from '../src/jobs/autoDownloadSubmitter';
import { clearTitleAliasCache, resolveTitleAliases } from '../src/services/titleAliasResolver';
import { expandTitleVariants } from '../src/utils/seriesQueryBuilder';
import { eq } from 'drizzle-orm';

describe('Waitlist Sweep Fixes (Preferred Fallback, Title Relevance, 0h Waterfall, HTTP 200 & Self-Healing)', () => {
  const originalPreferredEnv = process.env.PREFERRED_INDEXER_REGEX;

  beforeEach(() => {
    process.env.PREFERRED_INDEXER_REGEX = 'bj[-_ ]?share';
    clearTitleAliasCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalPreferredEnv !== undefined) {
      process.env.PREFERRED_INDEXER_REGEX = originalPreferredEnv;
    } else {
      delete process.env.PREFERRED_INDEXER_REGEX;
    }
  });

  describe('Preferred Indexer Priority with Public Indexer Fallback', () => {
    it('ranks BJ-Share above public indexers when both have the episode, without discarding public candidates', async () => {
      const prowlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [
          {
            guid: 'pub-1',
            title: 'Awesome Movie 2024 1080p BluRay x264',
            size: 3000000000,
            seeders: 50,
            leechers: 5,
            downloadUrl: 'magnet:?xt=urn:btih:pub1',
            indexer: '1337x',
          },
          {
            guid: 'pref-1',
            title: 'Awesome Movie 2024 1080p WEB-DL x264',
            size: 2500000000,
            seeders: 15,
            leechers: 2,
            downloadUrl: 'magnet:?xt=urn:btih:pref1',
            indexer: 'BJ-Share',
          },
        ],
      } as Response);

      const candidates = await prowlarr.searchForEntry({
        mediaType: 'movie',
        title: 'Awesome Movie',
        year: 2024,
      });

      expect(candidates).toHaveLength(2);
      expect(candidates[0].guid).toBe('pref-1');
      expect(candidates[0].isPreferred).toBe(true);
      expect(candidates[0].score).toBeGreaterThan(candidates[1].score);
    });

    it('falls back to Nyaa.si when BJ-Share skipped the target episode (e.g. Hello, I Am a Witch S01E04)', async () => {
      const prowlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [
          {
            guid: 'bj-e03',
            title: 'Hello.I.am.a.Witch.and.my.Crush.Wants.me.to.Make.a.Love.Potion.S01E03.1080p.CR.WEB-DL.AAC2.0.H.264-Lucano22.mkv',
            size: 1400000000,
            seeders: 9,
            leechers: 0,
            downloadUrl: 'magnet:?xt=urn:btih:bje03',
            indexer: 'BJ-Share',
          },
          {
            guid: 'bj-e05',
            title: 'Hello.I.am.a.Witch.and.my.Crush.Wants.me.to.Make.a.Love.Potion.S01E05.1080p.CR.WEB-DL.AAC2.0.H.264-Lucano22.mkv',
            size: 1400000000,
            seeders: 15,
            leechers: 0,
            downloadUrl: 'magnet:?xt=urn:btih:bje05',
            indexer: 'BJ-Share',
          },
          {
            guid: 'nyaa-e04',
            title: '[AnoZu] Hello, I am a Witch and my Crush Wants me to Make a Love Potion! S01E04 1080p CR WEB-DL AAC 2.0 H.264',
            size: 1400000000,
            seeders: 51,
            leechers: 1,
            downloadUrl: 'magnet:?xt=urn:btih:nyaae04',
            indexer: 'Nyaa.si',
          },
        ],
      } as Response);

      const { db, sqlite } = initWatcherDatabase(':memory:');
      const now = new Date().toISOString();
      db.insert(watchRequests).values({
        id: 'witch-e04',
        userId: 'u1',
        mediaType: 'anime',
        metadataId: '313068',
        metadataSource: 'tmdb',
        title: 'Hello, I Am a Witch and My Crush Wants Me to Make a Love Potion!',
        seasonNumber: 1,
        targetEpisode: 4,
        status: 'checking',
        createdAt: now,
        updatedAt: now,
      }).run();

      const poller = new WatcherPoller({ db, prowlarrService: prowlarr });
      const res = await poller.pollOnce();

      expect(res.notified).toBe(1);
      const updated = db.select().from(watchRequests).where(eq(watchRequests.id, 'witch-e04')).get();
      expect(updated?.prowlarrReleaseTitle).toContain('[AnoZu]');
      expect(updated?.prowlarrReleaseMagnet).toBe('magnet:?xt=urn:btih:nyaae04');
      sqlite.close();
    });
  });

  describe('Title Relevance Guard & Query Normalization', () => {
    it('rejects unrelated torrents that happen to match S01E07 even on preferred indexers', async () => {
      const prowlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [
          {
            guid: 'wrong-show',
            title: 'Completely.Unrelated.Show.S01E07.1080p.WEB-DL.x264-Group',
            size: 1200000000,
            seeders: 40,
            leechers: 2,
            downloadUrl: 'magnet:?xt=urn:btih:wrongshow',
            indexer: 'BJ-Share',
          },
        ],
      } as Response);

      const { db, sqlite } = initWatcherDatabase(':memory:');
      const now = new Date().toISOString();
      db.insert(watchRequests).values({
        id: 'avatar-test',
        userId: 'u1',
        mediaType: 'tv_show',
        metadataId: '999999',
        metadataSource: 'tmdb',
        title: 'Avatar Seven Havens',
        seasonNumber: 1,
        targetEpisode: 7,
        status: 'checking',
        createdAt: now,
        updatedAt: now,
      }).run();

      const poller = new WatcherPoller({ db, prowlarrService: prowlarr });
      const res = await poller.pollOnce();

      expect(res.notified).toBe(0);
      const entry = db.select().from(watchRequests).where(eq(watchRequests.id, 'avatar-test')).get();
      expect(entry?.status).toBe('checking');
      sqlite.close();
    });

    it('expands punctuation-heavy titles and resolves TMDB alternative_titles + AniList Romaji aliases', async () => {
      const variants = expandTitleVariants('Hello, I Am a Witch and My Crush Wants Me to Make a Love Potion!');
      expect(variants).toContain('Hello, I Am a Witch and My Crush Wants Me to Make a Love Potion!');
      expect(variants).toContain('Hello I Am a Witch and My Crush Wants Me to Make a Love Potion');

      vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('api.themoviedb.org/3/tv/313068')) {
          return {
            ok: true,
            json: async () => ({
              name: 'Hello, I Am a Witch and My Crush Wants Me to Make a Love Potion!',
              original_name: 'どうも、好きになった人に惚れ薬を依頼された魔女です。',
              alternative_titles: { results: [] },
            }),
          } as Response;
        }
        if (u.includes('graphql.anilist.co')) {
          return {
            ok: true,
            json: async () => ({
              data: {
                Media: {
                  title: {
                    romaji: 'Doumo, Suki na Hito ni Horegusuri wo Irai sareta Majo desu.',
                    english: 'Hello, I Am a Witch and My Crush Wants Me to Make a Love Potion!',
                  },
                  synonyms: ['Witch Love Potion'],
                },
              },
            }),
          } as Response;
        }
        return { ok: false } as Response;
      });

      const resolved = await resolveTitleAliases(
        {
          mediaType: 'anime',
          metadataId: '313068',
          title: 'Hello, I Am a Witch and My Crush Wants Me to Make a Love Potion!',
        },
        'tmdb-key'
      );

      expect(resolved.romajiTitle).toBe('Doumo, Suki na Hito ni Horegusuri wo Irai sareta Majo desu.');
      expect(resolved.aliases).toContain('Witch Love Potion');
    });
  });

  describe('Zero-Grace Immediate Execution, HTTP 200 Advancement & Full Waterfall Catch-Up', () => {
    it('immediately submits 0h-grace episode in WatcherPoller, treats HTTP 200 as completed, and cascades E04 -> E05 -> E06 in one pass', async () => {
      const { db, sqlite } = initWatcherDatabase(':memory:');
      const now = new Date().toISOString();

      db.insert(watchRequests).values({
        id: 'waterfall-entry',
        userId: 'user-1',
        mediaType: 'anime',
        metadataId: '313068',
        metadataSource: 'tmdb',
        title: 'Hello Witch',
        seasonNumber: 1,
        targetEpisode: 4,
        graceOverrideHours: 0,
        status: 'checking',
        createdAt: now,
        updatedAt: now,
      }).run();

      const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
      vi.spyOn(mockProwlarr, 'searchForEntry').mockImplementation(async (entry) => {
        if (entry.targetEpisode === 4) {
          return [
            {
              guid: 'nyaa-e04',
              title: '[AnoZu] Hello Witch S01E04 1080p WEB-DL',
              sizeBytes: 1400000000,
              formattedSize: '1.4 GB',
              seeders: 51,
              leechers: 1,
              downloadUrl: 'magnet:?xt=urn:btih:e04',
              indexer: 'Nyaa.si',
              resolution: '1080p',
              codec: 'x264',
              source: 'web',
              score: 215,
              isLowHealth: false,
              isPreferred: false,
            },
          ];
        }
        if (entry.targetEpisode === 5) {
          return [
            {
              guid: 'bj-e05',
              title: 'Hello.Witch.S01E05.1080p.WEB-DL-Lucano22.mkv',
              sizeBytes: 1400000000,
              formattedSize: '1.4 GB',
              seeders: 15,
              leechers: 0,
              downloadUrl: 'magnet:?xt=urn:btih:e05',
              indexer: 'BJ-Share',
              resolution: '1080p',
              codec: 'x264',
              source: 'web',
              score: 500,
              isLowHealth: false,
              isPreferred: true,
            },
          ];
        }
        return [];
      });

      const submittedEpisodes: number[] = [];
      vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
        const u = String(url);
        if (u.endsWith('/requests') && init?.method === 'POST') {
          const body = JSON.parse(String(init.body));
          submittedEpisodes.push(body.episodeNumber);
          // E04 returns 200 OK (already existed), E05 returns 201 Created
          return {
            ok: true,
            status: body.episodeNumber === 4 ? 200 : 201,
            json: async () => ({ id: `req-e${body.episodeNumber}` }),
          } as Response;
        }
        if (u.includes('/season/1')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              episodes: Array.from({ length: 12 }, (_, i) => ({
                episode_number: i + 1,
                air_date: i + 1 <= 5 ? '2026-10-01' : '2099-12-31',
              })),
            }),
          } as Response;
        }
        if (u.includes('/tv/313068')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              name: 'Hello Witch',
              next_episode_to_air: { season_number: 1, episode_number: 6 },
            }),
          } as Response;
        }
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      });

      const poller = new WatcherPoller({
        db,
        prowlarrService: mockProwlarr,
        tmdbApiKey: 'test-tmdb',
      });

      const submitter = new AutoDownloadSubmitter({
        db,
        mainApiUrl: 'http://localhost:3000',
        serviceApiKey: 'svc-key',
        tmdbApiKey: 'test-tmdb',
        poller,
      });
      poller.setSubmitter(submitter);

      await poller.pollOnce();
      // Allow setImmediate waterfall to complete
      await new Promise((r) => setTimeout(r, 50));

      expect(submittedEpisodes).toEqual([4, 5]);
      const finalEntry = db.select().from(watchRequests).where(eq(watchRequests.id, 'waterfall-entry')).get();
      expect(finalEntry?.targetEpisode).toBe(6);
      expect(finalEntry?.status).toBe('pending_release');
      expect(finalEntry?.failureCount).toBe(0);

      sqlite.close();
    });

    it('self-heals status=error entries back to checking on the next WatcherPoller pollOnce cycle', async () => {
      const { db, sqlite } = initWatcherDatabase(':memory:');
      const now = new Date().toISOString();

      db.insert(watchRequests).values({
        id: 'stuck-error-entry',
        userId: 'user-1',
        mediaType: 'anime',
        metadataId: '100',
        metadataSource: 'tmdb',
        title: 'PSYREN',
        seasonNumber: 1,
        targetEpisode: 3,
        status: 'error',
        failureCount: 3,
        createdAt: now,
        updatedAt: now,
      }).run();

      const mockProwlarr = new WatcherProwlarrService({ apiKey: 'test-key' });
      vi.spyOn(mockProwlarr, 'searchForEntry').mockResolvedValue([]);

      const poller = new WatcherPoller({ db, prowlarrService: mockProwlarr });
      const res = await poller.pollOnce();

      expect(res.polled).toBe(1);
      const healed = db.select().from(watchRequests).where(eq(watchRequests.id, 'stuck-error-entry')).get();
      expect(healed?.status).toBe('checking');
      expect(healed?.failureCount).toBe(0);

      sqlite.close();
    });
  });
});
