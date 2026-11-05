import { describe, it, expect } from 'vitest';
import {
  isMediaFullyConsumed,
  parsePlayHistoryEntry,
  DEFAULT_CONSUMPTION_THRESHOLD,
} from '../src/utils/playbackConsumption';

describe('playbackConsumption utility', () => {
  describe('isMediaFullyConsumed', () => {
    it('returns true when played flag is true', () => {
      expect(isMediaFullyConsumed({ played: true })).toBe(true);
      expect(
        isMediaFullyConsumed({
          played: true,
          playbackPositionTicks: 100,
          runTimeTicks: 10000,
        })
      ).toBe(true);
    });

    it('returns false when played is false or missing and ticks are absent', () => {
      expect(isMediaFullyConsumed({ played: false })).toBe(false);
      expect(isMediaFullyConsumed({})).toBe(false);
      expect(isMediaFullyConsumed({ played: null })).toBe(false);
    });

    it('returns false when playback percentage is below threshold', () => {
      const runTime = 100000;
      // 10%
      expect(
        isMediaFullyConsumed({
          played: false,
          playbackPositionTicks: 10000,
          runTimeTicks: runTime,
        })
      ).toBe(false);

      // 50%
      expect(
        isMediaFullyConsumed({
          played: false,
          playbackPositionTicks: 50000,
          runTimeTicks: runTime,
        })
      ).toBe(false);

      // 89.9%
      expect(
        isMediaFullyConsumed({
          played: false,
          playbackPositionTicks: 89900,
          runTimeTicks: runTime,
        })
      ).toBe(false);
    });

    it('returns true when playback percentage reaches or exceeds threshold (90%)', () => {
      const runTime = 100000;
      // Exactly 90%
      expect(
        isMediaFullyConsumed({
          played: false,
          playbackPositionTicks: 90000,
          runTimeTicks: runTime,
        })
      ).toBe(true);

      // 95%
      expect(
        isMediaFullyConsumed({
          played: false,
          playbackPositionTicks: 95000,
          runTimeTicks: runTime,
        })
      ).toBe(true);

      // 100%
      expect(
        isMediaFullyConsumed({
          played: false,
          playbackPositionTicks: 100000,
          runTimeTicks: runTime,
        })
      ).toBe(true);
    });

    it('supports custom thresholds', () => {
      const runTime = 1000;
      expect(
        isMediaFullyConsumed(
          { playbackPositionTicks: 800, runTimeTicks: runTime },
          0.8
        )
      ).toBe(true);
      expect(
        isMediaFullyConsumed(
          { playbackPositionTicks: 799, runTimeTicks: runTime },
          0.8
        )
      ).toBe(false);
    });

    it('safely handles zero, negative, or invalid durations', () => {
      expect(
        isMediaFullyConsumed({
          played: false,
          playbackPositionTicks: 500,
          runTimeTicks: 0,
        })
      ).toBe(false);

      expect(
        isMediaFullyConsumed({
          played: false,
          playbackPositionTicks: 500,
          runTimeTicks: -100,
        })
      ).toBe(false);
    });
  });

  describe('parsePlayHistoryEntry', () => {
    it('normalizes legacy date strings into fully consumed entries for test backward compatibility', () => {
      const res = parsePlayHistoryEntry('2026-09-01T12:00:00.000Z');
      expect(res).toEqual({
        lastPlayedDate: '2026-09-01T12:00:00.000Z',
        isFullyConsumed: true,
      });
    });

    it('preserves structured entries with custom isFullyConsumed', () => {
      const consumed = parsePlayHistoryEntry({
        lastPlayedDate: '2026-10-01T00:00:00Z',
        isFullyConsumed: true,
      });
      expect(consumed?.isFullyConsumed).toBe(true);

      const inProgress = parsePlayHistoryEntry({
        lastPlayedDate: '2026-10-01T00:00:00Z',
        isFullyConsumed: false,
      });
      expect(inProgress?.isFullyConsumed).toBe(false);
    });

    it('returns null for undefined or null inputs, but normalizes empty strings to fallback date with isFullyConsumed=true', () => {
      expect(parsePlayHistoryEntry(null)).toBeNull();
      expect(parsePlayHistoryEntry(undefined)).toBeNull();
      expect(parsePlayHistoryEntry('')).toEqual({
        lastPlayedDate: '1970-01-01T00:00:00.000Z',
        isFullyConsumed: true,
      });
    });
  });
});
