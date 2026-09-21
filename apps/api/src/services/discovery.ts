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
  isPrivateTracker: boolean;
  isPreferred: boolean;
  streamUrl?: string;
  streamIndexer?: string;
}

export interface DiscoveryFeedResult {
  available: boolean;
  items: DiscoveryItem[];
  error?: string;
}

export interface IDiscoveryService {
  getFeed(category: DiscoveryCategory, forceRefresh?: boolean): Promise<DiscoveryFeedResult>;
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

  async getFeed(category: DiscoveryCategory, forceRefresh = false): Promise<DiscoveryFeedResult> {
    if (!this.prowlarr.isConfigured()) {
      return { available: false, items: [], error: 'Prowlarr is not configured' };
    }

    const cached = this.cache.get(category);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.ttlMs) {
      return { available: true, items: cached.data };
    }

    if (!forceRefresh && this.inflight.has(category)) {
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

      // Semantic media type filtering:
      if (mediaType === 'movie') {
        // Exclude TV packs and episodes from Movies tab
        if (
          seasonNumber !== null ||
          episodeNumber !== null ||
          cleaned.detectedMediaType === 'tv_show' ||
          /(?:^|[\s._-])(?:s\d{1,2}|season[\s._-]*\d{1,2}|ep?[\s._-]*\d{1,3}|episode[\s._-]*\d{1,3})(?:$|[\s._-])/i.test(candidate.title)
        ) {
          continue;
        }
      } else if (mediaType === 'tv_show') {
        // Exclude standalone movies from TV tab
        if (
          seasonNumber === null &&
          episodeNumber === null &&
          cleaned.detectedMediaType === 'movie'
        ) {
          continue;
        }
      }

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

    interface SelectedGroupItem {
      parsed: ParsedCandidate;
      streamCandidate?: ReleaseCandidate;
    }

    // Select the best candidate per group (highest score, tiebreak higher seeders)
    const topCandidates: SelectedGroupItem[] = [];
    for (const group of dedupeGroups.values()) {
      group.sort((a, b) => {
        if (b.candidate.score !== a.candidate.score) {
          return b.candidate.score - a.candidate.score;
        }
        return b.candidate.seeders - a.candidate.seeders;
      });
      const winner = group[0];
      let streamCandidate: ReleaseCandidate | undefined;

      // When the winning candidate is from the Preferred Indexer, scan for the best public alternative
      if (winner.candidate.isPreferred) {
        const publicCandidates = group
          .map((g) => g.candidate)
          .filter((c) => !c.isPrivateTracker && !c.isPreferred);
        if (publicCandidates.length > 0) {
          publicCandidates.sort((a, b) => {
            if (b.score !== a.score) {
              return b.score - a.score;
            }
            return b.seeders - a.seeders;
          });
          streamCandidate = publicCandidates[0];
        }
      }

      topCandidates.push({ parsed: winner, streamCandidate });
    }

    // Rank across all groups by winner score descending, then seeders descending
    topCandidates.sort((a, b) => {
      if (b.parsed.candidate.score !== a.parsed.candidate.score) {
        return b.parsed.candidate.score - a.parsed.candidate.score;
      }
      return b.parsed.candidate.seeders - a.parsed.candidate.seeders;
    });

    // Top 10 items
    const selected = topCandidates.slice(0, 10);
    const tmdbApiKey = this.getTmdbApiKey ? this.getTmdbApiKey() : undefined;

    // 3. Metadata Enrichment
    const enrichedItems: DiscoveryItem[] = await Promise.all(
      selected.map(async (item) => {
        const { candidate, cleanTitle, year, seasonNumber, episodeNumber } = item.parsed;
        const streamCandidate = item.streamCandidate;

        let posterUrl: string | null = null;
        let rating: number | null = null;
        let overview: string | null = null;
        let metadataId: string | null = null;
        let metadataSource: 'tmdb' | 'anilist' | null = null;
        let resolvedYear = year;

        try {
          const results = await this.metadata.searchMedia(cleanTitle, mediaType, {
            year,
            apiKey: tmdbApiKey,
          });
          if (results && results.length > 0) {
            const match = results[0];
            posterUrl = match.posterUrl;
            rating = match.rating ?? null;
            overview = match.overview;
            metadataId = match.id;
            metadataSource = match.source;
            if (!resolvedYear && match.year) {
              resolvedYear = match.year;
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
          isPrivateTracker: candidate.isPrivateTracker ?? false,
          isPreferred: Boolean(candidate.isPreferred),
          streamUrl: streamCandidate ? streamCandidate.downloadUrl : undefined,
          streamIndexer: streamCandidate ? streamCandidate.indexer : undefined,
        };
      })
    );

    // Save into cache
    this.cache.set(category, { timestamp: Date.now(), data: enrichedItems });

    return { available: true, items: enrichedItems };
  }
}
