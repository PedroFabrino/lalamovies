import { eq, inArray } from 'drizzle-orm';
import { AppDatabase, downloadRequests, DownloadRequest, NewDownloadRequest } from '../db';

// Statuses considered "pending" (in-flight, poller and daemon care about these)
const PENDING_STATUSES = [
  'queued',
  'downloading',
  'hardlinking',
  'unarchiving',
] as const;

export interface IRequestsRepository {
  findById(id: string): DownloadRequest | undefined;
  create(data: NewDownloadRequest): DownloadRequest;
  setStatus(id: string, status: DownloadRequest['status']): void;
  findPending(): DownloadRequest[];
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

  setStatus(id: string, status: DownloadRequest['status']): void {
    this.db
      .update(downloadRequests)
      .set({ status })
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

  markError(id: string, message: string): void {
    this.db
      .update(downloadRequests)
      .set({ status: 'error', errorMessage: message })
      .where(eq(downloadRequests.id, id))
      .run();
  }
}
