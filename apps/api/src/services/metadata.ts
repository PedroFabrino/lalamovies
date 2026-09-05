import { cleanTorrentTitle } from '../utils/torrentTitleCleaner';

export interface MetadataCandidate {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
}

export class MetadataApiError extends Error {
  constructor(message: string, public statusCode = 502) {
    super(message);
    this.name = 'MetadataApiError';
  }
}

export interface IMetadataService {
  extractTitleFromMagnet(magnetLink: string): string;
  searchTMDB(query: string, mediaType: 'movie' | 'tv_show', apiKey?: string): Promise<MetadataCandidate[]>;
  searchAniList(query: string): Promise<MetadataCandidate[]>;
}

export class MetadataService implements IMetadataService {
  private defaultTmdbKey?: string;

  constructor(defaultTmdbKey?: string) {
    this.defaultTmdbKey = defaultTmdbKey || process.env.TMDB_API_KEY;
  }

  extractTitleFromMagnet(magnetLink: string): string {
    const cleaned = cleanTorrentTitle(magnetLink);
    return cleaned.title || (magnetLink.startsWith('magnet:') ? '' : magnetLink.trim());
  }

  async searchTMDB(
    query: string,
    mediaType: 'movie' | 'tv_show',
    apiKey?: string
  ): Promise<MetadataCandidate[]> {
    const key = apiKey || this.defaultTmdbKey || process.env.TMDB_API_KEY;
    if (!key) {
      throw new MetadataApiError('TMDB API key is not configured. Please set TMDB_API_KEY in system config.', 502);
    }

    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${encodeURIComponent(
      key
    )}&query=${encodeURIComponent(query)}&include_adult=false`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (err) {
      throw new MetadataApiError(`Failed to connect to TMDB API: ${(err as Error).message}`, 502);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new MetadataApiError('Invalid TMDB API key', 502);
      }
      throw new MetadataApiError(`TMDB API returned HTTP ${response.status}`, 502);
    }

    const data = (await response.json()) as {
      results?: Array<{
        id: number;
        title?: string;
        name?: string;
        original_title?: string;
        original_name?: string;
        release_date?: string;
        first_air_date?: string;
        poster_path?: string;
        overview?: string;
      }>;
    };

    const results = (data.results || []).slice(0, 5);

    return results.map((item) => {
      const title = item.title || item.name || item.original_title || item.original_name || 'Unknown Title';
      const dateStr = item.release_date || item.first_air_date;
      let year: number | null = null;
      if (dateStr) {
        const parsed = parseInt(dateStr.slice(0, 4), 10);
        if (!isNaN(parsed)) {
          year = parsed;
        }
      }

      const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;

      return {
        id: String(item.id),
        source: 'tmdb',
        title,
        year,
        posterUrl,
        overview: item.overview || null,
      };
    });
  }

  async searchAniList(query: string): Promise<MetadataCandidate[]> {
    const graphqlQuery = `
      query ($search: String) {
        Page(page: 1, perPage: 5) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            title {
              english
              romaji
              native
            }
            startDate {
              year
            }
            coverImage {
              large
              medium
            }
            description
          }
        }
      }
    `;

    let response: Response;
    try {
      response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { search: query },
        }),
      });
    } catch (err) {
      throw new MetadataApiError(`Failed to connect to AniList API: ${(err as Error).message}`, 502);
    }

    if (!response.ok) {
      throw new MetadataApiError(`AniList API returned HTTP ${response.status}`, 502);
    }

    const data = (await response.json()) as {
      data?: {
        Page?: {
          media?: Array<{
            id: number;
            title?: {
              english?: string;
              romaji?: string;
              native?: string;
            };
            startDate?: {
              year?: number;
            };
            coverImage?: {
              large?: string;
              medium?: string;
            };
            description?: string;
          }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (data.errors && data.errors.length > 0) {
      throw new MetadataApiError(`AniList GraphQL error: ${data.errors[0].message}`, 502);
    }

    const mediaList = data.data?.Page?.media || [];

    return mediaList.slice(0, 5).map((item) => {
      const title =
        item.title?.english || item.title?.romaji || item.title?.native || 'Unknown Anime';
      const year = item.startDate?.year ?? null;
      const posterUrl = item.coverImage?.large || item.coverImage?.medium || null;
      let overview = item.description || null;
      if (overview) {
        // Strip HTML tags commonly returned by AniList
        overview = overview.replace(/<[^>]*>/g, '').trim();
      }

      return {
        id: String(item.id),
        source: 'anilist',
        title,
        year,
        posterUrl,
        overview,
      };
    });
  }
}