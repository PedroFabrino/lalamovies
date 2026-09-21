import { cleanTorrentTitle } from '../utils/torrentTitleCleaner';

export interface MetadataCandidate {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  year: number | null;
  releaseDate?: string | null;
  posterUrl: string | null;
  overview: string | null;
  romajiTitle?: string | null;
  englishTitle?: string | null;
  rating?: number | null;
}

export class MetadataApiError extends Error {
  constructor(message: string, public statusCode = 502) {
    super(message);
    this.name = 'MetadataApiError';
  }
}

export interface MetadataSearchOptions {
  apiKey?: string;
  year?: number | null;
}

export interface IMetadataService {
  extractTitleFromMagnet(magnetLink: string): string;
  searchTMDB(
    query: string,
    mediaType: 'movie' | 'tv_show',
    apiKey?: string,
    year?: number | null
  ): Promise<MetadataCandidate[]>;
  searchAniList(query: string, year?: number | null): Promise<MetadataCandidate[]>;
  searchMovies(query: string, opts?: MetadataSearchOptions): Promise<MetadataCandidate[]>;
  searchSeries(query: string, opts?: MetadataSearchOptions): Promise<MetadataCandidate[]>;
  searchAnime(query: string, opts?: MetadataSearchOptions): Promise<MetadataCandidate[]>;
  searchPrivate(query: string, opts?: MetadataSearchOptions): Promise<MetadataCandidate[]>;
  searchMedia(
    query: string,
    mediaType: 'movie' | 'tv_show' | 'anime' | 'private',
    opts?: MetadataSearchOptions
  ): Promise<MetadataCandidate[]>;
}

export function rankMetadataCandidates<T extends { title: string; year: number | null; romajiTitle?: string | null; englishTitle?: string | null }>(
  candidates: T[],
  targetTitle: string,
  targetYear?: number | null
): T[] {
  if (candidates.length <= 1) return candidates;

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/['’".,_\-:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const normTarget = normalize(targetTitle);

  return [...candidates].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    const normA = normalize(a.title);
    const normB = normalize(b.title);
    const romajiA = a.romajiTitle ? normalize(a.romajiTitle) : '';
    const romajiB = b.romajiTitle ? normalize(b.romajiTitle) : '';
    const engA = a.englishTitle ? normalize(a.englishTitle) : '';
    const engB = b.englishTitle ? normalize(b.englishTitle) : '';

    // Exact title match: +100
    if (normA === normTarget || romajiA === normTarget || engA === normTarget) scoreA += 100;
    if (normB === normTarget || romajiB === normTarget || engB === normTarget) scoreB += 100;

    // Substring / prefix match
    if (normA !== normTarget && romajiA !== normTarget && engA !== normTarget) {
      if (normA.startsWith(normTarget) || normTarget.startsWith(normA)) scoreA += 30;
      else if (normA.includes(normTarget) || normTarget.includes(normA)) scoreA += 15;
    }
    if (normB !== normTarget && romajiB !== normTarget && engB !== normTarget) {
      if (normB.startsWith(normTarget) || normTarget.startsWith(normB)) scoreB += 30;
      else if (normB.includes(normTarget) || normTarget.includes(normB)) scoreB += 15;
    }

    // Word count penalty: extra words reduce match confidence
    const wordsTarget = normTarget.split(' ').filter(Boolean).length;
    const wordsA = normA.split(' ').filter(Boolean).length;
    const wordsB = normB.split(' ').filter(Boolean).length;
    scoreA -= Math.abs(wordsA - wordsTarget) * 5;
    scoreB -= Math.abs(wordsB - wordsTarget) * 5;

    // Year matching
    if (targetYear !== undefined && targetYear !== null) {
      if (a.year !== null) {
        const diffA = Math.abs(a.year - targetYear);
        if (diffA === 0) scoreA += 100;
        else if (diffA === 1) scoreA += 50;
        else scoreA -= diffA * 15;
      }
      if (b.year !== null) {
        const diffB = Math.abs(b.year - targetYear);
        if (diffB === 0) scoreB += 100;
        else if (diffB === 1) scoreB += 50;
        else scoreB -= diffB * 15;
      }
    }

    return scoreB - scoreA;
  });
}

export abstract class BaseMetadataService implements IMetadataService {
  abstract extractTitleFromMagnet(magnetLink: string): string;
  abstract searchTMDB(
    query: string,
    mediaType: 'movie' | 'tv_show',
    apiKey?: string,
    year?: number | null
  ): Promise<MetadataCandidate[]>;
  abstract searchAniList(query: string, year?: number | null): Promise<MetadataCandidate[]>;

  async searchMovies(query: string, opts?: MetadataSearchOptions): Promise<MetadataCandidate[]> {
    if (opts?.year !== undefined && opts?.year !== null) {
      return this.searchTMDB(query, 'movie', opts?.apiKey, opts?.year);
    }
    return this.searchTMDB(query, 'movie', opts?.apiKey);
  }

  async searchSeries(query: string, opts?: MetadataSearchOptions): Promise<MetadataCandidate[]> {
    if (opts?.year !== undefined && opts?.year !== null) {
      return this.searchTMDB(query, 'tv_show', opts?.apiKey, opts?.year);
    }
    return this.searchTMDB(query, 'tv_show', opts?.apiKey);
  }

  async searchAnime(query: string, opts?: MetadataSearchOptions): Promise<MetadataCandidate[]> {
    // 1. Try TMDB first (search TV shows, and if fewer than 3 results, also search movies)
    try {
      const tvCandidates =
        opts?.year !== undefined && opts?.year !== null
          ? await this.searchTMDB(query, 'tv_show', opts?.apiKey, opts?.year)
          : await this.searchTMDB(query, 'tv_show', opts?.apiKey);
      const movieCandidates =
        tvCandidates.length < 3
          ? opts?.year !== undefined && opts?.year !== null
            ? await this.searchTMDB(query, 'movie', opts?.apiKey, opts?.year).catch(() => [])
            : await this.searchTMDB(query, 'movie', opts?.apiKey).catch(() => [])
          : [];
      const combined = [...tvCandidates, ...movieCandidates];
      const seen = new Set<string>();
      const uniqueCandidates: MetadataCandidate[] = [];
      for (const c of combined) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          uniqueCandidates.push(c);
        }
      }
      if (uniqueCandidates.length > 0) {
        return rankMetadataCandidates(uniqueCandidates, query, opts?.year);
      }
    } catch (err) {
      console.warn(`[MetadataService] TMDB anime search failed for query "${query}": ${(err as Error).message}`);
    }

    // 2. Fallback to AniList
    try {
      return await this.searchAniList(query, opts?.year);
    } catch (err) {
      console.warn(`[MetadataService] AniList fallback search failed for query "${query}": ${(err as Error).message}`);
      return [];
    }
  }

  async searchPrivate(query: string, opts?: MetadataSearchOptions): Promise<MetadataCandidate[]> {
    const movieCandidates =
      opts?.year !== undefined && opts?.year !== null
        ? await this.searchTMDB(query, 'movie', opts?.apiKey, opts?.year)
        : await this.searchTMDB(query, 'movie', opts?.apiKey);
    let tvCandidates: MetadataCandidate[] = [];
    try {
      tvCandidates =
        opts?.year !== undefined && opts?.year !== null
          ? await this.searchTMDB(query, 'tv_show', opts?.apiKey, opts?.year)
          : await this.searchTMDB(query, 'tv_show', opts?.apiKey);
    } catch (err) {
      console.warn(`[MetadataService] TMDB TV search failed in searchPrivate for query "${query}": ${(err as Error).message}`);
    }
    const combined = [...movieCandidates, ...tvCandidates];
    const seen = new Set<string>();
    const uniqueCandidates: MetadataCandidate[] = [];
    for (const c of combined) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        uniqueCandidates.push(c);
      }
    }
    return rankMetadataCandidates(uniqueCandidates, query, opts?.year);
  }

  async searchMedia(
    query: string,
    mediaType: 'movie' | 'tv_show' | 'anime' | 'private',
    opts?: MetadataSearchOptions
  ): Promise<MetadataCandidate[]> {
    switch (mediaType) {
      case 'movie':
        return this.searchMovies(query, opts);
      case 'tv_show':
        return this.searchSeries(query, opts);
      case 'anime':
        return this.searchAnime(query, opts);
      case 'private':
        return this.searchPrivate(query, opts);
    }
  }
}

export class MetadataService extends BaseMetadataService {
  private defaultTmdbKey?: string;

  constructor(defaultTmdbKey?: string) {
    super();
    this.defaultTmdbKey = defaultTmdbKey || process.env.TMDB_API_KEY;
  }

  extractTitleFromMagnet(magnetLink: string): string {
    const cleaned = cleanTorrentTitle(magnetLink);
    return cleaned.title || (magnetLink.startsWith('magnet:') ? '' : magnetLink.trim());
  }

  async searchTMDB(
    query: string,
    mediaType: 'movie' | 'tv_show',
    apiKey?: string,
    year?: number | null
  ): Promise<MetadataCandidate[]> {
    const key = apiKey || this.defaultTmdbKey || process.env.TMDB_API_KEY;
    if (!key) {
      throw new MetadataApiError('TMDB API key is not configured. Please set TMDB_API_KEY in system config.', 502);
    }

    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const baseUrl = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${encodeURIComponent(
      key
    )}&query=${encodeURIComponent(query)}&include_adult=false`;

    type TmdbSearchResult = {
      id: number;
      title?: string;
      name?: string;
      original_title?: string;
      original_name?: string;
      release_date?: string;
      first_air_date?: string;
      poster_path?: string;
      overview?: string;
      vote_average?: number;
    };

    const fetchResults = async (url: string): Promise<TmdbSearchResult[]> => {
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
        results?: TmdbSearchResult[];
      };

      return data.results || [];
    };

    let rawResults: TmdbSearchResult[] = [];
    if (year) {
      const yearParam = mediaType === 'movie' ? `&primary_release_year=${year}` : `&first_air_date_year=${year}`;
      rawResults = await fetchResults(baseUrl + yearParam);
      if (rawResults.length === 0) {
        rawResults = await fetchResults(baseUrl);
      }
    } else {
      rawResults = await fetchResults(baseUrl);
    }

    const results = rawResults.slice(0, 10);

    const candidates: MetadataCandidate[] = results.map((item) => {
      const title = item.title || item.name || item.original_title || item.original_name || 'Unknown Title';
      const dateStr = item.release_date || item.first_air_date;
      let parsedYear: number | null = null;
      if (dateStr) {
        const parsed = parseInt(dateStr.slice(0, 4), 10);
        if (!isNaN(parsed)) {
          parsedYear = parsed;
        }
      }

      const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
      const rating =
        typeof item.vote_average === 'number' && item.vote_average > 0
          ? Math.round(item.vote_average * 10) / 10
          : null;

      return {
        id: String(item.id),
        source: 'tmdb',
        title,
        year: parsedYear,
        releaseDate: dateStr ? dateStr.slice(0, 10) : null,
        posterUrl,
        overview: item.overview || null,
        romajiTitle: item.original_name || item.original_title || null,
        englishTitle: item.name || item.title || null,
        rating,
      };
    });

    return rankMetadataCandidates(candidates, query, year);
  }

  async searchAniList(query: string, year?: number | null): Promise<MetadataCandidate[]> {
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
              month
              day
            }
            coverImage {
              large
              medium
            }
            description
            averageScore
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
              month?: number;
              day?: number;
            };
            coverImage?: {
              large?: string;
              medium?: string;
            };
            description?: string;
            averageScore?: number;
          }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (data.errors && data.errors.length > 0) {
      throw new MetadataApiError(`AniList GraphQL error: ${data.errors[0].message}`, 502);
    }

    const mediaList = data.data?.Page?.media || [];

    const candidates: MetadataCandidate[] = mediaList.slice(0, 5).map((item) => {
      const title =
        item.title?.english || item.title?.romaji || item.title?.native || 'Unknown Anime';
      const parsedYear = item.startDate?.year ?? null;
      const posterUrl = item.coverImage?.large || item.coverImage?.medium || null;
      let overview = item.description || null;
      if (overview) {
        // Strip HTML tags commonly returned by AniList
        overview = overview.replace(/<[^>]*>/g, '').trim();
      }
      const rating =
        typeof item.averageScore === 'number' && item.averageScore > 0
          ? Math.round((item.averageScore / 10) * 10) / 10
          : null;

      let releaseDate: string | null = null;
      if (item.startDate?.year) {
        const y = String(item.startDate.year);
        const m = item.startDate.month ? String(item.startDate.month).padStart(2, '0') : '01';
        const d = item.startDate.day ? String(item.startDate.day).padStart(2, '0') : '01';
        releaseDate = `${y}-${m}-${d}`;
      }

      return {
        id: String(item.id),
        source: 'anilist',
        title,
        year: parsedYear,
        releaseDate,
        posterUrl,
        overview,
        romajiTitle: item.title?.romaji || null,
        englishTitle: item.title?.english || null,
        rating,
      };
    });

    return rankMetadataCandidates(candidates, query, year);
  }
}