export interface MediaRequester {
  id: string;
  username: string;
}

export interface EpisodeItem {
  id: string;
  episodeNumber: number | null;
  title: string;
  sizeBytes: number;
  jellyfinPath: string | null;
}

export interface SeasonItem {
  seasonNumber: number;
  episodeCount: number;
  sizeBytes: number;
  episodes: EpisodeItem[];
}

export interface LibraryMediaItem {
  id: string;
  requestIds: string[];
  title: string;
  year: number | null;
  mediaType: 'movie' | 'tv_show' | 'anime';
  sizeBytes: number;
  jellyfinPath: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  overview?: string | null;
  genres?: string[];
  resolution?: string;
  requestedBy: MediaRequester;
  coRequesters: MediaRequester[];
  canManage: boolean;
  seasons?: SeasonItem[];
}
