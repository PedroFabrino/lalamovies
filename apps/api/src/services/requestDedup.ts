import { and, eq, ne, isNull } from 'drizzle-orm';
import { AppDatabase } from '../db';
import { downloadRequests, DownloadRequest, requestCoRequesters } from '../db/schema';

export interface DedupMatchParams {
  mediaType: 'movie' | 'tv_show' | 'anime';
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

export function findMatchingCanonicalRequest(
  db: AppDatabase,
  params: DedupMatchParams
): DownloadRequest | null {
  const metaId = String(params.metadataId);
  const source = params.metadataSource;

  if (params.mediaType === 'movie') {
    const match = db
      .select()
      .from(downloadRequests)
      .where(
        and(
          ne(downloadRequests.status, 'deleted'),
          eq(downloadRequests.metadataId, metaId),
          eq(downloadRequests.metadataSource, source),
          eq(downloadRequests.mediaType, 'movie')
        )
      )
      .get();
    return match || null;
  }

  // TV Show or Anime
  const isSingleEpisode = params.seasonNumber != null && params.episodeNumber != null;
  const isSeasonPack = params.seasonNumber != null && params.episodeNumber == null;

  if (isSingleEpisode) {
    // 1. Check if a season pack exists for this season (asymmetric: pack covers episode)
    const packMatch = db
      .select()
      .from(downloadRequests)
      .where(
        and(
          ne(downloadRequests.status, 'deleted'),
          eq(downloadRequests.metadataId, metaId),
          eq(downloadRequests.metadataSource, source),
          eq(downloadRequests.seasonNumber, params.seasonNumber!),
          isNull(downloadRequests.episodeNumber)
        )
      )
      .get();

    if (packMatch) {
      return packMatch;
    }

    // 2. Check for exact episode match
    const epMatch = db
      .select()
      .from(downloadRequests)
      .where(
        and(
          ne(downloadRequests.status, 'deleted'),
          eq(downloadRequests.metadataId, metaId),
          eq(downloadRequests.metadataSource, source),
          eq(downloadRequests.seasonNumber, params.seasonNumber!),
          eq(downloadRequests.episodeNumber, params.episodeNumber!)
        )
      )
      .get();

    return epMatch || null;
  }

  if (isSeasonPack) {
    // Only matches another season pack (episodeNumber is null)
    // Asymmetric: season pack does NOT absorb into individual episodes
    const packMatch = db
      .select()
      .from(downloadRequests)
      .where(
        and(
          ne(downloadRequests.status, 'deleted'),
          eq(downloadRequests.metadataId, metaId),
          eq(downloadRequests.metadataSource, source),
          eq(downloadRequests.seasonNumber, params.seasonNumber!),
          isNull(downloadRequests.episodeNumber)
        )
      )
      .get();

    return packMatch || null;
  }

  // Neither season nor episode specified
  const generalMatch = db
    .select()
    .from(downloadRequests)
    .where(
      and(
        ne(downloadRequests.status, 'deleted'),
        eq(downloadRequests.metadataId, metaId),
        eq(downloadRequests.metadataSource, source),
        isNull(downloadRequests.seasonNumber),
        isNull(downloadRequests.episodeNumber)
      )
    )
    .get();

  return generalMatch || null;
}

export function addCoRequester(
  db: AppDatabase,
  requestId: string,
  userId: string
): void {
  const existing = db
    .select()
    .from(requestCoRequesters)
    .where(
      and(
        eq(requestCoRequesters.requestId, requestId),
        eq(requestCoRequesters.userId, userId)
      )
    )
    .get();

  if (!existing) {
    db.insert(requestCoRequesters)
      .values({
        requestId,
        userId,
        addedAt: new Date().toISOString(),
      })
      .run();
  }
}

export class KeyedMutex {
  private queues = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const current = this.queues.get(key) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = current.then(
      () => next,
      () => next
    );
    this.queues.set(key, tail);
    await current.catch(() => {});
    try {
      return await fn();
    } finally {
      release();
      if (this.queues.get(key) === tail) {
        this.queues.delete(key);
      }
    }
  }
}

export function getDedupLockKey(params: DedupMatchParams): string {
  const metaId = String(params.metadataId);
  const source = params.metadataSource;

  if (params.mediaType === 'movie') {
    return `movie:${source}:${metaId}`;
  }
  if (params.seasonNumber != null) {
    return `season:${source}:${metaId}:s${params.seasonNumber}`;
  }
  return `series:${source}:${metaId}`;
}

export const globalRequestMutex = new KeyedMutex();
