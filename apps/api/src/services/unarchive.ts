import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

export interface ExtractedMedia {
  primaryVideo: { path: string; name: string; size: number };
  extraVideos: Array<{ path: string; name: string; size: number }>;
  subtitles: Array<{ path: string; name: string }>;
}

export interface ExtractArchiveOptions {
  archivePath: string;
  destinationDir: string;
  password?: string;
}

export type CommandExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type CommandExecFn = (cmd: string, args: string[]) => Promise<CommandExecResult>;

export interface UnarchiveServiceOptions {
  execCommand?: CommandExecFn;
}

export interface IUnarchiveService {
  isArchiveFile(fileNameOrPath: string): boolean;
  containsArchives(files: Array<{ name: string; size?: number } | string>): boolean;
  isArchiveOnly(files: Array<{ name: string; size: number }>): boolean;
  extractArchive(options: ExtractArchiveOptions): Promise<void>;
  filterPlayableMedia(directory: string): ExtractedMedia;
}

export class UnarchiveService implements IUnarchiveService {
  private execCommand: CommandExecFn;

  private readonly VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.ts', '.mov', '.webm', '.m4v']);
  private readonly SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt', '.ass', '.sub']);
  private readonly ARCHIVE_EXTENSIONS = new Set(['.rar', '.zip', '.7z', '.tar', '.gz', '.bz2', '.xz']);
  private readonly SAMPLE_SIZE_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50MB

  constructor(options: UnarchiveServiceOptions = {}) {
    this.execCommand =
      options.execCommand ||
      ((cmd: string, args: string[]) => {
        return new Promise<CommandExecResult>((resolve) => {
          execFile(cmd, args, { maxBuffer: 100 * 1024 * 1024 }, (err, stdout, stderr) => {
            resolve({
              stdout: stdout ? stdout.toString() : '',
              stderr: stderr ? stderr.toString() : '',
              exitCode: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
            });
          });
        });
      });
  }

  isArchiveFile(fileNameOrPath: string): boolean {
    const ext = path.extname(fileNameOrPath).toLowerCase();
    if (this.ARCHIVE_EXTENSIONS.has(ext)) {
      return true;
    }
    // Match multi-part archive patterns like .part01.rar, .r00, .r01, .z01
    if (/\.(part\d+\.rar|r\d{2}|z\d{2})$/i.test(fileNameOrPath)) {
      return true;
    }
    return false;
  }

  containsArchives(files: Array<{ name: string; size?: number } | string>): boolean {
    return files.some((f) => {
      const name = typeof f === 'string' ? f : f.name;
      return this.isArchiveFile(name);
    });
  }

  isArchiveOnly(files: Array<{ name: string; size: number }>): boolean {
    if (!files || files.length === 0) return false;

    let hasArchive = false;
    let hasVideo = false;

    for (const f of files) {
      const ext = path.extname(f.name).toLowerCase();
      if (this.isArchiveFile(f.name)) {
        hasArchive = true;
      } else if (this.VIDEO_EXTENSIONS.has(ext)) {
        hasVideo = true;
      }
    }

    return hasArchive && !hasVideo;
  }

  private extractDomainCandidate(filePath: string): string | null {
    const basename = path.basename(filePath);
    // Matches e.g. "hhd800.com" from "hhd800.com@xb-3987.rar"
    const match = basename.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,6})/);
    return match ? match[1] : null;
  }

  private buildExtractCommand(
    archivePath: string,
    destinationDir: string,
    password?: string
  ): { cmd: string; args: string[] } {
    const ext = path.extname(archivePath).toLowerCase();
    const isRar = ext === '.rar' || /\.r\d{2}$/i.test(archivePath) || /\.part\d+\.rar$/i.test(archivePath);

    if (isRar) {
      // Prefer unrar-free or unrar
      const cmd = 'unrar-free';
      const args = ['-x', '-f'];
      if (password) {
        args.push(`-p${password}`);
      }
      args.push(archivePath, destinationDir);
      return { cmd, args };
    }

    // Default to 7z for zip / 7z
    const cmd = '7z';
    const args = ['x', '-y', `-o${destinationDir}`];
    if (password) {
      args.push(`-p${password}`);
    }
    args.push(archivePath);
    return { cmd, args };
  }

  async extractArchive(options: ExtractArchiveOptions): Promise<void> {
    const { archivePath, destinationDir, password } = options;

    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true, mode: 0o777 });
    }

    const { cmd, args } = this.buildExtractCommand(archivePath, destinationDir, password);
    let result = await this.execCommand(cmd, args);

    if (result.exitCode === 0) {
      return;
    }

    // If failed and no explicit password was supplied, attempt domain token heuristic
    if (!password) {
      const candidatePassword = this.extractDomainCandidate(archivePath);
      if (candidatePassword) {
        const retry = this.buildExtractCommand(archivePath, destinationDir, candidatePassword);
        result = await this.execCommand(retry.cmd, retry.args);
        if (result.exitCode === 0) {
          return;
        }
      }
    }

    throw new Error(
      `Extraction failed for ${archivePath} with exit code ${result.exitCode}: ${result.stderr || result.stdout}`
    );
  }

  filterPlayableMedia(directory: string): ExtractedMedia {
    const allVideos: Array<{ path: string; name: string; size: number }> = [];
    const subtitles: Array<{ path: string; name: string }> = [];

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const stat = fs.statSync(fullPath);

          if (this.VIDEO_EXTENSIONS.has(ext)) {
            allVideos.push({
              path: fullPath,
              name: entry.name,
              size: stat.size,
            });
          } else if (this.SUBTITLE_EXTENSIONS.has(ext)) {
            subtitles.push({
              path: fullPath,
              name: entry.name,
            });
          }
        }
      }
    };

    walk(directory);

    if (allVideos.length === 0) {
      throw new Error(`No playable media file found in extracted directory: ${directory}`);
    }

    // Filter sample clips
    const hasLargeVideo = allVideos.some((v) => v.size >= this.SAMPLE_SIZE_THRESHOLD_BYTES);
    let validVideos = allVideos;

    if (hasLargeVideo) {
      validVideos = allVideos.filter((v) => {
        const isSampleName = /sample/i.test(v.name);
        const isSmall = v.size < this.SAMPLE_SIZE_THRESHOLD_BYTES;
        return !isSampleName && !isSmall;
      });
      // Fallback if all got filtered
      if (validVideos.length === 0) {
        validVideos = allVideos;
      }
    } else if (allVideos.length > 1) {
      // Remove any file explicitly titled "sample"
      const nonSample = allVideos.filter((v) => !/sample/i.test(v.name));
      if (nonSample.length > 0) {
        validVideos = nonSample;
      }
    }

    // Sort descending by size
    validVideos.sort((a, b) => b.size - a.size);

    const primaryVideo = validVideos[0];
    const extraVideos = validVideos.slice(1);

    return {
      primaryVideo,
      extraVideos,
      subtitles,
    };
  }
}
