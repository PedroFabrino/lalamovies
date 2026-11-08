import type { WatchRequest } from '../db/schema';

export interface WaterfallPollResult {
  notified: boolean;
  triggered?: boolean;
  diagnostic: string;
}

export interface WaterfallDeps {
  entryId: string;
  /** Already-fetched entry to avoid a redundant DB read on the first iteration. */
  initialEntry?: WatchRequest | null;
  /** If true, skip the first advance() call since initialEntry is already at the target episode. */
  skipFirstAdvance?: boolean;
  /** Advances the entry to the next episode; returns updated entry or null if not found/completed. */
  advance: (entryId: string) => Promise<WatchRequest | null>;
  /** Polls Prowlarr for a qualifying release on the entry; returns whether one was found/triggered. */
  poll: (entry: WatchRequest) => Promise<WaterfallPollResult>;
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
 * Advances an episodic waitlist entry through available episodes. When a 0h-grace
 * release is immediately triggered during poll(), the loop continues to the next
 * episode until no qualifying release is found, the next episode has not aired yet,
 * the season completes, or maxIterations is reached.
 */
export async function executeEpisodicWaterfall(deps: WaterfallDeps): Promise<WaterfallResult> {
  const { entryId, initialEntry, skipFirstAdvance, advance, poll, logger, maxIterations = 24 } = deps;

  if (initialEntry && initialEntry.mediaType !== 'tv_show' && initialEntry.mediaType !== 'anime') {
    return { iterations: 0, stoppedBecause: 'not_episodic' };
  }

  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    let current: WatchRequest | null = null;
    if (iterations === 1 && skipFirstAdvance && initialEntry) {
      current = initialEntry;
    } else {
      current = await advance(entryId);
    }

    if (!current) {
      return { iterations, stoppedBecause: 'entry_not_found' };
    }

    if (current.status === 'completed') {
      logger?.info(`Waterfall: entry "${current.title}" season completed.`);
      return { iterations, stoppedBecause: 'completed' };
    }

    if (current.status === 'pending_release') {
      logger?.info(`Waterfall: next episode of "${current.title}" E${current.targetEpisode ?? '?'} not yet aired — stopping.`);
      return { iterations, stoppedBecause: 'pending_release' };
    }

    if (current.mediaType !== 'tv_show' && current.mediaType !== 'anime') {
      return { iterations, stoppedBecause: 'not_episodic' };
    }

    const pollResult = await poll(current);

    if (!pollResult.notified) {
      logger?.info(`Waterfall: no qualifying release for "${current.title}" E${current.targetEpisode ?? '?'} — stopping.`);
      return { iterations, stoppedBecause: 'no_release_found' };
    }

    if (!pollResult.triggered) {
      logger?.info(`Waterfall: found release for "${current.title}" E${current.targetEpisode ?? '?'} — set to notified.`);
      return { iterations, stoppedBecause: 'release_found' };
    }

    logger?.info(
      `Waterfall: auto-downloaded "${current.title}" E${current.targetEpisode ?? '?'} immediately — advancing to next episode.`
    );
  }

  return { iterations, stoppedBecause: 'max_iterations' };
}
