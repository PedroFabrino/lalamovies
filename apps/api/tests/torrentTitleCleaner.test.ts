import { describe, it, expect } from 'vitest';
import { cleanTorrentTitle, extractEpisodeInfo } from '../src/utils/torrentTitleCleaner';

describe('Torrent Title Cleaning Engine & Metadata Extraction Suite (#14)', () => {
  describe('TV Episode Patterns', () => {
    it('truncates trailing scene text, extracts season number, and detects tv_show for S01E01', () => {
      const input = 'Crowned.in.a.Hundred.Days.S01E01.1080p.CR.WEB-DL.AAC2.0.H.264-BiOMA.mkv';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Crowned in a Hundred Days',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });
    });

    it('handles lowercase s1e1 pattern', () => {
      const input = 'Breaking.Bad.s1e1.720p.HDTV.x264';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Breaking Bad',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });
    });

    it('handles 1x01 and 02x05 episode patterns', () => {
      const input1 = 'The.Wire.1x01.The.Target.720p.HDTV.x264';
      const result1 = cleanTorrentTitle(input1);

      expect(result1).toEqual({
        title: 'The Wire',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });

      const input2 = 'The.Wire.02x05.720p.HDTV.x264';
      const result2 = cleanTorrentTitle(input2);

      expect(result2).toEqual({
        title: 'The Wire',
        seasonNumber: 2,
        detectedMediaType: 'tv_show',
      });
    });

    it('handles multi-episode token like S01E01-E02', () => {
      const input = 'Severance.S01E01-E02.1080p.ATVP.WEB-DL.DDP5.1.Atmos.H.264';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Severance',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });
    });

    it('preserves year in series title when season/episode follows (e.g. Doctor Who 2005)', () => {
      const input = 'Doctor.Who.2005.S01E01.Rose.1080p.BluRay.x264-SHORT';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Doctor Who 2005',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });
    });
  });

  describe('Season Pack Patterns', () => {
    it('extracts season from "Season.01" and truncates trailing scene tags', () => {
      const input = 'Show.Name.Season.01.1080p.WEB-DL.x265';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Show Name',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });
    });

    it('extracts season from "Season 02" with spaces', () => {
      const input = 'Game of Thrones Season 02 Complete 720p BluRay';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Game of Thrones',
        seasonNumber: 2,
        detectedMediaType: 'tv_show',
      });
    });

    it('extracts season from short form S01 or S1', () => {
      const input1 = 'Show.Name.S01.720p.HDTV';
      const result1 = cleanTorrentTitle(input1);

      expect(result1).toEqual({
        title: 'Show Name',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });

      const input2 = 'Succession.S3.1080p.WEB-DL';
      const result2 = cleanTorrentTitle(input2);

      expect(result2).toEqual({
        title: 'Succession',
        seasonNumber: 3,
        detectedMediaType: 'tv_show',
      });
    });

    it('extracts season from "Series 1"', () => {
      const input = 'Sherlock.Series.1.720p.BluRay';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Sherlock',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });
    });
  });

  describe('Movie Patterns with 4-Digit Release Years', () => {
    it('retains "Title YYYY" and strips trailing scene tags', () => {
      const input = 'Inception.2010.1080p.BluRay.x264-SPARKS.mkv';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Inception 2010',
        detectedMediaType: 'movie',
      });
    });

    it('handles parenthesized year e.g. "Title (YYYY)"', () => {
      const input = 'Interstellar (2014) [1080p] [BluRay] [5.1] [YTS.MX]';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Interstellar 2014',
        detectedMediaType: 'movie',
      });
    });

    it('retains year and handles 2160p UHD HDR tags', () => {
      const input = 'The.Matrix.1999.2160p.UHD.BluRay.x265-TERMINAL';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'The Matrix 1999',
        detectedMediaType: 'movie',
      });
    });

    it('correctly parses titles starting with a number like "1917.2019"', () => {
      const input = '1917.2019.1080p.BluRay.x264';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: '1917 2019',
        detectedMediaType: 'movie',
      });
    });

    it('correctly parses "2001.A.Space.Odyssey.1968"', () => {
      const input = '2001.A.Space.Odyssey.1968.1080p.BluRay';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: '2001 A Space Odyssey 1968',
        detectedMediaType: 'movie',
      });
    });

    it('retains year in brackets e.g. [2021]', () => {
      const input = 'Dune [2021] 1080p WEBRip x264';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Dune 2021',
        detectedMediaType: 'movie',
      });
    });
  });

  describe('Scene Artifact Stripping & Cleaning', () => {
    it('strips bracketed expressions, curly braces, and release group suffixes', () => {
      const input = '[SubsPlease] Sousou no Frieren - S01E01 [1080p] [ABCD1234].mkv';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Sousou no Frieren',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });
    });

    it('replaces dots, underscores, and plus signs with spaces and trims', () => {
      const input1 = 'The_Lord_of_the_Rings+The_Fellowship+2001.mkv';
      const result1 = cleanTorrentTitle(input1);

      expect(result1.title).toBe('The Lord of the Rings The Fellowship 2001');

      const input2 = '   Dirty....Dots___And+++Plus   Signs   ';
      const result2 = cleanTorrentTitle(input2);

      expect(result2.title).toBe('Dirty Dots And Plus Signs');
    });

    it('cleans non-year movie with scene tags and release group', () => {
      const input = 'Fight.Club.1080p.BluRay.x264-SPARKS.mkv';
      const result = cleanTorrentTitle(input);

      expect(result).toEqual({
        title: 'Fight Club',
      });
    });

    it('cleans anime titles with episode tags without crashing', () => {
      const input = '[SubsPlease] Sousou no Frieren - 01 (1080p) [ABCD1234].mkv';
      const result = cleanTorrentTitle(input);

      expect(result.title).toBe('Sousou no Frieren - 01');
    });
  });

  describe('Magnet URI Parsing', () => {
    it('extracts and cleans display name from dn= parameter', () => {
      const magnet = 'magnet:?xt=urn:btih:c12fe1c06bba254a9d9f57d6fcaccc276a8ec3e7&dn=Crowned.in.a.Hundred.Days.S01E01.1080p.CR.WEB-DL.AAC2.0.H.264-BiOMA.mkv&tr=http%3A%2F%2Ftracker';
      const result = cleanTorrentTitle(magnet);

      expect(result).toEqual({
        title: 'Crowned in a Hundred Days',
        seasonNumber: 1,
        detectedMediaType: 'tv_show',
      });
    });

    it('handles plus-encoded spaces in dn= parameter', () => {
      const magnet = 'magnet:?xt=urn:btih:12345&dn=Inception+2010+1080p+BluRay+x264-SPARKS.mkv';
      const result = cleanTorrentTitle(magnet);

      expect(result).toEqual({
        title: 'Inception 2010',
        detectedMediaType: 'movie',
      });
    });

    it('returns empty title for bare magnet URI without dn=', () => {
      const magnet = 'magnet:?xt=urn:btih:c12fe1c06bba254a9d9f57d6fcaccc276a8ec3e7';
      const result = cleanTorrentTitle(magnet);

      expect(result).toEqual({
        title: '',
      });
    });

    it('handles empty or non-string input safely', () => {
      expect(cleanTorrentTitle('')).toEqual({ title: '' });
      expect(cleanTorrentTitle('   ')).toEqual({ title: '' });
      expect(cleanTorrentTitle(null as any)).toEqual({ title: '' });
      expect(cleanTorrentTitle(undefined as any)).toEqual({ title: '' });
    });
  });

  describe('extractEpisodeInfo - Multi-Torrent Episode Auto-Mapper (#7)', () => {
    it('extracts standard scene SxxExx patterns', () => {
      expect(extractEpisodeInfo('Attack.on.Titan.S04E28.The.Dawn.of.Humanity.1080p.mkv')).toEqual({
        seasonNumber: 4,
        episodeNumber: 28,
      });

      expect(extractEpisodeInfo('Severance.s1e1.720p.WEB-DL.mkv')).toEqual({
        seasonNumber: 1,
        episodeNumber: 1,
      });

      expect(extractEpisodeInfo('Show.Name.S02E05-E06.1080p.mkv')).toEqual({
        seasonNumber: 2,
        episodeNumber: 5,
      });
    });

    it('extracts cross notation (1x03, 02x15)', () => {
      expect(extractEpisodeInfo('Game.of.Thrones.1x03.Lord.Snow.720p.mkv')).toEqual({
        seasonNumber: 1,
        episodeNumber: 3,
      });

      expect(extractEpisodeInfo('The.Wire.02x15.mkv')).toEqual({
        seasonNumber: 2,
        episodeNumber: 15,
      });
    });

    it('extracts anime dash notation with release groups', () => {
      expect(extractEpisodeInfo('[SubsPlease] Sousou no Frieren - 01 (1080p) [ABCD1234].mkv')).toEqual({
        seasonNumber: undefined,
        episodeNumber: 1,
      });

      expect(extractEpisodeInfo('[Erai-raws] Jujutsu Kaisen - 24 [1080p].mkv')).toEqual({
        seasonNumber: undefined,
        episodeNumber: 24,
      });

      expect(extractEpisodeInfo('[HorribleSubs] One Piece - 950 [720p].mkv')).toEqual({
        seasonNumber: undefined,
        episodeNumber: 950,
      });

      expect(extractEpisodeInfo('[SubsPlease] Bleach TYBW - 15v2 (1080p).mkv')).toEqual({
        seasonNumber: undefined,
        episodeNumber: 15,
      });
    });

    it('extracts anime with explicit season and dash episode', () => {
      expect(extractEpisodeInfo('[SubsPlease] Bleach - S02 - 14 (1080p).mkv')).toEqual({
        seasonNumber: 2,
        episodeNumber: 14,
      });

      expect(extractEpisodeInfo('Show Name Season 3 - 05.mkv')).toEqual({
        seasonNumber: 3,
        episodeNumber: 5,
      });
    });

    it('extracts episode prefix notation (EP04, Episode 07)', () => {
      expect(extractEpisodeInfo('Spy.x.Family.EP15.1080p.CR.WEB-DL.mkv')).toEqual({
        seasonNumber: undefined,
        episodeNumber: 15,
      });

      expect(extractEpisodeInfo('DanMachi.IV.Episode.08.1080p.mkv')).toEqual({
        seasonNumber: undefined,
        episodeNumber: 8,
      });

      expect(extractEpisodeInfo('Show.Name.Ep.03.720p.mkv')).toEqual({
        seasonNumber: undefined,
        episodeNumber: 3,
      });
    });

    it('extracts delimited standalone episode digits before video specs', () => {
      expect(extractEpisodeInfo('Bleach.TYBW.05.1080p.WEB-DL.mkv')).toEqual({
        seasonNumber: undefined,
        episodeNumber: 5,
      });
    });

    it('handles edge cases safely without crashing', () => {
      expect(extractEpisodeInfo('')).toEqual({});
      expect(extractEpisodeInfo(null as any)).toEqual({});
      expect(extractEpisodeInfo('Movie.Without.Episodes.2024.1080p.mkv')).toEqual({});
    });
  });
});
