import cron, { ScheduledTask } from 'node-cron';
import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { WatcherDatabase } from '../db';
import { watchRequests, WatchRequest } from '../db/schema';

export interface ReleaseGatingLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface ReleaseGatingOptions {
  db: WatcherDatabase;
  tmdbApiKey?: string;
  logger?: ReleaseGatingLogger;
  scheduleDue?: string;
  scheduleUnconfirmed?: string;
}

export function evaluateInitialStatus(
  releaseDate: string | null,
  today?: string,
  isNextSeason = false
): {
  status: 'pending_release' | 'checking';
  tmdbReleaseDate: string | null;
} {
  const currentDay = today || new Date().toISOString().slice(0, 10);
  if (releaseDate && releaseDate > currentDay) {
    return {
      status: 'pending_release',
      tmdbReleaseDate: releaseDate,
    };
  }
  if (!releaseDate && isNextSeason) {
    return {
      status: 'pending_release',
      tmdbReleaseDate: null,
    };
  }
  return {
    status: 'checking',
    tmdbReleaseDate: releaseDate || null,
  };
}

export class ReleaseGatingService {
  private db: WatcherDatabase;
  private tmdbApiKey?: string;
  private logger?: ReleaseGatingLogger;
  private scheduleDue: string;
  private scheduleUnconfirmed: string;
  private dueTask: ScheduledTask | null = null;
  private unconfirmedTask: ScheduledTask | null = null;

  constructor(options: ReleaseGatingOptions) {
    this.db = options.db;
    this.tmdbApiKey = options.tmdbApiKey;
    this.logger = options.logger;
    this.scheduleDue = options.scheduleDue || '0 0 * * *';
    this.scheduleUnconfirmed = options.scheduleUnconfirmed || '0 1 * * *';
  }

  async fetchReleaseDate(
    mediaType: 'movie' | 'tv_show' | 'anime',
    metadataId: string,
    seasonNumber?: number | null,
    targetEpisode?: number | null
  ): Promise<string | null> {
    if (!this.tmdbApiKey) {
      this.logger?.warn('TMDB_API_KEY is not configured; skipping release date lookup');
      return null;
    }

    try {
      if (mediaType === 'movie') {
        const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(
          metadataId
        )}?api_key=${encodeURIComponent(this.tmdbApiKey)}&append_to_response=release_dates`;
        const res = await fetch(url);
        if (!res.ok) {
          this.logger?.warn(`TMDB returned HTTP ${res.status} for movie ${metadataId}`);
          return null;
        }
        const data = (await res.json()) as any;

        const candidateDates: string[] = [];
        if (data.release_date) {
          candidateDates.push(data.release_date.slice(0, 10));
        }

        if (data.release_dates?.results && Array.isArray(data.release_dates.results)) {
          for (const country of data.release_dates.results) {
            if (Array.isArray(country.release_dates)) {
              for (const rd of country.release_dates) {
                // type 3: Theatrical, type 4: Digital, type 5: Physical
                if (rd.release_date && [3, 4, 5].includes(rd.type)) {
                  candidateDates.push(rd.release_date.slice(0, 10));
                }
              }
            }
          }
        }

        if (candidateDates.length === 0) return null;
        candidateDates.sort();
        return candidateDates[0];
      } else {
        const sNum = seasonNumber ?? 1;
        const url = `https://api.themoviedb.org/3/tv/${encodeURIComponent(
          metadataId
        )}/season/${encodeURIComponent(sNum)}?api_key=${encodeURIComponent(this.tmdbApiKey)}`;
        const res = await fetch(url);
        if (!res.ok) {
          this.logger?.warn(`TMDB returned HTTP ${res.status} for tv ${metadataId} season ${sNum}`);
          return null;
        }
        const data = (await res.json()) as any;

        // If targetEpisode is provided, look up that specific episode's air date first
        if (targetEpisode && Array.isArray(data.episodes)) {
          const ep = data.episodes.find((e: any) => e.episode_number === targetEpisode);
          if (ep && ep.air_date) {
            return ep.air_date.slice(0, 10);
          }
        }

        if (data.air_date) {
          return data.air_date.slice(0, 10);
        }
        return null;
      }
    } catch (err) {
      this.logger?.error(`Failed to fetch TMDB release date for ${mediaType} ${metadataId}:`, err);
      return null;
    }
  }

  async promoteDueEntries(today?: string): Promise<number> {
    const currentDay = today || new Date().toISOString().slice(0, 10);
    const dueEntries = this.db
      .select()
      .from(watchRequests)
      .where(
        and(
          eq(watchRequests.status, 'pending_release'),
          isNotNull(watchRequests.tmdbReleaseDate),
          lte(watchRequests.tmdbReleaseDate, currentDay)
        )
      )
      .all();

    const now = new Date().toISOString();
    for (const entry of dueEntries) {
      this.db
        .update(watchRequests)
        .set({
          status: 'checking',
          updatedAt: now,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();
    }

    return dueEntries.length;
  }

  async pollUnconfirmedFutureSeasons(today?: string): Promise<number> {
    if (!this.tmdbApiKey) return 0;
    const currentDay = today || new Date().toISOString().slice(0, 10);

    const unconfirmedEntries = this.db
      .select()
      .from(watchRequests)
      .where(
        and(
          eq(watchRequests.status, 'pending_release'),
          isNull(watchRequests.tmdbReleaseDate)
        )
      )
      .all();

    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const entry of unconfirmedEntries) {
      try {
        const targetSeason = entry.seasonNumber ?? 1;
        let foundAirDate: string | null = null;

        // 1. Query /tv/{id}/season/{seasonNumber} for air_date
        const seasonUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(
          entry.metadataId
        )}/season/${encodeURIComponent(targetSeason)}?api_key=${encodeURIComponent(this.tmdbApiKey)}`;
        const seasonRes = await fetch(seasonUrl);
        if (seasonRes.ok) {
          const seasonData = (await seasonRes.json()) as any;
          if (entry.targetEpisode && Array.isArray(seasonData.episodes)) {
            const ep = seasonData.episodes.find((e: any) => e.episode_number === entry.targetEpisode);
            if (ep && ep.air_date) {
              foundAirDate = ep.air_date.slice(0, 10);
            }
          }
          if (!foundAirDate && seasonData.air_date) {
            foundAirDate = seasonData.air_date.slice(0, 10);
          }
        }

        // 2. Also check /tv/{id} next_episode_to_air as fallback
        if (!foundAirDate) {
          const url = `https://api.themoviedb.org/3/tv/${encodeURIComponent(
            entry.metadataId
          )}?api_key=${encodeURIComponent(this.tmdbApiKey)}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = (await res.json()) as any;
            const nextEpisode = data.next_episode_to_air;
            if (nextEpisode && nextEpisode.season_number === targetSeason && nextEpisode.air_date) {
              foundAirDate = nextEpisode.air_date.slice(0, 10);
            }
          }
        }

        if (foundAirDate) {
          const newStatus = foundAirDate <= currentDay ? 'checking' : 'pending_release';

          this.db
            .update(watchRequests)
            .set({
              tmdbReleaseDate: foundAirDate,
              status: newStatus,
              updatedAt: now,
            })
            .where(eq(watchRequests.id, entry.id))
            .run();

          updatedCount++;
        }
      } catch (err) {
        this.logger?.warn(`Failed checking unconfirmed season for entry ${entry.id}: ${(err as Error).message}`);
      }
    }

    return updatedCount;
  }

  startCrons(): void {
    this.dueTask = cron.schedule(this.scheduleDue, async () => {
      try {
        await this.promoteDueEntries();
      } catch (err) {
        this.logger?.error('Error running promoteDueEntries cron:', err);
      }
    });

    this.unconfirmedTask = cron.schedule(this.scheduleUnconfirmed, async () => {
      try {
        await this.pollUnconfirmedFutureSeasons();
      } catch (err) {
        this.logger?.error('Error running pollUnconfirmedFutureSeasons cron:', err);
      }
    });
  }

  stopCrons(): void {
    this.dueTask?.stop();
    this.unconfirmedTask?.stop();
    this.dueTask = null;
    this.unconfirmedTask = null;
  }
}