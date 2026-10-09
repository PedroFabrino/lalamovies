export interface SeriesQueryParam {
  query: string;
  categories: number[];
}

export interface SeriesQueryOptions {
  title: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  englishTitle?: string | null;
  romajiTitle?: string | null;
  seasonName?: string | null;
}

export function hasCjkCharacters(s?: string | null): boolean {
  return Boolean(s && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(s));
}

export function buildSeriesSearchQueries(options: SeriesQueryOptions): SeriesQueryParam[] {
  const categories = [5000, 5070, 2070];
  const queries: SeriesQueryParam[] = [];
  const seenQueries = new Set<string>();

  const addQuery = (q: string, isCjk = false) => {
    const trimmed = q.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && !seenQueries.has(lower)) {
      seenQueries.add(lower);
      // For CJK queries, restrict to anime indexer categories (5070) so ASCII-only
      // public indexers do not strip Kanji and degrade into bare episode number queries.
      const queryCats = isCjk ? [5070] : categories;
      queries.push({ query: trimmed, categories: queryCats });
    }
  };

  // Build candidate title list: prefer Romaji, English, season subtitle, then title
  const rawList = [
    options.romajiTitle,
    options.englishTitle,
    options.seasonName,
    options.seasonName && options.title ? `${options.title} ${options.seasonName}` : undefined,
    options.title,
  ].filter((t): t is string => Boolean(t && t.trim().length > 0));

  // If any Latin titles are available, omit CJK-only titles to prevent
  // ASCII-only indexers from degrading queries.
  const latinTitles = rawList.filter((t) => !hasCjkCharacters(t));
  const cjkTitles = rawList.filter((t) => hasCjkCharacters(t));
  const prioritized = latinTitles.length > 0 ? latinTitles : cjkTitles;

  const titles: string[] = [];
  const seenTitles = new Set<string>();
  for (const t of prioritized) {
    const norm = t.trim();
    if (!seenTitles.has(norm.toLowerCase())) {
      seenTitles.add(norm.toLowerCase());
      titles.push(norm);
    }
  }

  const sNum = options.seasonNumber && options.seasonNumber > 0 ? options.seasonNumber : 1;
  const sPad = String(sNum).padStart(2, '0');
  const isSingleEpisode = options.episodeNumber !== undefined && options.episodeNumber !== null;

  for (const title of titles) {
    const isCjk = hasCjkCharacters(title);
    if (isSingleEpisode) {
      const eNum = options.episodeNumber!;
      const ePad = String(eNum).padStart(2, '0');

      // Standard TV syntax: Title S01E01
      addQuery(`${title} S${sPad}E${ePad}`, isCjk);
      // Anime absolute dashed syntax: Title - 01
      addQuery(`${title} - ${ePad}`, isCjk);
      // Anime absolute spaced syntax: Title 01
      addQuery(`${title} ${ePad}`, isCjk);
    } else {
      // Season Pack: Title S01
      addQuery(`${title} S${sPad}`, isCjk);
      // For Season 1, also query plain Title
      if (sNum === 1) {
        addQuery(title, isCjk);
      }
    }
  }

  return queries;
}
