import { CAM_REGEX, ProwlarrSearchResult } from '../services/prowlarr';
import { matchesTarget } from './torrentTitleCleaner';
import type { WatchRequest } from '../db/schema';

export interface DiagnosticEvaluationResult {
  qualifying: ProwlarrSearchResult[];
  diagnostic: string;
}

export function evaluateCandidatesDiagnostic(
  entry: Pick<WatchRequest, 'mediaType' | 'seasonNumber' | 'targetEpisode'>,
  candidates: ProwlarrSearchResult[]
): DiagnosticEvaluationResult {
  const isEpisodic = entry.mediaType === 'tv_show' || entry.mediaType === 'anime';
  const sNum = entry.seasonNumber ?? 1;
  const targetEp = entry.targetEpisode ?? null;

  const sStr = sNum < 10 ? `0${sNum}` : `${sNum}`;
  const eStr = targetEp ? (targetEp < 10 ? `0${targetEp}` : `${targetEp}`) : '';
  const epTag = eStr ? `S${sStr}E${eStr}` : `S${sStr}`;

  let episodeMatches = candidates;
  if (isEpisodic) {
    episodeMatches = candidates.filter((c) => matchesTarget(c.title, sNum, targetEp));
  }

  const qualifying = episodeMatches.filter((c) => {
    if (c.score < 100) return false;
    if (c.seeders < 10) return false;
    if (c.source === 'cam') return false;
    if (CAM_REGEX.test(c.title)) return false;
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
