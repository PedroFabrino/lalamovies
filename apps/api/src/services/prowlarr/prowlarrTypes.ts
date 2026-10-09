import {
  Resolution,
  VideoCodec,
  ReleaseSource,
  ScoreOptions,
  ScorableCandidate,
} from './prowlarrScoring';

export type { Resolution, VideoCodec, ReleaseSource, ScoreOptions, ScorableCandidate };

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
  isPrivateTracker: boolean;
  isPreferred: boolean;
  infoHash?: string;
  magnetUrl?: string;
  isInfringing?: boolean;
}

export interface SearchReleasesResult {
  recommended: ReleaseCandidate | null;
  candidates: ReleaseCandidate[];
  totalFound: number;
  isConfigured: boolean;
  isReachable: boolean;
  hasHealthyReleases: boolean;
  error?: string;
}

export interface SearchReleasesOptions {
  mediaType: 'movie' | 'tv_show' | 'anime' | 'private';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  romajiTitle?: string | null;
  englishTitle?: string | null;
  seasonName?: string | null;
}

export interface IProwlarrService {
  isConfigured(): boolean;
  checkHealth(): Promise<boolean>;
  getIndexerPrivacy(indexerIdOrName: number | string): Promise<boolean>;
  isIndexerPrivate(indexerIdOrName: number | string): boolean;
  parseReleaseTitle(title: string): { resolution: Resolution; codec: VideoCodec; source: ReleaseSource };
  scoreRelease(
    candidate: Omit<ReleaseCandidate, 'score' | 'isLowHealth'>,
    options?: ScoreOptions
  ): { score: number; isLowHealth: boolean };
  searchMovieReleases(title: string, year?: number | null): Promise<SearchReleasesResult>;
  searchReleases(options: SearchReleasesOptions): Promise<SearchReleasesResult>;
  searchLatestByCategory(
    categories: number[],
    scoreOptions?: ScoreOptions
  ): Promise<{ candidates: ReleaseCandidate[]; isReachable: boolean; error?: string }>;
  markHashInfringing?(hash: string): void;
  isHashInfringing?(hash: string): boolean;
}
