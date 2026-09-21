import { and, asc, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import { AppDatabase, downloadRequests, DownloadRequest, NewDownloadRequest } from '../db';
import { RequestStatus } from './requestStateMachine';

// Statuses considered "pending" (in-flight, poller and daemon care about these)
const PENDING_STATUSES = [
  RequestStatus.QUEUED,
  RequestStatus.DOWNLOADING,
  RequestStatus.HARDLINKING,
  RequestStatus.UNARCHIVING,
] as const;

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
}

export class RequestsRepository implements IRequestsRepository {
  constructor(private db: AppDatabase) {}

  findById(id: string): DownloadRequest | undefined {
    return this.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, id))
      .get();
  }

  create(data: NewDownloadRequest): DownloadRequest {
    this.db.insert(downloadRequests).values(data).run();
    const created = this.findById(data.id);
    if (!created) {
      throw new Error(`Failed to retrieve request after insert: ${data.id}`);
    }
    return created;
  }

  setStatus(
    id: string,
    status: DownloadRequest['status'],
    extraFields?: Partial<Omit<DownloadRequest, 'id' | 'status'>>
  ): void {
    this.db
      .update(downloadRequests)
      .set({ status, ...(extraFields || {}) })
      .where(eq(downloadRequests.id, id))
      .run();
  }

  update(
    id: string,
    fields: Partial<Omit<DownloadRequest, 'id'>>
  ): void {
    this.db
      .update(downloadRequests)
      .set(fields)
      .where(eq(downloadRequests.id, id))
      .run();
  }

  findPending(): DownloadRequest[] {
    return this.db
      .select()
      .from(downloadRequests)
      .where(inArray(downloadRequests.status, [...PENDING_STATUSES]))
      .all();
  }

  findByStatus(
    status: DownloadRequest['status'],
    orderBy?: 'requestedAtAsc'
  ): DownloadRequest[] {
    if (orderBy === 'requestedAtAsc') {
      return this.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.status, status))
        .orderBy(asc(downloadRequests.requestedAt))
        .all();
    }

    return this.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.status, status))
      .all();
  }

  findExistingSeriesFolder(params: {
    metadataId?: string | null;
    mediaType: string;
    excludeRequestId?: string;
  }): string | undefined {
    if (!params.metadataId || !['tv_show', 'anime'].includes(params.mediaType)) {
      return undefined;
    }

    const conditions = [
      ne(downloadRequests.status, RequestStatus.DELETED),
      inArray(downloadRequests.mediaType, ['tv_show', 'anime']),
      isNotNull(downloadRequests.jellyfinPath),
      eq(downloadRequests.metadataId, params.metadataId),
    ];

    if (params.excludeRequestId) {
      conditions.push(ne(downloadRequests.id, params.excludeRequestId));
    }

    const existingSeries = this.db
      .select({
        jellyfinPath: downloadRequests.jellyfinPath,
      })
      .from(downloadRequests)
      .where(and(...conditions))
      .get();

    if (existingSeries?.jellyfinPath) {
      const parts = existingSeries.jellyfinPath.split(/[\\/]/);
      const animeIdx = parts.indexOf('anime');
      const showsIdx = parts.indexOf('shows');
      const targetIdx = animeIdx !== -1 ? animeIdx : showsIdx;
      if (targetIdx !== -1 && parts[targetIdx + 1]) {
        return parts[targetIdx + 1];
      }
    }

    return undefined;
  }

  markError(id: string, message: string): void {
    this.db
      .update(downloadRequests)
      .set({ status: RequestStatus.ERROR, errorMessage: message })
      .where(eq(downloadRequests.id, id))
      .run();
  }
}
