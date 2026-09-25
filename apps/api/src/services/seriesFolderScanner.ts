import fs from 'node:fs';
import path from 'node:path';

export interface ResolveExistingSeriesFolderParams {
  req: {
    mediaType: 'movie' | 'tv_show' | 'anime' | 'private';
    title: string;
    year?: number | null;
  };
  existingShowFolder?: string;
  mediaBase: string;
  logger?: {
    warn?: (msg: string) => void;
  };
}

export interface ResolveExistingSeriesFolderResult {
  existingShowFolder?: string;
  targetMediaType: 'movie' | 'tv_show' | 'anime' | 'private';
  effectiveTitle: string;
}

export function resolveExistingSeriesFolder(
  params: ResolveExistingSeriesFolderParams
): ResolveExistingSeriesFolderResult {
  const { req, mediaBase, logger } = params;
  let existingShowFolder = params.existingShowFolder;
  let targetMediaType = req.mediaType;
  let effectiveTitle = req.title;

  if (!['tv_show', 'anime'].includes(req.mediaType)) {
    return { existingShowFolder, targetMediaType, effectiveTitle };
  }

  if (!existingShowFolder) {
    try {
      const cleanReqTitle = req.title.replace(/[<>:"/\\|?*]/g, '').trim();
      const baseClean = cleanReqTitle.replace(/\s*-\s*\d+$/, '').trim() || cleanReqTitle;
      const candidates = [req.year ? `${baseClean} (${req.year})` : baseClean, baseClean];
      for (const folder of candidates) {
        if (fs.existsSync(path.join(mediaBase, 'anime', folder))) {
          existingShowFolder = folder;
          targetMediaType = 'anime';
          effectiveTitle = folder.replace(/\s*\(\d{4}\)$/, '').trim();
          break;
        }
        if (fs.existsSync(path.join(mediaBase, 'shows', folder))) {
          existingShowFolder = folder;
          targetMediaType = 'tv_show';
          effectiveTitle = folder.replace(/\s*\(\d{4}\)$/, '').trim();
          break;
        }
      }
    } catch (scanErr) {
      logger?.warn?.(`Error scanning disk for existing series folder: ${(scanErr as Error).message}`);
    }
  } else {
    try {
      if (fs.existsSync(path.join(mediaBase, 'anime', existingShowFolder))) {
        targetMediaType = 'anime';
      } else if (fs.existsSync(path.join(mediaBase, 'shows', existingShowFolder))) {
        targetMediaType = 'tv_show';
      }
      effectiveTitle = existingShowFolder.replace(/\s*\(\d{4}\)$/, '').trim();
    } catch (scanErr) {
      logger?.warn?.(`Error checking disk for existing series folder: ${(scanErr as Error).message}`);
    }
  }

  return { existingShowFolder, targetMediaType, effectiveTitle };
}
