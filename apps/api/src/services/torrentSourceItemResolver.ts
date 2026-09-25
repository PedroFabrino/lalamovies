import fs from 'node:fs';
import path from 'node:path';
import { extractEpisodeInfo } from '../utils/torrentTitleCleaner';

export interface ResolveSourceItemParams {
  stagingPath: string;
  torrentName: string;
  files?: Array<{ name: string; size: number }>;
  mediaType: 'movie' | 'tv_show' | 'anime' | 'private';
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

export interface ResolveSourceItemResult {
  sourceItem: string;
  isDirectory: boolean;
  ext: string;
}

export function resolveSourceItem(params: ResolveSourceItemParams): ResolveSourceItemResult {
  const { stagingPath, torrentName, files = [], mediaType, seasonNumber, episodeNumber } = params;

  let sourceItem = path.join(stagingPath, torrentName);
  let isDirectory = false;
  let ext = path.extname(torrentName) || '.mkv';

  if (files.length > 0) {
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.ts', '.mov', '.webm', '.m4v'];
    const videoFiles = files
      .filter((f) => videoExtensions.includes(path.extname(f.name).toLowerCase()))
      .sort((a, b) => b.size - a.size);

    const firstSegment = files[0].name.split(/[\\/]/)[0];
    const rootDir = path.join(stagingPath, firstSegment);

    if (
      mediaType === 'movie' ||
      (mediaType === 'private' && seasonNumber == null && episodeNumber == null)
    ) {
      if (videoFiles.length > 0) {
        sourceItem = path.join(stagingPath, videoFiles[0].name);
        ext = path.extname(videoFiles[0].name) || '.mkv';
        isDirectory = false;
      } else if (fs.existsSync(rootDir) && fs.statSync(rootDir).isDirectory()) {
        sourceItem = rootDir;
        isDirectory = true;
      }
    } else {
      if (episodeNumber != null) {
        const matchedVideo = videoFiles.find((f) => {
          const epInfo = extractEpisodeInfo(path.basename(f.name));
          return epInfo.episodeNumber === episodeNumber;
        });
        if (matchedVideo) {
          sourceItem = path.join(stagingPath, matchedVideo.name);
          ext = path.extname(matchedVideo.name) || '.mkv';
          isDirectory = false;
        } else if (videoFiles.length === 1) {
          sourceItem = path.join(stagingPath, videoFiles[0].name);
          ext = path.extname(videoFiles[0].name) || '.mkv';
          isDirectory = false;
        } else if (fs.existsSync(rootDir) && fs.statSync(rootDir).isDirectory()) {
          sourceItem = rootDir;
          isDirectory = true;
        }
      } else if (fs.existsSync(rootDir) && fs.statSync(rootDir).isDirectory()) {
        sourceItem = rootDir;
        isDirectory = true;
      }
    }
  } else if (!fs.existsSync(sourceItem)) {
    if (fs.existsSync(stagingPath)) {
      const entries = fs.readdirSync(stagingPath);
      const cleanTorrentName = torrentName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = entries.find((e) => {
        const cleanEntry = e.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanEntry.includes(cleanTorrentName) || cleanTorrentName.includes(cleanEntry);
      });
      if (matched) {
        sourceItem = path.join(stagingPath, matched);
        isDirectory = fs.statSync(sourceItem).isDirectory();
        ext = path.extname(matched) || '.mkv';
      }
    }
  } else {
    isDirectory = fs.statSync(sourceItem).isDirectory();
  }

  if (fs.existsSync(sourceItem) && !isDirectory) {
    isDirectory = fs.statSync(sourceItem).isDirectory();
  }

  return { sourceItem, isDirectory, ext };
}
