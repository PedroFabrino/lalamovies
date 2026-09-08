import { IProwlarrService, ReleaseCandidate, Resolution, ScoreOptions } from './prowlarr';
import { IMetadataService } from './metadata';
import { cleanTorrentTitle, extractEpisodeInfo } from '../utils/torrentTitleCleaner';

export type DiscoveryCategory = 'movies' | 'tv' | 'anime';

export interface DiscoveryItem {
  id: string;
  title: string;
  rawTitle: string;
  mediaType: 'movie' | 'tv_show' | 'anime';
  year: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
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
  metadataId: string | null;
  metadataSource: 'tmdb' | 'anilist' | null;
}

export interface DiscoveryFeedResult {
  available: boolean;
  items: DiscoveryItem[];
  error?: string;
}

export interface IDiscoveryService {
  getFeed(category: DiscoveryCategory): Promise<DiscoveryFeedResult>;
  clearCache(): void;
}

export interface DiscoveryServiceOptions {
  prowlarr: IProwlarrService;
  metadata: IMetadataService;
  ttlMs?: number;
  getTmdbApiKey?: () => string | undefined;
}

const CAM_REGEX = /\b(CAM|CAMRip|TS|TELESYNC|TeleSync|HDCAM|HDTS|WORKPRINT|WP)\b/i;

function extractTitleAndYear(cleanedTitle: string): { title: string; year: number | null } {
  const match = cleanedTitle.match(/^(.*?)\s+((?:19|20)\d{2})$/);
  if (match) {
    return { title: match[1].trim(), year: parseInt(match[2], 10) };
  }
  return { title: cleanedTitle.trim(), year: null };
}

export class DiscoveryService implements IDiscoveryService {
  private prowlarr: IProwlarrService;
  private metadata: IMetadataService;
  private ttlMs: number;
  private getTmdbApiKey?: () => string | undefined;

  private cache = new Map<DiscoveryCategory, { timestamp: number; data: DiscoveryItem[] }>();
  private inflight = new Map<DiscoveryCategory, Promise<DiscoveryFeedResult>>();

  constructor(options: DiscoveryServiceOptions) {
    this.prowlarr = options.prowlarr;
    this.metadata = options.metadata;
    this.ttlMs = options.ttlMs ?? 60 * 60 * 1000;
    this.getTmdbApiKey = options.getTmdbApiKey;
  }

  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  async getFeed(category: DiscoveryCategory): Promise<DiscoveryFeedResult> {
    if (!this.prowlarr.isConfigured()) {
      return { available: false, items: [], error: 'Prowlarr is not configured' };
    }

    const cached = this.cache.get(category);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      return { available: true, items: cached.data };
    }

    if (this.inflight.has(category)) {
      return this.inflight.get(category)!;
    }

    const promise = this.fetchAndEnrichFeed(category).finally(() => {
      this.inflight.delete(category);
    });

    this.inflight.set(category, promise);
    return promise;
  }

  private async fetchAndEnrichFeed(category: DiscoveryCategory): Promise<DiscoveryFeedResult> {
    let categories: number[];
    let mediaType: 'movie' | 'tv_show' | 'anime';
    let scoreOptions: ScoreOptions;

    switch (category) {
      case 'movies':
        categories = [2000];
        mediaType = 'movie';
        scoreOptions = { mediaType: 'movie' };
        break;
      case 'tv':
        categories = [5000];
        mediaType = 'tv_show';
        scoreOptions = { mediaType: 'tv_show' };
        break;
      case 'anime':
        categories = [5070, 2070];
        mediaType = 'anime';
        scoreOptions = { mediaType: 'anime' };
        break;
    }

    let searchRes: { candidates: ReleaseCandidate[]; isReachable: boolean; error?: string };
    try {
      searchRes = await this.prowlarr.searchLatestByCategory(categories, scoreOptions);
    } catch (err) {
      return { available: false, items: [], error: (err as Error).message };
    }

    if (!searchRes.isReachable) {
      return { available: false, items: [], error: searchRes.error || 'Prowlarr unreachable' };
    }

    // 1. Strict quality filtering:
    // - seeders >= 10
    // - score > 0
    // - eliminate CAM, Telesync, Workprint
    const qualityFiltered = searchRes.candidates.filter((candidate) => {
      if (candidate.seeders < 10) return false;
      if (candidate.score <= 0) return false;
      if (candidate.source === 'cam') return false;
      if (CAM_REGEX.test(candidate.title)) return false;
      return true;
    });

    // 2. Title extraction and deduplication
    interface ParsedCandidate {
      candidate: ReleaseCandidate;
      cleanTitle: string;
      year: number | null;
      seasonNumber: number | null;
      episodeNumber: number | null;
      dedupeKey: string;
    }

    const dedupeGroups = new Map<string, ParsedCandidate[]>();

    for (const candidate of qualityFiltered) {
      const cleaned = cleanTorrentTitle(candidate.title);
      const epInfo = extractEpisodeInfo(candidate.title);

      const titleAndYear = extractTitleAndYear(cleaned.title || candidate.title);
      const cleanTitle = titleAndYear.title;
      const year = titleAndYear.year;
      const seasonNumber = epInfo.seasonNumber ?? cleaned.seasonNumber ?? null;
      const episodeNumber = epInfo.episodeNumber ?? null;

      let dedupeKey: string;
      if (mediaType === 'movie') {
        dedupeKey = cleanTitle.toLowerCase();
      } else {
        if (episodeNumber !== null) {
          dedupeKey = `${cleanTitle.toLowerCase()}_s${seasonNumber ?? 1}_e${episodeNumber}`;
        } else if (seasonNumber !== null) {
          dedupeKey = `${cleanTitle.toLowerCase()}_s${seasonNumber}`;
        } else {
          dedupeKey = cleanTitle.toLowerCase();
        }
      }

      const parsed: ParsedCandidate = {
        candidate,
        cleanTitle,
        year,
        seasonNumber,
        episodeNumber,
        dedupeKey,
      };

      const group = dedupeGroups.get(dedupeKey) || [];
      group.push(parsed);
      dedupeGroups.set(dedupeKey, group);
    }

    // Select the best candidate per group (highest score, tiebreak higher seeders)
    const topCandidates: ParsedCandidate[] = [];
    for (const group of dedupeGroups.values()) {
      group.sort((a, b) => {
        if (b.candidate.score !== a.candidate.score) {
          return b.candidate.score - a.candidate.score;
        }
        return b.candidate.seeders - a.candidate.seeders;
      });
      topCandidates.push(group[0]);
    }

    // Rank across all groups by score descending, then seeders descending
    topCandidates.sort((a, b) => {
      if (b.candidate.score !== a.candidate.score) {
        return b.candidate.score - a.candidate.score;
      }
      return b.candidate.seeders - a.candidate.seeders;
    });

    // Top 10 items
    const selected = topCandidates.slice(0, 10);
    const tmdbApiKey = this.getTmdbApiKey ? this.getTmdbApiKey() : undefined;

    // 3. Metadata Enrichment
    const enrichedItems: DiscoveryItem[] = await Promise.all(
      selected.map(async (item) => {
        const { candidate, cleanTitle, year, seasonNumber, episodeNumber } = item;

        let posterUrl: string | null = null;
        let rating: number | null = null;
        let overview: string | null = null;
        let metadataId: string | null = null;
        let metadataSource: 'tmdb' | 'anilist' | null = null;
        let resolvedYear = year;

        try {
          if (mediaType === 'anime') {
            let aniMatch: any = null;
            try {
              const aniResults = await this.metadata.searchAniList(cleanTitle);
              if (aniResults && aniResults.length > 0) {
                aniMatch = aniResults[0];
              }
            } catch {
              // AniList error, will fallback to TMDB
            }

            if (aniMatch) {
              posterUrl = aniMatch.posterUrl;
              rating = aniMatch.rating ?? null;
              overview = aniMatch.overview;
              metadataId = aniMatch.id;
              metadataSource = 'anilist';
              if (!resolvedYear && aniMatch.year) {
                resolvedYear = aniMatch.year;
              }
            } else {
              // Fallback to TMDB for anime
              try {
                const tmdbResults = await this.metadata.searchTMDB(cleanTitle, 'tv_show', tmdbApiKey);
                if (tmdbResults && tmdbResults.length > 0) {
                  const tmdbMatch = tmdbResults[0];
                  posterUrl = tmdbMatch.posterUrl;
                  rating = tmdbMatch.rating ?? null;
                  overview = tmdbMatch.overview;
                  metadataId = tmdbMatch.id;
                  metadataSource = 'tmdb';
                  if (!resolvedYear && tmdbMatch.year) {
                    resolvedYear = tmdbMatch.year;
                  }
                }
              } catch {
                // Ignore fallback error
              }
            }
          } else {
            // Movie or TV Show
            const tmdbType = mediaType === 'movie' ? 'movie' : 'tv_show';
            const tmdbResults = await this.metadata.searchTMDB(cleanTitle, tmdbType, tmdbApiKey);
            if (tmdbResults && tmdbResults.length > 0) {
              const tmdbMatch = tmdbResults[0];
              posterUrl = tmdbMatch.posterUrl;
              rating = tmdbMatch.rating ?? null;
              overview = tmdbMatch.overview;
              metadataId = tmdbMatch.id;
              metadataSource = 'tmdb';
              if (!resolvedYear && tmdbMatch.year) {
                resolvedYear = tmdbMatch.year;
              }
            }
          }
        } catch {
          // Graceful fallback if metadata fails entirely
        }

        return {
          id: candidate.guid || candidate.downloadUrl,
          title: cleanTitle,
          rawTitle: candidate.title,
          mediaType,
          year: resolvedYear,
          seasonNumber,
          episodeNumber,
          posterUrl,
          rating,
          overview,
          resolution: candidate.resolution,
          sizeBytes: candidate.sizeBytes,
          formattedSize: candidate.formattedSize,
          seeders: candidate.seeders,
          indexer: candidate.indexer,
          downloadUrl: candidate.downloadUrl,
          score: candidate.score,
          metadataId,
          metadataSource,
        };
      })
    );

    // Save into cache
    this.cache.set(category, { timestamp: Date.now(), data: enrichedItems });

    return { available: true, items: enrichedItems };
  }
}
