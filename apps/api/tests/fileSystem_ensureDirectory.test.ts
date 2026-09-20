import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FileSystemService } from '../src/services/fileSystem';

describe('FileSystemService.ensureDirectory', () => {
  let tmpDir: string;
  let service: FileSystemService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ensure-dir-test-'));
    // Pass tmpDir as mediaBasePath so FileSystemService doesn't touch real media dirs
    service = new FileSystemService(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a directory that does not exist', () => {
    const target = path.join(tmpDir, 'new-dir');
    expect(fs.existsSync(target)).toBe(false);

    service.ensureDirectory(target);

    expect(fs.existsSync(target)).toBe(true);
    expect(fs.statSync(target).isDirectory()).toBe(true);
  });

  it('creates nested directories recursively', () => {
    const target = path.join(tmpDir, 'a', 'b', 'c');
    expect(fs.existsSync(target)).toBe(false);

    service.ensureDirectory(target);

    expect(fs.existsSync(target)).toBe(true);
  });

  it('is a no-op when directory already exists (does not throw)', () => {
    const target = path.join(tmpDir, 'existing');
    fs.mkdirSync(target);

    expect(() => service.ensureDirectory(target)).not.toThrow();
    expect(fs.existsSync(target)).toBe(true);
  });

  it('does not disturb existing directory contents', () => {
    const target = path.join(tmpDir, 'with-content');
    fs.mkdirSync(target);
    const file = path.join(target, 'keep.txt');
    fs.writeFileSync(file, 'data');

    service.ensureDirectory(target);

    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe('data');
  });

  it('creates sibling directories independently', () => {
    const a = path.join(tmpDir, 'sibling-a');
    const b = path.join(tmpDir, 'sibling-b');

    service.ensureDirectory(a);
    service.ensureDirectory(b);

    expect(fs.existsSync(a)).toBe(true);
    expect(fs.existsSync(b)).toBe(true);
  });
});
