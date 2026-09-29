import { eq } from 'drizzle-orm';
import { WatcherDatabase } from '../db';
import { watchRequests, WatchRequest } from '../db/schema';
import { ReleaseGatingService } from './releaseGating';
import { WatcherPoller } from '../jobs/watcherPoller';

export interface WaitlistCheckResult {
  message: string;
  entry: WatchRequest;
}

export interface WaitlistCheckContext {
  db: WatcherDatabase;
  releaseGating?: ReleaseGatingService;
  poller?: WatcherPoller;
  logger?: { warn: (msg: string | object, ...args: unknown[]) => void };
}

export type WaitlistCheckContextOrFn =
  | WaitlistCheckContext
  | (() => WaitlistCheckContext);

export class WaitlistCheckService {
  constructor(private context: WaitlistCheckContextOrFn) {}

  private get ctx(): WaitlistCheckContext {
    return typeof this.context === 'function' ? this.context() : this.context;
  }

  async pollNow(): Promise<{ ok: boolean; promoted: number; polled: number; notified: number }> {
    const { releaseGating, poller } = this.ctx;
    const promoted = await releaseGating?.promoteDueEntries();
    const pollResult = await poller?.pollOnce();
    return {
      ok: true,
      promoted: promoted || 0,
      polled: pollResult?.polled || 0,
      notified: pollResult?.notified || 0,
    };
  }

  async checkAndDiagnoseEntry(idOrEntry: string | WatchRequest): Promise<WaitlistCheckResult | null> {
    const { db, releaseGating, poller, logger } = this.ctx;
    const id = typeof idOrEntry === 'string' ? idOrEntry : idOrEntry.id;
    let currentEntry =
      typeof idOrEntry === 'string'
        ? db.select().from(watchRequests).where(eq(watchRequests.id, id)).get()
        : idOrEntry;

    if (!currentEntry) {
      return null;
    }

    let checkMessage = 'Checked trackers';

    if (
      currentEntry.status === 'pending_release' ||
      !currentEntry.tmdbReleaseDate ||
      (currentEntry.seasonNumber && currentEntry.seasonNumber > 1)
    ) {
      if (releaseGating) {
        const result = await releaseGating.checkOrHealEntry(currentEntry);
        checkMessage = result.message;
      }

      currentEntry =
        db
          .select()
          .from(watchRequests)
          .where(eq(watchRequests.id, id))
          .get() || currentEntry;

      if (currentEntry.status !== 'checking') {
        const now = new Date().toISOString();
        db
          .update(watchRequests)
          .set({ lastCheckResult: checkMessage, updatedAt: now })
          .where(eq(watchRequests.id, id))
          .run();

        const finalEntry =
          db
            .select()
            .from(watchRequests)
            .where(eq(watchRequests.id, id))
            .get() || currentEntry;

        return {
          message: checkMessage,
          entry: finalEntry,
        };
      }
    }

    try {
      const pollRes = await poller?.pollEntry(currentEntry);
      if (pollRes?.diagnostic) {
        checkMessage = pollRes.diagnostic;
      }
    } catch (err: unknown) {
      logger?.warn(err as object, 'Manual poller tick failed');
    }

    const updated =
      db
        .select()
        .from(watchRequests)
        .where(eq(watchRequests.id, id))
        .get() || currentEntry;

    return {
      message: updated?.lastCheckResult || checkMessage,
      entry: updated,
    };
  }
}
