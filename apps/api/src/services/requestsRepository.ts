import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, ne } from 'drizzle-orm';
import {
  AppDatabase,
  downloadRequests,
  DownloadRequest,
  NewDownloadRequest,
  requestCoRequesters,
  users,
} from '../db';
import { RequestStatus } from './requestStateMachine';
import {
  RequestListItem,
  FindByCriteriaFilters,
  IRequestsRepository,
  REQUEST_LIST_SELECT_FIELDS,
} from './requestsRepositoryTypes';

export type { RequestListItem, FindByCriteriaFilters, IRequestsRepository };

// Statuses considered "pending" (in-flight, poller and daemon care about these)
const PENDING_STATUSES = [
  RequestStatus.QUEUED,
  RequestStatus.DOWNLOADING,
  RequestStatus.HARDLINKING,
  RequestStatus.UNARCHIVING,
] as const;

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

  findAll(userId: string, isAdmin: boolean): RequestListItem[] {
    if (!isAdmin) {
      return this.findAllForUser(userId);
    }

    const rawList = this.db
      .select(REQUEST_LIST_SELECT_FIELDS)
      .from(downloadRequests)
      .leftJoin(users, eq(downloadRequests.userId, users.id))
      .where(ne(downloadRequests.status, RequestStatus.DELETED))
      .orderBy(desc(downloadRequests.requestedAt))
      .all();

    const coReqMap = new Map<string, string[]>();
    const allCoRequesters = this.db
      .select({
        requestId: requestCoRequesters.requestId,
        username: users.username,
      })
      .from(requestCoRequesters)
      .leftJoin(users, eq(requestCoRequesters.userId, users.id))
      .all();

    for (const cr of allCoRequesters) {
      if (!coReqMap.has(cr.requestId)) {
        coReqMap.set(cr.requestId, []);
      }
      if (cr.username) {
        coReqMap.get(cr.requestId)!.push(cr.username);
      }
    }

    return rawList.map((item) => ({
      ...item,
      isPrimaryRequester: item.userId === userId,
      coRequesters: coReqMap.get(item.id) || [],
    })) as RequestListItem[];
  }

  findAllForUser(userId: string): RequestListItem[] {
    const primaryRows = this.db
      .select(REQUEST_LIST_SELECT_FIELDS)
      .from(downloadRequests)
      .leftJoin(users, eq(downloadRequests.userId, users.id))
      .where(
        and(
          eq(downloadRequests.userId, userId),
          ne(downloadRequests.status, RequestStatus.DELETED)
        )
      )
      .all();

    const coRequestRows = this.db
      .select(REQUEST_LIST_SELECT_FIELDS)
      .from(requestCoRequesters)
      .innerJoin(downloadRequests, eq(requestCoRequesters.requestId, downloadRequests.id))
      .leftJoin(users, eq(downloadRequests.userId, users.id))
      .where(
        and(
          eq(requestCoRequesters.userId, userId),
          ne(downloadRequests.status, RequestStatus.DELETED)
        )
      )
      .all();

    const primaryMapped: RequestListItem[] = primaryRows.map((r) => ({
      ...r,
      isPrimaryRequester: true,
      coRequesters: [],
    })) as RequestListItem[];

    const coMapped: RequestListItem[] = coRequestRows.map((r) => ({
      ...r,
      isPrimaryRequester: false,
      coRequesters: [],
    })) as RequestListItem[];

    const seen = new Set<string>();
    const combined: RequestListItem[] = [];
    for (const item of [...primaryMapped, ...coMapped]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }
    combined.sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );

    return combined;
  }

  isCoRequester(requestId: string, userId: string): boolean {
    const coReq = this.db
      .select()
      .from(requestCoRequesters)
      .where(
        and(
          eq(requestCoRequesters.requestId, requestId),
          eq(requestCoRequesters.userId, userId)
        )
      )
      .get();
    return Boolean(coReq);
  }

  findRequesterUsername(userId: string): string | undefined {
    const user = this.db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    return user?.username;
  }

  findByUserId(userId: string, excludeDeleted = false): DownloadRequest[] {
    const conditions = [eq(downloadRequests.userId, userId)];
    if (excludeDeleted) {
      conditions.push(ne(downloadRequests.status, RequestStatus.DELETED));
    }
    return this.db.select().from(downloadRequests).where(and(...conditions)).all();
  }

  findByCriteria(filters: FindByCriteriaFilters): DownloadRequest[] {
    const conditions = [];
    if (filters.status) conditions.push(eq(downloadRequests.status, filters.status as DownloadRequest['status']));
    if (filters.mediaType) conditions.push(eq(downloadRequests.mediaType, filters.mediaType as DownloadRequest['mediaType']));
    if (filters.keepFlag !== undefined) conditions.push(eq(downloadRequests.keepFlag, filters.keepFlag));
    if (filters.downloadedAtBefore) conditions.push(lte(downloadRequests.downloadedAt, filters.downloadedAtBefore));
    if (filters.scheduledDeleteAtBefore) {
      conditions.push(isNotNull(downloadRequests.scheduledDeleteAt));
      conditions.push(lte(downloadRequests.scheduledDeleteAt, filters.scheduledDeleteAtBefore));
    }
    if (filters.scheduledDeleteAtNull === true) conditions.push(isNull(downloadRequests.scheduledDeleteAt));
    if (filters.scheduledDeleteAtNull === false) conditions.push(isNotNull(downloadRequests.scheduledDeleteAt));
    if (filters.excludeDeleted) conditions.push(ne(downloadRequests.status, RequestStatus.DELETED));

    return conditions.length > 0
      ? this.db.select().from(downloadRequests).where(and(...conditions)).all()
      : this.db.select().from(downloadRequests).all();
  }

  setTranscriptionStatus(
    id: string,
    status: 'none' | 'pending' | 'transcribing' | 'done' | 'failed' | 'completed',
    extraFields?: Partial<Omit<DownloadRequest, 'id' | 'transcriptionStatus'>>
  ): void {
    const effectiveStatus: DownloadRequest['transcriptionStatus'] =
      status === 'done' ? 'completed' : (status as DownloadRequest['transcriptionStatus']);
    this.db
      .update(downloadRequests)
      .set({ transcriptionStatus: effectiveStatus, ...(extraFields || {}) })
      .where(eq(downloadRequests.id, id))
      .run();
  }

  findByTranscriptionStatus(status: string): DownloadRequest[] {
    return this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          eq(downloadRequests.transcriptionStatus, status as DownloadRequest['transcriptionStatus']),
          ne(downloadRequests.status, RequestStatus.DELETED)
        )
      )
      .all();
  }

  findPendingTranscriptionByType(mediaType: string): DownloadRequest[] {
    return this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          eq(downloadRequests.transcriptionStatus, 'pending'),
          eq(downloadRequests.mediaType, mediaType as DownloadRequest['mediaType']),
          ne(downloadRequests.status, RequestStatus.DELETED)
        )
      )
      .orderBy(asc(downloadRequests.requestedAt))
      .all();
  }

  findByMetadataId(
    metadataId: string,
    seasonNumber?: number | null,
    episodeNumber?: number | null,
    excludeStatuses: string[] = [RequestStatus.DELETED]
  ): DownloadRequest[] {
    const conditions = [eq(downloadRequests.metadataId, String(metadataId))];
    if (seasonNumber !== undefined && seasonNumber !== null) {
      conditions.push(eq(downloadRequests.seasonNumber, seasonNumber));
    }
    if (episodeNumber !== undefined && episodeNumber !== null) {
      conditions.push(eq(downloadRequests.episodeNumber, episodeNumber));
    }
    for (const status of excludeStatuses) {
      conditions.push(ne(downloadRequests.status, status as DownloadRequest['status']));
    }
    return this.db.select().from(downloadRequests).where(and(...conditions)).all();
  }

  findWithTorrentHash(hash: string): DownloadRequest | undefined {
    return this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          eq(downloadRequests.qbTorrentHash, hash),
          ne(downloadRequests.status, RequestStatus.DELETED)
        )
      )
      .get();
  }
}
