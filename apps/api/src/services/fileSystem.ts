import fs from 'node:fs';
import path from 'node:path';

export interface BuildLibraryPathParams {
  mediaType: 'movie' | 'tv_show' | 'anime';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  ext?: string;
  isSeasonPack?: boolean;
  mediaBasePath?: string;
  existingShowFolder?: string;
}

export interface IFileSystemService {
  buildLibraryPath(params: BuildLibraryPathParams): string;
  hardlink(srcPath: string, destPath: string): void;
  hardlinkDirectory(srcDir: string, destDir: string): void;
  getStorageFootprintBytes(targetPath?: string | string[]): number;
}

export class FileSystemService implements IFileSystemService {
  private defaultMediaBasePath: string;

  constructor(mediaBasePath?: string) {
    this.defaultMediaBasePath = mediaBasePath || process.env.MEDIA_PATH || path.resolve(process.cwd(), 'media');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const staging = process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads', 'staging');
    const media = this.defaultMediaBasePath;
    const dirs = [
      staging,
      path.join(media, 'movies'),
      path.join(media, 'shows'),
      path.join(media, 'anime'),
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
    const fileName = `${cleanTitle} ${epCode}.${ext}`;
    return path.join(root, subDir, showFolderName, seasonFolder, fileName);
  }

  hardlink(srcPath: string, destPath: string): void {
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Source file does not exist for hardlink: ${srcPath}`);
    }

    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
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
      fs.mkdirSync(destDir, { recursive: true });
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

  getStorageFootprintBytes(targetPath?: string | string[]): number {
    let pathsToScan: string[] = [];
    if (targetPath) {
      pathsToScan = Array.isArray(targetPath) ? targetPath : [targetPath];
    } else {
      if (fs.existsSync('/media_data')) {
        pathsToScan = ['/media_data'];
      } else {
        const staging = process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads', 'staging');
        const media = this.defaultMediaBasePath;
        pathsToScan = [staging, media];
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
        try {
          const entries = fs.readdirSync(current);
          for (const entry of entries) {
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

    return totalBytes;
  }
}