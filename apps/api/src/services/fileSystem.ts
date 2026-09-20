import fs from 'node:fs';
import path from 'node:path';
import { and, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import { AppDatabase, downloadRequests } from '../db';
import { RequestStatus } from './requestStateMachine';
import type { ISubtitleInspectionService } from './subtitleInspection';
import { extractEpisodeInfo } from '../utils/torrentTitleCleaner';

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
  db?: AppDatabase;
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
  hardlink(srcPath: string, destPath: string): void;
  hardlinkDirectory(srcDir: string, destDir: string): void;
  getStorageFootprintBytes(targetPath?: string | string[], forceRefresh?: boolean): number;
  ensureDirectory(dirPath: string): void;
  processAndHardlinkTorrent(input: ProcessAndHardlinkInput): Promise<ProcessAndHardlinkResult>;
  invalidateFootprintCache?(): void;
  getMediaBasePath?(): string;
}

export class FileSystemService implements IFileSystemService {
  private defaultMediaBasePath: string;
  private cachedFootprint: { bytes: number; timestamp: number } | null = null;
  private readonly FOOTPRINT_CACHE_TTL_MS = 60_000;

  constructor(mediaBasePath?: string) {
    this.defaultMediaBasePath = mediaBasePath || process.env.MEDIA_PATH || path.resolve(process.cwd(), 'media');
    this.ensureDirectories();
  }

  getMediaBasePath(): string {
    return this.defaultMediaBasePath;
  }

  /**
   * Creates dirPath (and any missing parents) if it does not already exist.
   * Uses mode 0o777 so the directory is writable by the media process.
   * Errors are rethrown — callers decide how to handle a creation failure.
   */
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

  private sanitize(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '').trim();
  }

  private padNumber(num: number, digits = 2): string {
    return String(num).padStart(digits, '0');
  }

  buildLibraryPath(params: BuildLibraryPathParams): string {
    const root = (params.mediaBasePath || this.defaultMediaBasePath).replace(/[\\/]+$/, '');
    const cleanTitle = this.sanitize(params.title);
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
        const seasonFolder = `Season ${this.padNumber(params.seasonNumber, 2)}`;
        const epCode = `S${this.padNumber(params.seasonNumber, 2)}E${this.padNumber(params.episodeNumber, 2)}`;
        const fileName = `${cleanTitle} ${epCode}.${ext}`;
        return path.join(root, 'private', folderName, seasonFolder, fileName);
      }
      if (params.disambiguator) {
        const cleanDisambiguator = this.sanitize(params.disambiguator);
        return path.join(root, 'private', cleanDisambiguator, `${cleanDisambiguator}.${ext}`);
      }
      const fileName = `${cleanTitle}${yearStr}.${ext}`;
      return path.join(root, 'private', folderName, fileName);
    }

    const subDir = params.mediaType === 'anime' ? 'anime' : 'shows';
    const seasonNum = params.seasonNumber ?? 1;
    const seasonFolder = `Season ${this.padNumber(seasonNum, 2)}`;
    const baseCleanTitle = cleanTitle.replace(/\s*-\s*\d+$/, '').trim() || cleanTitle;
    const defaultShowFolder = params.year ? `${baseCleanTitle} (${params.year})` : baseCleanTitle;
    const showFolderName = params.existingShowFolder || defaultShowFolder;

    if (params.isSeasonPack) {
      return path.join(root, subDir, showFolderName, seasonFolder);
    }

    const epNum = params.episodeNumber ?? 1;
    const epCode = `S${this.padNumber(seasonNum, 2)}E${this.padNumber(epNum, 2)}`;
    const effectiveTitle = params.existingShowFolder
      ? params.existingShowFolder.replace(/\s*\(\d{4}\)$/, '').trim()
      : cleanTitle;
    const fileName = `${effectiveTitle} ${epCode}.${ext}`;
    return path.join(root, subDir, showFolderName, seasonFolder, fileName);
  }

  hardlink(srcPath: string, destPath: string): void {
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Source file does not exist for hardlink: ${srcPath}`);
    }

    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true, mode: 0o777 });
      try { fs.chmodSync(destDir, 0o777); } catch { /* ignore */ }
    }

    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }

    fs.linkSync(srcPath, destPath);
  }

  hardlinkDirectory(srcDir: string, destDir: string): void {
    if (!fs.existsSync(srcDir)) {
      throw new Error(`Source directory does not exist: ${srcDir}`);
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true, mode: 0o777 });
      try { fs.chmodSync(destDir, 0o777); } catch { /* ignore */ }
    }

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcEntryPath = path.join(srcDir, entry.name);
      const destEntryPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        this.hardlinkDirectory(srcEntryPath, destEntryPath);
      } else if (entry.isFile()) {
        this.hardlink(srcEntryPath, destEntryPath);
      }
    }
  }

  invalidateFootprintCache(): void {
    this.cachedFootprint = null;
  }

  getStorageFootprintBytes(targetPath?: string | string[], forceRefresh = false): number {
    if (!targetPath && !forceRefresh && this.cachedFootprint && (Date.now() - this.cachedFootprint.timestamp < this.FOOTPRINT_CACHE_TTL_MS)) {
      return this.cachedFootprint.bytes;
    }

    let pathsToScan: string[] = [];
    if (targetPath) {
      pathsToScan = Array.isArray(targetPath) ? targetPath : [targetPath];
    } else {
      const candidates = [
        fs.existsSync('/media_data/downloads') ? '/media_data/downloads' : null,
        process.env.STAGING_PATH,
        this.defaultMediaBasePath,
      ].filter((p): p is string => Boolean(p && fs.existsSync(p)));

      if (candidates.length > 0) {
        pathsToScan = Array.from(new Set(candidates));
      } else {
        pathsToScan = [
          path.resolve(process.cwd(), 'downloads', 'staging'),
          this.defaultMediaBasePath,
        ];
      }
    }

    const seenInodes = new Set<string>();
    let totalBytes = 0;
    const stack: string[] = [...pathsToScan];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (!fs.existsSync(current)) continue;

      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(current);
      } catch {
        continue;
      }

      if (stat.isSymbolicLink()) {
        continue;
      }

      if (stat.isDirectory()) {
        const baseName = path.basename(current);
        // Exclude virtual cloud mounts (.zurg), ephemeral stream folders, and hidden directories
        if (baseName.startsWith('.') || baseName === 'stream') {
          continue;
        }

        try {
          const entries = fs.readdirSync(current);
          for (const entry of entries) {
            if (entry.startsWith('.') || entry === 'stream') {
              continue;
            }
            stack.push(path.join(current, entry));
          }
        } catch {
          // ignore read errors
        }
      } else if (stat.isFile()) {
        const inodeKey = `${stat.dev}:${stat.ino}`;
        if (!seenInodes.has(inodeKey)) {
          seenInodes.add(inodeKey);
          totalBytes += stat.size;
        }
      }
    }

    if (!targetPath) {
      this.cachedFootprint = { bytes: totalBytes, timestamp: Date.now() };
    }

    return totalBytes;
  }

  async processAndHardlinkTorrent(
    input: ProcessAndHardlinkInput
  ): Promise<ProcessAndHardlinkResult> {
    const { request: req, torrentStatus, logger, subtitleInspection, db } = input;
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

    // Check if existing requests for this series already established a show directory
    let existingShowFolder: string | undefined;
    let targetMediaType = req.mediaType;
    let effectiveTitle = req.title;

    if (['tv_show', 'anime'].includes(req.mediaType)) {
      if (db) {
        try {
          const conditions = [
            ne(downloadRequests.id, req.id),
            ne(downloadRequests.status, RequestStatus.DELETED),
            inArray(downloadRequests.mediaType, ['tv_show', 'anime']),
            isNotNull(downloadRequests.jellyfinPath),
          ];
          if (req.metadataId) {
            conditions.push(eq(downloadRequests.metadataId, req.metadataId));
          }

          const existingSeries = db
            .select({
              jellyfinPath: downloadRequests.jellyfinPath,
              mediaType: downloadRequests.mediaType,
              title: downloadRequests.title,
            })
            .from(downloadRequests)
            .where(and(...conditions))
            .get();

          if (existingSeries?.jellyfinPath) {
            const parts = existingSeries.jellyfinPath.split(/[\\/]/);
            const animeIdx = parts.indexOf('anime');
            const showsIdx = parts.indexOf('shows');
            const targetIdx = animeIdx !== -1 ? animeIdx : showsIdx;
            if (targetIdx !== -1 && parts[targetIdx + 1]) {
              existingShowFolder = parts[targetIdx + 1];
              targetMediaType = (animeIdx !== -1 ? 'anime' : 'tv_show') as 'anime' | 'tv_show';
              effectiveTitle = existingSeries.title || existingShowFolder.replace(/\s*\(\d{4}\)$/, '').trim();
            }
          }
        } catch {
          // Non-fatal
        }
      }

      // If no existing series found in DB, check on disk across anime and shows
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
        } catch {
          // Non-fatal
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

    // Perform Hardlink Move
    if (isDirectory) {
      this.hardlinkDirectory(sourceItem, destPath);
    } else {
      this.hardlink(sourceItem, destPath);
    }

    // Hardlink subtitles for movies if available
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
          const langMatch = sub.name.match(/\.([a-z]{2,3})\.(srt|vtt)$/i);
          const subDest = langMatch
            ? path.join(destDir, `${baseName}.${langMatch[1]}${subExt}`)
            : path.join(destDir, `${baseName}${subExt}`);
          try {
            this.hardlink(subSrc, subDest);
          } catch {
            // non-fatal
          }
        }
      }
    }

    // Subtitle inspection for private library
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