export interface WaitlistCandidate {
  id: string | number;
  source?: string;
  title: string;
  year?: number;
  posterUrl?: string | null;
  releaseDate?: string | null;
  overview?: string;
  [key: string]: unknown;
}

export interface SeriesProgressResponse {
  inLibrary?: boolean;
  hasExisting?: boolean;
  status?: string | null;
  highestSeason: number | null;
  highestEpisode: number | null;
  existingEpisodes: number[];
  suggestedSeason: number;
  suggestedEpisode: number;
  existingMediaType?: string;
  existingTitle?: string;
  airDate?: string | null;
  [key: string]: unknown;
}

export interface MediaTypeOption {
  value: 'movie' | 'tv_show' | 'anime';
  label: string;
  icon: string;
}
