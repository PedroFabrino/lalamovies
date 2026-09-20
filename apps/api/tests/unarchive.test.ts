import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { UnarchiveService } from '../src/services/unarchive';
import { FileSystemService } from '../src/services/fileSystem';

describe('UnarchiveService', () => {
  let tempDir: string;
  let service: UnarchiveService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unarchive-test-'));
    service = new UnarchiveService();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('Archive Detection', () => {
    it('detects archive file extensions correctly', () => {
      expect(service.isArchiveFile('movie.rar')).toBe(true);
      expect(service.isArchiveFile('movie.zip')).toBe(true);
      expect(service.isArchiveFile('movie.7z')).toBe(true);
      expect(service.isArchiveFile('movie.part01.rar')).toBe(true);
      expect(service.isArchiveFile('movie.r00')).toBe(true);
      expect(service.isArchiveFile('movie.r01')).toBe(true);
      expect(service.isArchiveFile('movie.mkv')).toBe(false);
      expect(service.isArchiveFile('movie.mp4')).toBe(false);
      expect(service.isArchiveFile('info.nfo')).toBe(false);
    });

    it('identifies archive-only torrent file lists', () => {
      const archiveOnlyFiles = [
        { name: 'xb-3987/hhd800.com@xb-3987.rar', size: 228303058 },
        { name: 'xb-3987/hhd800.com.url', size: 120 },
      ];
      expect(service.isArchiveOnly(archiveOnlyFiles)).toBe(true);

      const mixedFiles = [
        { name: 'movie.rar', size: 100000 },
        { name: 'movie.mkv', size: 500000000 },
      ];
      expect(service.isArchiveOnly(mixedFiles)).toBe(false);

      const videoOnlyFiles = [
        { name: 'movie.mkv', size: 500000000 },
        { name: 'movie.nfo', size: 500 },
      ];
      expect(service.isArchiveOnly(videoOnlyFiles)).toBe(false);
    });

    it('detects containsArchives correctly', () => {
      expect(service.containsArchives(['file.txt', 'file.rar'])).toBe(true);
      expect(service.containsArchives([{ name: 'file.mkv' }, { name: 'file.zip' }])).toBe(true);
      expect(service.containsArchives(['file.mp4', 'file.srt'])).toBe(false);
    });

    it('findHeadArchive selects head volume or main rar regardless of order', () => {
      expect(service.findHeadArchive(['track.nfo', 'movie.part02.rar', 'movie.part01.rar'])).toBe('movie.part01.rar');
      expect(service.findHeadArchive(['movie.part2.rar', 'movie.part1.rar', 'sample.mp4'])).toBe('movie.part1.rar');
      expect(service.findHeadArchive(['hhd800.com.url', 'hhd800.com@xb-3987.rar'])).toBe('hhd800.com@xb-3987.rar');
      expect(service.findHeadArchive(['notes.txt', 'image.jpg'])).toBeUndefined();
    });
  });

  describe('filterPlayableMedia', () => {
    it('filters out clutter (.nfo, .url, .txt, images) and identifies primary video', () => {
      const extractedDir = path.join(tempDir, 'extracted');
      fs.mkdirSync(extractedDir, { recursive: true });

      // Create junk files
      fs.writeFileSync(path.join(extractedDir, 'track.nfo'), 'some nfo');
      fs.writeFileSync(path.join(extractedDir, 'site.url'), 'http://site.com');
      fs.writeFileSync(path.join(extractedDir, 'readme.txt'), 'readme');
      fs.writeFileSync(path.join(extractedDir, 'poster.jpg'), 'fake-image');

      // Create primary video (100MB)
      const videoPath = path.join(extractedDir, 'feature.mp4');
      const fd = fs.openSync(videoPath, 'w');
      fs.writeSync(fd, Buffer.alloc(100), 0, 100, 100 * 1024 * 1024); // 100MB sparse
      fs.closeSync(fd);

      // Create subtitle
      fs.writeFileSync(path.join(extractedDir, 'feature.srt'), '1\n00:00:00 --> 00:00:01\nHi');

      const result = service.filterPlayableMedia(extractedDir);
      expect(result.primaryVideo.name).toBe('feature.mp4');
      expect(result.subtitles.length).toBe(1);
      expect(result.subtitles[0].name).toBe('feature.srt');
      expect(result.extraVideos.length).toBe(0);
    });

    it('filters out sample clip when primary video is present', () => {
      const extractedDir = path.join(tempDir, 'sample_test');
      fs.mkdirSync(extractedDir, { recursive: true });

      // Main video (120MB)
      const mainPath = path.join(extractedDir, 'movie.mkv');
      const fdMain = fs.openSync(mainPath, 'w');
      fs.writeSync(fdMain, Buffer.alloc(100), 0, 100, 120 * 1024 * 1024);
      fs.closeSync(fdMain);

      // Sample video (< 50MB, named sample.mkv)
      const samplePath = path.join(extractedDir, 'sample.mkv');
      const fdSample = fs.openSync(samplePath, 'w');
      fs.writeSync(fdSample, Buffer.alloc(100), 0, 100, 20 * 1024 * 1024);
      fs.closeSync(fdSample);

      const result = service.filterPlayableMedia(extractedDir);
      expect(result.primaryVideo.name).toBe('movie.mkv');
      expect(result.extraVideos.length).toBe(0);
    });

    it('throws error when no playable video file exists', () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });
      fs.writeFileSync(path.join(emptyDir, 'info.nfo'), 'just nfo');

      expect(() => service.filterPlayableMedia(emptyDir)).toThrow(/No playable media file found/);
    });
  });

  describe('Extraction Engine & Password Heuristic', () => {
    it('executes extraction command successfully', async () => {
      const execMock = vi.fn().mockResolvedValue({ stdout: 'All OK', stderr: '', exitCode: 0 });
      const customService = new UnarchiveService({ execCommand: execMock });

      const fakeArchive = path.join(tempDir, 'test.rar');
      fs.writeFileSync(fakeArchive, 'dummy rar');
      const outDir = path.join(tempDir, 'output');

      await customService.extractArchive({
        archivePath: fakeArchive,
        destinationDir: outDir,
      });

      expect(execMock).toHaveBeenCalled();
      const call = execMock.mock.calls[0];
      expect(call[1]).toContain(fakeArchive);
      expect(call[1]).toContain(outDir);
    });

    it('falls back to domain token heuristic when encrypted password detected', async () => {
      let callCount = 0;
      const execMock = vi.fn().mockImplementation(async (cmd, args) => {
        callCount++;
        if (callCount === 1) {
          // First attempt without password fails
          return { stdout: '', stderr: 'password required / encrypted header', exitCode: 1 };
        }
        // Second attempt with password candidate succeeds
        return { stdout: 'Extracted successfully', stderr: '', exitCode: 0 };
      });

      const customService = new UnarchiveService({ execCommand: execMock });
      const fakeArchive = path.join(tempDir, 'hhd800.com@xb-3987.rar');
      fs.writeFileSync(fakeArchive, 'dummy encrypted rar');
      const outDir = path.join(tempDir, 'output_pw');

      await customService.extractArchive({
        archivePath: fakeArchive,
        destinationDir: outDir,
      });

      expect(execMock).toHaveBeenCalledTimes(2);
      const secondCallArgs = execMock.mock.calls[1][1];
      const hasPasswordArg = secondCallArgs.some((arg: string) => arg.includes('hhd800.com'));
      expect(hasPasswordArg).toBe(true);
    });
  });

  describe('extractAndDeployMedia', () => {
    it('successfully extracts archive and deploys media to collision-safe library path', async () => {
      const stagingDir = path.join(tempDir, 'staging');
      const mediaDir = path.join(tempDir, 'media');
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(mediaDir, { recursive: true });

      const fakeArchive = path.join(stagingDir, 'Movie.Release.rar');
      fs.writeFileSync(fakeArchive, 'dummy rar');

      const customService = new UnarchiveService({
        execCommand: async (_cmd, args) => {
          // Last argument is destinationDir
          const outDir = args[args.length - 1];
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'movie.1080p.mkv'), Buffer.alloc(1024 * 1024 * 60, 'v'));
          return { stdout: 'OK', stderr: '', exitCode: 0 };
        },
      });

      const fsService = new FileSystemService(mediaDir);
      const scratchDir = path.join(stagingDir, '.scratch_unarchive', 'req_mov_1');

      const destPath = await customService.extractAndDeployMedia(
        fakeArchive,
        {
          id: 'req_mov_1',
          mediaType: 'movie',
          title: 'Dune Part Two',
          year: 2024,
        },
        {
          fileSystem: fsService,
          stagingPath: stagingDir,
          scratchDir,
        }
      );

      // Verifies destination file exists at resolved library path
      expect(fs.existsSync(destPath)).toBe(true);
      expect(destPath.replace(/\\/g, '/')).toContain('/movies/Dune Part Two (2024)/Dune Part Two (2024).mkv');
      // Verifies scratchDir is cleaned up
      expect(fs.existsSync(scratchDir)).toBe(false);
    });

    it('moves subtitles with language tags alongside primary video', async () => {
      const stagingDir = path.join(tempDir, 'staging');
      const mediaDir = path.join(tempDir, 'media');
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(mediaDir, { recursive: true });

      const fakeArchive = path.join(stagingDir, 'Show.S01E01.rar');
      fs.writeFileSync(fakeArchive, 'dummy rar');

      const customService = new UnarchiveService({
        execCommand: async (_cmd, args) => {
          const outDir = args[args.length - 1];
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'ep01.mkv'), Buffer.alloc(1024 * 1024 * 60, 'v'));
          fs.writeFileSync(path.join(outDir, 'ep01.en.srt'), '1\n00:00:01 --> 00:00:02\nSub');
          fs.writeFileSync(path.join(outDir, 'ep01.pt-BR.vtt'), 'WEBVTT\n1\n00:00:01 --> 00:00:02\nLegenda');
          return { stdout: 'OK', stderr: '', exitCode: 0 };
        },
      });

      const fsService = new FileSystemService(mediaDir);
      const destPath = await customService.extractAndDeployMedia(
        fakeArchive,
        {
          id: 'req_show_1',
          mediaType: 'tv_show',
          title: 'Severance',
          seasonNumber: 1,
          episodeNumber: 1,
        },
        {
          fileSystem: fsService,
          stagingPath: stagingDir,
        }
      );

      expect(fs.existsSync(destPath)).toBe(true);
      const destDir = path.dirname(destPath);
      const baseName = path.basename(destPath, path.extname(destPath));

      const enSub = path.join(destDir, `${baseName}.en.srt`);
      const ptSub = path.join(destDir, `${baseName}.pt-BR.vtt`);

      expect(fs.existsSync(enSub)).toBe(true);
      expect(fs.readFileSync(enSub, 'utf-8')).toContain('Sub');
      expect(fs.existsSync(ptSub)).toBe(true);
      expect(fs.readFileSync(ptSub, 'utf-8')).toContain('Legenda');
    });

    it('cleans up scratch directory on extraction failure', async () => {
      const stagingDir = path.join(tempDir, 'staging');
      const mediaDir = path.join(tempDir, 'media');
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(mediaDir, { recursive: true });

      const fakeArchive = path.join(stagingDir, 'Corrupt.rar');
      fs.writeFileSync(fakeArchive, 'corrupt rar');

      const customService = new UnarchiveService({
        execCommand: async (_cmd, args) => {
          const outDir = args[args.length - 1];
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'partial.tmp'), 'partial');
          return { stdout: '', stderr: 'CRC failed', exitCode: 1 };
        },
      });

      const fsService = new FileSystemService(mediaDir);
      const scratchDir = path.join(stagingDir, '.scratch_unarchive', 'req_fail_1');

      await expect(
        customService.extractAndDeployMedia(
          fakeArchive,
          {
            id: 'req_fail_1',
            mediaType: 'movie',
            title: 'Failed Movie',
          },
          {
            fileSystem: fsService,
            stagingPath: stagingDir,
            scratchDir,
          }
        )
      ).rejects.toThrow(/Extraction failed/);

      // Verifies scratchDir was cleaned up despite failure!
      expect(fs.existsSync(scratchDir)).toBe(false);
    });

    it('cleans up scratch directory when filterPlayableMedia finds no video', async () => {
      const stagingDir = path.join(tempDir, 'staging');
      const mediaDir = path.join(tempDir, 'media');
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(mediaDir, { recursive: true });

      const fakeArchive = path.join(stagingDir, 'NoVideo.rar');
      fs.writeFileSync(fakeArchive, 'rar with text only');

      const customService = new UnarchiveService({
        execCommand: async (_cmd, args) => {
          const outDir = args[args.length - 1];
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'notes.txt'), 'no video here');
          return { stdout: 'OK', stderr: '', exitCode: 0 };
        },
      });

      const fsService = new FileSystemService(mediaDir);
      const scratchDir = path.join(stagingDir, '.scratch_unarchive', 'req_novideo');

      await expect(
        customService.extractAndDeployMedia(
          fakeArchive,
          {
            id: 'req_novideo',
            mediaType: 'movie',
            title: 'No Video Movie',
          },
          {
            fileSystem: fsService,
            stagingPath: stagingDir,
            scratchDir,
          }
        )
      ).rejects.toThrow(/No playable media file found/);

      expect(fs.existsSync(scratchDir)).toBe(false);
    });

    it('throws error when archive file does not exist', async () => {
      const fsService = new FileSystemService(tempDir);
      await expect(
        service.extractAndDeployMedia(
          path.join(tempDir, 'non-existent.rar'),
          { id: 'req_missing', mediaType: 'movie', title: 'Ghost' },
          { fileSystem: fsService }
        )
      ).rejects.toThrow(/Archive file not found/);
    });
  });
});

