import fs from 'node:fs';
import path from 'node:path';

export interface EnsureLocalPosterParams {
  metadataSource: 'tmdb' | 'anilist';
  metadataId: string;
  mediaType: 'movie' | 'tv_show' | 'anime' | 'private';
  title?: string;
  tmdbApiKey?: string;
  fetchFn?: typeof fetch;
}

export interface IPosterService {
  ensureLocalPoster(showDir: string, params: EnsureLocalPosterParams): Promise<boolean>;
}

export class PosterService implements IPosterService {
  private defaultFetch: typeof fetch;

  constructor(fetchFn?: typeof fetch) {
    this.defaultFetch = fetchFn || globalThis.fetch;
  }

  async ensureLocalPoster(showDir: string, params: EnsureLocalPosterParams): Promise<boolean> {
    if (!showDir || !fs.existsSync(showDir)) {
      return false;
    }

    const posterPath = path.join(showDir, 'poster.jpg');
    if (fs.existsSync(posterPath)) {
      return false;
    }

    const fetchImpl = params.fetchFn || this.defaultFetch;

    try {
      let posterUrl: string | null = null;

      if (params.metadataSource === 'tmdb' && params.metadataId) {
        const apiKey = params.tmdbApiKey || process.env.TMDB_API_KEY;
        if (!apiKey) return false;

        const type = params.mediaType === 'movie' ? 'movie' : 'tv';
        const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(params.metadataId)}?api_key=${encodeURIComponent(apiKey)}`;
        const res = await fetchImpl(url);
        if (res.ok) {
          const data = (await res.json()) as { poster_path?: string | null };
          if (data.poster_path) {
            posterUrl = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
          }
        }
      } else if (params.metadataSource === 'anilist' && params.metadataId) {
        const graphqlQuery = `query ($id: Int) { Media(id: $id, type: ANIME) { coverImage { extraLarge large } } }`;
        const res = await fetchImpl('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query: graphqlQuery, variables: { id: parseInt(params.metadataId, 10) } }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            data?: { Media?: { coverImage?: { extraLarge?: string; large?: string } } };
          };
          const media = data?.data?.Media;
          posterUrl = media?.coverImage?.extraLarge || media?.coverImage?.large || null;
        }
      }

      if (posterUrl) {
        const imgRes = await fetchImpl(posterUrl);
        if (imgRes.ok) {
          const arrayBuf = await imgRes.arrayBuffer();
          fs.writeFileSync(posterPath, Buffer.from(arrayBuf));
          return true;
        }
      }
    } catch {
      // Non-fatal
    }

    return false;
  }
}
