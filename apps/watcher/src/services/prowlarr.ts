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

export interface ScoreOptions {
  mediaType?: 'movie' | 'tv_show' | 'anime';
  isSingleEpisode?: boolean;
}

export const CAM_REGEX = /\b(CAM|CAMRip|TS|TELESYNC|TeleSync|HDCAM|HDTS|WORKPRINT|WP)\b/i;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const clampedIndex = Math.min(i, units.length - 1);
  return `${(bytes / Math.pow(1024, clampedIndex)).toFixed(1)} ${units[clampedIndex]}`;
}

export function parseReleaseTitle(title: string): { resolution: Resolution; codec: VideoCodec; source: ReleaseSource } {
  const lower = title.toLowerCase();

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

  let source: ReleaseSource = 'unknown';
  if (CAM_REGEX.test(lower) || /\b(cam|camrip|ts|telesync|hdcam|hdts)\b/i.test(lower)) {
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

export function scoreRelease(
  candidate: Omit<ReleaseCandidate, 'score' | 'isLowHealth'>,
  options?: ScoreOptions
): { score: number; isLowHealth: boolean } {
  let score = 0;

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

  if (candidate.codec === 'x265') {
    score += 15;
  } else if (candidate.codec === 'x264') {
    score += 10;
  }

  if (candidate.source === 'bluray' || candidate.source === 'web') {
    score += 10;
  } else if (candidate.source === 'remux') {
    score += 5;
  } else if (candidate.source === 'cam') {
    score -= 200;
  }

  const GB = 1024 * 1024 * 1024;
  const MB = 1024 * 1024;

  if (options?.isSingleEpisode) {
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

  score += Math.min(candidate.seeders, 50);
  const isLowHealth = candidate.seeders < 5;

  return { score, isLowHealth };
}

export interface WatcherProwlarrOptions {
  prowlarrUrl?: string;
  apiKey?: string;
}

export class WatcherProwlarrService {
  private prowlarrUrl: string;
  private apiKey: string;

  constructor(options: WatcherProwlarrOptions = {}) {
    this.prowlarrUrl = (options.prowlarrUrl || process.env.PROWLARR_URL || 'http://localhost:9696').replace(/\/+$/, '');
    this.apiKey = options.apiKey || process.env.PROWLARR_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async searchForEntry(entry: {
    mediaType: 'movie' | 'tv_show' | 'anime';
    title: string;
    year?: number | null;
    seasonNumber?: number | null;
    targetEpisode?: number | null;
  }): Promise<ReleaseCandidate[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const { mediaType, title, year, seasonNumber, targetEpisode } = entry;
    const isSingleEpisode = targetEpisode !== undefined && targetEpisode !== null;
    const scoreOptions: ScoreOptions = { mediaType, isSingleEpisode };

    let query = '';
    let categories: number[] = [2000];

    if (mediaType === 'movie') {
      const parts = [title.trim()];
      if (year) parts.push(String(year));
      query = parts.join(' ');
      categories = [2000];
    } else if (mediaType === 'tv_show') {
      const sNum = seasonNumber && seasonNumber > 0 ? seasonNumber : 1;
      const sPad = String(sNum).padStart(2, '0');
      if (isSingleEpisode) {
        const ePad = String(targetEpisode).padStart(2, '0');
        query = `${title.trim()} S${sPad}E${ePad}`;
      } else {
        query = `${title.trim()} S${sPad}`;
      }
      categories = [5000];
    } else if (mediaType === 'anime') {
      categories = [5070, 2070];
      const sNum = seasonNumber && seasonNumber > 0 ? seasonNumber : 1;
      const sPad = String(sNum).padStart(2, '0');
      if (isSingleEpisode) {
        const ePad = String(targetEpisode).padStart(2, '0');
        query = `${title.trim()} S${sPad}E${ePad}`;
      } else {
        query = `${title.trim()} S${sPad}`;
      }
    }

    const catParams = categories.map((c) => `categories=${encodeURIComponent(c)}`).join('&');
    const endpointUrl = `${this.prowlarrUrl}/api/v1/search?query=${encodeURIComponent(query)}&type=search&${catParams}`;

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

      const { resolution, codec, source } = parseReleaseTitle(releaseTitle);
      const { score, isLowHealth } = scoreRelease(
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
}