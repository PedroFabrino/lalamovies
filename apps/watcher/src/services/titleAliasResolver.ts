import { hasCjkCharacters } from '../utils/seriesQueryBuilder';

export interface ResolvedTitleAliases {
  englishTitle?: string;
  romajiTitle?: string;
  aliases: string[];
}

interface TmdbTvDetailsResponse {
  name?: string;
  original_name?: string;
  alternative_titles?: {
    results?: Array<{
      title?: string;
      iso_3166_1?: string;
    }>;
  };
}

interface AniListResponse {
  data?: {
    Media?: {
      title?: {
        romaji?: string | null;
        english?: string | null;
      };
      synonyms?: Array<string | null>;
    };
  };
}

const aliasCache = new Map<string, { expiresAt: number; value: ResolvedTitleAliases }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function clearTitleAliasCache(): void {
  aliasCache.clear();
}

export async function resolveTitleAliases(
  entry: {
    mediaType: string;
    metadataId?: string | null;
    title: string;
  },
  tmdbApiKey?: string
): Promise<ResolvedTitleAliases> {
  if (!entry.metadataId || !tmdbApiKey) {
    return { aliases: [] };
  }

  const cacheKey = `${entry.mediaType}:${entry.metadataId}:${entry.title}`;
  const cached = aliasCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const aliasSet = new Set<string>();
  const addAlias = (candidate?: string | null) => {
    const trimmed = candidate?.trim();
    if (trimmed && trimmed.toLowerCase() !== entry.title.trim().toLowerCase()) {
      aliasSet.add(trimmed);
    }
  };

  let englishTitle: string | undefined;
  let romajiTitle: string | undefined;

  try {
    const url = `https://api.themoviedb.org/3/tv/${encodeURIComponent(entry.metadataId)}?api_key=${encodeURIComponent(tmdbApiKey)}&append_to_response=alternative_titles`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as TmdbTvDetailsResponse;
      if (data.name && data.name.trim() !== entry.title.trim()) {
        englishTitle = data.name.trim();
        addAlias(englishTitle);
      }
      if (data.original_name && data.original_name.trim() !== entry.title.trim()) {
        const orig = data.original_name.trim();
        addAlias(orig);
        if (!hasCjkCharacters(orig)) {
          romajiTitle = orig;
        }
      }
      const altList = data.alternative_titles?.results || [];
      for (const alt of altList) {
        const altTitle = alt.title?.trim();
        if (!altTitle) continue;
        addAlias(altTitle);
        if (!romajiTitle && !hasCjkCharacters(altTitle) && altTitle.toLowerCase() !== entry.title.trim().toLowerCase()) {
          romajiTitle = altTitle;
        }
      }
    }
  } catch {
    // Non-fatal: continue to AniList fallback if anime
  }

  if (entry.mediaType === 'anime' && !romajiTitle) {
    try {
      const graphqlQuery = `
        query ($search: String) {
          Media(search: $search, type: ANIME) {
            title {
              romaji
              english
            }
            synonyms
          }
        }
      `;
      const aniRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { search: entry.title },
        }),
      });
      if (aniRes.ok) {
        const aniData = (await aniRes.json()) as AniListResponse;
        const media = aniData.data?.Media;
        if (media?.title?.romaji && !hasCjkCharacters(media.title.romaji)) {
          const r = media.title.romaji.trim();
          if (r.toLowerCase() !== entry.title.trim().toLowerCase()) {
            romajiTitle = r;
          }
          addAlias(r);
        }
        if (media?.title?.english) {
          if (!englishTitle && media.title.english.trim().toLowerCase() !== entry.title.trim().toLowerCase()) {
            englishTitle = media.title.english.trim();
          }
          addAlias(media.title.english);
        }
        for (const syn of media?.synonyms || []) {
          if (syn && !hasCjkCharacters(syn)) {
            addAlias(syn);
          }
        }
      }
    } catch {
      // Non-fatal: AniList unreachable
    }
  }

  const resolved: ResolvedTitleAliases = {
    englishTitle,
    romajiTitle,
    aliases: Array.from(aliasSet),
  };

  aliasCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: resolved,
  });

  return resolved;
}
