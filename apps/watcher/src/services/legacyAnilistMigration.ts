import { eq } from 'drizzle-orm';
import { WatcherDatabase } from '../db';
import { watchRequests } from '../db/schema';

export interface WatcherAnilistMigrationOptions {
  db: WatcherDatabase;
  tmdbApiKey?: string;
  logger?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
  };
}

export interface WatcherAnilistMigrationResult {
  scanned: number;
  migrated: number;
  failed: number;
}

export async function runWatcherLegacyAnilistMigration(
  options: WatcherAnilistMigrationOptions
): Promise<WatcherAnilistMigrationResult> {
  const { db, tmdbApiKey, logger } = options;
  const legacyRows = db
    .select()
    .from(watchRequests)
    .where(eq(watchRequests.metadataSource, 'anilist'))
    .all();

  const result: WatcherAnilistMigrationResult = {
    scanned: legacyRows.length,
    migrated: 0,
    failed: 0,
  };

  if (legacyRows.length === 0) {
    return result;
  }

  logger?.info(`[LegacyMigration] Discovered ${legacyRows.length} legacy AniList records in watch_requests`);

  for (const row of legacyRows) {
    try {
      if (!tmdbApiKey) {
        result.failed++;
        logger?.warn(`[LegacyMigration] TMDB API key not configured — skipping migration for watch request ${row.id}`);
        continue;
      }

      const endpoint = row.mediaType === 'movie' ? 'movie' : 'tv';
      let url = `https://api.themoviedb.org/3/search/${endpoint}?query=${encodeURIComponent(row.title)}&api_key=${encodeURIComponent(tmdbApiKey)}`;
      if (row.year) {
        url += endpoint === 'tv' ? `&first_air_date_year=${row.year}` : `&year=${row.year}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`TMDB returned HTTP ${res.status}`);
      }

      const data = (await res.json()) as { results?: Array<{ id: number; name?: string; title?: string }> };
      const topMatch = data.results?.[0];

      if (topMatch && topMatch.id) {
        db.update(watchRequests)
          .set({
            metadataId: String(topMatch.id),
            metadataSource: 'tmdb',
            updatedAt: new Date().toISOString(),
          })
          .where(eq(watchRequests.id, row.id))
          .run();

        result.migrated++;
        logger?.info(
          `[LegacyMigration] Migrated watch request ${row.id} ("${row.title}") from AniList ID ${row.metadataId} -> TMDB ID ${topMatch.id}`
        );
      } else {
        result.failed++;
        logger?.warn(
          `[LegacyMigration] Unable to resolve TMDB match for AniList watch request ${row.id} ("${row.title}", year: ${row.year}) — flagged for review`
        );
      }
    } catch (err) {
      result.failed++;
      logger?.warn(
        `[LegacyMigration] Error resolving AniList watch request ${row.id} ("${row.title}"): ${(err as Error).message}`
      );
    }
  }

  return result;
}
