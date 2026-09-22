import { DownloadRequest } from '../db/schema';

export class RequestServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string
  ) {
    super(message);
    this.name = 'RequestServiceError';
  }
}

export interface CreateRequestInput {
  userId: string;
  userRole?: string;
  magnetLink?: string;
  torrentFileBase64?: string;
  torrentFileName?: string;
  mediaType: 'movie' | 'tv_show' | 'anime' | 'private';
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  waitlistNextSeason?: boolean;
  coRequesterUserIds?: string[];
}

export interface CreateRequestResult {
  request: DownloadRequest;
  isExisting: boolean;
}

export interface BatchItemInput {
  torrentFileName?: string;
  torrentFileBase64?: string;
  magnetLink?: string;
  mediaType?: 'movie' | 'tv_show' | 'anime' | 'private';
  metadataId?: string;
  metadataSource?: 'tmdb' | 'anilist';
  title?: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

export interface BatchRequestInput {
  userId: string;
  userRole?: string;
  mediaType?: 'movie' | 'tv_show' | 'anime' | 'private';
  metadataId?: string;
  metadataSource?: 'tmdb' | 'anilist';
  title?: string;
  year?: number | null;
  seasonNumber?: number | null;
  items: BatchItemInput[];
}

export interface BatchRequestResult {
  requests: DownloadRequest[];
  count: number;
}

export interface RetryRequestResult {
  request: DownloadRequest;
  message: string;
}

export interface PromoteStreamInput {
  userId: string;
  mediaType: 'movie' | 'tv_show' | 'anime';
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  stagingPath: string;
  sizeBytes?: number | null;
}

export interface PromoteStreamResult {
  requestId: string;
  jellyfinPath: string;
  status: string;
}

export interface IRequestService {
  createRequest(input: CreateRequestInput): Promise<CreateRequestResult>;
  createBatchRequests(input: BatchRequestInput): Promise<BatchRequestResult>;
  retryRequest(id: string): Promise<RetryRequestResult>;
  promoteFromStream(input: PromoteStreamInput): Promise<PromoteStreamResult>;
}
