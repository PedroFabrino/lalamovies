export interface ParsedAnimeTitle {
  cleanTitle: string;
  seasonNumber: number;
}

/**
 * Strips season suffixes from anime titles (e.g. "Season 3", "2nd Season", "S02")
 * and extracts the detected season number.
 */
export function parseAnimeTitleAndSeason(rawTitle: string): ParsedAnimeTitle {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return { cleanTitle: '', seasonNumber: 1 };
  }

  const trimmed = rawTitle.trim();
  let cleanTitle = trimmed;
  let seasonNumber = 1;

  // 1. Ordinal season, e.g. "Kusuriya no Hitorigoto 2nd Season", "Slime 3rd Season"
  const ordinalMatch = cleanTitle.match(
    /^(.*?)(?:[\s:_-]+)(\d{1,2})(?:nd|rd|th|st)[\s._-]*(?:season|series)(.*)$/i
  );
  if (ordinalMatch) {
    seasonNumber = parseInt(ordinalMatch[2], 10);
    cleanTitle = ordinalMatch[1].trim();
  } else {
    // 2. Word season, e.g. "The Apothecary Diaries Season 3", "Series 2"
    const wordMatch = cleanTitle.match(
      /^(.*?)(?:[\s:_-]+)(?:season|series)[\s._-]*(\d{1,2})(.*)$/i
    );
    if (wordMatch) {
      seasonNumber = parseInt(wordMatch[2], 10);
      cleanTitle = wordMatch[1].trim();
    } else {
      // 3. Short season code, e.g. "Solo Leveling S2", "Show Name S03"
      const sMatch = cleanTitle.match(
        /^(.*?)(?:[\s:_-]+)s(\d{1,2})(?:$|[\s._-].*$)/i
      );
      if (sMatch) {
        seasonNumber = parseInt(sMatch[2], 10);
        cleanTitle = sMatch[1].trim();
      }
    }
  }

  // Clean trailing punctuation, colons, dashes
  cleanTitle = cleanTitle.replace(/[\s:._-]+$/, '').trim();

  return {
    cleanTitle: cleanTitle || trimmed,
    seasonNumber: isNaN(seasonNumber) || seasonNumber < 1 ? 1 : seasonNumber,
  };
}
