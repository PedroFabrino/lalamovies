export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export interface AniListTitle {
  romaji: string;
  english: string | null;
  native: string | null;
}

export interface AniListCoverImage {
  extraLarge: string | null;
  large: string | null;
  medium: string | null;
}

export interface AniListTrailer {
  id: string | null;
  site: string | null;
}

export interface AniListStartDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface AniListRelationNode {
  id: number;
  title: {
    romaji: string;
    english: string | null;
  };
  format: string | null;
}

export interface AniListRelationEdge {
  relationType: string;
  node: AniListRelationNode;
}

export interface SeasonalAnimeItem {
  id: number;
  title: AniListTitle;
  format: string | null;
  status: string | null;
  episodes: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  startDate: AniListStartDate | null;
  coverImage: AniListCoverImage;
  bannerImage: string | null;
  genres: string[];
  averageScore: number | null;
  popularity: number | null;
  description: string | null;
  trailer: AniListTrailer | null;
  relations?: AniListRelationEdge[];
}

export interface AnticipatedSequelItem extends SeasonalAnimeItem {
  prequelTitle: string;
  matchedRelationType: string;
}

export interface SeasonalSectionsResponse {
  trending: SeasonalAnimeItem[];
  popularThisSeason: SeasonalAnimeItem[];
  upcomingNextSeason: SeasonalAnimeItem[];
  anticipatedSequels: AnticipatedSequelItem[];
}

export interface PageInfo {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

export interface SeasonalArchiveResponse {
  pageInfo: PageInfo;
  items: SeasonalAnimeItem[];
}

export interface IAnimeSeasonService {
  getSeasonalSections(
    userId?: string,
    jellyfinUserId?: string
  ): Promise<SeasonalSectionsResponse>;
  getSeasonalArchive(
    season: MediaSeason,
    year: number,
    page?: number,
    perPage?: number
  ): Promise<SeasonalArchiveResponse>;
  clearCache(): void;
}
