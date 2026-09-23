import {
  MediaSeason,
  SeasonalAnimeItem,
  SeasonalSectionsResponse,
  SeasonalArchiveResponse,
  IAnimeSeasonService,
  PageInfo,
} from './animeTypes';
import { AnimeHistoryMatcher } from './animeHistoryMatcher';

export interface AnimeSeasonServiceOptions {
  historyMatcher?: AnimeHistoryMatcher;
  endpoint?: string;
  trendingTtlMs?: number;
  seasonalTtlMs?: number;
  getIsAdult?: () => boolean | Promise<boolean>;
  logger?: {
    info?: (msg: string) => void;
    warn?: (msg: string, extra?: unknown) => void;
    error?: (msg: string, extra?: unknown) => void;
  };
}

const DEFAULT_ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const TRENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SEASONAL_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export const ANILIST_SEASONAL_QUERY = `
query (
  $season: MediaSeason
  $seasonYear: Int
  $sort: [MediaSort]
  $page: Int
  $perPage: Int
  $isAdult: Boolean
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(
      type: ANIME
      season: $season
      seasonYear: $seasonYear
      sort: $sort
      isAdult: $isAdult
    ) {
      id
      title {
        romaji
        english
        native
      }
      format
      status
      episodes
      season
      seasonYear
      startDate {
        year
        month
        day
      }
      coverImage {
        extraLarge
        large
        medium
      }
      bannerImage
      genres
      averageScore
      popularity
      description
      trailer {
        id
        site
      }
      relations {
        edges {
          relationType
          node {
            id
            title {
              romaji
              english
            }
            format
          }
        }
      }
    }
  }
}
`;

export function calculateCurrentSeasonAndYear(now = new Date()): {
  season: MediaSeason;
  year: number;
} {
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  if (month >= 0 && month <= 2) return { season: 'WINTER', year };
  if (month >= 3 && month <= 5) return { season: 'SPRING', year };
  if (month >= 6 && month <= 8) return { season: 'SUMMER', year };
  return { season: 'FALL', year };
}

export function calculateNextSeasonAndYear(
  season: MediaSeason,
  year: number
): { season: MediaSeason; year: number } {
  switch (season) {
    case 'WINTER':
      return { season: 'SPRING', year };
    case 'SPRING':
      return { season: 'SUMMER', year };
    case 'SUMMER':
      return { season: 'FALL', year };
    case 'FALL':
      return { season: 'WINTER', year: year + 1 };
  }
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

export class AnimeSeasonService implements IAnimeSeasonService {
  private endpoint: string;
  private trendingTtlMs: number;
  private seasonalTtlMs: number;
  private historyMatcher?: AnimeHistoryMatcher;
  private getIsAdult?: () => boolean | Promise<boolean>;
  private logger?: AnimeSeasonServiceOptions['logger'];

  private cache = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

  constructor(options: AnimeSeasonServiceOptions = {}) {
    this.endpoint = options.endpoint || DEFAULT_ANILIST_ENDPOINT;
    this.trendingTtlMs = options.trendingTtlMs ?? TRENDING_TTL_MS;
    this.seasonalTtlMs = options.seasonalTtlMs ?? SEASONAL_TTL_MS;
    this.historyMatcher = options.historyMatcher;
    this.getIsAdult = options.getIsAdult;
    this.logger = options.logger;
  }

  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  private async resolveIsAdult(): Promise<boolean> {
    if (this.getIsAdult) {
      try {
        return Boolean(await this.getIsAdult());
      } catch {
        return false;
      }
    }
    return false;
  }

  async getSeasonalSections(
    userId?: string,
    jellyfinUserId?: string
  ): Promise<SeasonalSectionsResponse> {
    const isAdult = await this.resolveIsAdult();
    const { season: curSeason, year: curYear } = calculateCurrentSeasonAndYear();
    const { season: nextSeason, year: nextYear } = calculateNextSeasonAndYear(curSeason, curYear);

    const [trending, popularThisSeason, upcomingNextSeason] = await Promise.all([
      this.fetchTrending(isAdult),
      this.fetchSeason(curSeason, curYear, isAdult),
      this.fetchSeason(nextSeason, nextYear, isAdult),
    ]);

    let anticipatedSequels: SeasonalSectionsResponse['anticipatedSequels'] = [];
    if (this.historyMatcher && userId) {
      anticipatedSequels = await this.historyMatcher.findAnticipatedSequels(
        upcomingNextSeason,
        userId,
        jellyfinUserId
      );
    }

    return {
      trending,
      popularThisSeason,
      upcomingNextSeason,
      anticipatedSequels,
    };
  }

  async getSeasonalArchive(
    season: MediaSeason,
    year: number,
    page = 1,
    perPage = 24
  ): Promise<SeasonalArchiveResponse> {
    const isAdult = await this.resolveIsAdult();
    const cacheKey = `archive:${season}:${year}:${page}:${perPage}:${isAdult}`;
    return this.executeWithDeduplicationAndCache<SeasonalArchiveResponse>(
      cacheKey,
      this.seasonalTtlMs,
      async () => {
        const res = await this.queryAniList({
          season,
          seasonYear: year,
          sort: ['POPULARITY_DESC'],
          page,
          perPage,
          isAdult,
        });

        return {
          pageInfo: res.pageInfo,
          items: res.items,
        };
      }
    );
  }

  private async fetchTrending(isAdult = false): Promise<SeasonalAnimeItem[]> {
    const cacheKey = `trending:${isAdult}`;
    return this.executeWithDeduplicationAndCache<SeasonalAnimeItem[]>(
      cacheKey,
      this.trendingTtlMs,
      async () => {
        const res = await this.queryAniList({
          sort: ['TRENDING_DESC'],
          page: 1,
          perPage: 24,
          isAdult,
        });
        return res.items;
      }
    );
  }

  private async fetchSeason(
    season: MediaSeason,
    year: number,
    isAdult = false
  ): Promise<SeasonalAnimeItem[]> {
    const cacheKey = `season:${season}:${year}:${isAdult}`;
    return this.executeWithDeduplicationAndCache<SeasonalAnimeItem[]>(
      cacheKey,
      this.seasonalTtlMs,
      async () => {
        const res = await this.queryAniList({
          season,
          seasonYear: year,
          sort: ['POPULARITY_DESC'],
          page: 1,
          perPage: 24,
          isAdult,
        });
        return res.items;
      }
    );
  }

  private async executeWithDeduplicationAndCache<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();
    if (cached && now - cached.cachedAt < cached.ttlMs) {
      return cached.data;
    }

    if (this.inflight.has(key)) {
      return this.inflight.get(key) as Promise<T>;
    }

    const promise = (async () => {
      try {
        const data = await fetcher();
        this.cache.set(key, { data, cachedAt: Date.now(), ttlMs });
        return data;
      } catch (err) {
        // Return stale cached data if available on error (e.g. rate limit / network failure)
        if (cached) {
          this.logger?.warn?.(
            `Failed to refresh ${key}, serving stale cache due to error: ${(err as Error).message}`
          );
          return cached.data;
        }
        throw err;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  private async queryAniList(variables: {
    season?: MediaSeason;
    seasonYear?: number;
    sort?: string[];
    page?: number;
    perPage?: number;
    isAdult?: boolean;
  }): Promise<{ pageInfo: PageInfo; items: SeasonalAnimeItem[] }> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'MediaDownloadManager/1.0.0',
        },
        body: JSON.stringify({
          query: ANILIST_SEASONAL_QUERY,
          variables: {
            ...variables,
            isAdult: variables.isAdult ?? false,
          },
        }),
      });

      if (response.status === 429) {
        throw new Error('AniList rate limit exceeded (HTTP 429)');
      }

      if (!response.ok) {
        throw new Error(`AniList GraphQL request failed with status ${response.status}`);
      }

      const json = (await response.json()) as {
        data?: {
          Page?: {
            pageInfo?: PageInfo;
            media?: SeasonalAnimeItem[];
          };
        };
        errors?: Array<{ message: string }>;
      };

      if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message || 'AniList GraphQL error');
      }

      const pageInfo = json.data?.Page?.pageInfo || {
        total: 0,
        perPage: variables.perPage || 24,
        currentPage: variables.page || 1,
        lastPage: 1,
        hasNextPage: false,
      };

      const items = (json.data?.Page?.media || []).map((m) => ({
        ...m,
        averageScore: typeof m.averageScore === 'number' ? m.averageScore : null,
      }));

      return { pageInfo, items };
    } catch (err) {
      this.logger?.warn?.(`AniList query failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
