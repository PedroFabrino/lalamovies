import { extractEpisodeInfo } from '../../utils/torrentTitleCleaner';
import { isQualifiedPreferred } from '../../utils/preferredIndexer';

export type Resolution = '2160p' | '1080p' | '720p' | '480p' | 'unknown';
export type VideoCodec = 'x265' | 'x264' | 'av1' | 'xvid' | 'unknown';
export type ReleaseSource = 'bluray' | 'web' | 'remux' | 'hdtv' | 'cam' | 'unknown';

export interface ScoreOptions {
  mediaType?: 'movie' | 'tv_show' | 'anime' | 'private';
  isSingleEpisode?: boolean;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  title?: string;
  aliases?: string[];
}

export function isTitleRelevant(
  candidateTitle: string,
  targetTitle: string,
  aliases?: string[]
): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[._\-–—[\](){}:;!?'"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const STOP_WORDS = new Set([
    'and', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'a', 'an', 'is', 'no', 'na', 'da', 'de', 'la', 'le',
  ]);

  const candidateNorm = norm(candidateTitle);
  const candidateTokens = new Set(
    candidateNorm
      .split(' ')
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
  );

  const targets = [targetTitle, ...(aliases || [])].filter(Boolean);

  for (const target of targets) {
    const targetNorm = norm(target);
    if (!targetNorm) continue;

    if (candidateNorm.includes(targetNorm)) {
      return true;
    }

    const targetTokens = targetNorm
      .split(' ')
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

    if (targetTokens.length === 0) continue;

    const matchedCount = targetTokens.filter((t) => candidateTokens.has(t)).length;

    if (targetTokens.length === 1) {
      if (matchedCount === 1) return true;
    } else if (targetTokens.length === 2) {
      if (matchedCount >= 1) return true;
    } else {
      if (matchedCount >= 2 || matchedCount / targetTokens.length >= 0.5) {
        return true;
      }
    }
  }

  return false;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const clampedIndex = Math.min(i, units.length - 1);
  return `${(bytes / Math.pow(1024, clampedIndex)).toFixed(1)} ${units[clampedIndex]}`;
}

export function parseReleaseTitle(title: string): { resolution: Resolution; codec: VideoCodec; source: ReleaseSource } {
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

export interface ScorableCandidate {
  guid?: string;
  title: string;
  sizeBytes: number;
  formattedSize?: string;
  seeders: number;
  leechers?: number;
  downloadUrl?: string;
  indexer?: string;
  resolution: Resolution;
  codec: VideoCodec;
  source: ReleaseSource;
  isPrivateTracker?: boolean;
  isPreferred?: boolean;
}

export function scoreRelease(
  candidate: ScorableCandidate,
  options?: ScoreOptions
): { score: number; isLowHealth: boolean } {
  let score = 0;

  // Resolution weights
  switch (candidate.resolution) {
    case '1080p':
      // Primary resolution target — ranked above 4K for series to conserve storage
      score += 105;
      break;
    case '720p':
      score += 50;
      break;
    case '2160p':
      // Qualifies for auto-download (>= 100) but ranked below 1080p for episodic series
      score += 100;
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

  // Season & Episode Guard
  if (options?.seasonNumber !== undefined && options?.seasonNumber !== null) {
    const info = extractEpisodeInfo(candidate.title);

    // Explicit season mismatch (e.g. S02 when S01 was requested)
    if (info.seasonNumber !== undefined && info.seasonNumber !== options.seasonNumber) {
      score -= 500;
    }

    // Season pack vs Single Episode
    if (!options.isSingleEpisode) {
      if (info.episodeNumber !== undefined) {
        // Individual episode returned when user requested a full season pack
        score -= 150;
      } else if (info.seasonNumber === options.seasonNumber) {
        // Explicitly matched season pack
        score += 30;
      }
    } else if (options.episodeNumber !== undefined && options.episodeNumber !== null) {
      if (info.episodeNumber !== undefined && info.episodeNumber !== options.episodeNumber) {
        // Explicit episode mismatch
        score -= 500;
      } else if (info.episodeNumber === options.episodeNumber) {
        // Exact episode match
        score += 30;
      }
    }
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
  } else if (
    options?.mediaType === 'tv_show' ||
    options?.mediaType === 'anime' ||
    (options?.mediaType === 'private' && options.seasonNumber != null && options.episodeNumber == null)
  ) {
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

  // Preferred Indexer bonus (+300 points for qualified preferred candidates)
  if (isQualifiedPreferred(candidate)) {
    score += 300;
  }

  // Title Relevance Guard
  if (options?.title && options.title.trim()) {
    if (!isTitleRelevant(candidate.title, options.title, options.aliases)) {
      score -= 1000;
    } else {
      score += 25;
    }
  }

  const isLowHealth = candidate.seeders < 5;

  return { score, isLowHealth };
}
