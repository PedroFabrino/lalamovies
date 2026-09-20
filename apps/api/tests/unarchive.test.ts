import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { UnarchiveService } from '../src/services/unarchive';

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
});
