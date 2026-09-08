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

export interface IProwlarrService {
  isConfigured(): boolean;
  parseReleaseTitle(title: string): { resolution: Resolution; codec: VideoCodec; source: ReleaseSource };
  scoreRelease(candidate: Omit<ReleaseCandidate, 'score' | 'isLowHealth'>): { score: number; isLowHealth: boolean };
  searchMovieReleases(title: string, year?: number | null): Promise<SearchReleasesResult>;
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

  scoreRelease(candidate: Omit<ReleaseCandidate, 'score' | 'isLowHealth'>): { score: number; isLowHealth: boolean } {
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

    // Size Safety (ideal 1.5 GB - 8 GB, cap at 10 GB for movies)
    const GB = 1024 * 1024 * 1024;
    const MB = 1024 * 1024;

    if (candidate.sizeBytes >= 1.5 * GB && candidate.sizeBytes <= 8 * GB) {
      score += 20;
    } else if (candidate.sizeBytes > 10 * GB && candidate.sizeBytes <= 20 * GB) {
      score -= 80;
    } else if (candidate.sizeBytes > 20 * GB) {
      score -= 150;
    } else if (candidate.sizeBytes < 500 * MB) {
      score -= 50;
    }

    // Seeders health bonus (capped at 50 points)
    score += Math.min(candidate.seeders, 50);

    const isLowHealth = candidate.seeders < 5;

    return { score, isLowHealth };
  }

  async searchMovieReleases(title: string, year?: number | null): Promise<SearchReleasesResult> {
    if (!this.isConfigured()) {
      return {
        recommended: null,
        candidates: [],
        totalFound: 0,
        isConfigured: false,
      };
    }

    const queryParts = [title.trim()];
    if (year) {
      queryParts.push(String(year));
    }
    const cleanQuery = queryParts.join(' ');

    const endpointUrl = `${this.prowlarrUrl}/api/v1/search?query=${encodeURIComponent(
      cleanQuery
    )}&type=search&categories=2000`;

    let response: Response;
    try {
      response = await fetch(endpointUrl, {
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'application/json',
        },
      });
    } catch (err) {
      // Prowlarr down / unreachable
      return {
        recommended: null,
        candidates: [],
        totalFound: 0,
        isConfigured: true,
      };
    }

    if (!response.ok) {
      return {
        recommended: null,
        candidates: [],
        totalFound: 0,
        isConfigured: true,
      };
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
      const { score, isLowHealth } = this.scoreRelease({
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
      });

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

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Pick top recommended release that has healthy seeders and non-negative score
    const recommended = candidates.find((c) => !c.isLowHealth && c.score > 0) || null;

    return {
      recommended,
      candidates,
      totalFound: candidates.length,
      isConfigured: true,
    };
  }
}
