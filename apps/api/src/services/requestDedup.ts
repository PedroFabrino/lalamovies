import { and, eq } from 'drizzle-orm';
import { AppDatabase } from '../db';
import { DownloadRequest, requestCoRequesters } from '../db/schema';
import { IRequestsRepository, RequestsRepository } from './requestsRepository';

function toRepo(repoOrDb: IRequestsRepository | AppDatabase): IRequestsRepository {
  return 'findByMetadataId' in repoOrDb ? repoOrDb : new RequestsRepository(repoOrDb);
}

export interface DedupMatchParams {
  mediaType: 'movie' | 'tv_show' | 'anime' | 'private';
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

export function findMatchingCanonicalRequest(
  requestsRepoOrDb: IRequestsRepository | AppDatabase,
  params: DedupMatchParams
): DownloadRequest | null {
  const repo = toRepo(requestsRepoOrDb);
  const metaId = String(params.metadataId);
  const source = params.metadataSource;
  const isPrivate = params.mediaType === 'private';
  const matchesMediaType = (r: DownloadRequest) =>
    isPrivate ? r.mediaType === 'private' : r.mediaType !== 'private';

  const candidates = repo.findByMetadataId(metaId).filter(
    (r) => r.metadataSource === source && matchesMediaType(r)
  );

  if (params.mediaType === 'movie' || (isPrivate && params.seasonNumber == null && params.episodeNumber == null)) {
    return candidates[0] || null;
  }

  // TV Show or Anime or Episodic Private
  const isSingleEpisode = params.seasonNumber != null && params.episodeNumber != null;
  const isSeasonPack = params.seasonNumber != null && params.episodeNumber == null;

  if (isSingleEpisode) {
    // 1. Check if a season pack exists for this season (asymmetric: pack covers episode)
    const packMatch = candidates.find(
      (r) => r.seasonNumber === params.seasonNumber && r.episodeNumber == null
    );
    if (packMatch) {
      return packMatch;
    }

    // 2. Check for exact episode match
    const epMatch = candidates.find(
      (r) => r.seasonNumber === params.seasonNumber && r.episodeNumber === params.episodeNumber
    );
    return epMatch || null;
  }

  if (isSeasonPack) {
    // Only matches another season pack (episodeNumber is null)
    // Asymmetric: season pack does NOT absorb into individual episodes
    const packMatch = candidates.find(
      (r) => r.seasonNumber === params.seasonNumber && r.episodeNumber == null
    );
    return packMatch || null;
  }

  // Neither season nor episode specified
  const generalMatch = candidates.find(
    (r) => r.seasonNumber == null && r.episodeNumber == null
  );
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

export function findCanonicalSeriesInfo(
  requestsRepoOrDb: IRequestsRepository | AppDatabase,
  params: {
    metadataId?: string | null;
    metadataSource?: 'tmdb' | 'anilist' | null;
    mediaType?: 'movie' | 'tv_show' | 'anime' | 'private' | null;
  }
): { title: string; mediaType: 'tv_show' | 'anime' } | null {
  if (!params.metadataId || !params.metadataSource || !params.mediaType) {
    return null;
  }
  if (!['tv_show', 'anime'].includes(params.mediaType)) {
    return null;
  }

  const repo = toRepo(requestsRepoOrDb);
  const candidates = repo.findByMetadataId(String(params.metadataId));
  const match = candidates.find(
    (r) =>
      r.metadataSource === params.metadataSource &&
      (r.mediaType === 'tv_show' || r.mediaType === 'anime')
  );

  if (match && (match.mediaType === 'tv_show' || match.mediaType === 'anime')) {
    return { title: match.title, mediaType: match.mediaType };
  }
  return null;
}

export const globalRequestMutex = new KeyedMutex();

