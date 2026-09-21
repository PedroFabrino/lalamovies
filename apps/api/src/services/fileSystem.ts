import fs from 'node:fs';
import path from 'node:path';
import type { ISubtitleInspectionService } from './subtitleInspection';
import { extractEpisodeInfo } from '../utils/torrentTitleCleaner';
import { reconstructFilesFromDisk } from '../utils/stagingScanner';
import {
  type BuildLibraryPathParams,
  buildLibraryPath as buildLibraryPathHelper,
} from './libraryPathBuilder';
import { StorageFootprintService } from './storageFootprint';

export { reconstructFilesFromDisk };
export type { BuildLibraryPathParams };

export interface ProcessAndHardlinkTorrentInput {
  request: {
    id: string;
    mediaType: 'movie' | 'tv_show' | 'anime' | 'private';
    title: string;
    year?: number | null;
    seasonNumber?: number | null;
    episodeNumber?: number | null;
    metadataId?: string | null;
  };
  torrentStatus: {
    name: string;
  };
  files?: Array<{ name: string; size: number }>;
  stagingPath?: string;
  existingShowFolder?: string;
  subtitleInspection?: ISubtitleInspectionService;
  logger?: {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string, err?: unknown) => void;
  };
}

export type ProcessAndHardlinkInput = ProcessAndHardlinkTorrentInput;

export interface ProcessAndHardlinkTorrentResult {
  destPath: string;
  isDirectory: boolean;
  transcriptionStatus: 'none' | 'pending';
  targetMediaType: 'movie' | 'tv_show' | 'anime' | 'private';
  effectiveTitle: string;
}

export type ProcessAndHardlinkResult = ProcessAndHardlinkTorrentResult;

export interface IFileSystemService {
  buildLibraryPath(params: BuildLibraryPathParams): string;
  hardlink(srcPath: string, destPath: string): Promise<void>;
  hardlinkDirectory(srcDir: string, destDir: string): Promise<void>;
  getStorageFootprintBytes(targetPath?: string | string[], forceRefresh?: boolean): Promise<number>;
  ensureDirectory(dirPath: string): void;
  processAndHardlinkTorrent(input: ProcessAndHardlinkInput): Promise<ProcessAndHardlinkResult>;
  reconstructFilesFromDisk?(
    stagingDir: string,
    subDir?: string
  ): Promise<Array<{ name: string; size: number }>>;
  invalidateFootprintCache?(): void;
  getMediaBasePath?(): string;
}

export class FileSystemService implements IFileSystemService {
  private defaultMediaBasePath: string;
  private footprintService: StorageFootprintService;

  constructor(mediaBasePath?: string) {
    this.defaultMediaBasePath = mediaBasePath || process.env.MEDIA_PATH || path.resolve(process.cwd(), 'media');
    this.footprintService = new StorageFootprintService(this.defaultMediaBasePath);
    this.ensureDirectories();
  }

  getMediaBasePath(): string {
    return this.defaultMediaBasePath;
  }

  async reconstructFilesFromDisk(
    stagingDir: string,
    subDir?: string
  ): Promise<Array<{ name: string; size: number }>> {
    return reconstructFilesFromDisk(stagingDir, subDir);
  }

  ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o777 });
    }
  }

  private ensureDirectories(): void {
    const staging = process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads', 'staging');
    const media = this.defaultMediaBasePath;
    const dirs = [
      staging,
      path.join(media, 'movies'),
      path.join(media, 'shows'),
      path.join(media, 'anime'),
      path.join(media, 'private'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {
          // ignore error if already created or permission issue
        }
      }
    }
  }

  buildLibraryPath(params: BuildLibraryPathParams): string {
    return buildLibraryPathHelper(params, this.defaultMediaBasePath);
  }

  async hardlink(srcPath: string, destPath: string): Promise<void> {
    try {
      await fs.promises.access(srcPath);
    } catch {
      throw new Error(`Source file does not exist for hardlink: ${srcPath}`);
    }

    const destDir = path.dirname(destPath);
    this.ensureDirectory(destDir);
    try {
      await fs.promises.chmod(destDir, 0o777);
    } catch {
      /* ignore */
    }

    try {
      await fs.promises.unlink(destPath);
    } catch {
      // ignore if doesn't exist
    }

    await fs.promises.link(srcPath, destPath);
  }

  async hardlinkDirectory(srcDir: string, destDir: string): Promise<void> {
    try {
      await fs.promises.access(srcDir);
    } catch {
      throw new Error(`Source directory does not exist: ${srcDir}`);
    }

    this.ensureDirectory(destDir);
    try {
      await fs.promises.chmod(destDir, 0o777);
    } catch {
      /* ignore */
    }

    const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcEntryPath = path.join(srcDir, entry.name);
      const destEntryPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        await this.hardlinkDirectory(srcEntryPath, destEntryPath);
      } else if (entry.isFile()) {
        await this.hardlink(srcEntryPath, destEntryPath);
      }
    }
  }

  invalidateFootprintCache(): void {
    this.footprintService.invalidateFootprintCache();
  }

  async getStorageFootprintBytes(
    targetPath?: string | string[],
    forceRefresh = false
  ): Promise<number> {
    return this.footprintService.getStorageFootprintBytes(targetPath, forceRefresh);
  }

  async processAndHardlinkTorrent(
    input: ProcessAndHardlinkInput
  ): Promise<ProcessAndHardlinkResult> {
    const { request: req, torrentStatus, logger, subtitleInspection } = input;
    const stagingPath =
      input.stagingPath ||
      process.env.STAGING_PATH ||
      path.resolve(process.cwd(), 'downloads', 'staging');
    const files = input.files || [];

    let sourceItem = path.join(stagingPath, torrentStatus.name);
    let isDirectory = false;
    let ext = path.extname(torrentStatus.name) || '.mkv';

    if (files.length > 0) {
      const videoExtensions = ['.mkv', '.mp4', '.avi', '.ts', '.mov', '.webm', '.m4v'];
      const videoFiles = files
        .filter((f) => videoExtensions.includes(path.extname(f.name).toLowerCase()))
        .sort((a, b) => b.size - a.size);

      const firstSegment = files[0].name.split(/[\\/]/)[0];
      const rootDir = path.join(stagingPath, firstSegment);

      if (
        req.mediaType === 'movie' ||
        (req.mediaType === 'private' && req.seasonNumber == null && req.episodeNumber == null)
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
        if (req.episodeNumber != null) {
          const matchedVideo = videoFiles.find((f) => {
            const epInfo = extractEpisodeInfo(path.basename(f.name));
            return epInfo.episodeNumber === req.episodeNumber;
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
        const cleanTorrentName = torrentStatus.name.toLowerCase().replace(/[^a-z0-9]/g, '');
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

    if (!fs.existsSync(sourceItem) && fs.existsSync(stagingPath)) {
      const entries = fs.readdirSync(stagingPath);
      const cleanTorrentName = torrentStatus.name.toLowerCase().replace(/[^a-z0-9]/g, '');
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

    if (!fs.existsSync(sourceItem)) {
      throw new Error(`Source file does not exist for hardlink: ${sourceItem}`);
    }

    if (fs.existsSync(sourceItem) && !isDirectory) {
      isDirectory = fs.statSync(sourceItem).isDirectory();
    }

    let existingShowFolder: string | undefined = input.existingShowFolder;
    let targetMediaType = req.mediaType;
    let effectiveTitle = req.title;

    if (['tv_show', 'anime'].includes(req.mediaType)) {
      if (!existingShowFolder) {
        try {
          const mediaBase =
            (this.getMediaBasePath ? this.getMediaBasePath() : null) ||
            this.defaultMediaBasePath ||
            process.env.MEDIA_PATH ||
            path.resolve(process.cwd(), 'media');
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
          const mediaBase =
            (this.getMediaBasePath ? this.getMediaBasePath() : null) ||
            this.defaultMediaBasePath ||
            process.env.MEDIA_PATH ||
            path.resolve(process.cwd(), 'media');
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
    }

    const destPath = this.buildLibraryPath({
      mediaType: targetMediaType,
      title: effectiveTitle,
      year: req.year,
      seasonNumber: req.seasonNumber,
      episodeNumber: req.episodeNumber,
      isSeasonPack: isDirectory || (targetMediaType !== 'movie' && !ext),
      ext,
      existingShowFolder,
      disambiguator:
        req.mediaType === 'private' && req.seasonNumber == null && req.episodeNumber == null
          ? torrentStatus.name
          : undefined,
    });

    if (isDirectory) {
      await this.hardlinkDirectory(sourceItem, destPath);
    } else {
      await this.hardlink(sourceItem, destPath);
    }

    if (req.mediaType === 'movie' && !isDirectory && files.length > 0) {
      const subFiles = files.filter((f) => {
        const subExt = path.extname(f.name).toLowerCase();
        return subExt === '.srt' || subExt === '.vtt';
      });
      for (const sub of subFiles) {
        const subSrc = path.join(stagingPath, sub.name);
        if (fs.existsSync(subSrc)) {
          const subExt = path.extname(sub.name);
          const destDir = path.dirname(destPath);
          const baseName = path.basename(destPath, path.extname(destPath));
          const langMatch = sub.name.match(/\.([a-z]{2,3}(?:-[a-z0-9]{2,4})?)\.(srt|vtt)$/i);
          const subDest = langMatch
            ? path.join(destDir, `${baseName}.${langMatch[1]}${subExt}`)
            : path.join(destDir, `${baseName}${subExt}`);
          try {
            await this.hardlink(subSrc, subDest);
          } catch (hlErr) {
            logger?.warn?.(`Failed to hardlink subtitle ${subSrc} to ${subDest}: ${(hlErr as Error).message}`);
          }
        }
      }
    }

    let transcriptionStatus: 'none' | 'pending' = 'none';
    if (req.mediaType === 'private') {
      if (subtitleInspection) {
        try {
          const inspection = await subtitleInspection.inspect(destPath);
          transcriptionStatus = inspection.hasSubtitles ? 'none' : 'pending';
        } catch (err) {
          logger?.error?.(`Subtitle inspection failed for ${destPath}`, err);
          transcriptionStatus = 'pending';
        }
      } else {
        transcriptionStatus = 'pending';
      }
    }

    return {
      destPath,
      isDirectory,
      transcriptionStatus,
      targetMediaType,
      effectiveTitle,
    };
  }
}