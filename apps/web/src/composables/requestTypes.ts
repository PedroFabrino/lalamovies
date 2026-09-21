import type { ParsedTorrentClient } from '../lib/torrentParser';
import type { ReleaseCandidate } from '../lib/releaseExplorer';

export interface MetadataCandidate {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
  romajiTitle?: string | null;
  englishTitle?: string | null;
}

export type { ReleaseCandidate };

export interface BatchItem {
  id: string;
  file: File;
  fileName: string;
  fileSizeBytes: number;
  parsed?: ParsedTorrentClient;
  error?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface CanonicalRequestSummary {
  id: string;
  title: string;
  status: string;
  mediaType: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}
