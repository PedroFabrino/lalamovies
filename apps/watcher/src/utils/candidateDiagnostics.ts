import { CAM_REGEX } from '../services/prowlarr';
import { matchesTarget } from './torrentTitleCleaner';
import { isQualifiedPreferred, getPreferredIndexerMinSeeders } from './preferredIndexer';
import type { WatchRequest } from '../db/schema';

/** Minimal shape of a release candidate needed for diagnostic evaluation. */
export interface DiagnosticCandidate {
  title: string;
  downloadUrl: string;
  score: number;
  seeders: number;
  source: string;
  indexer?: string;
}

export interface DiagnosticEvaluationResult {
  qualifying: DiagnosticCandidate[];
  diagnostic: string;
}

/** Returns true when the episode aired more than 24 hours ago, or has no known air date (treat as backlog). */
function isBacklogEpisode(tmdbReleaseDate?: string | null): boolean {
  if (!tmdbReleaseDate) return true;
  const aired = new Date(tmdbReleaseDate).getTime();
  if (isNaN(aired)) return true;
  return Date.now() - aired > 24 * 60 * 60 * 1000;
}

function meetsResolutionGate(
  candidate: DiagnosticCandidate,
  episodeMatches: DiagnosticCandidate[],
  tmdbReleaseDate?: string | null
): boolean {
  const title = candidate.title?.toLowerCase() ?? '';

  const is2160p = /\b(2160p|4k|uhd)\b/i.test(title);
  const is1080p = /\b(1080p|1080i|fhd)\b/i.test(title);
  const is720p = /\b(720p|hd)\b/i.test(title);

  // 1080p and 2160p always qualify
  if (is1080p || is2160p) return true;

  // 720p qualifies only for backlog episodes when no higher-res candidate exists in the matched set
  if (is720p) {
    const backlog = isBacklogEpisode(tmdbReleaseDate);
    if (!backlog) return false;
    const higherResExists = episodeMatches.some((c) => {
      const t = c.title?.toLowerCase() ?? '';
      return /\b(1080p|1080i|fhd|2160p|4k|uhd)\b/i.test(t);
    });
    return !higherResExists;
  }

  // 480p, unknown: disqualified
  return false;
}

type EntryContext = Pick<WatchRequest, 'mediaType' | 'seasonNumber' | 'targetEpisode'> & {
  /** Optional: supports both WatchRequest.tmdbReleaseDate and test-supplied airDate */
  tmdbReleaseDate?: string | null;
  airDate?: string | null;
};

export function evaluateCandidatesDiagnostic(
  entry: EntryContext,
  candidates: DiagnosticCandidate[]
): DiagnosticEvaluationResult {
  const isEpisodic = entry.mediaType === 'tv_show' || entry.mediaType === 'anime';
  const sNum = entry.seasonNumber ?? 1;
  const targetEp = entry.targetEpisode ?? null;

  const sStr = sNum < 10 ? `0${sNum}` : `${sNum}`;
  const eStr = targetEp ? (targetEp < 10 ? `0${targetEp}` : `${targetEp}`) : '';
  const epTag = eStr ? `S${sStr}E${eStr}` : `S${sStr}`;

  // Support tmdbReleaseDate from WatchRequest or test-supplied airDate
  const releaseDate = entry.tmdbReleaseDate ?? entry.airDate;

  let episodeMatches = candidates;
  if (isEpisodic) {
    episodeMatches = candidates.filter((c) => matchesTarget(c.title, sNum, targetEp));
  }

  const minSeeders = getPreferredIndexerMinSeeders();

  const qualifying = episodeMatches.filter((c) => {
    if (c.source === 'cam') return false;
    if (CAM_REGEX.test(c.title)) return false;

    if (isQualifiedPreferred(c)) {
      // Preferred Indexer: use configurable min seeders threshold
      if ((c.seeders ?? 0) < minSeeders) return false;
    } else {
      // Public indexers: require >= 10 seeders and score >= 100
      if (c.score < 100) return false;
      if (c.seeders < 10) return false;
    }

    // Resolution gating applies to all candidates
    if (!meetsResolutionGate(c, episodeMatches, releaseDate)) return false;

    return true;
  });

  let diagnostic: string;
  if (candidates.length === 0) {
    diagnostic = '0 releases found on indexers';
  } else if (isEpisodic && episodeMatches.length === 0) {
    diagnostic = `Found ${candidates.length} releases, 0 matched ${epTag}`;
  } else if (qualifying.length === 0) {
    if (isEpisodic) {
      diagnostic = `Found ${candidates.length} releases (${episodeMatches.length} matched ${epTag}), 0 met seed/quality criteria`;
    } else {
      diagnostic = `Found ${candidates.length} releases, 0 met seed/quality criteria`;
    }
  } else {
    diagnostic = `Found ${qualifying.length} qualifying releases; selecting top scored`;
  }

  return { qualifying, diagnostic };
}
