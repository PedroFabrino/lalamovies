export interface CleanedTorrentResult {
  title: string;
  seasonNumber?: number;
  detectedMediaType?: 'movie' | 'tv_show';
}

/**
 * Parses and sanitizes raw torrent release titles and magnet URI display names (`dn=`).
 * Strips scene noise, extracts season numbers, detects media type, and prepares clean search queries.
 */
export function cleanTorrentTitle(rawInput: string): CleanedTorrentResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { title: '' };
  }

  let raw = rawInput.trim();

  // 1. Extract dn (display name) if input is a magnet URI
  if (raw.startsWith('magnet:')) {
    const dnMatch = raw.match(/[?&]dn=([^&]+)/i);
    if (dnMatch && dnMatch[1]) {
      try {
        raw = decodeURIComponent(dnMatch[1].replace(/\+/g, ' '));
      } catch {
        raw = dnMatch[1].replace(/\+/g, ' ');
      }
    } else {
      return { title: '' };
    }
  }

  // 2. Strip common file extensions
  raw = raw.replace(/\.(mkv|mp4|avi|wmv|mov|m4v|flv|webm|ts|iso|torrent)$/i, '');

  // 3. Unwrap 4-digit years in brackets or braces: [2010] -> 2010
  raw = raw.replace(/\[(\d{4})\]/g, ' $1 ');
  raw = raw.replace(/\{(\d{4})\}/g, ' $1 ');

  // Strip bracketed expressions ([...], {...})
  raw = raw.replace(/\[[^\]]*\]/g, ' ');
  raw = raw.replace(/\{[^}]*\}/g, ' ');

  // Strip trailing release group suffix (e.g. -SPARKS, -BiOMA, -CTU, -YTS)
  raw = raw.replace(/-\s*[A-Za-z0-9_]+$/i, '');

  // 4. TV Episode patterns: S01E01, s1e1, 1x01, S01E01-E02
  const tvEpisodeRegex = /(?:^|[\s._\-])(?:s(\d{1,2})e(\d{1,3})(?:-[eE]?\d{1,3})?|(\d{1,2})x(\d{1,3}))(?:$|[\s._\-].*$)/i;
  const epMatch = raw.match(tvEpisodeRegex);
  if (epMatch) {
    const season = parseInt(epMatch[1] || epMatch[3], 10);
    const markerIndex = epMatch.index ?? 0;
    const rawPrefix = raw.slice(0, markerIndex);
    const cleanShowTitle = cleanSeparators(rawPrefix);
    return {
      title: cleanShowTitle,
      seasonNumber: isNaN(season) ? undefined : season,
      detectedMediaType: 'tv_show',
    };
  }

  // 5. Season pack patterns: Season 1, Season.01, Series 1, S01, S1
  const seasonWordRegex = /(?:^|[\s._\-])(?:season|series)[\s._\-]*(\d{1,2})(?:$|[\s._\-].*$)/i;
  const seasonWordMatch = raw.match(seasonWordRegex);
  if (seasonWordMatch) {
    const season = parseInt(seasonWordMatch[1], 10);
    const markerIndex = seasonWordMatch.index ?? 0;
    const rawPrefix = raw.slice(0, markerIndex);
    const cleanShowTitle = cleanSeparators(rawPrefix);
    return {
      title: cleanShowTitle,
      seasonNumber: isNaN(season) ? undefined : season,
      detectedMediaType: 'tv_show',
    };
  }

  const seasonShortRegex = /(?:^|[\s._\-])s(\d{1,2})(?:$|[\s._\-].*$)/i;
  const seasonShortMatch = raw.match(seasonShortRegex);
  if (seasonShortMatch) {
    const season = parseInt(seasonShortMatch[1], 10);
    const markerIndex = seasonShortMatch.index ?? 0;
    const rawPrefix = raw.slice(0, markerIndex);
    const cleanShowTitle = cleanSeparators(rawPrefix);
    return {
      title: cleanShowTitle,
      seasonNumber: isNaN(season) ? undefined : season,
      detectedMediaType: 'tv_show',
    };
  }

  // 6. Movie patterns with 4-digit release years (1900-2099)
  const parenYearRegex = /^(.+?)[\s._\-]*\(((?:19|20)\d{2})\)(?:$|[\s._\-].*$)/i;
  const parenYearMatch = raw.match(parenYearRegex);
  if (parenYearMatch) {
    const titlePart = cleanSeparators(parenYearMatch[1]);
    const year = parenYearMatch[2];
    return {
      title: `${titlePart} ${year}`.trim(),
      detectedMediaType: 'movie',
    };
  }

  const yearRegex = /^(.+?)[\s._\-]+((?:19|20)\d{2})(?:$|[\s._\-].*$)/i;
  const yearMatch = raw.match(yearRegex);
  if (yearMatch) {
    const titlePart = cleanSeparators(yearMatch[1]);
    const year = yearMatch[2];
    return {
      title: `${titlePart} ${year}`.trim(),
      detectedMediaType: 'movie',
    };
  }

  // 7. General scene cleaning if no TV pattern and no release year
  let cleaned = raw;
  cleaned = cleaned.replace(/-\s*[A-Za-z0-9_]+$/i, ' ');
  cleaned = cleaned.replace(/\b(2160p|4k|1080p|1080i|720p|480p|576p|uhd|fhd)\b/gi, ' ');
  cleaned = cleaned.replace(/\b(hdrip|webrip|web-dl|webdl|bluray|blu-ray|bdrip|brrip|dvdrip|remux|hdtv)\b/gi, ' ');
  cleaned = cleaned.replace(/\b(x264|x265|h264|h265|hevc|av1|xvid|divx|10bit|8bit|hdr|hdr10|hdr10\+|sdr|dv|dovi)\b/gi, ' ');
  cleaned = cleaned.replace(/\b(aac\d*(\.\d+)?|ac3|eac3|dts(-hd)?|truehd|ddp\d*(\.\d+)?|dd\d*(\.\d+)?|\d\.\d|atmos|mp3|flac)\b/gi, ' ');
  cleaned = cleaned.replace(/\b(repack|proper|extended|remastered|unrated|directors[\s._\-]*cut|multi|subbed|dubbed)\b/gi, ' ');

  return {
    title: cleanSeparators(cleaned),
  };
}

function cleanSeparators(str: string): string {
  return str
    .replace(/[._+]/g, ' ')
    .replace(/\((?!\d{4}\b)[^)]*\)/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '')
    .trim();
}
