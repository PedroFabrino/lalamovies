import { and, asc, eq, isNotNull, ne, sql } from 'drizzle-orm';
import {
  AppDatabase,
  downloadRequests,
  DownloadRequest,
  requestEpisodes,
  RequestEpisode,
  NewRequestEpisode,
} from '../db';

export interface ConsumedEpisodeItem extends RequestEpisode {
  requestTitle: string;
  requestKeepFlag: boolean;
}

export type InsertRequestEpisode = Omit<NewRequestEpisode, 'id'> & { id?: string };

export interface IEpisodesRepository {
  create(data: InsertRequestEpisode): RequestEpisode;
  createMany(data: InsertRequestEpisode[]): RequestEpisode[];
  findById(id: string): RequestEpisode | undefined;
  findByRequestId(requestId: string): RequestEpisode[];
  findByRequestSeasonEpisode(requestId: string, seasonNumber: number, episodeNumber: number): RequestEpisode | undefined;
  findByLibraryPath(jellyfinPath: string): RequestEpisode | undefined;
  update(id: string, fields: Partial<Omit<RequestEpisode, 'id'>>): void;
  countUnprunedByRequestId(requestId: string): number;
  findConsumedEpisodes(): ConsumedEpisodeItem[];
  findActiveSeasonPackRequests(): DownloadRequest[];
}

export class EpisodesRepository implements IEpisodesRepository {
  constructor(private db: AppDatabase) {}

  create(data: InsertRequestEpisode): RequestEpisode {
    const id = data.id || crypto.randomUUID();
    const toInsert = { ...data, id };
    this.db.insert(requestEpisodes).values(toInsert).run();
    const created = this.findById(id);
    if (!created) {
      throw new Error(`Failed to retrieve episode after insert: ${id}`);
    }
    return created;
  }

  createMany(data: InsertRequestEpisode[]): RequestEpisode[] {
    if (data.length === 0) return [];
    const items = data.map((d) => ({
      ...d,
      id: d.id || crypto.randomUUID(),
    }));
    this.db.insert(requestEpisodes).values(items).run();
    return items.map((item) => this.findById(item.id)!).filter(Boolean);
  }

  findById(id: string): RequestEpisode | undefined {
    return this.db
      .select()
      .from(requestEpisodes)
      .where(eq(requestEpisodes.id, id))
      .get();
  }

  findByRequestId(requestId: string): RequestEpisode[] {
    return this.db
      .select()
      .from(requestEpisodes)
      .where(eq(requestEpisodes.requestId, requestId))
      .orderBy(asc(requestEpisodes.seasonNumber), asc(requestEpisodes.episodeNumber))
      .all();
  }

  findByRequestSeasonEpisode(
    requestId: string,
    seasonNumber: number,
    episodeNumber: number
  ): RequestEpisode | undefined {
    return this.db
      .select()
      .from(requestEpisodes)
      .where(
        and(
          eq(requestEpisodes.requestId, requestId),
          eq(requestEpisodes.seasonNumber, seasonNumber),
          eq(requestEpisodes.episodeNumber, episodeNumber)
        )
      )
      .get();
  }

  findByLibraryPath(jellyfinPath: string): RequestEpisode | undefined {
    return this.db
      .select()
      .from(requestEpisodes)
      .where(eq(requestEpisodes.jellyfinPath, jellyfinPath))
      .get();
  }

  update(id: string, fields: Partial<Omit<RequestEpisode, 'id'>>): void {
    this.db
      .update(requestEpisodes)
      .set(fields)
      .where(eq(requestEpisodes.id, id))
      .run();
  }

  countUnprunedByRequestId(requestId: string): number {
    const res = this.db
      .select({ count: sql<number>`count(*)` })
      .from(requestEpisodes)
      .where(
        and(
          eq(requestEpisodes.requestId, requestId),
          eq(requestEpisodes.status, 'downloaded')
        )
      )
      .get();
    return res ? Number(res.count) : 0;
  }

  findConsumedEpisodes(): ConsumedEpisodeItem[] {
    const rows = this.db
      .select({
        id: requestEpisodes.id,
        requestId: requestEpisodes.requestId,
        seasonNumber: requestEpisodes.seasonNumber,
        episodeNumber: requestEpisodes.episodeNumber,
        fileIndex: requestEpisodes.fileIndex,
        relativePath: requestEpisodes.relativePath,
        jellyfinPath: requestEpisodes.jellyfinPath,
        sizeBytes: requestEpisodes.sizeBytes,
        status: requestEpisodes.status,
        keepFlag: requestEpisodes.keepFlag,
        lastPlayedAt: requestEpisodes.lastPlayedAt,
        prunedAt: requestEpisodes.prunedAt,
        requestTitle: downloadRequests.title,
        requestKeepFlag: downloadRequests.keepFlag,
      })
      .from(requestEpisodes)
      .innerJoin(downloadRequests, eq(requestEpisodes.requestId, downloadRequests.id))
      .where(
        and(
          eq(requestEpisodes.status, 'downloaded'),
          eq(requestEpisodes.keepFlag, false),
          isNotNull(requestEpisodes.lastPlayedAt),
          eq(downloadRequests.keepFlag, false),
          ne(downloadRequests.status, 'deleted')
        )
      )
      .orderBy(asc(requestEpisodes.lastPlayedAt))
      .all();

    return rows.map((r) => ({
      id: r.id,
      requestId: r.requestId,
      seasonNumber: r.seasonNumber,
      episodeNumber: r.episodeNumber,
      fileIndex: r.fileIndex,
      relativePath: r.relativePath,
      jellyfinPath: r.jellyfinPath,
      sizeBytes: r.sizeBytes,
      status: r.status,
      keepFlag: Boolean(r.keepFlag),
      lastPlayedAt: r.lastPlayedAt,
      prunedAt: r.prunedAt,
      requestTitle: r.requestTitle,
      requestKeepFlag: Boolean(r.requestKeepFlag),
    }));
  }

  findActiveSeasonPackRequests(): DownloadRequest[] {
    return this.db
      .select()
      .from(downloadRequests)
      .where(
        and(
          ne(downloadRequests.status, 'deleted'),
          ne(downloadRequests.status, 'error'),
          isNotNull(downloadRequests.seasonNumber),
          sql`${downloadRequests.episodeNumber} IS NULL`
        )
      )
      .all();
  }
}
