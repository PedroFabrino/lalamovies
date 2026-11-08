import cron, { ScheduledTask } from 'node-cron';
import { eq } from 'drizzle-orm';
import { WatcherDatabase } from '../db';
import { watchRequests, WatchRequest, waitlistCoRequesters } from '../db/schema';
import {
  deleteDiscordMessage,
  sendWaitlistAutoDownloadNotification,
  sendWaitlistErrorNotification,
} from '../services/notifications';
import { EpisodicTrackingService } from '../services/episodicTracking';
import { executeEpisodicWaterfall } from '../services/episodicWaterfall';
import type { WatcherPoller } from './watcherPoller';

export interface AutoDownloadSubmitterLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface AutoDownloadSubmitterOptions {
  db: WatcherDatabase;
  mainApiUrl?: string;
  serviceApiKey?: string;
  tmdbApiKey?: string;
  webhookUrl?: string;
  graceHours?: number;
  schedule?: string;
  adminRoleMention?: string | null;
  episodicService?: EpisodicTrackingService;
  poller?: WatcherPoller;
  logger?: AutoDownloadSubmitterLogger;
}

export interface SubmitEntryOptions {
  fromWaterfall?: boolean;
  sendStartedNotification?: boolean;
}

export class AutoDownloadSubmitter {
  private db: WatcherDatabase;
  private mainApiUrl: string;
  private serviceApiKey: string;
  private tmdbApiKey?: string;
  private webhookUrl?: string;
  private graceHours: number;
  private schedule: string;
  private adminRoleMention?: string | null;
  private episodicService: EpisodicTrackingService;
  private poller?: WatcherPoller;
  private logger?: AutoDownloadSubmitterLogger;
  private task: ScheduledTask | null = null;
  private isSubmitting = false;
  private activeEntryIds = new Set<string>();

  constructor(options: AutoDownloadSubmitterOptions) {
    this.db = options.db;
    this.mainApiUrl = (
      options.mainApiUrl ||
      process.env.MAIN_API_URL ||
      'http://localhost:3000'
    ).replace(/\/+$/, '');
    this.serviceApiKey = options.serviceApiKey || process.env.SERVICE_API_KEY || '';
    this.tmdbApiKey = options.tmdbApiKey || process.env.TMDB_API_KEY;
    this.webhookUrl = options.webhookUrl;
    this.graceHours = options.graceHours ?? (Number(process.env.NOTIFY_GRACE_HOURS) || 6);
    this.schedule = options.schedule || '*/15 * * * *';
    this.adminRoleMention = options.adminRoleMention;
    this.logger = options.logger;
    this.poller = options.poller;

    this.episodicService =
      options.episodicService ??
      new EpisodicTrackingService({
        db: this.db,
        tmdbApiKey: this.tmdbApiKey,
        logger: this.logger,
      });
  }

  setPoller(poller: WatcherPoller): void {
    this.poller = poller;
  }

  isEntrySubmitting(entryId: string): boolean {
    return this.activeEntryIds.has(entryId);
  }

  async submitOnce(): Promise<{ checked: number; triggered: number; failed: number }> {
    if (this.isSubmitting) {
      this.logger?.info('Auto-download submitter: tick skipped, previous run in progress.');
      return { checked: 0, triggered: 0, failed: 0 };
    }

    this.isSubmitting = true;
    try {
      const notifiedEntries = this.db
        .select()
        .from(watchRequests)
        .where(eq(watchRequests.status, 'notified'))
        .all();

      if (notifiedEntries.length === 0) {
        return { checked: 0, triggered: 0, failed: 0 };
      }

      const now = Date.now();

      const dueEntries = notifiedEntries.filter((entry) => {
        if (!entry.notifyAt) return false;
        const notifyTime = new Date(entry.notifyAt).getTime();
        const effectiveGrace = entry.graceOverrideHours ?? this.graceHours;
        const graceMs = effectiveGrace * 60 * 60 * 1000;
        return notifyTime + graceMs <= now;
      });

      if (dueEntries.length === 0) {
        return { checked: notifiedEntries.length, triggered: 0, failed: 0 };
      }

      let triggeredCount = 0;
      let failedCount = 0;

      for (const entry of dueEntries) {
        const res = await this.submitEntry(entry);
        if (res.success) {
          triggeredCount++;
        } else {
          failedCount++;
        }
      }

      return { checked: notifiedEntries.length, triggered: triggeredCount, failed: failedCount };
    } finally {
      this.isSubmitting = false;
    }
  }

  async submitEntry(
    entry: WatchRequest,
    options?: SubmitEntryOptions
  ): Promise<{ success: boolean; alreadyExisted?: boolean; error?: string }> {
    if (this.activeEntryIds.has(entry.id)) {
      this.logger?.info(`AutoDownloadSubmitter: Entry "${entry.title}" (${entry.id}) already submitting, skipping.`);
      return { success: false, error: 'Submission already in progress' };
    }

    if (!entry.prowlarrReleaseMagnet) {
      this.logger?.warn(`AutoDownloadSubmitter: Entry "${entry.title}" (${entry.id}) has no prowlarr release magnet.`);
      return { success: false, error: 'No release magnet available' };
    }

    this.activeEntryIds.add(entry.id);
    try {
      const targetUrl = `${this.mainApiUrl}/requests`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.serviceApiKey) {
        headers['x-service-key'] = this.serviceApiKey;
      }
      if (entry.userId) {
        headers['x-user-id'] = entry.userId;
      }

      const coReqRows = this.db
        .select({ userId: waitlistCoRequesters.userId })
        .from(waitlistCoRequesters)
        .where(eq(waitlistCoRequesters.waitlistId, entry.id))
        .all();
      const coRequesterUserIds = coReqRows.map((r) => r.userId);

      const requestBody = {
        magnetLink: entry.prowlarrReleaseMagnet,
        mediaType: entry.mediaType,
        metadataId: entry.metadataId,
        metadataSource: entry.metadataSource,
        title: entry.title,
        year: entry.year ?? undefined,
        seasonNumber: entry.seasonNumber ?? undefined,
        episodeNumber: entry.targetEpisode ?? undefined,
        coRequesterUserIds: coRequesterUserIds.length > 0 ? coRequesterUserIds : undefined,
      };

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      // Both 201 (newly created) and 200 (isExisting: true — already requested/downloaded) are completed
      if (res.status === 201 || res.status === 200) {
        const alreadyExisted = res.status === 200;

        if (entry.discordMessageId) {
          await deleteDiscordMessage(
            entry.discordMessageId,
            this.webhookUrl || process.env.WAITLIST_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL,
            this.logger
          );
        }

        if (!alreadyExisted && options?.sendStartedNotification && entry.prowlarrReleaseTitle) {
          await sendWaitlistAutoDownloadNotification({
            id: entry.id,
            title: entry.title,
            year: entry.year,
            seasonNumber: entry.seasonNumber,
            targetEpisode: entry.targetEpisode,
            releaseTitle: entry.prowlarrReleaseTitle,
            score: entry.prowlarrReleaseScore ?? 0,
            posterUrl: entry.posterUrl,
            webhookUrl: this.webhookUrl,
            logger: this.logger,
          });
        }

        const newTriggeredCount = (entry.triggeredCount || 0) + 1;

        if (options?.fromWaterfall) {
          // Inside executeEpisodicWaterfall: the waterfall loop handles advanceEntry on the next iteration
          this.logger?.info(
            `AutoDownloadSubmitter: Waterfall submitted "${entry.title}" E${entry.targetEpisode ?? '?'} (HTTP ${res.status}).`
          );
          return { success: true, alreadyExisted };
        }

        if (entry.mediaType === 'tv_show' || entry.mediaType === 'anime') {
          const advancedEntry = await this.episodicService.advanceEntry(entry.id, newTriggeredCount);

          if (this.poller && advancedEntry) {
            setImmediate(() => {
              executeEpisodicWaterfall({
                entryId: entry.id,
                initialEntry: advancedEntry,
                skipFirstAdvance: true,
                advance: (eid) => this.episodicService.advanceOrCompleteEntry(eid),
                poll: (e) => this.poller!.pollEntry(e, { fromWaterfall: true }),
                logger: this.logger,
              }).catch((err) => {
                this.logger?.error(`AutoDownloadSubmitter: Waterfall failed for entry ${entry.id}:`, err);
              });
            });
          }
        } else {
          const nowIso = new Date().toISOString();
          this.db
            .update(watchRequests)
            .set({
              status: 'triggered',
              triggeredCount: newTriggeredCount,
              failureCount: 0,
              discordMessageId: null,
              updatedAt: nowIso,
            })
            .where(eq(watchRequests.id, entry.id))
            .run();
        }

        this.logger?.info(
          `AutoDownloadSubmitter: Successfully processed "${entry.title}" (HTTP ${res.status}${alreadyExisted ? ', already existed' : ''}).`
        );
        return { success: true, alreadyExisted };
      }

      const errorText = await res.text();
      return await this.recordFailure(entry, `HTTP ${res.status}: ${errorText}`);
    } catch (fetchErr) {
      this.logger?.error(`AutoDownloadSubmitter: Network exception calling Main API for "${entry.title}":`, fetchErr);
      return await this.recordFailure(entry, (fetchErr as Error).message || 'Network exception');
    } finally {
      this.activeEntryIds.delete(entry.id);
    }
  }

  private async recordFailure(
    entry: WatchRequest,
    errorMessage: string
  ): Promise<{ success: boolean; error: string }> {
    this.logger?.error(`AutoDownloadSubmitter: POST /requests failed for "${entry.title}" (${entry.id}): ${errorMessage}`);
    const newFailureCount = (entry.failureCount || 0) + 1;
    const nowIso = new Date().toISOString();

    if (newFailureCount >= 3) {
      await sendWaitlistErrorNotification({
        id: entry.id,
        title: entry.title,
        year: entry.year,
        mediaType: entry.mediaType,
        errorMessage,
        webhookUrl: this.webhookUrl,
        adminRoleMention: this.adminRoleMention,
        logger: this.logger,
      });

      this.db
        .update(watchRequests)
        .set({
          status: 'error',
          failureCount: newFailureCount,
          lastCheckResult: `Auto-download failed (${errorMessage}) — will retry on next poll`,
          updatedAt: nowIso,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();

      this.logger?.error(`AutoDownloadSubmitter: Entry "${entry.title}" reached 3 failures -> transitioned to 'error' status.`);
    } else {
      this.db
        .update(watchRequests)
        .set({
          failureCount: newFailureCount,
          lastCheckResult: `Auto-download retry ${newFailureCount}/3 (${errorMessage})`,
          updatedAt: nowIso,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();
    }

    return { success: false, error: errorMessage };
  }

  start(): void {
    if (this.task) return;
    this.task = cron.schedule(this.schedule, async () => {
      try {
        await this.submitOnce();
      } catch (err) {
        this.logger?.error('AutoDownloadSubmitter: unhandled error in cron job:', err);
      }
    });
    this.logger?.info(`Auto-download submitter scheduled (${this.schedule})`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }
}
