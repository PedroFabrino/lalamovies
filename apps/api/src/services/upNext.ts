import { and, eq, gte, inArray, ne } from 'drizzle-orm';
import { AppDatabase, downloadRequests } from '../db';
import { IProwlarrService, Resolution, ScoreOptions } from './prowlarr';
import { IMetadataService } from './metadata';

export interface UpNextItem {
  id: string;
  showTitle: string;
  releaseTitle: string;
  mediaType: 'tv_show' | 'anime';
  seasonNumber: number;
  episodeNumber: number | null;
  posterUrl: string | null;
  rating: number | null;
  overview: string | null;
  resolution: Resolution;
  sizeBytes: number;
  formattedSize: string;
  seeders: number;
  indexer: string;
  downloadUrl: string;
  score: number;
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  year: number | null;
}

export interface UpNextResult {
  available: boolean;
  items: UpNextItem[];
  error?: string;
}

export interface IUpNextService {
  getUpNext(userId: string): Promise<UpNextResult>;
  clearCache(): void;
}

export interface UpNextServiceOptions {
  db: AppDatabase;
  prowlarr: IProwlarrService;
  metadata: IMetadataService;
  ttlMs?: number;
  getTmdbApiKey?: () => string | undefined;
}

const CAM_REGEX = /\b(CAM|CAMRip|TS|TELESYNC|TeleSync|HDCAM|HDTS|WORKPRINT|WP)\b/i;

export class UpNextService implements IUpNextService {
  private db: AppDatabase;
  private prowlarr: IProwlarrService;
  private metadata: IMetadataService;
  private ttlMs: number;
  private getTmdbApiKey?: () => string | undefined;

  private cache = new Map<string, { timestamp: number; data: UpNextItem[] }>();
  private inflight = new Map<string, Promise<UpNextResult>>();

  constructor(options: UpNextServiceOptions) {
    this.db = options.db;
    this.prowlarr = options.prowlarr;
    this.metadata = options.metadata;
    this.ttlMs = options.ttlMs ?? 15 * 60 * 1000;
    this.getTmdbApiKey = options.getTmdbApiKey;
  }

  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  async getUpNext(userId: string): Promise<UpNextResult> {
    if (!this.prowlarr.isConfigured()) {
      return { available: false, items: [], error: 'Prowlarr is not configured' };
    }

    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      return { available: true, items: cached.data };
    }

    if (this.inflight.has(userId)) {
      return this.inflight.get(userId)!;
    }

    const promise = this.calculateUpNext(userId).finally(() => {
      this.inflight.delete(userId);
    });

    this.inflight.set(userId, promise);
    return promise;
  }

  private async calculateUpNext(userId: string): Promise<UpNextResult> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    let recentRequests: (typeof downloadRequests.$inferSelect)[];
    try {
      recentRequests = this.db
        .select()
        .from(downloadRequests)
        .where(
          and(
            eq(downloadRequests.userId, userId),
            ne(downloadRequests.status, 'deleted'),
            inArray(downloadRequests.mediaType, ['tv_show', 'anime']),
            gte(downloadRequests.requestedAt, cutoffDate)
          )
        )
        .all();
    } catch (err) {
      return { available: false, items: [], error: (err as Error).message };
    }

    if (recentRequests.length === 0) {
      return { available: true, items: [] };
    }

    // Group by series (metadataId or title + mediaType)
    const groups = new Map<string, typeof downloadRequests.$inferSelect[]>();
    for (const req of recentRequests) {
      const key = req.metadataId
        ? `${req.metadataSource}:${req.metadataId}`
        : `${req.title.toLowerCase()}:${req.mediaType}`;
      const list = groups.get(key) || [];
      list.push(req);
      groups.set(key, list);
    }

    const upNextItems: UpNextItem[] = [];
    const tmdbApiKey = this.getTmdbApiKey ? this.getTmdbApiKey() : undefined;

    for (const group of groups.values()) {
      const rep = group[0];
      const mediaType = rep.mediaType as 'tv_show' | 'anime';
      const showTitle = rep.title;
      const metadataId = rep.metadataId;
      const metadataSource = rep.metadataSource;

      // 1. Determine highest requested season
      let maxSeason = 1;
      for (const req of group) {
        if (req.seasonNumber && req.seasonNumber > maxSeason) {
          maxSeason = req.seasonNumber;
        }
      }

      // Requests for the maxSeason
      const seasonRequests = group.filter((r) => (r.seasonNumber ?? 1) === maxSeason);

      // Check if full season pack was requested
      const hasSeasonPack = seasonRequests.some(
        (r) => r.episodeNumber === null || r.episodeNumber === undefined
      );

      let targetSeason = maxSeason;
      let targetEpisode: number | null = null;

      if (hasSeasonPack) {
        targetSeason = maxSeason + 1;
        targetEpisode = null;
      } else {
        let maxEpisode = 0;
        for (const r of seasonRequests) {
          if (typeof r.episodeNumber === 'number' && r.episodeNumber > maxEpisode) {
            maxEpisode = r.episodeNumber;
          }
        }
        targetSeason = maxSeason;
        targetEpisode = maxEpisode + 1;
      }

      // 2. Query Prowlarr specifically for targetSeason & targetEpisode
      try {
        const searchRes = await this.prowlarr.searchReleases({
          mediaType,
          title: showTitle,
          seasonNumber: targetSeason,
          episodeNumber: targetEpisode,
        });

        if (!searchRes.isReachable) {
          return { available: false, items: [], error: searchRes.error || 'Prowlarr unreachable' };
        }

        // Quality filtering
        const healthyCandidates = searchRes.candidates.filter((candidate) => {
          if (candidate.seeders < 10) return false;
          if (candidate.score <= 0) return false;
          if (candidate.source === 'cam') return false;
          if (CAM_REGEX.test(candidate.title)) return false;
          return true;
        });

        if (healthyCandidates.length === 0) {
          continue;
        }

        // Select top scoring candidate
        healthyCandidates.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.seeders - a.seeders;
        });
        const bestCandidate = healthyCandidates[0];

        // 3. Metadata Enrichment for show artwork & rating
        let posterUrl: string | null = null;
        let rating: number | null = null;
        let overview: string | null = null;
        let year: number | null = rep.year ?? null;

        try {
          if (mediaType === 'anime') {
            const aniRes = await this.metadata.searchAniList(showTitle);
            if (aniRes && aniRes.length > 0) {
              posterUrl = aniRes[0].posterUrl;
              rating = aniRes[0].rating ?? null;
              overview = aniRes[0].overview;
              if (!year && aniRes[0].year) year = aniRes[0].year;
            }
          } else {
            const tmdbRes = await this.metadata.searchTMDB(showTitle, 'tv_show', tmdbApiKey);
            if (tmdbRes && tmdbRes.length > 0) {
              posterUrl = tmdbRes[0].posterUrl;
              rating = tmdbRes[0].rating ?? null;
              overview = tmdbRes[0].overview;
              if (!year && tmdbRes[0].year) year = tmdbRes[0].year;
            }
          }
        } catch {
          // Non-critical, fallback to nulls
        }

        upNextItems.push({
          id: bestCandidate.guid || bestCandidate.downloadUrl,
          showTitle,
          releaseTitle: bestCandidate.title,
          mediaType,
          seasonNumber: targetSeason,
          episodeNumber: targetEpisode,
          posterUrl,
          rating,
          overview,
          resolution: bestCandidate.resolution,
          sizeBytes: bestCandidate.sizeBytes,
          formattedSize: bestCandidate.formattedSize,
          seeders: bestCandidate.seeders,
          indexer: bestCandidate.indexer,
          downloadUrl: bestCandidate.downloadUrl,
          score: bestCandidate.score,
          metadataId,
          metadataSource,
          year,
        });
      } catch (err) {
        // Show query failed, continue with next show
      }
    }

    this.cache.set(userId, { timestamp: Date.now(), data: upNextItems });
    return { available: true, items: upNextItems };
  }
}
