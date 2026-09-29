import { WatchRequest } from '../../db/schema';

export interface CreateWaitlistBody {
  mediaType: 'movie' | 'tv_show' | 'anime';
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  targetEpisode?: number | null;
  userId?: string;
  status?: WatchRequest['status'];
  isNextSeason?: boolean;
  posterUrl?: string | null;
  requesterUsername?: string | null;
  requesterEmail?: string | null;
  tmdbReleaseDate?: string | null;
  notifyBeforeDownload?: boolean;
}

export function normalizeTitle(value?: string | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
