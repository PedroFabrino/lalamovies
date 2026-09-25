import cron, { ScheduledTask } from 'node-cron';
import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { WatcherDatabase } from '../db';
import { watchRequests, WatchRequest } from '../db/schema';
import { fetchAirDate, AirDateFetcherLogger } from './airDateFetcher';

export type ReleaseGatingLogger = AirDateFetcherLogger;

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
  void isNextSeason;
  const currentDay = today || new Date().toISOString().slice(0, 10);
  if (releaseDate && releaseDate > currentDay) {
    return {
      status: 'pending_release',
      tmdbReleaseDate: releaseDate,
    };
  }
  if (!releaseDate) {
    return {
      status: 'pending_release',
      tmdbReleaseDate: null,
    };
  }
  return {
    status: 'checking',
    tmdbReleaseDate: releaseDate,
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
    targetEpisode?: number | null,
    metadataSource?: 'tmdb' | 'anilist'
  ): Promise<string | null> {
    return fetchAirDate({
      mediaType,
      metadataId,
      metadataSource,
      seasonNumber,
      targetEpisode,
      tmdbApiKey: this.tmdbApiKey,
      logger: this.logger,
    });
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
        const foundAirDate = await this.fetchReleaseDate(
          entry.mediaType,
          entry.metadataId,
          entry.seasonNumber,
          entry.targetEpisode,
          entry.metadataSource
        );

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
        this.logger?.warn?.(`Failed checking unconfirmed season for entry ${entry.id}: ${(err as Error).message}`);
      }
    }

    return updatedCount;
  }

  async checkOrHealEntry(
    entry: WatchRequest,
    today?: string
  ): Promise<{
    healed: boolean;
    status: 'pending_release' | 'checking';
    tmdbReleaseDate: string | null;
    message: string;
  }> {
    const currentDay = today || new Date().toISOString().slice(0, 10);
    const upstreamDate = await this.fetchReleaseDate(
      entry.mediaType,
      entry.metadataId,
      entry.seasonNumber,
      entry.targetEpisode,
      entry.metadataSource
    );
    const now = new Date().toISOString();

    if (upstreamDate) {
      const newStatus = upstreamDate <= currentDay ? 'checking' : 'pending_release';
      this.db
        .update(watchRequests)
        .set({
          tmdbReleaseDate: upstreamDate,
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();

      return {
        healed: false,
        status: newStatus,
        tmdbReleaseDate: upstreamDate,
        message: newStatus === 'checking'
          ? `Confirmed release date arrived (${upstreamDate})! Now checking trackers.`
          : `Confirmed release date announced (${upstreamDate}). Starts checking on release day.`,
      };
    } else {
      const wasCorrupted = entry.tmdbReleaseDate !== null || entry.status === 'checking';
      this.db
        .update(watchRequests)
        .set({
          tmdbReleaseDate: null,
          status: 'pending_release',
          updatedAt: now,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();

      return {
        healed: wasCorrupted,
        status: 'pending_release',
        tmdbReleaseDate: null,
        message: 'Checked APIs — still no confirmed release date announced',
      };
    }
  }

  startCrons(): void {
    this.dueTask = cron.schedule(this.scheduleDue, async () => {
      try {
        await this.promoteDueEntries();
      } catch (err) {
        this.logger?.error?.('Error running promoteDueEntries cron:', err);
      }
    });

    this.unconfirmedTask = cron.schedule(this.scheduleUnconfirmed, async () => {
      try {
        await this.pollUnconfirmedFutureSeasons();
      } catch (err) {
        this.logger?.error?.('Error running pollUnconfirmedFutureSeasons cron:', err);
      }
    });

    // Run promotion check on startup
    this.promoteDueEntries().catch((err) => {
      this.logger?.error?.('Error running startup promoteDueEntries:', err);
    });
  }

  stopCrons(): void {
    this.dueTask?.stop();
    this.unconfirmedTask?.stop();
    this.dueTask = null;
    this.unconfirmedTask = null;
  }
}