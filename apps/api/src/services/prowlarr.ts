export type Resolution = '2160p' | '1080p' | '720p' | '480p' | 'unknown';
export type VideoCodec = 'x265' | 'x264' | 'av1' | 'xvid' | 'unknown';
export type ReleaseSource = 'bluray' | 'web' | 'remux' | 'hdtv' | 'cam' | 'unknown';

export interface ReleaseCandidate {
  guid: string;
  title: string;
  sizeBytes: number;
  formattedSize: string;
  seeders: number;
  leechers: number;
  downloadUrl: string;
  indexer: string;
  resolution: Resolution;
  codec: VideoCodec;
  source: ReleaseSource;
  score: number;
  isLowHealth: boolean;
}

export interface SearchReleasesResult {
  recommended: ReleaseCandidate | null;
  candidates: ReleaseCandidate[];
  totalFound: number;
  isConfigured: boolean;
}

export interface SearchReleasesOptions {
  mediaType: 'movie' | 'tv_show' | 'anime';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  romajiTitle?: string | null;
  englishTitle?: string | null;
}

export interface ScoreOptions {
  mediaType?: 'movie' | 'tv_show' | 'anime';
  isSingleEpisode?: boolean;
}

export interface IProwlarrService {
  isConfigured(): boolean;
  parseReleaseTitle(title: string): { resolution: Resolution; codec: VideoCodec; source: ReleaseSource };
  scoreRelease(
    candidate: Omit<ReleaseCandidate, 'score' | 'isLowHealth'>,
    options?: ScoreOptions
  ): { score: number; isLowHealth: boolean };
  searchMovieReleases(title: string, year?: number | null): Promise<SearchReleasesResult>;
  searchReleases(options: SearchReleasesOptions): Promise<SearchReleasesResult>;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const clampedIndex = Math.min(i, units.length - 1);
  return `${(bytes / Math.pow(1024, clampedIndex)).toFixed(1)} ${units[clampedIndex]}`;
}

export class ProwlarrService implements IProwlarrService {
  private prowlarrUrl: string;
  private apiKey: string;

  constructor(prowlarrUrl?: string, apiKey?: string) {
    this.prowlarrUrl = (prowlarrUrl || process.env.PROWLARR_URL || 'http://localhost:9696').replace(/\/+$/, '');
    this.apiKey = apiKey || process.env.PROWLARR_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  parseReleaseTitle(title: string): { resolution: Resolution; codec: VideoCodec; source: ReleaseSource } {
    const lower = title.toLowerCase();

    // 1. Resolution
    let resolution: Resolution = 'unknown';
    if (/\b(2160p|4k|uhd)\b/i.test(lower)) {
      resolution = '2160p';
    } else if (/\b(1080p|1080i|fhd)\b/i.test(lower)) {
      resolution = '1080p';
    } else if (/\b(720p|hd)\b/i.test(lower)) {
      resolution = '720p';
    } else if (/\b(480p|576p|sd)\b/i.test(lower)) {
      resolution = '480p';
    }

    // 2. Video Codec
    let codec: VideoCodec = 'unknown';
    if (/\b(x265|h265|hevc)\b/i.test(lower)) {
      codec = 'x265';
    } else if (/\b(x264|h264|avc)\b/i.test(lower)) {
      codec = 'x264';
    } else if (/\b(av1)\b/i.test(lower)) {
      codec = 'av1';
    } else if (/\b(xvid|divx)\b/i.test(lower)) {
      codec = 'xvid';
    }

    // 3. Source
    let source: ReleaseSource = 'unknown';
    if (/\b(cam|camrip|ts|telesync|hdcam|hdts)\b/i.test(lower)) {
      source = 'cam';
    } else if (/\b(remux)\b/i.test(lower)) {
      source = 'remux';
    } else if (/\b(bluray|blu-ray|bdrip|brrip)\b/i.test(lower)) {
      source = 'bluray';
    } else if (/\b(web-?dl|web-?rip|web)\b/i.test(lower)) {
      source = 'web';
    } else if (/\b(hdtv)\b/i.test(lower)) {
      source = 'hdtv';
    }

    return { resolution, codec, source };
  }

  scoreRelease(
    candidate: Omit<ReleaseCandidate, 'score' | 'isLowHealth'>,
    options?: ScoreOptions
  ): { score: number; isLowHealth: boolean } {
    let score = 0;

    // Resolution weights
    switch (candidate.resolution) {
      case '1080p':
        score += 100;
        break;
      case '720p':
        score += 50;
        break;
      case '2160p':
        score += 20;
        break;
      case '480p':
        score += 10;
        break;
      default:
        score += 0;
    }

    // Codec weights
    if (candidate.codec === 'x265') {
      score += 15;
    } else if (candidate.codec === 'x264') {
      score += 10;
    }

    // Source weights
    if (candidate.source === 'bluray' || candidate.source === 'web') {
      score += 10;
    } else if (candidate.source === 'remux') {
      score += 5;
    } else if (candidate.source === 'cam') {
      score -= 200; // Heavily penalize CAM/telesync
    }

    const GB = 1024 * 1024 * 1024;
    const MB = 1024 * 1024;

    if (options?.isSingleEpisode) {
      // Single Episode sizing: max 2 GB cap
      if (candidate.sizeBytes <= 1.5 * GB) {
        score += 20;
      } else if (candidate.sizeBytes > 2 * GB && candidate.sizeBytes <= 4 * GB) {
        score -= 80;
      } else if (candidate.sizeBytes > 4 * GB) {
        score -= 150;
      } else if (candidate.sizeBytes < 100 * MB) {
        score -= 50;
      }
    } else if (options?.mediaType === 'tv_show') {
      // Season Pack sizing: max 25 GB cap
      if (candidate.sizeBytes >= 3 * GB && candidate.sizeBytes <= 20 * GB) {
        score += 20;
      } else if (candidate.sizeBytes > 25 * GB && candidate.sizeBytes <= 40 * GB) {
        score -= 80;
      } else if (candidate.sizeBytes > 40 * GB) {
        score -= 150;
      } else if (candidate.sizeBytes < 1 * GB) {
        score -= 50;
      }
    } else {
      // Movie / Default sizing: max 10 GB cap
      if (candidate.sizeBytes >= 1.5 * GB && candidate.sizeBytes <= 8 * GB) {
        score += 20;
      } else if (candidate.sizeBytes > 10 * GB && candidate.sizeBytes <= 20 * GB) {
        score -= 80;
      } else if (candidate.sizeBytes > 20 * GB) {
        score -= 150;
      } else if (candidate.sizeBytes < 500 * MB) {
        score -= 50;
      }
    }

    // Seeders health bonus (capped at 50 points)
    score += Math.min(candidate.seeders, 50);

    const isLowHealth = candidate.seeders < 5;

    return { score, isLowHealth };
  }

  private async executeSearch(query: string, categories: number[], scoreOptions: ScoreOptions): Promise<ReleaseCandidate[]> {
    const endpointUrl = `${this.prowlarrUrl}/api/v1/search?query=${encodeURIComponent(
      query
    )}&type=search&categories=${categories.join(',')}`;

    let response: Response;
    try {
      response = await fetch(endpointUrl, {
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'application/json',
        },
      });
    } catch {
      return [];
    }

    if (!response.ok) {
      return [];
    }

    const rawData = (await response.json()) as Array<{
      guid?: string;
      title?: string;
      size?: number;
      indexer?: string;
      seeders?: number;
      leechers?: number;
      downloadUrl?: string;
      magnetUrl?: string;
      infoHash?: string;
    }>;

    const candidates: ReleaseCandidate[] = [];

    for (const item of rawData) {
      const releaseTitle = item.title?.trim() || '';
      const downloadUrl = item.magnetUrl || item.downloadUrl || '';

      if (!releaseTitle || !downloadUrl) {
        continue;
      }

      const sizeBytes = item.size || 0;
      const seeders = typeof item.seeders === 'number' ? Math.max(0, item.seeders) : 0;
      const leechers = typeof item.leechers === 'number' ? Math.max(0, item.leechers) : 0;
      const indexer = item.indexer || 'Tracker';
      const guid = item.guid || downloadUrl;

      const { resolution, codec, source } = this.parseReleaseTitle(releaseTitle);
      const { score, isLowHealth } = this.scoreRelease(
        {
          guid,
          title: releaseTitle,
          sizeBytes,
          formattedSize: formatBytes(sizeBytes),
          seeders,
          leechers,
          downloadUrl,
          indexer,
          resolution,
          codec,
          source,
        },
        scoreOptions
      );

      candidates.push({
        guid,
        title: releaseTitle,
        sizeBytes,
        formattedSize: formatBytes(sizeBytes),
        seeders,
        leechers,
        downloadUrl,
        indexer,
        resolution,
        codec,
        source,
        score,
        isLowHealth,
      });
    }

    return candidates;
  }

  async searchMovieReleases(title: string, year?: number | null): Promise<SearchReleasesResult> {
    return this.searchReleases({
      mediaType: 'movie',
      title,
      year,
    });
  }

  async searchReleases(options: SearchReleasesOptions): Promise<SearchReleasesResult> {
    if (!this.isConfigured()) {
      return {
        recommended: null,
        candidates: [],
        totalFound: 0,
        isConfigured: false,
      };
    }

    const { mediaType, title, year, seasonNumber, episodeNumber, romajiTitle, englishTitle } = options;
    const isSingleEpisode = episodeNumber !== undefined && episodeNumber !== null;
    const scoreOptions: ScoreOptions = { mediaType, isSingleEpisode };

    let candidates: ReleaseCandidate[] = [];

    if (mediaType === 'movie') {
      const queryParts = [title.trim()];
      if (year) {
        queryParts.push(String(year));
      }
      const query = queryParts.join(' ');
      candidates = await this.executeSearch(query, [2000], scoreOptions);
    } else if (mediaType === 'tv_show') {
      const sNum = seasonNumber && seasonNumber > 0 ? seasonNumber : 1;
      const sPad = String(sNum).padStart(2, '0');

      let query = '';
      if (isSingleEpisode) {
        const ePad = String(episodeNumber).padStart(2, '0');
        query = `${title.trim()} S${sPad}E${ePad}`;
      } else {
        query = `${title.trim()} S${sPad}`;
      }

      candidates = await this.executeSearch(query, [5000], scoreOptions);
    } else if (mediaType === 'anime') {
      const animeCategories = [5070, 2070];
      const primaryTitle = (romajiTitle && romajiTitle.trim().length > 0 ? romajiTitle.trim() : title.trim());

      let primaryQuery = '';
      if (isSingleEpisode) {
        const ePad = String(episodeNumber).padStart(2, '0');
        primaryQuery = `${primaryTitle} - ${ePad}`;
      } else if (seasonNumber && seasonNumber > 1) {
        const sPad = String(seasonNumber).padStart(2, '0');
        primaryQuery = `${primaryTitle} S${sPad}`;
      } else {
        primaryQuery = primaryTitle;
      }

      candidates = await this.executeSearch(primaryQuery, animeCategories, scoreOptions);

      // Fallback to English title if fewer than 3 candidates found and English title is different
      const altTitle = englishTitle && englishTitle.trim();
      if (candidates.length < 3 && altTitle && altTitle.toLowerCase() !== primaryTitle.toLowerCase()) {
        let altQuery = '';
        if (isSingleEpisode) {
          const ePad = String(episodeNumber).padStart(2, '0');
          altQuery = `${altTitle} - ${ePad}`;
        } else if (seasonNumber && seasonNumber > 1) {
          const sPad = String(seasonNumber).padStart(2, '0');
          altQuery = `${altTitle} S${sPad}`;
        } else {
          altQuery = altTitle;
        }

        const fallbackCandidates = await this.executeSearch(altQuery, animeCategories, scoreOptions);
        const existingGuids = new Set(candidates.map((c) => c.guid || c.downloadUrl));
        for (const fb of fallbackCandidates) {
          const key = fb.guid || fb.downloadUrl;
          if (!existingGuids.has(key)) {
            candidates.push(fb);
            existingGuids.add(key);
          }
        }
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Recommended release must be healthy (seeders >= 5) and score > 0
    const recommended = candidates.find((c) => !c.isLowHealth && c.score > 0) || null;

    return {
      recommended,
      candidates,
      totalFound: candidates.length,
      isConfigured: true,
    };
  }
}
