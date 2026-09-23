import { describe, it, expect } from 'vitest';
import { parseAnimeTitleAndSeason } from '../src/utils/animeTitleCleaner';

describe('parseAnimeTitleAndSeason', () => {
  it('extracts word season and cleans series title', () => {
    expect(parseAnimeTitleAndSeason('The Apothecary Diaries Season 3')).toEqual({
      cleanTitle: 'The Apothecary Diaries',
      seasonNumber: 3,
    });
    expect(
      parseAnimeTitleAndSeason(
        "As a Reincarnated Aristocrat, I'll Use My Appraisal Skill to Rise in the World Season 2"
      )
    ).toEqual({
      cleanTitle: "As a Reincarnated Aristocrat, I'll Use My Appraisal Skill to Rise in the World",
      seasonNumber: 2,
    });
    expect(parseAnimeTitleAndSeason('Solo Leveling Season 2 -Arise from the Shadow-')).toEqual({
      cleanTitle: 'Solo Leveling',
      seasonNumber: 2,
    });
  });

  it('extracts ordinal season and cleans series title', () => {
    expect(parseAnimeTitleAndSeason('Kusuriya no Hitorigoto 2nd Season')).toEqual({
      cleanTitle: 'Kusuriya no Hitorigoto',
      seasonNumber: 2,
    });
    expect(parseAnimeTitleAndSeason('Re:Zero kara Hajimeru Isekai Seikatsu 3rd Season')).toEqual({
      cleanTitle: 'Re:Zero kara Hajimeru Isekai Seikatsu',
      seasonNumber: 3,
    });
    expect(parseAnimeTitleAndSeason('Boku no Hero Academia 7th Season')).toEqual({
      cleanTitle: 'Boku no Hero Academia',
      seasonNumber: 7,
    });
  });

  it('extracts S-code season and cleans series title', () => {
    expect(parseAnimeTitleAndSeason('Jujutsu Kaisen S2')).toEqual({
      cleanTitle: 'Jujutsu Kaisen',
      seasonNumber: 2,
    });
    expect(parseAnimeTitleAndSeason('Bleach S03')).toEqual({
      cleanTitle: 'Bleach',
      seasonNumber: 3,
    });
  });

  it('preserves single-season anime titles with default season 1', () => {
    expect(parseAnimeTitleAndSeason('Sousou no Frieren')).toEqual({
      cleanTitle: 'Sousou no Frieren',
      seasonNumber: 1,
    });
    expect(parseAnimeTitleAndSeason("Demon Slayer: Kimetsu no Yaiba")).toEqual({
      cleanTitle: 'Demon Slayer: Kimetsu no Yaiba',
      seasonNumber: 1,
    });
  });
});
