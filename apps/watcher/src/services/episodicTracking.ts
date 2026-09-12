import { eq } from 'drizzle-orm';
import { WatcherDatabase } from '../db';
import { watchRequests, WatchRequest } from '../db/schema';

export interface EpisodicTrackingLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface EpisodicTrackingOptions {
  db: WatcherDatabase;
  tmdbApiKey?: string;
  logger?: EpisodicTrackingLogger;
}

export class EpisodicTrackingService {
  private db: WatcherDatabase;
  private tmdbApiKey?: string;
  private logger?: EpisodicTrackingLogger;

  constructor(options: EpisodicTrackingOptions) {
    this.db = options.db;
    this.tmdbApiKey = options.tmdbApiKey || process.env.TMDB_API_KEY;
    this.logger = options.logger;
  }

  async advanceEntry(
    entryId: string,
    forcedTriggeredCount?: number
  ): Promise<WatchRequest | null> {
    const entry = this.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.id, entryId))
      .get();

    if (!entry) {
      this.logger?.warn(`EpisodicTracking: entry ${entryId} not found`);
      return null;
    }

    if (entry.mediaType !== 'tv_show' && entry.mediaType !== 'anime') {
      return entry;
    }

    const newTriggeredCount = forcedTriggeredCount ?? ((entry.triggeredCount || 0) + 1);
    const now = new Date().toISOString();

    if (!this.tmdbApiKey) {
      this.logger?.warn('EpisodicTracking: TMDB_API_KEY is not configured; leaving status as triggered');
      this.db
        .update(watchRequests)
        .set({
          status: 'triggered',
          triggeredCount: newTriggeredCount,
          failureCount: 0,
          discordMessageId: null,
          updatedAt: now,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();

      return this.db.select().from(watchRequests).where(eq(watchRequests.id, entry.id)).get() || null;
    }

    const sNum = entry.seasonNumber ?? 1;

    try {
      // 1. Query TMDB /tv/{metadataId}/season/{seasonNumber} for episode_count
      const seasonUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(
        entry.metadataId
      )}/season/${encodeURIComponent(sNum)}?api_key=${encodeURIComponent(this.tmdbApiKey)}`;
      const seasonRes = await fetch(seasonUrl);

      // 2. Query TMDB /tv/{metadataId} for next_episode_to_air
      const showUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(
        entry.metadataId
      )}?api_key=${encodeURIComponent(this.tmdbApiKey)}`;
      const showRes = await fetch(showUrl);

      if (!seasonRes.ok || !showRes.ok) {
        this.logger?.warn(
          `EpisodicTracking: TMDB fetch failed for ${entry.title} (season HTTP ${seasonRes.status}, show HTTP ${showRes.status})`
        );
        this.db
          .update(watchRequests)
          .set({
            status: 'triggered',
            triggeredCount: newTriggeredCount,
            failureCount: 0,
            discordMessageId: null,
            updatedAt: now,
          })
          .where(eq(watchRequests.id, entry.id))
          .run();
        return this.db.select().from(watchRequests).where(eq(watchRequests.id, entry.id)).get() || null;
      }

      const seasonData = (await seasonRes.json()) as any;
      const showData = (await showRes.json()) as any;

      const episodeCount = seasonData.episodes ? seasonData.episodes.length : (seasonData.episode_count ?? 0);
      const nextEpisodeToAir = showData.next_episode_to_air ?? null;

      if (nextEpisodeToAir !== null && newTriggeredCount < episodeCount) {
        // Next episode exists and more episodes remain in the season
        const nextTargetEpisode = (entry.targetEpisode ?? 1) + 1;
        const nextEp = seasonData.episodes?.find((e: any) => e.episode_number === nextTargetEpisode);
        const nextEpAirDate = nextEp?.air_date ? nextEp.air_date.slice(0, 10) : null;
        const today = new Date().toISOString().slice(0, 10);
        const nextStatus = nextEpAirDate && nextEpAirDate > today ? 'pending_release' : 'checking';

        this.db
          .update(watchRequests)
          .set({
            status: nextStatus,
            targetEpisode: nextTargetEpisode,
            tmdbReleaseDate: nextEpAirDate || entry.tmdbReleaseDate,
            triggeredCount: newTriggeredCount,
            failureCount: 0,
            notifyAt: null,
            prowlarrReleaseTitle: null,
            prowlarrReleaseMagnet: null,
            prowlarrReleaseScore: null,
            discordMessageId: null,
            updatedAt: now,
          })
          .where(eq(watchRequests.id, entry.id))
          .run();

        this.logger?.info(
          `EpisodicTracking: advanced "${entry.title}" to episode ${nextTargetEpisode} (${newTriggeredCount}/${episodeCount}). Status -> checking.`
        );
      } else {
        // Season complete: next_episode_to_air is null OR triggered_count >= episode_count
        this.db
          .update(watchRequests)
          .set({
            status: 'completed',
            triggeredCount: newTriggeredCount,
            failureCount: 0,
            notifyAt: null,
            prowlarrReleaseTitle: null,
            prowlarrReleaseMagnet: null,
            prowlarrReleaseScore: null,
            discordMessageId: null,
            updatedAt: now,
          })
          .where(eq(watchRequests.id, entry.id))
          .run();

        this.logger?.info(
          `EpisodicTracking: completed season for "${entry.title}" (${newTriggeredCount}/${episodeCount} episodes). Status -> completed.`
        );
      }

      return this.db.select().from(watchRequests).where(eq(watchRequests.id, entry.id)).get() || null;
    } catch (err) {
      this.logger?.error(`EpisodicTracking: error advancing episodic tracking for "${entry.title}":`, err);
      this.db
        .update(watchRequests)
        .set({
          status: 'triggered',
          triggeredCount: newTriggeredCount,
          failureCount: 0,
          discordMessageId: null,
          updatedAt: now,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();
      return this.db.select().from(watchRequests).where(eq(watchRequests.id, entry.id)).get() || null;
    }
  }
}
