import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SymlinkManager } from '../src/services/symlinkManager';

describe('SymlinkManager', () => {
  let tmpDir: string;
  let zurgPath: string;
  let streamPath: string;
  let symlinkManager: SymlinkManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'symlink-test-'));
    zurgPath = path.join(tmpDir, '.zurg');
    streamPath = path.join(tmpDir, 'stream');

    fs.mkdirSync(zurgPath, { recursive: true });
    fs.mkdirSync(streamPath, { recursive: true });

    symlinkManager = new SymlinkManager({
      zurgMountPath: zurgPath,
      streamPath,
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('resolves direct and fuzzy folder names in zurg', () => {
    const movieFolder = 'Incredibles 2 2018 1080p BluRay x265-YAWNTiC.mkv';
    fs.mkdirSync(path.join(zurgPath, movieFolder));

    expect(symlinkManager.resolveZurgEntry(movieFolder)).toBe(movieFolder);
    expect(
      symlinkManager.resolveZurgEntry('Incredibles 2 2018 1080p BluRay x265 YAWNTiC')
    ).toBe(movieFolder);
    expect(symlinkManager.resolveZurgEntry('Nonexistent Movie 2026')).toBeNull();
  });

  it('creates symlink and alias if name matches fuzzy', () => {
    const movieFolder = 'Incredibles 2 2018 1080p BluRay x265-YAWNTiC.mkv';
    fs.mkdirSync(path.join(zurgPath, movieFolder));

    const success = symlinkManager.createStreamSymlink('Incredibles 2 2018 1080p BluRay x265 YAWNTiC');
    expect(success).toBe(true);

    const resolvedDest = path.join(streamPath, movieFolder);
    const aliasDest = path.join(streamPath, 'Incredibles 2 2018 1080p BluRay x265 YAWNTiC');

    expect(fs.existsSync(resolvedDest)).toBe(true);
    expect(fs.existsSync(aliasDest)).toBe(true);
  });

  it('reconciles active streams and purges unlisted entries', () => {
    const movie1 = 'Movie.One.2024.1080p';
    const movie2 = 'Movie.Two.2024.1080p';
    const unlisted = 'Unlisted.Movie.2020';

    fs.mkdirSync(path.join(zurgPath, movie1));
    fs.mkdirSync(path.join(zurgPath, movie2));
    fs.mkdirSync(path.join(zurgPath, unlisted));

    symlinkManager.createStreamSymlink(unlisted);
    expect(fs.existsSync(path.join(streamPath, unlisted))).toBe(true);

    symlinkManager.reconcileActiveStreams([movie1, movie2]);

    expect(fs.existsSync(path.join(streamPath, unlisted))).toBe(false);
    expect(fs.existsSync(path.join(streamPath, movie1))).toBe(true);
    expect(fs.existsSync(path.join(streamPath, movie2))).toBe(true);
  });

  it('removes symlink cleanly', () => {
    const movie = 'Movie.Three.2024';
    fs.mkdirSync(path.join(zurgPath, movie));
    symlinkManager.createStreamSymlink(movie);

    expect(fs.existsSync(path.join(streamPath, movie))).toBe(true);
    symlinkManager.removeStreamSymlink(movie);
    expect(fs.existsSync(path.join(streamPath, movie))).toBe(false);
  });
});
