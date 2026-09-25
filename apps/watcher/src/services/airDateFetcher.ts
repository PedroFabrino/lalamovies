export interface AirDateFetcherLogger {
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
  error?: (msg: string, err?: unknown) => void;
}

export interface FetchAirDateParams {
  mediaType: 'movie' | 'tv_show' | 'anime';
  metadataId: string;
  metadataSource?: 'tmdb' | 'anilist';
  seasonNumber?: number | null;
  targetEpisode?: number | null;
  tmdbApiKey?: string;
  logger?: AirDateFetcherLogger;
}

interface TmdbMovieReleaseResponse {
  release_date?: string;
  release_dates?: {
    results?: Array<{
      release_dates?: Array<{
        type?: number;
        release_date?: string;
      }>;
    }>;
  };
}

interface TmdbEpisodeInfo {
  episode_number?: number;
  air_date?: string | null;
}

interface TmdbSeasonResponse {
  air_date?: string | null;
  episodes?: TmdbEpisodeInfo[];
}

interface TmdbShowResponse {
  next_episode_to_air?: {
    season_number?: number;
    air_date?: string;
  } | null;
}

interface AniListStartDate {
  year?: number | null;
  month?: number | null;
  day?: number | null;
}

interface AniListNextAiringEpisode {
  airingAt?: number | null;
  timeUntilAiring?: number | null;
  episode?: number | null;
}

interface AniListMediaResponse {
  data?: {
    Media?: {
      startDate?: AniListStartDate | null;
      nextAiringEpisode?: AniListNextAiringEpisode | null;
      status?: string | null;
    } | null;
  };
}

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

const ANILIST_AIRING_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    startDate { year month day }
    nextAiringEpisode { airingAt timeUntilAiring episode }
    status
  }
}
`;

export async function fetchAniListAirDate(
  metadataId: string,
  targetEpisode?: number | null,
  logger?: AirDateFetcherLogger
): Promise<string | null> {
  const numericId = parseInt(metadataId, 10);
  if (isNaN(numericId)) {
    logger?.warn?.(`Invalid AniList ID: ${metadataId}`);
    return null;
  }

  try {
    const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: ANILIST_AIRING_QUERY,
        variables: { id: numericId },
      }),
    });

    if (!res.ok) {
      logger?.warn?.(`AniList GraphQL returned HTTP ${res.status} for media ${metadataId}`);
      return null;
    }

    const json = (await res.json()) as AniListMediaResponse;
    const media = json.data?.Media;
    if (!media) return null;

    // Check nextAiringEpisode for target episode or initial episode
    if (media.nextAiringEpisode?.airingAt) {
      const airingTimestampSec = media.nextAiringEpisode.airingAt;
      const isoDate = new Date(airingTimestampSec * 1000).toISOString().slice(0, 10);

      // If target episode specifically requested and matches
      if (targetEpisode && media.nextAiringEpisode.episode === targetEpisode) {
        return isoDate;
      }
      // If target episode is 1 or unspecified and next airing episode is episode 1
      if ((!targetEpisode || targetEpisode === 1) && media.nextAiringEpisode.episode === 1) {
        return isoDate;
      }
    }

    // Check confirmed startDate
    const start = media.startDate;
    if (start?.year && start.month && start.day) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${start.year}-${pad(start.month)}-${pad(start.day)}`;
    }

    // Fallback: if nextAiringEpisode has airingAt regardless of episode number
    if (media.nextAiringEpisode?.airingAt) {
      return new Date(media.nextAiringEpisode.airingAt * 1000).toISOString().slice(0, 10);
    }

    return null;
  } catch (err) {
    logger?.error?.(`Failed to fetch AniList release date for ${metadataId}:`, err);
    return null;
  }
}

export async function fetchTmdbAirDate(
  metadataId: string,
  mediaType: 'movie' | 'tv_show' | 'anime',
  seasonNumber?: number | null,
  targetEpisode?: number | null,
  tmdbApiKey?: string,
  logger?: AirDateFetcherLogger
): Promise<string | null> {
  if (!tmdbApiKey) {
    logger?.warn?.('TMDB_API_KEY is not configured; skipping TMDB lookup');
    return null;
  }

  try {
    if (mediaType === 'movie') {
      const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(
        metadataId
      )}?api_key=${encodeURIComponent(tmdbApiKey)}&append_to_response=release_dates`;
      const res = await fetch(url);
      if (!res.ok) {
        logger?.warn?.(`TMDB returned HTTP ${res.status} for movie ${metadataId}`);
        return null;
      }
      const data = (await res.json()) as TmdbMovieReleaseResponse;

      const candidateDates: string[] = [];
      if (data.release_date) {
        candidateDates.push(data.release_date.slice(0, 10));
      }

      if (data.release_dates?.results && Array.isArray(data.release_dates.results)) {
        for (const country of data.release_dates.results) {
          if (Array.isArray(country.release_dates)) {
            for (const rd of country.release_dates) {
              // type 3: Theatrical, type 4: Digital, type 5: Physical
              if (rd.release_date && rd.type && [3, 4, 5].includes(rd.type)) {
                candidateDates.push(rd.release_date.slice(0, 10));
              }
            }
          }
        }
      }

      if (candidateDates.length === 0) return null;
      candidateDates.sort();
      return candidateDates[0];
    } else {
      const sNum = seasonNumber ?? 1;
      const url = `https://api.themoviedb.org/3/tv/${encodeURIComponent(
        metadataId
      )}/season/${encodeURIComponent(sNum)}?api_key=${encodeURIComponent(tmdbApiKey)}`;
      const res = await fetch(url);

      if (res.ok) {
        const data = (await res.json()) as TmdbSeasonResponse;

        // If targetEpisode is provided, look up that specific episode's air date first
        if (targetEpisode && Array.isArray(data.episodes)) {
          const ep = data.episodes.find((e: TmdbEpisodeInfo) => e.episode_number === targetEpisode);
          if (ep && ep.air_date) {
            return ep.air_date.slice(0, 10);
          }
        }

        if (data.air_date) {
          return data.air_date.slice(0, 10);
        }
      } else {
        logger?.warn?.(`TMDB returned HTTP ${res.status} for tv ${metadataId} season ${sNum}`);
      }

      // Fallback: check /tv/{id} next_episode_to_air
      const showUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(
        metadataId
      )}?api_key=${encodeURIComponent(tmdbApiKey)}`;
      const showRes = await fetch(showUrl);
      if (showRes.ok) {
        const showData = (await showRes.json()) as TmdbShowResponse;
        const nextEpisode = showData.next_episode_to_air;
        if (nextEpisode && nextEpisode.season_number === sNum && nextEpisode.air_date) {
          return nextEpisode.air_date.slice(0, 10);
        }
      }

      return null;
    }
  } catch (err) {
    logger?.error?.(`Failed to fetch TMDB release date for ${mediaType} ${metadataId}:`, err);
    return null;
  }
}

export async function fetchAirDate(params: FetchAirDateParams): Promise<string | null> {
  const { mediaType, metadataId, metadataSource, seasonNumber, targetEpisode, tmdbApiKey, logger } = params;

  if (metadataSource === 'anilist') {
    return fetchAniListAirDate(metadataId, targetEpisode, logger);
  }

  return fetchTmdbAirDate(metadataId, mediaType, seasonNumber, targetEpisode, tmdbApiKey, logger);
}
