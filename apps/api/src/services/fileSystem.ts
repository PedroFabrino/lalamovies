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
import { resolveExistingSeriesFolder } from './seriesFolderScanner';
import { resolveSourceItem } from './torrentSourceItemResolver';

export { reconstructFilesFromDisk };
export type { BuildLibraryPathParams };

export interface HardlinkedEpisodeInfo {
  seasonNumber: number;
  episodeNumber: number;
  fileIndex: number;
  relativePath: string;
  jellyfinPath: string;
  sizeBytes: number;
}

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
  files?: Array<{ index?: number; name: string; size: number }>;
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
  episodes?: HardlinkedEpisodeInfo[];
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

    const { sourceItem, isDirectory, ext } = resolveSourceItem({
      stagingPath,
      torrentName: torrentStatus.name,
      files,
      mediaType: req.mediaType,
      seasonNumber: req.seasonNumber,
      episodeNumber: req.episodeNumber,
    });

    const mediaBase =
      (this.getMediaBasePath ? this.getMediaBasePath() : null) ||
      this.defaultMediaBasePath ||
      process.env.MEDIA_PATH ||
      path.resolve(process.cwd(), 'media');

    const {
      existingShowFolder,
      targetMediaType,
      effectiveTitle,
    } = resolveExistingSeriesFolder({
      req,
      existingShowFolder: input.existingShowFolder,
      mediaBase,
      logger,
    });

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

    const episodes: HardlinkedEpisodeInfo[] = [];
    if (
      ['tv_show', 'anime'].includes(targetMediaType) ||
      (req.mediaType === 'private' && (req.seasonNumber != null || req.episodeNumber != null))
    ) {
      const videoExtensions = ['.mkv', '.mp4', '.avi', '.ts', '.mov', '.webm', '.m4v'];
      if (isDirectory && files.length > 0) {
        let epIdx = 0;
        for (const f of files) {
          const fileExt = path.extname(f.name).toLowerCase();
          if (!videoExtensions.includes(fileExt)) continue;
          const epInfo = extractEpisodeInfo(path.basename(f.name));
          if (epInfo.episodeNumber != null) {
            const seasonNum = epInfo.seasonNumber || req.seasonNumber || 1;
            const episodeNum = epInfo.episodeNumber;
            const fIndex = typeof f.index === 'number' ? f.index : epIdx;
            const relToSource = path.relative(sourceItem, path.join(stagingPath, f.name));
            const epJellyfinPath = relToSource && !relToSource.startsWith('..')
              ? path.join(destPath, relToSource)
              : path.join(destPath, path.basename(f.name));
            episodes.push({
              seasonNumber: seasonNum,
              episodeNumber: episodeNum,
              fileIndex: fIndex,
              relativePath: f.name,
              jellyfinPath: epJellyfinPath,
              sizeBytes: f.size,
            });
          }
          epIdx++;
        }
      } else if (!isDirectory && req.seasonNumber != null && req.episodeNumber != null) {
        const f = files[0];
        episodes.push({
          seasonNumber: req.seasonNumber,
          episodeNumber: req.episodeNumber,
          fileIndex: f && typeof f.index === 'number' ? f.index : 0,
          relativePath: f ? f.name : path.basename(destPath),
          jellyfinPath: destPath,
          sizeBytes: f ? f.size : (fs.existsSync(destPath) ? fs.statSync(destPath).size : 0),
        });
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
      episodes: episodes.length > 0 ? episodes : undefined,
    };
  }
}