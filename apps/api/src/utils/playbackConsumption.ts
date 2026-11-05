export interface PlaybackProgress {
  played?: boolean | null;
  playbackPositionTicks?: number | null;
  runTimeTicks?: number | null;
}

export const DEFAULT_CONSUMPTION_THRESHOLD = 0.9;

/**
 * Evaluates whether a media item has reached the threshold to be considered fully consumed (watched).
 * An item is fully consumed if:
 * 1. `played` is explicitly true (marked as watched or past server-configured completion percentage), OR
 * 2. `playbackPositionTicks / runTimeTicks` is greater than or equal to the threshold (default: 0.90 / 90%).
 */
export function isMediaFullyConsumed(
  progress: PlaybackProgress,
  threshold: number = DEFAULT_CONSUMPTION_THRESHOLD
): boolean {
  if (progress.played === true) {
    return true;
  }

  if (
    typeof progress.playbackPositionTicks === 'number' &&
    typeof progress.runTimeTicks === 'number' &&
    progress.runTimeTicks > 0
  ) {
    const ratio = progress.playbackPositionTicks / progress.runTimeTicks;
    return ratio >= threshold;
  }

  return false;
}

export interface PlayHistoryEntry {
  lastPlayedDate: string;
  isFullyConsumed: boolean;
}

/**
 * Normalizes either a legacy ISO date string or a structured PlayHistoryEntry.
 * Legacy string entries default to isFullyConsumed = true for test and mock backward compatibility.
 */
export function parsePlayHistoryEntry(
  val: string | PlayHistoryEntry | undefined | null
): PlayHistoryEntry | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    return {
      lastPlayedDate: val.trim() || '1970-01-01T00:00:00.000Z',
      isFullyConsumed: true,
    };
  }
  return {
    lastPlayedDate: val.lastPlayedDate || '1970-01-01T00:00:00.000Z',
    isFullyConsumed: Boolean(val.isFullyConsumed),
  };
}
