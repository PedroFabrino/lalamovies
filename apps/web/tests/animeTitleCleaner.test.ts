import { describe, it, expect } from 'vitest';
import { parseAnimeTitleAndSeason } from '../src/lib/animeTitleCleaner';

describe('parseAnimeTitleAndSeason (web)', () => {
  it('correctly parses seasons and series titles', () => {
    expect(parseAnimeTitleAndSeason('The Apothecary Diaries Season 3')).toEqual({
      cleanTitle: 'The Apothecary Diaries',
      seasonNumber: 3,
    });
    expect(parseAnimeTitleAndSeason('Kusuriya no Hitorigoto 2nd Season')).toEqual({
      cleanTitle: 'Kusuriya no Hitorigoto',
      seasonNumber: 2,
    });
    expect(
      parseAnimeTitleAndSeason(
        "As a Reincarnated Aristocrat, I'll Use My Appraisal Skill to Rise in the World Season 2"
      )
    ).toEqual({
      cleanTitle: "As a Reincarnated Aristocrat, I'll Use My Appraisal Skill to Rise in the World",
      seasonNumber: 2,
    });
  });
});
