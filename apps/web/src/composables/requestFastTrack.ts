import type { LocationQuery } from 'vue-router';
import type { MediaType } from '../stores/requests';
import { formatBytes } from '../lib/formatters';
import { isKnownPrivateIndexer, type ReleaseCandidate } from '../lib/releaseExplorer';
import type { MetadataCandidate } from './requestTypes';

export interface FastTrackParsedData {
  mediaType: MediaType;
  candidate: MetadataCandidate;
  release: ReleaseCandidate;
  seasonNumber: number | null;
  episodeNumber: number | null;
  downloadGranularity: 'season' | 'episode';
  watchForNextEpisodes: boolean;
}

export function parseFastTrack(
  query: LocationQuery,
  state: Record<string, unknown> = {}
): { data?: FastTrackParsedData; error?: string } {
  const rawTitle = (query.title || (typeof state.title === 'string' ? state.title : undefined)) as string | undefined;
  const rawMetadataId = (query.metadataId || (state.metadataId ? String(state.metadataId) : undefined)) as string | undefined;
  const rawDownloadUrl = (query.downloadUrl || (typeof state.downloadUrl === 'string' ? state.downloadUrl : undefined)) as string | undefined;
  const rawMediaType = (query.mediaType || (typeof state.mediaType === 'string' ? state.mediaType : undefined)) as string | undefined;

  if (!rawTitle || !rawMetadataId || !rawDownloadUrl || !rawMediaType) {
    if (query.fastTrack === 'true' || query.downloadUrl || query.releaseTitle || query.metadataId) {
      return { error: 'Incomplete fast-track parameters. Please search or upload manually.' };
    }
    return {};
  }

  const validMediaTypes: MediaType[] = ['movie', 'tv_show', 'anime', 'private'];
  if (!validMediaTypes.includes(rawMediaType as MediaType)) {
    return { error: 'Invalid media type for fast-track request.' };
  }

  const mediaType = rawMediaType as MediaType;
  const rawYear = query.year || state.year;
  const yearNum = rawYear ? parseInt(String(rawYear), 10) : null;

  const candidate: MetadataCandidate = {
    id: String(rawMetadataId),
    source: (query.metadataSource === 'anilist' || state.metadataSource === 'anilist') ? 'anilist' : 'tmdb',
    title: String(rawTitle),
    year: yearNum !== null && !isNaN(yearNum) ? yearNum : null,
    posterUrl: (query.posterUrl as string) || (typeof state.posterUrl === 'string' ? state.posterUrl : null),
    overview: (query.overview as string) || (typeof state.overview === 'string' ? state.overview : null),
    romajiTitle: (query.romajiTitle as string) || (typeof state.romajiTitle === 'string' ? state.romajiTitle : null),
    englishTitle: (query.englishTitle as string) || (typeof state.englishTitle === 'string' ? state.englishTitle : null),
  };

  let seasonNumber: number | null = null;
  if (query.seasonNumber !== undefined || state.seasonNumber !== undefined) {
    const s = parseInt(String(query.seasonNumber ?? state.seasonNumber), 10);
    if (!isNaN(s)) seasonNumber = s;
  } else if (mediaType !== 'movie') {
    seasonNumber = 1;
  }

  let episodeNumber: number | null = null;
  let downloadGranularity: 'season' | 'episode' = 'season';
  if (query.episodeNumber !== undefined || state.episodeNumber !== undefined) {
    const e = parseInt(String(query.episodeNumber ?? state.episodeNumber), 10);
    if (!isNaN(e)) {
      episodeNumber = e;
      downloadGranularity = 'episode';
    }
  }

  const rawSeeders = query.seeders ? parseInt(String(query.seeders), 10) : (typeof state.seeders === 'number' ? state.seeders : 10);
  const rawLeechers = query.leechers ? parseInt(String(query.leechers), 10) : (typeof state.leechers === 'number' ? state.leechers : 0);
  const rawSizeBytes = query.sizeBytes ? parseInt(String(query.sizeBytes), 10) : (typeof state.sizeBytes === 'number' ? state.sizeBytes : 0);
  const rawScore = query.score ? parseInt(String(query.score), 10) : (typeof state.score === 'number' ? state.score : 100);
  const rawIndexer = String(query.indexer || state.indexer || 'Indexer');
  const rawIsPrivate = query.isPrivateTracker === 'true' || state.isPrivateTracker === true || isKnownPrivateIndexer(rawIndexer);

  const release: ReleaseCandidate = {
    guid: String(query.guid || state.guid || `fast-track-${Date.now()}`),
    title: String(query.releaseTitle || state.releaseTitle || rawTitle),
    downloadUrl: String(rawDownloadUrl),
    indexer: rawIndexer,
    sizeBytes: isNaN(rawSizeBytes) ? 0 : rawSizeBytes,
    formattedSize: String(query.formattedSize || state.formattedSize || (rawSizeBytes > 0 ? formatBytes(rawSizeBytes) : 'Unknown')),
    seeders: isNaN(rawSeeders) ? 10 : rawSeeders,
    leechers: isNaN(rawLeechers) ? 0 : rawLeechers,
    resolution: String(query.resolution || state.resolution || '1080p'),
    codec: String(query.codec || state.codec || 'unknown'),
    source: String(query.source || state.source || 'unknown'),
    score: isNaN(rawScore) ? 100 : rawScore,
    isLowHealth: !isNaN(rawSeeders) && rawSeeders < 5,
    isPrivateTracker: rawIsPrivate,
  };

  const watchForNextEpisodes = query.fromUpNext === 'true' || state.fromUpNext === true;

  return {
    data: {
      mediaType,
      candidate,
      release,
      seasonNumber,
      episodeNumber,
      downloadGranularity,
      watchForNextEpisodes,
    },
  };
}

export interface WaitlistParsedData {
  mediaType: MediaType;
  candidate: MetadataCandidate;
  seasonNumber: number | null;
  episodeNumber: number | null;
  downloadGranularity: 'season' | 'episode';
  watchForNextEpisodes: boolean;
  waitlistId?: string;
}

export function parseWaitlistParams(
  query: LocationQuery
): { data?: WaitlistParsedData; error?: string } {
  if (query.fromWaitlist !== 'true') return {};
  const rawTitle = query.title ? String(query.title) : undefined;
  const rawMetadataId = query.metadataId ? String(query.metadataId) : undefined;
  const rawMediaType = query.mediaType ? String(query.mediaType) : undefined;

  if (!rawTitle || !rawMetadataId || !rawMediaType) {
    return { error: 'Incomplete waitlist parameters.' };
  }

  const validMediaTypes: MediaType[] = ['movie', 'tv_show', 'anime', 'private'];
  if (!validMediaTypes.includes(rawMediaType as MediaType)) {
    return { error: 'Invalid media type for waitlist request.' };
  }

  const mediaType = rawMediaType as MediaType;
  const rawYear = query.year;
  const yearNum = rawYear ? parseInt(String(rawYear), 10) : null;

  const candidate: MetadataCandidate = {
    id: rawMetadataId,
    source: query.metadataSource === 'anilist' ? 'anilist' : 'tmdb',
    title: rawTitle,
    year: yearNum !== null && !isNaN(yearNum) ? yearNum : null,
    posterUrl: query.posterUrl ? String(query.posterUrl) : null,
  };

  let seasonNumber: number | null = null;
  if (query.seasonNumber !== undefined) {
    const s = parseInt(String(query.seasonNumber), 10);
    if (!isNaN(s)) seasonNumber = s;
  } else if (mediaType !== 'movie') {
    seasonNumber = 1;
  }

  let episodeNumber: number | null = null;
  let downloadGranularity: 'season' | 'episode' = 'season';
  if (query.episodeNumber !== undefined) {
    const e = parseInt(String(query.episodeNumber), 10);
    if (!isNaN(e)) {
      episodeNumber = e;
      downloadGranularity = 'episode';
    }
  }

  const watchForNextEpisodes = ['tv_show', 'anime'].includes(mediaType);
  const waitlistId = query.waitlistId ? String(query.waitlistId) : undefined;

  return {
    data: {
      mediaType,
      candidate,
      seasonNumber,
      episodeNumber,
      downloadGranularity,
      watchForNextEpisodes,
      waitlistId,
    },
  };
}

export async function enrichCandidateMetadata(
  apiClient: { post: <T>(url: string, body: unknown) => Promise<T> },
  mediaType: string,
  candidate: MetadataCandidate
): Promise<void> {
  if (candidate.posterUrl && candidate.overview) return;
  try {
    const res = await apiClient.post<{ candidates: MetadataCandidate[] }>('/requests/search-metadata', {
      mediaType,
      query: candidate.title,
    });
    if (res.candidates && res.candidates.length > 0) {
      const match = res.candidates.find((c) => String(c.id) === String(candidate.id)) || res.candidates[0];
      if (match) {
        if (!candidate.posterUrl && match.posterUrl) candidate.posterUrl = match.posterUrl;
        if (!candidate.overview && match.overview) candidate.overview = match.overview;
        if (!candidate.year && match.year) candidate.year = match.year;
      }
    }
  } catch {
    // Non-blocking
  }
}

