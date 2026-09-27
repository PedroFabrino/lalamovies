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
}

export function hasCjkCharacters(s?: string | null): boolean {
  return Boolean(s && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(s));
}

export function buildSeriesSearchQueries(options: SeriesQueryOptions): SeriesQueryParam[] {
  const categories = [5000, 5070, 2070];
  const queries: SeriesQueryParam[] = [];
  const seenQueries = new Set<string>();

  const addQuery = (q: string) => {
    const trimmed = q.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && !seenQueries.has(lower)) {
      seenQueries.add(lower);
      queries.push({ query: trimmed, categories });
    }
  };

  // Build candidate title list: prefer Romaji and English, then title
  const rawList = [
    options.romajiTitle,
    options.englishTitle,
    options.title,
  ].filter((t): t is string => Boolean(t && t.trim().length > 0));

  // If any title is Latin while others are CJK, prioritize Latin titles
  const latinTitles = rawList.filter((t) => !hasCjkCharacters(t));
  const cjkTitles = rawList.filter((t) => hasCjkCharacters(t));
  const prioritized = [...latinTitles, ...cjkTitles];

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
    if (isSingleEpisode) {
      const eNum = options.episodeNumber!;
      const ePad = String(eNum).padStart(2, '0');

      // Standard TV syntax: Title S01E01
      addQuery(`${title} S${sPad}E${ePad}`);
      // Anime absolute dashed syntax: Title - 01
      addQuery(`${title} - ${ePad}`);
      // Anime absolute spaced syntax: Title 01
      addQuery(`${title} ${ePad}`);
    } else {
      // Season Pack: Title S01
      addQuery(`${title} S${sPad}`);
      // For Season 1, also query plain Title
      if (sNum === 1) {
        addQuery(title);
      }
    }
  }

  return queries;
}
