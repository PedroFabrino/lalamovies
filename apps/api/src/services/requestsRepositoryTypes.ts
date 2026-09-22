import { downloadRequests, DownloadRequest, NewDownloadRequest, users } from '../db';

export interface RequestListItem extends DownloadRequest {
  requesterUsername?: string | null;
  isPrimaryRequester?: boolean;
  coRequesters?: string[];
}

export interface FindByCriteriaFilters {
  status?: string;
  mediaType?: string;
  keepFlag?: boolean;
  downloadedAtBefore?: string;
  scheduledDeleteAtBefore?: string;
  scheduledDeleteAtNull?: boolean;
  excludeDeleted?: boolean;
}

export interface IRequestsRepository {
  findById(id: string): DownloadRequest | undefined;
  create(data: NewDownloadRequest): DownloadRequest;
  setStatus(
    id: string,
    status: DownloadRequest['status'],
    extraFields?: Partial<Omit<DownloadRequest, 'id' | 'status'>>
  ): void;
  update(
    id: string,
    fields: Partial<Omit<DownloadRequest, 'id'>>
  ): void;
  findPending(): DownloadRequest[];
  findByStatus(
    status: DownloadRequest['status'],
    orderBy?: 'requestedAtAsc'
  ): DownloadRequest[];
  findExistingSeriesFolder(params: {
    metadataId?: string | null;
    mediaType: string;
    excludeRequestId?: string;
  }): string | undefined;
  markError(id: string, message: string): void;
  findAll(userId: string, isAdmin: boolean): RequestListItem[];
  findAllForUser(userId: string): RequestListItem[];
  isCoRequester(requestId: string, userId: string): boolean;
  findRequesterUsername(userId: string): string | undefined;
  findByUserId(userId: string, excludeDeleted?: boolean): DownloadRequest[];
  findByCriteria(filters: FindByCriteriaFilters): DownloadRequest[];
  setTranscriptionStatus(
    id: string,
    status: 'none' | 'pending' | 'transcribing' | 'done' | 'failed' | 'completed',
    extraFields?: Partial<Omit<DownloadRequest, 'id' | 'transcriptionStatus'>>
  ): void;
  findByTranscriptionStatus(status: string): DownloadRequest[];
  findPendingTranscriptionByType(mediaType: string): DownloadRequest[];
  findByMetadataId(
    metadataId: string,
    seasonNumber?: number | null,
    episodeNumber?: number | null,
    excludeStatuses?: string[]
  ): DownloadRequest[];
  findWithTorrentHash(hash: string): DownloadRequest | undefined;
}

export const REQUEST_LIST_SELECT_FIELDS = {
  id: downloadRequests.id,
  userId: downloadRequests.userId,
  magnetLink: downloadRequests.magnetLink,
  mediaType: downloadRequests.mediaType,
  status: downloadRequests.status,
  metadataId: downloadRequests.metadataId,
  metadataSource: downloadRequests.metadataSource,
  title: downloadRequests.title,
  year: downloadRequests.year,
  seasonNumber: downloadRequests.seasonNumber,
  episodeNumber: downloadRequests.episodeNumber,
  jellyfinPath: downloadRequests.jellyfinPath,
  keepFlag: downloadRequests.keepFlag,
  qbTorrentHash: downloadRequests.qbTorrentHash,
  errorMessage: downloadRequests.errorMessage,
  requestedAt: downloadRequests.requestedAt,
  downloadedAt: downloadRequests.downloadedAt,
  lastPlayedAt: downloadRequests.lastPlayedAt,
  scheduledDeleteAt: downloadRequests.scheduledDeleteAt,
  sizeBytes: downloadRequests.sizeBytes,
  torrentFilePath: downloadRequests.torrentFilePath,
  deferredReason: downloadRequests.deferredReason,
  transcriptionStatus: downloadRequests.transcriptionStatus,
  transcriptionError: downloadRequests.transcriptionError,
  requesterUsername: users.username,
};
