import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.sub', '.ass'];
export const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.ts', '.mov', '.webm', '.m4v'];

export interface SubtitleInspectionResult {
  hasSubtitles: boolean;
  externalSubtitles: string[];
  embeddedSubtitlesCount: number;
}

export type FfprobeRunner = (filePath: string) => Promise<string>;

export interface SubtitleInspectionServiceOptions {
  probeRunner?: FfprobeRunner;
  logger?: {
    warn: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
  };
}

export interface ISubtitleInspectionService {
  inspect(targetPath: string): Promise<SubtitleInspectionResult>;
  probeContainer(filePath: string): Promise<number>;
}

export class SubtitleInspectionService implements ISubtitleInspectionService {
  private probeRunner: FfprobeRunner;
  private logger?: SubtitleInspectionServiceOptions['logger'];

  constructor(options: SubtitleInspectionServiceOptions = {}) {
    this.logger = options.logger;
    this.probeRunner = options.probeRunner || this.defaultProbeRunner.bind(this);
  }

  private async defaultProbeRunner(filePath: string): Promise<string> {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'stream=index,codec_type',
      '-of',
      'json',
      filePath,
    ]);
    return stdout;
  }

  async probeContainer(filePath: string): Promise<number> {
    try {
      const output = await this.probeRunner(filePath);
      const parsed = JSON.parse(output);
      if (!parsed || !Array.isArray(parsed.streams)) {
        return 0;
      }
      const subtitleStreams = parsed.streams.filter(
        (stream: { codec_type?: string }) => stream.codec_type === 'subtitle'
      );
      return subtitleStreams.length;
    } catch (err) {
      this.logger?.warn(`Failed to probe subtitle streams with ffprobe for ${filePath}: ${(err as Error).message}`);
      return 0;
    }
  }

  async inspect(targetPath: string): Promise<SubtitleInspectionResult> {
    if (!fs.existsSync(targetPath)) {
      return {
        hasSubtitles: false,
        externalSubtitles: [],
        embeddedSubtitlesCount: 0,
      };
    }

    const stat = fs.statSync(targetPath);
    const externalSubtitles: string[] = [];
    const videoFiles: string[] = [];

    if (stat.isDirectory()) {
      this.scanDirectory(targetPath, externalSubtitles, videoFiles);
    } else {
      const ext = path.extname(targetPath).toLowerCase();
      if (SUBTITLE_EXTENSIONS.includes(ext)) {
        externalSubtitles.push(targetPath);
      } else if (VIDEO_EXTENSIONS.includes(ext)) {
        videoFiles.push(targetPath);
        // Check sibling directory for external subtitles with matching name or in same folder
        const dir = path.dirname(targetPath);
        const baseName = path.basename(targetPath, ext);
        try {
          const siblings = fs.readdirSync(dir);
          for (const sibling of siblings) {
            const sibExt = path.extname(sibling).toLowerCase();
            if (SUBTITLE_EXTENSIONS.includes(sibExt)) {
              const fullSibPath = path.join(dir, sibling);
              if (sibling.startsWith(baseName) || siblings.length <= 5) {
                externalSubtitles.push(fullSibPath);
              }
            }
          }
        } catch {
          // ignore read error
        }
      }
    }

    // Probe embedded streams in video files
    let embeddedSubtitlesCount = 0;
    for (const videoFile of videoFiles) {
      const count = await this.probeContainer(videoFile);
      embeddedSubtitlesCount += count;
    }

    const hasSubtitles = externalSubtitles.length > 0 || embeddedSubtitlesCount > 0;

    return {
      hasSubtitles,
      externalSubtitles,
      embeddedSubtitlesCount,
    };
  }

  private scanDirectory(dir: string, externalSubtitles: string[], videoFiles: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.scanDirectory(fullPath, externalSubtitles, videoFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUBTITLE_EXTENSIONS.includes(ext)) {
          externalSubtitles.push(fullPath);
        } else if (VIDEO_EXTENSIONS.includes(ext)) {
          videoFiles.push(fullPath);
        }
      }
    }
  }
}
