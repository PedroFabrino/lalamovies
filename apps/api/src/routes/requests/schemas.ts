import { z } from 'zod';

export interface TmdbEpisodeInfo {
  episode_number: number;
  air_date?: string | null;
}

export interface TmdbSeasonDetails {
  air_date?: string | null;
  episodes?: TmdbEpisodeInfo[];
}

export const searchMetadataSchema = z
  .object({
    magnetLink: z.string().optional(),
    torrentFileBase64: z.string().optional(),
    mediaType: z.enum(['movie', 'tv_show', 'anime', 'private']),
    query: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.magnetLink && data.magnetLink.trim().length > 0) ||
          data.torrentFileBase64 ||
          (data.query && data.query.trim().length > 0)
      ),
    {
      message: 'Either magnetLink, torrentFileBase64, or explicit query is required',
    }
  );

export const createRequestSchema = z.object({
  magnetLink: z.string().optional(),
  torrentFileBase64: z.string().optional(),
  torrentFileName: z.string().optional(),
  mediaType: z.enum(['movie', 'tv_show', 'anime', 'private']),
  metadataId: z.string().min(1, 'Metadata ID is required'),
  metadataSource: z.enum(['tmdb', 'anilist']),
  title: z.string().min(1, 'Title is required'),
  year: z.number().int().optional(),
  seasonNumber: z.number().int().optional(),
  episodeNumber: z.number().int().optional(),
  waitlistNextSeason: z.boolean().optional(),
  coRequesterUserIds: z.array(z.string()).optional(),
});

export const existsRequestSchema = z.object({
  metadataId: z.string().min(1, 'Metadata ID is required'),
  metadataSource: z.enum(['tmdb', 'anilist']),
  mediaType: z.enum(['movie', 'tv_show', 'anime', 'private']).optional(),
  seasonNumber: z.coerce.number().int().optional(),
  episodeNumber: z.coerce.number().int().optional(),
});

export const batchItemSchema = z
  .object({
    magnetLink: z.string().optional(),
    torrentFileBase64: z.string().optional(),
    torrentFileName: z.string().optional(),
    mediaType: z.enum(['movie', 'tv_show', 'anime', 'private']).optional(),
    metadataId: z.string().optional(),
    metadataSource: z.enum(['tmdb', 'anilist']).optional(),
    title: z.string().optional(),
    year: z.number().int().optional(),
    seasonNumber: z.number().int().optional(),
    episodeNumber: z.number().int().optional(),
  })
  .refine(
    (data) => Boolean((data.magnetLink && data.magnetLink.trim().length > 0) || data.torrentFileBase64),
    {
      message: 'Either magnetLink or torrentFileBase64 is required for each batch item',
    }
  );

export const batchRequestSchema = z.object({
  mediaType: z.enum(['movie', 'tv_show', 'anime', 'private']).optional(),
  metadataId: z.string().optional(),
  metadataSource: z.enum(['tmdb', 'anilist']).optional(),
  title: z.string().optional(),
  year: z.number().int().optional(),
  seasonNumber: z.number().int().optional(),
  items: z.array(batchItemSchema).min(1, 'At least one item is required in the batch'),
});

export const searchReleasesSchema = z.object({
  metadataId: z.string().optional().nullable(),
  metadataSource: z.enum(['tmdb', 'anilist']).optional().nullable(),
  mediaType: z.enum(['movie', 'tv_show', 'anime', 'private']),
  title: z.string().min(1, 'Title is required'),
  year: z.number().int().optional().nullable(),
  seasonNumber: z.number().int().optional().nullable(),
  episodeNumber: z.number().int().optional().nullable(),
  romajiTitle: z.string().optional().nullable(),
  englishTitle: z.string().optional().nullable(),
});

export const replaceTorrentSchema = z
  .object({
    magnetLink: z.string().optional(),
    torrentFileBase64: z.string().optional(),
    torrentFileName: z.string().optional(),
  })
  .refine(
    (data) => Boolean((data.magnetLink && data.magnetLink.trim().length > 0) || data.torrentFileBase64),
    {
      message: 'Either magnetLink or torrentFileBase64 is required',
    }
  );
