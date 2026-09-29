import type { WatchRequest } from '../db/schema';

export interface WaterfallDeps {
  entryId: string;
  /** Already-fetched entry to avoid a redundant DB read on the first iteration. */
  initialEntry?: WatchRequest | null;
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
  | 'max_iterations';

export interface WaterfallResult {
  iterations: number;
  stoppedBecause: WaterfallStopReason;
}

const DEFAULT_MAX_ITERATIONS = 30;

/**
 * Episodic Waterfall Engine.
 *
 * After an episode is downloaded (request created), immediately advance the waitlist
 * entry and poll for the next episode. Repeat until no qualifying release is found,
 * the season completes, or the safety cap is reached.
 *
 * @param deps.entryId   - ID of the waitlist entry to waterfall.
 * @param deps.initialEntry - Optional pre-fetched entry (avoids extra DB read).
 * @param deps.advance   - Calls advanceOrCompleteEntry and returns updated WatchRequest.
 * @param deps.poll      - Calls pollEntry and returns whether a qualifying release was found.
 * @param deps.maxIterations - Safety cap (default 30).
 */
export async function executeEpisodicWaterfall(deps: WaterfallDeps): Promise<WaterfallResult> {
  const { entryId, initialEntry, advance, poll, logger, maxIterations = DEFAULT_MAX_ITERATIONS } = deps;

  // Guard: skip non-episodic entries immediately (check on initialEntry if provided)
  if (initialEntry && initialEntry.mediaType !== 'tv_show' && initialEntry.mediaType !== 'anime') {
    return { iterations: 0, stoppedBecause: 'not_episodic' };
  }

  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    // 1. Advance to next episode (or complete the season)
    const advanced = await advance(entryId);

    if (!advanced) {
      return { iterations, stoppedBecause: 'entry_not_found' };
    }

    if (advanced.status === 'completed') {
      logger?.info(`Waterfall: entry "${advanced.title}" season completed after ${iterations} iteration(s).`);
      return { iterations, stoppedBecause: 'completed' };
    }

    if (advanced.status === 'pending_release') {
      logger?.info(`Waterfall: next episode of "${advanced.title}" not yet aired — stopping waterfall.`);
      return { iterations, stoppedBecause: 'pending_release' };
    }

    if (advanced.mediaType !== 'tv_show' && advanced.mediaType !== 'anime') {
      return { iterations, stoppedBecause: 'not_episodic' };
    }

    // 2. Poll for a qualifying release on the new episode
    const pollResult = await poll(advanced);

    if (!pollResult.notified) {
      logger?.info(`Waterfall: no qualifying release for "${advanced.title}" E${advanced.targetEpisode ?? '?'} — stopping after ${iterations} iteration(s).`);
      return { iterations, stoppedBecause: 'no_release_found' };
    }

    logger?.info(`Waterfall: found release for "${advanced.title}" E${advanced.targetEpisode ?? '?'} — continuing (iteration ${iterations}).`);
  }

  logger?.warn(`Waterfall: reached maximum of ${maxIterations} iterations for entry "${entryId}" — stopping.`);
  return { iterations, stoppedBecause: 'max_iterations' };
}
