import { IRequestsRepository } from './requestsRepositoryTypes';
import { IMetadataService, rankMetadataCandidates } from './metadata';

export interface AnilistMigrationOptions {
  requestsRepo: IRequestsRepository;
  metadataService: IMetadataService;
  logger?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
  };
}

export interface AnilistMigrationResult {
  scanned: number;
  migrated: number;
  failed: number;
}

export async function runLegacyAnilistMigration(
  options: AnilistMigrationOptions
): Promise<AnilistMigrationResult> {
  const { requestsRepo, metadataService, logger } = options;
  const legacyRows = requestsRepo.findLegacyAnilist();

  const result: AnilistMigrationResult = {
    scanned: legacyRows.length,
    migrated: 0,
    failed: 0,
  };

  if (legacyRows.length === 0) {
    return result;
  }

  logger?.info(`[LegacyMigration] Discovered ${legacyRows.length} legacy AniList records in download_requests`);

  for (const row of legacyRows) {
    try {
      const candidates =
        row.mediaType === 'movie'
          ? await metadataService.searchMovies(row.title, { year: row.year })
          : await metadataService.searchSeries(row.title, { year: row.year });

      const ranked = rankMetadataCandidates(candidates, row.title, row.year);
      const topMatch = ranked[0];

      if (topMatch && topMatch.id) {
        requestsRepo.updateMetadataSource(row.id, String(topMatch.id), 'tmdb');
        result.migrated++;
        logger?.info(
          `[LegacyMigration] Migrated request ${row.id} ("${row.title}") from AniList ID ${row.metadataId} -> TMDB ID ${topMatch.id}`
        );
      } else {
        result.failed++;
        logger?.warn(
          `[LegacyMigration] Unable to resolve TMDB match for AniList request ${row.id} ("${row.title}", year: ${row.year}) — flagged for manual review`
        );
      }
    } catch (err) {
      result.failed++;
      logger?.warn(
        `[LegacyMigration] Error resolving AniList request ${row.id} ("${row.title}"): ${(err as Error).message}`
      );
    }
  }

  return result;
}
