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
}

export interface IFileSystemService {
  buildLibraryPath(params: BuildLibraryPathParams): string;
  hardlink(srcPath: string, destPath: string): void;
  hardlinkDirectory(srcDir: string, destDir: string): void;
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

    if (params.isSeasonPack) {
      return path.join(root, subDir, cleanTitle, seasonFolder);
    }

    const epNum = params.episodeNumber ?? 1;
    const epCode = `S${this.padNumber(seasonNum, 2)}E${this.padNumber(epNum, 2)}`;
    const fileName = `${cleanTitle} ${epCode}.${ext}`;
    return path.join(root, subDir, cleanTitle, seasonFolder, fileName);
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
}