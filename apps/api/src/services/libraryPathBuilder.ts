import path from 'node:path';

export interface BuildLibraryPathParams {
  mediaType: 'movie' | 'tv_show' | 'anime' | 'private';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  ext?: string;
  isSeasonPack?: boolean;
  mediaBasePath?: string;
  existingShowFolder?: string;
  disambiguator?: string;
}

export function sanitizePathSegment(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '').trim();
}

export function padNumber(num: number, digits = 2): string {
  return String(num).padStart(digits, '0');
}

export function buildLibraryPath(
  params: BuildLibraryPathParams,
  defaultMediaBasePath: string
): string {
  const root = (params.mediaBasePath || defaultMediaBasePath).replace(/[\\/]+$/, '');
  const cleanTitle = sanitizePathSegment(params.title);
  const ext = (params.ext || 'mkv').replace(/^\./, '');
  const yearStr = params.year ? ` (${params.year})` : '';

  if (params.mediaType === 'movie') {
    const folderName = `${cleanTitle}${yearStr}`;
    const fileName = `${cleanTitle}${yearStr}.${ext}`;
    return path.join(root, 'movies', folderName, fileName);
  }

  if (params.mediaType === 'private') {
    const folderName = `${cleanTitle}${yearStr}`;
    if (params.seasonNumber != null && params.episodeNumber != null) {
      const seasonFolder = `Season ${padNumber(params.seasonNumber, 2)}`;
      const epCode = `S${padNumber(params.seasonNumber, 2)}E${padNumber(params.episodeNumber, 2)}`;
      const fileName = `${cleanTitle} ${epCode}.${ext}`;
      return path.join(root, 'private', folderName, seasonFolder, fileName);
    }
    if (params.disambiguator) {
      const cleanDisambiguator = sanitizePathSegment(params.disambiguator);
      return path.join(root, 'private', cleanDisambiguator, `${cleanDisambiguator}.${ext}`);
    }
    const fileName = `${cleanTitle}${yearStr}.${ext}`;
    return path.join(root, 'private', folderName, fileName);
  }

  const subDir = params.mediaType === 'anime' ? 'anime' : 'shows';
  const seasonNum = params.seasonNumber ?? 1;
  const seasonFolder = `Season ${padNumber(seasonNum, 2)}`;
  const baseCleanTitle = cleanTitle.replace(/\s*-\s*\d+$/, '').trim() || cleanTitle;
  const defaultShowFolder = params.year ? `${baseCleanTitle} (${params.year})` : baseCleanTitle;
  const showFolderName = params.existingShowFolder || defaultShowFolder;

  if (params.isSeasonPack) {
    return path.join(root, subDir, showFolderName, seasonFolder);
  }

  const epNum = params.episodeNumber ?? 1;
  const epCode = `S${padNumber(seasonNum, 2)}E${padNumber(epNum, 2)}`;
  const effectiveTitle = params.existingShowFolder
    ? params.existingShowFolder.replace(/\s*\(\d{4}\)$/, '').trim()
    : cleanTitle;
  const fileName = `${effectiveTitle} ${epCode}.${ext}`;
  return path.join(root, subDir, showFolderName, seasonFolder, fileName);
}
