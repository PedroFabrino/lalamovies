import { IRequestsRepository } from './requestsRepository';
import { IJellyfinService } from './jellyfin';
import { normalizeShowTitle } from './upNext';
import {
  SeasonalAnimeItem,
  AnticipatedSequelItem,
  AniListRelationEdge,
} from './animeTypes';

export interface HistoryMatcherOptions {
  requestsRepo: IRequestsRepository;
  jellyfin: IJellyfinService;
  logger?: {
    warn: (msg: string, extra?: unknown) => void;
  };
}

export function extractShowNameFromPath(filePath: string): string {
  if (!filePath) return '';
  const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
  // Remove filename
  parts.pop();
  // Strip trailing season / specials / numeric folders
  while (parts.length > 0 && /^(season|series|specials|\d+)/i.test(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

function stripSeasonNumbering(title: string): string {
  return title
    .replace(/(?:season|series|part|cour|2nd|3rd|4th|\d+(?:st|nd|rd|th))\s*\d*/gi, '')
    .replace(/[:\-–—]\s*$/, '')
    .trim();
}

export class AnimeHistoryMatcher {
  private requestsRepo: IRequestsRepository;
  private jellyfin: IJellyfinService;
  private logger?: { warn: (msg: string, extra?: unknown) => void };

  constructor(options: HistoryMatcherOptions) {
    this.requestsRepo = options.requestsRepo;
    this.jellyfin = options.jellyfin;
    this.logger = options.logger;
  }

  async findAnticipatedSequels(
    upcomingAnime: SeasonalAnimeItem[],
    userId?: string,
    jellyfinUserId?: string
  ): Promise<AnticipatedSequelItem[]> {
    if (!userId) {
      return [];
    }

    try {
      const watchedAniListIds = new Set<string>();
      const watchedTitles: Array<{ original: string; normalized: string; stripped: string }> = [];

      // 1. Ingest completed anime download requests
      const userRequests = this.requestsRepo.findByUserId(userId, true);
      const completedAnime = userRequests.filter(
        (r) =>
          r.mediaType === 'anime' &&
          (r.status === 'done' || r.status === 'seeding')
      );

      for (const req of completedAnime) {
        if (req.metadataSource === 'anilist' && req.metadataId) {
          watchedAniListIds.add(String(req.metadataId));
        }
        if (req.title) {
          const norm = normalizeShowTitle(req.title);
          const stripped = normalizeShowTitle(stripSeasonNumbering(req.title));
          watchedTitles.push({ original: req.title, normalized: norm, stripped });
        }
      }

      // 2. Ingest Jellyfin watch history if available
      if (this.jellyfin.getPlayHistory && jellyfinUserId) {
        try {
          const playHistory = await this.jellyfin.getPlayHistory(jellyfinUserId);
          const seenJellyfinShows = new Set<string>();

          for (const filePath of Object.keys(playHistory || {})) {
            const showName = extractShowNameFromPath(filePath);
            if (showName && !seenJellyfinShows.has(showName)) {
              seenJellyfinShows.add(showName);
              const norm = normalizeShowTitle(showName);
              const stripped = normalizeShowTitle(stripSeasonNumbering(showName));
              watchedTitles.push({ original: showName, normalized: norm, stripped });
            }
          }
        } catch (jfErr) {
          this.logger?.warn('Failed to retrieve Jellyfin play history for anime matching', jfErr);
        }
      }

      if (watchedAniListIds.size === 0 && watchedTitles.length === 0) {
        return [];
      }

      // 3. Correlate upcoming anime against user watch history
      const matchedSequels: AnticipatedSequelItem[] = [];
      const seenMediaIds = new Set<number>();

      for (const anime of upcomingAnime) {
        if (seenMediaIds.has(anime.id)) continue;

        let matchResult: { prequelTitle: string; relationType: string } | null = null;
        const relations = anime.relations || [];

        // Check PREQUEL and PARENT relation edges
        const relevantEdges = relations.filter(
          (edge: AniListRelationEdge) =>
            edge.relationType === 'PREQUEL' || edge.relationType === 'PARENT'
        );

        for (const edge of relevantEdges) {
          const edgeNodeId = String(edge.node.id);
          const edgeRomaji = edge.node.title?.romaji || '';
          const edgeEnglish = edge.node.title?.english || '';
          const bestRelationTitle = edgeEnglish || edgeRomaji || 'Prequel';

          // Pass 1: Deterministic AniList ID check
          if (watchedAniListIds.has(edgeNodeId)) {
            matchResult = {
              prequelTitle: bestRelationTitle,
              relationType: edge.relationType,
            };
            break;
          }

          // Pass 2: Normalized title check on relations
          const normRomaji = normalizeShowTitle(edgeRomaji);
          const normEnglish = normalizeShowTitle(edgeEnglish);

          const matchedWatched = watchedTitles.find((w) => {
            if (normEnglish && w.normalized === normEnglish) return true;
            if (normRomaji && w.normalized === normRomaji) return true;
            if (normEnglish && w.stripped && w.stripped === normEnglish) return true;
            if (normRomaji && w.stripped && w.stripped === normRomaji) return true;
            return false;
          });

          if (matchedWatched) {
            matchResult = {
              prequelTitle: matchedWatched.original || bestRelationTitle,
              relationType: edge.relationType,
            };
            break;
          }
        }

        // Pass 3: Fallback title normalization (e.g. for TMDB requests with season numbers in title)
        if (!matchResult) {
          const animeRomaji = anime.title?.romaji || '';
          const animeEnglish = anime.title?.english || '';
          const strippedRomaji = normalizeShowTitle(stripSeasonNumbering(animeRomaji));
          const strippedEnglish = normalizeShowTitle(stripSeasonNumbering(animeEnglish));

          const fallbackMatched = watchedTitles.find((w) => {
            if (w.normalized.length < 3) return false;
            // Ensure title has a sequel indicator so we don't match the same show to itself
            const isSelfEnglish = animeEnglish && normalizeShowTitle(animeEnglish) === w.normalized;
            const isSelfRomaji = animeRomaji && normalizeShowTitle(animeRomaji) === w.normalized;
            if (isSelfEnglish || isSelfRomaji) return false;

            if (strippedEnglish && w.stripped === strippedEnglish) return true;
            if (strippedRomaji && w.stripped === strippedRomaji) return true;
            return false;
          });

          if (fallbackMatched) {
            matchResult = {
              prequelTitle: fallbackMatched.original,
              relationType: 'PREQUEL',
            };
          }
        }

        if (matchResult) {
          seenMediaIds.add(anime.id);
          matchedSequels.push({
            ...anime,
            prequelTitle: `Sequel to ${matchResult.prequelTitle}`,
            matchedRelationType: matchResult.relationType,
          });
        }
      }

      return matchedSequels;
    } catch (err) {
      this.logger?.warn('Error correlating anticipated anime sequels', err);
      return [];
    }
  }
}
