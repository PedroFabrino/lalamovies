import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { eq } from 'drizzle-orm';
import { FileSystemService } from '../src/services/fileSystem';
import { initDatabase, users, downloadRequests } from '../src/db';
import { RequestStatus } from '../src/services/requestStateMachine';
import { RequestsRepository } from '../src/services/requestsRepository';
import type { ISubtitleInspectionService } from '../src/services/subtitleInspection';

describe('FileSystemService.processAndHardlinkTorrent', () => {
  let tmpDir: string;
  let stagingDir: string;
  let mediaDir: string;
  let dbInstance: ReturnType<typeof initDatabase>;
  let fsService: FileSystemService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdm-fs-hl-test-'));
    stagingDir = path.join(tmpDir, 'staging');
    mediaDir = path.join(tmpDir, 'media');
    fs.mkdirSync(stagingDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    dbInstance = initDatabase(':memory:');
    fsService = new FileSystemService(mediaDir);

    dbInstance.db
      .insert(users)
      .values({
        id: 'usr_1',
        jellyfinUserId: 'jf_usr_1',
        username: 'tester',
        createdAt: new Date().toISOString(),
      })
      .run();
  });

  afterEach(() => {
    dbInstance.sqlite.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('movie source picking: picks the largest video file when multiple files are in torrent', async () => {
    const torrentDir = path.join(stagingDir, 'Movie.Torrent.1999');
    fs.mkdirSync(torrentDir, { recursive: true });

    const sampleFile = path.join(torrentDir, 'sample.mkv');
    const mainFeature = path.join(torrentDir, 'movie.1080p.mkv');
    fs.writeFileSync(sampleFile, Buffer.alloc(1024, 's')); // 1 KB
    fs.writeFileSync(mainFeature, Buffer.alloc(1024 * 10, 'm')); // 10 KB

    const files = [
      { name: path.join('Movie.Torrent.1999', 'sample.mkv'), size: 1024 },
      { name: path.join('Movie.Torrent.1999', 'movie.1080p.mkv'), size: 1024 * 10 },
    ];

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_mov_1',
        mediaType: 'movie',
        title: 'Fight Club',
        year: 1999,
      },
      torrentStatus: { name: 'Movie.Torrent.1999' },
      files,
      stagingPath: stagingDir,
    });

    expect(result.isDirectory).toBe(false);
    expect(result.targetMediaType).toBe('movie');
    expect(result.effectiveTitle).toBe('Fight Club');
    expect(fs.existsSync(result.destPath)).toBe(true);
    // Verified hardlink points to main feature (10 KB)
    expect(fs.statSync(result.destPath).size).toBe(1024 * 10);
  });

  it('TV episode source picking: picks video matching episodeNumber from multi-file pack', async () => {
    const torrentDir = path.join(stagingDir, 'Show.S01.720p');
    fs.mkdirSync(torrentDir, { recursive: true });

    const ep1 = path.join(torrentDir, 'Show.S01E01.mkv');
    const ep2 = path.join(torrentDir, 'Show.S01E02.mkv');
    fs.writeFileSync(ep1, 'Episode 1 Content');
    fs.writeFileSync(ep2, 'Episode 2 Content');

    const files = [
      { name: path.join('Show.S01.720p', 'Show.S01E01.mkv'), size: 100 },
      { name: path.join('Show.S01.720p', 'Show.S01E02.mkv'), size: 200 },
    ];

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_tv_ep2',
        mediaType: 'tv_show',
        title: 'Breaking Bad',
        seasonNumber: 1,
        episodeNumber: 2,
      },
      torrentStatus: { name: 'Show.S01.720p' },
      files,
      stagingPath: stagingDir,
    });

    expect(result.isDirectory).toBe(false);
    expect(fs.existsSync(result.destPath)).toBe(true);
    expect(fs.readFileSync(result.destPath, 'utf-8')).toBe('Episode 2 Content');
    expect(result.destPath.replace(/\\/g, '/')).toContain('/shows/Breaking Bad/Season 01/Breaking Bad S01E02.mkv');
  });

  it('TV episode single video fallback: picks the only video file when videoFiles.length === 1', async () => {
    const epFile = path.join(stagingDir, 'Single.Ep.mkv');
    fs.writeFileSync(epFile, 'Single ep content');

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_single_ep',
        mediaType: 'tv_show',
        title: 'Severance',
        seasonNumber: 1,
        episodeNumber: 5,
      },
      torrentStatus: { name: 'Single.Ep.mkv' },
      files: [{ name: 'Single.Ep.mkv', size: 500 }],
      stagingPath: stagingDir,
    });

    expect(result.isDirectory).toBe(false);
    expect(fs.existsSync(result.destPath)).toBe(true);
    expect(fs.readFileSync(result.destPath, 'utf-8')).toBe('Single ep content');
  });

  it('season pack source picking: hardlinks entire directory when episodeNumber is null', async () => {
    const packDir = path.join(stagingDir, 'Anime.Season.1');
    fs.mkdirSync(packDir, { recursive: true });
    fs.writeFileSync(path.join(packDir, 'Anime.01.mkv'), 'Ep 1');
    fs.writeFileSync(path.join(packDir, 'Anime.02.mkv'), 'Ep 2');

    const files = [
      { name: path.join('Anime.Season.1', 'Anime.01.mkv'), size: 50 },
      { name: path.join('Anime.Season.1', 'Anime.02.mkv'), size: 50 },
    ];

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_anime_pack',
        mediaType: 'anime',
        title: 'Frieren',
        seasonNumber: 1,
        episodeNumber: null,
      },
      torrentStatus: { name: 'Anime.Season.1' },
      files,
      stagingPath: stagingDir,
    });

    expect(result.isDirectory).toBe(true);
    expect(fs.existsSync(result.destPath)).toBe(true);
    expect(fs.existsSync(path.join(result.destPath, 'Anime.01.mkv'))).toBe(true);
    expect(fs.existsSync(path.join(result.destPath, 'Anime.02.mkv'))).toBe(true);
  });

  it('fuzzy matches torrent name in staging when file not found at exact torrentStatus.name', async () => {
    // Torrent named with extra symbols or spacing on disk
    const actualDiskName = 'The.Matrix.1999.Remastered.1080p.mkv';
    fs.writeFileSync(path.join(stagingDir, actualDiskName), 'Matrix Content');

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_fuzzy',
        mediaType: 'movie',
        title: 'The Matrix',
        year: 1999,
      },
      torrentStatus: { name: 'The Matrix 1999 Remastered' }, // slightly different name, no files array
      files: [],
      stagingPath: stagingDir,
    });

    expect(fs.existsSync(result.destPath)).toBe(true);
    expect(fs.readFileSync(result.destPath, 'utf-8')).toBe('Matrix Content');
  });

  it('series folder detection via DB: reuses established show folder from existing request with metadataId', async () => {
    // Seed prior episode with established anime folder
    const establishedAnimePath = path.join(mediaDir, 'anime', 'Dungeon Meshi (2024)', 'Season 01', 'Dungeon Meshi S01E01.mkv');
    fs.mkdirSync(path.dirname(establishedAnimePath), { recursive: true });
    fs.writeFileSync(establishedAnimePath, 'Ep 1');

    dbInstance.db
      .insert(downloadRequests)
      .values({
        id: 'req_ep1_prior',
        userId: 'usr_1',
        magnetLink: 'magnet:?xt=urn:btih:dungeon1',
        mediaType: 'anime',
        status: RequestStatus.SEEDING,
        metadataId: '12345',
        metadataSource: 'tmdb',
        title: 'Delicious in Dungeon',
        year: 2024,
        jellyfinPath: establishedAnimePath,
        requestedAt: new Date().toISOString(),
      })
      .run();

    // Now process episode 2 request under tv_show with same metadataId
    const ep2Src = path.join(stagingDir, 'Dungeon.Meshi.E02.mkv');
    fs.writeFileSync(ep2Src, 'Ep 2');

    const repo = new RequestsRepository(dbInstance.db);
    const existingShowFolder = repo.findExistingSeriesFolder({
      metadataId: '12345',
      mediaType: 'tv_show',
      excludeRequestId: 'req_ep2_new',
    });

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_ep2_new',
        mediaType: 'tv_show', // initial request might say tv_show
        title: 'Delicious in Dungeon',
        year: 2024,
        seasonNumber: 1,
        episodeNumber: 2,
        metadataId: '12345',
      },
      torrentStatus: { name: 'Dungeon.Meshi.E02.mkv' },
      files: [{ name: 'Dungeon.Meshi.E02.mkv', size: 100 }],
      stagingPath: stagingDir,
      existingShowFolder,
    });

    expect(result.targetMediaType).toBe('anime'); // Adopted anime from prior request
    expect(result.destPath.replace(/\\/g, '/')).toContain('/anime/Dungeon Meshi (2024)/Season 01/');
    expect(fs.existsSync(result.destPath)).toBe(true);
  });

  it('series folder detection via disk scan: discovers existing show directory under anime/ or shows/', async () => {
    // Create existing folder on disk without DB entry
    const existingShowDir = path.join(mediaDir, 'shows', 'Succession (2018)');
    fs.mkdirSync(existingShowDir, { recursive: true });

    const epSrc = path.join(stagingDir, 'Succession.S04E01.mkv');
    fs.writeFileSync(epSrc, 'Succession S4E1');

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_succession_s4',
        mediaType: 'tv_show',
        title: 'Succession',
        year: 2018,
        seasonNumber: 4,
        episodeNumber: 1,
      },
      torrentStatus: { name: 'Succession.S04E01.mkv' },
      files: [{ name: 'Succession.S04E01.mkv', size: 100 }],
      stagingPath: stagingDir,
    });

    expect(result.targetMediaType).toBe('tv_show');
    expect(result.destPath.replace(/\\/g, '/')).toContain('/shows/Succession (2018)/Season 04/');
    expect(fs.existsSync(result.destPath)).toBe(true);
  });

  it('subtitle hardlink for movies: hardlinks .srt and .vtt files alongside main movie', async () => {
    const movieSrc = path.join(stagingDir, 'Oppenheimer.2023.mkv');
    const srtSrc = path.join(stagingDir, 'Oppenheimer.2023.en.srt');
    const vttSrc = path.join(stagingDir, 'Oppenheimer.2023.pt.vtt');

    fs.writeFileSync(movieSrc, 'Oppenheimer Movie');
    fs.writeFileSync(srtSrc, 'English Subtitles');
    fs.writeFileSync(vttSrc, 'Portuguese Subtitles');

    const files = [
      { name: 'Oppenheimer.2023.mkv', size: 5000 },
      { name: 'Oppenheimer.2023.en.srt', size: 50 },
      { name: 'Oppenheimer.2023.pt.vtt', size: 60 },
    ];

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_oppenheimer',
        mediaType: 'movie',
        title: 'Oppenheimer',
        year: 2023,
      },
      torrentStatus: { name: 'Oppenheimer.2023.mkv' },
      files,
      stagingPath: stagingDir,
    });

    expect(fs.existsSync(result.destPath)).toBe(true);
    const destDir = path.dirname(result.destPath);
    const baseName = path.basename(result.destPath, path.extname(result.destPath));

    const expectedSrt = path.join(destDir, `${baseName}.en.srt`);
    const expectedVtt = path.join(destDir, `${baseName}.pt.vtt`);

    expect(fs.existsSync(expectedSrt)).toBe(true);
    expect(fs.readFileSync(expectedSrt, 'utf-8')).toBe('English Subtitles');
    expect(fs.existsSync(expectedVtt)).toBe(true);
    expect(fs.readFileSync(expectedVtt, 'utf-8')).toBe('Portuguese Subtitles');
  });

  it('private release disambiguator: passes torrentStatus.name as disambiguator to buildLibraryPath', async () => {
    const privSrc = path.join(stagingDir, 'Family_Home_Video_2026.mkv');
    fs.writeFileSync(privSrc, 'Home Video Content');

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_priv_1',
        mediaType: 'private',
        title: 'Home Videos',
        seasonNumber: null,
        episodeNumber: null,
      },
      torrentStatus: { name: 'Family_Home_Video_2026' },
      files: [{ name: 'Family_Home_Video_2026.mkv', size: 2000 }],
      stagingPath: stagingDir,
    });

    expect(result.destPath.replace(/\\/g, '/')).toContain('/private/Family_Home_Video_2026/Family_Home_Video_2026.mkv');
    expect(fs.existsSync(result.destPath)).toBe(true);
  });

  it('subtitle inspection for private media: inspects destPath and returns transcriptionStatus', async () => {
    const privSrc = path.join(stagingDir, 'Private_Meeting.mkv');
    fs.writeFileSync(privSrc, 'Meeting audio/video');

    const mockInspectionService: ISubtitleInspectionService = {
      inspect: vi.fn().mockResolvedValue({
        hasSubtitles: false,
        externalSubtitles: [],
        embeddedSubtitlesCount: 0,
      }),
      probeContainer: vi.fn().mockResolvedValue(0),
    };

    const result = await fsService.processAndHardlinkTorrent({
      request: {
        id: 'req_priv_inspect',
        mediaType: 'private',
        title: 'Meeting',
      },
      torrentStatus: { name: 'Private_Meeting.mkv' },
      files: [{ name: 'Private_Meeting.mkv', size: 1000 }],
      stagingPath: stagingDir,
      subtitleInspection: mockInspectionService,
    });

    expect(mockInspectionService.inspect).toHaveBeenCalledWith(result.destPath);
    expect(result.transcriptionStatus).toBe('pending'); // hasSubtitles is false -> pending transcription
  });

  it('throws error when source file does not exist', async () => {
    await expect(
      fsService.processAndHardlinkTorrent({
        request: {
          id: 'req_missing',
          mediaType: 'movie',
          title: 'Ghost Movie',
          year: 2020,
        },
        torrentStatus: { name: 'NonExistent.mkv' },
        files: [],
        stagingPath: stagingDir,
      })
    ).rejects.toThrow('Source file does not exist for hardlink');
  });
});
