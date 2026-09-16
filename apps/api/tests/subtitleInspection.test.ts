import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SubtitleInspectionService } from '../src/services/subtitleInspection';

describe('SubtitleInspectionService (Subtask #99)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sub-inspect-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('returns false when target path does not exist', async () => {
    const service = new SubtitleInspectionService();
    const result = await service.inspect(path.join(tmpDir, 'nonexistent.mkv'));

    expect(result.hasSubtitles).toBe(false);
    expect(result.externalSubtitles).toEqual([]);
    expect(result.embeddedSubtitlesCount).toBe(0);
  });

  it('detects external .srt subtitle file in directory', async () => {
    const videoPath = path.join(tmpDir, 'movie.mkv');
    const srtPath = path.join(tmpDir, 'movie.ja.srt');
    fs.writeFileSync(videoPath, 'dummy video');
    fs.writeFileSync(srtPath, '1\n00:00:01 --> 00:00:02\nTest');

    const service = new SubtitleInspectionService({
      probeRunner: async () => JSON.stringify({ streams: [{ codec_type: 'video' }] }),
    });

    const result = await service.inspect(tmpDir);

    expect(result.hasSubtitles).toBe(true);
    expect(result.externalSubtitles).toHaveLength(1);
    expect(result.externalSubtitles[0]).toBe(srtPath);
    expect(result.embeddedSubtitlesCount).toBe(0);
  });

  it('detects external subtitles with various extensions (.vtt, .sub, .ass)', async () => {
    fs.writeFileSync(path.join(tmpDir, 'sub1.vtt'), 'vtt content');
    fs.writeFileSync(path.join(tmpDir, 'sub2.sub'), 'sub content');
    fs.writeFileSync(path.join(tmpDir, 'sub3.ass'), 'ass content');

    const service = new SubtitleInspectionService();
    const result = await service.inspect(tmpDir);

    expect(result.hasSubtitles).toBe(true);
    expect(result.externalSubtitles).toHaveLength(3);
  });

  it('probes embedded subtitles from ffprobe JSON streams', async () => {
    const videoPath = path.join(tmpDir, 'anime.mkv');
    fs.writeFileSync(videoPath, 'dummy mkv');

    const mockFfprobeOutput = JSON.stringify({
      streams: [
        { index: 0, codec_type: 'video', codec_name: 'h264' },
        { index: 1, codec_type: 'audio', codec_name: 'aac' },
        { index: 2, codec_type: 'subtitle', codec_name: 'subrip' },
        { index: 3, codec_type: 'subtitle', codec_name: 'ass' },
      ],
    });

    const service = new SubtitleInspectionService({
      probeRunner: async () => mockFfprobeOutput,
    });

    const result = await service.inspect(videoPath);

    expect(result.hasSubtitles).toBe(true);
    expect(result.externalSubtitles).toHaveLength(0);
    expect(result.embeddedSubtitlesCount).toBe(2);
  });

  it('returns hasSubtitles: false when zero external and zero internal subtitle streams exist', async () => {
    const videoPath = path.join(tmpDir, 'unsubbed_japanese.mkv');
    fs.writeFileSync(videoPath, 'raw video');

    const mockFfprobeOutput = JSON.stringify({
      streams: [
        { index: 0, codec_type: 'video', codec_name: 'hevc' },
        { index: 1, codec_type: 'audio', codec_name: 'flac' },
      ],
    });

    const service = new SubtitleInspectionService({
      probeRunner: async () => mockFfprobeOutput,
    });

    const result = await service.inspect(videoPath);

    expect(result.hasSubtitles).toBe(false);
    expect(result.externalSubtitles).toEqual([]);
    expect(result.embeddedSubtitlesCount).toBe(0);
  });

  it('handles ffprobe runner error or corrupted output gracefully', async () => {
    const videoPath = path.join(tmpDir, 'corrupt.mkv');
    fs.writeFileSync(videoPath, 'corrupt data');

    const service = new SubtitleInspectionService({
      probeRunner: async () => {
        throw new Error('ffprobe: file not recognized');
      },
    });

    const result = await service.inspect(videoPath);

    expect(result.hasSubtitles).toBe(false);
    expect(result.embeddedSubtitlesCount).toBe(0);
  });

  it('finds sibling external subtitles when inspecting a single video file', async () => {
    const videoPath = path.join(tmpDir, 'Movie (2024).mkv');
    const srtPath = path.join(tmpDir, 'Movie (2024).en.srt');
    fs.writeFileSync(videoPath, 'video');
    fs.writeFileSync(srtPath, 'srt');

    const service = new SubtitleInspectionService({
      probeRunner: async () => JSON.stringify({ streams: [] }),
    });

    const result = await service.inspect(videoPath);

    expect(result.hasSubtitles).toBe(true);
    expect(result.externalSubtitles).toContain(srtPath);
  });
});
