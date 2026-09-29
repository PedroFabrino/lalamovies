import type { WatchRequest } from '../db/schema';

export interface WaterfallDeps {
  entryId: string;
  /** Already-fetched entry to avoid a redundant DB read on the first iteration. */
  initialEntry?: WatchRequest | null;
  /** If true, skip the first advance() call since initialEntry is already at the target episode. */
  skipFirstAdvance?: boolean;
  /** Advances the entry to the next episode; returns updated entry or null if not found/completed. */
  advance: (entryId: string) => Promise<WatchRequest | null>;
  /** Polls Prowlarr for a qualifying release on the entry; returns whether one was found. */
  poll: (entry: WatchRequest) => Promise<{ notified: boolean; diagnostic: string }>;
  logger?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
  };
  maxIterations?: number;
}

export type WaterfallStopReason =
  | 'not_episodic'
  | 'entry_not_found'
  | 'completed'
  | 'pending_release'
  | 'no_release_found'
  | 'release_found'
  | 'max_iterations';

export interface WaterfallResult {
  iterations: number;
  stoppedBecause: WaterfallStopReason;
}

/**
 * Episodic Waterfall Engine.
 *
 * After an episode is downloaded (request created), advance the waitlist
 * entry to the next episode and poll it once. If a release is found, set to notified and stop
 * so it can be downloaded. If no release is found or season completes, stop accordingly.
 */
export async function executeEpisodicWaterfall(deps: WaterfallDeps): Promise<WaterfallResult> {
  const { entryId, initialEntry, skipFirstAdvance, advance, poll, logger } = deps;

  // Guard: skip non-episodic entries immediately (check on initialEntry if provided)
  if (initialEntry && initialEntry.mediaType !== 'tv_show' && initialEntry.mediaType !== 'anime') {
    return { iterations: 0, stoppedBecause: 'not_episodic' };
  }

  // 1. Advance to next episode (or use initialEntry if skipFirstAdvance is true)
  let advanced: WatchRequest | null = null;
  if (skipFirstAdvance && initialEntry) {
    advanced = initialEntry;
  } else {
    advanced = await advance(entryId);
  }

  if (!advanced) {
    return { iterations: 1, stoppedBecause: 'entry_not_found' };
  }

  if (advanced.status === 'completed') {
    logger?.info(`Waterfall: entry "${advanced.title}" season completed.`);
    return { iterations: 1, stoppedBecause: 'completed' };
  }

  if (advanced.status === 'pending_release') {
    logger?.info(`Waterfall: next episode of "${advanced.title}" E${advanced.targetEpisode ?? '?'} not yet aired — stopping.`);
    return { iterations: 1, stoppedBecause: 'pending_release' };
  }

  if (advanced.mediaType !== 'tv_show' && advanced.mediaType !== 'anime') {
    return { iterations: 1, stoppedBecause: 'not_episodic' };
  }

  // 2. Poll for a qualifying release on the episode
  const pollResult = await poll(advanced);

  if (!pollResult.notified) {
    logger?.info(`Waterfall: no qualifying release for "${advanced.title}" E${advanced.targetEpisode ?? '?'} — stopping.`);
    return { iterations: 1, stoppedBecause: 'no_release_found' };
  }

  logger?.info(`Waterfall: found release for "${advanced.title}" E${advanced.targetEpisode ?? '?'} — set to notified.`);
  return { iterations: 1, stoppedBecause: 'release_found' };
}
