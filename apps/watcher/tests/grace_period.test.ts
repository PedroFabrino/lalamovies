import { describe, it, expect } from 'vitest';
import { computeGraceHours } from '../src/utils/gracePeriod';

describe('computeGraceHours', () => {
  const defaultOpts = {
    movieGraceHours: 6,
    episodeGraceHours: 0,
    thresholdDays: 30,
    now: new Date('2026-09-13T00:00:00.000Z'),
  };

  it('always returns episodeGraceHours for tv_show regardless of date', () => {
    expect(computeGraceHours('tv_show', '2026-09-12', defaultOpts)).toBe(0);
    expect(computeGraceHours('tv_show', '2020-01-01', defaultOpts)).toBe(0);
    expect(computeGraceHours('tv_show', null, defaultOpts)).toBe(0);
  });

  it('always returns episodeGraceHours for anime regardless of date', () => {
    expect(computeGraceHours('anime', '2026-09-12', defaultOpts)).toBe(0);
    expect(computeGraceHours('anime', '2015-05-20', defaultOpts)).toBe(0);
    expect(computeGraceHours('anime', null, defaultOpts)).toBe(0);
  });

  it('returns movieGraceHours for movie released within threshold', () => {
    // 10 days ago
    expect(computeGraceHours('movie', '2026-09-03', defaultOpts)).toBe(6);
    // released today
    expect(computeGraceHours('movie', '2026-09-13', defaultOpts)).toBe(6);
    // future release
    expect(computeGraceHours('movie', '2026-10-01', defaultOpts)).toBe(6);
  });

  it('returns episodeGraceHours for movie released older than threshold', () => {
    // 35 days ago
    expect(computeGraceHours('movie', '2026-08-09', defaultOpts)).toBe(0);
    // years ago
    expect(computeGraceHours('movie', '2020-01-01', defaultOpts)).toBe(0);
  });

  it('returns movieGraceHours for movie with null, undefined, or empty release date', () => {
    expect(computeGraceHours('movie', null, defaultOpts)).toBe(6);
    expect(computeGraceHours('movie', undefined, defaultOpts)).toBe(6);
    expect(computeGraceHours('movie', '', defaultOpts)).toBe(6);
    expect(computeGraceHours('movie', 'invalid-date', defaultOpts)).toBe(6);
  });

  it('handles exact threshold boundary correctly', () => {
    // Exactly 30 days before now: 2026-08-14T00:00:00.000Z
    const exact30DaysAgo = new Date(defaultOpts.now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeGraceHours('movie', exact30DaysAgo, defaultOpts)).toBe(6);

    // 30 days + 1 second ago -> older than 30 days -> returns episodeGraceHours (0)
    const slightlyOver30Days = new Date(defaultOpts.now.getTime() - (30 * 24 * 60 * 60 * 1000 + 1000)).toISOString();
    expect(computeGraceHours('movie', slightlyOver30Days, defaultOpts)).toBe(0);

    // 31 days ago
    const exact31DaysAgo = new Date(defaultOpts.now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeGraceHours('movie', exact31DaysAgo, defaultOpts)).toBe(0);
  });
});
