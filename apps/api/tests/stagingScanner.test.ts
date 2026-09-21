import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { reconstructFilesFromDisk } from '../src/utils/stagingScanner';

describe('reconstructFilesFromDisk', () => {
  let tempDir: string;
  let stagingDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'staging-scanner-test-'));
    stagingDir = path.join(tempDir, 'staging');
    fs.mkdirSync(stagingDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('reconstructs files recursively from a staging sub-directory', async () => {
    const subFolder = 'Show.S01';
    const subPath = path.join(stagingDir, subFolder);
    fs.mkdirSync(path.join(subPath, 'nested'), { recursive: true });

    fs.writeFileSync(path.join(subPath, 'ep1.mkv'), 'ep1-content');
    fs.writeFileSync(path.join(subPath, 'nested', 'ep2.mkv'), 'ep2-longer-content');
    fs.writeFileSync(path.join(subPath, 'ep1.srt'), 'subtitles');

    const files = await reconstructFilesFromDisk(stagingDir, subFolder);

    expect(files).toHaveLength(3);
    const ep1 = files.find((f) => f.name.includes('ep1.mkv'));
    const ep2 = files.find((f) => f.name.includes('ep2.mkv'));
    const srt = files.find((f) => f.name.includes('ep1.srt'));

    expect(ep1).toBeDefined();
    expect(ep1?.size).toBe('ep1-content'.length);
    expect(ep1?.name.replace(/\\/g, '/')).toBe('Show.S01/ep1.mkv');

    expect(ep2).toBeDefined();
    expect(ep2?.size).toBe('ep2-longer-content'.length);
    expect(ep2?.name.replace(/\\/g, '/')).toBe('Show.S01/nested/ep2.mkv');

    expect(srt).toBeDefined();
    expect(srt?.size).toBe('subtitles'.length);
  });

  it('returns empty array gracefully when directory does not exist', async () => {
    const files = await reconstructFilesFromDisk(stagingDir, 'NonExistentFolder');
    expect(files).toEqual([]);
  });

  it('returns empty array gracefully when target is a file, not a directory', async () => {
    const filePath = path.join(stagingDir, 'single_file.mkv');
    fs.writeFileSync(filePath, 'hello');

    const files = await reconstructFilesFromDisk(stagingDir, 'single_file.mkv');
    expect(files).toEqual([]);
  });

  it('works when only the target folder path is passed without subDir', async () => {
    const subFolder = 'Movie.2024';
    const subPath = path.join(stagingDir, subFolder);
    fs.mkdirSync(subPath, { recursive: true });
    fs.writeFileSync(path.join(subPath, 'movie.mkv'), 'video');

    const files = await reconstructFilesFromDisk(subPath);
    expect(files).toHaveLength(1);
    expect(files[0].name.replace(/\\/g, '/')).toBe('Movie.2024/movie.mkv');
    expect(files[0].size).toBe('video'.length);
  });
});
