import cron, { ScheduledTask } from 'node-cron';
import { eq } from 'drizzle-orm';
import { WatcherDatabase } from '../db';
import { watchRequests, WatchRequest, waitlistCoRequesters } from '../db/schema';
import { deleteDiscordMessage, sendWaitlistErrorNotification } from '../services/notifications';
import { EpisodicTrackingService } from '../services/episodicTracking';

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
  logger?: AutoDownloadSubmitterLogger;
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
  private logger?: AutoDownloadSubmitterLogger;
  private task: ScheduledTask | null = null;
  private isSubmitting = false;

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

    this.episodicService =
      options.episodicService ??
      new EpisodicTrackingService({
        db: this.db,
        tmdbApiKey: this.tmdbApiKey,
        logger: this.logger,
      });
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
      const graceMs = this.graceHours * 60 * 60 * 1000;

      // Filter entries whose grace window has expired: notify_at + graceHours <= now
      const dueEntries = notifiedEntries.filter((entry) => {
        if (!entry.notifyAt) return false;
        const notifyTime = new Date(entry.notifyAt).getTime();
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

  async submitEntry(entry: WatchRequest): Promise<{ success: boolean; error?: string }> {
    if (!entry.prowlarrReleaseMagnet) {
      this.logger?.warn(`AutoDownloadSubmitter: Entry "${entry.title}" (${entry.id}) has no prowlarr release magnet.`);
      return { success: false, error: 'No release magnet available' };
    }

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

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (res.status === 201) {
        // Delete Discord message if it exists
        if (entry.discordMessageId) {
          await deleteDiscordMessage(
            entry.discordMessageId,
            this.webhookUrl || process.env.WAITLIST_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL,
            this.logger
          );
        }

        const newTriggeredCount = (entry.triggeredCount || 0) + 1;

        if (entry.mediaType === 'tv_show' || entry.mediaType === 'anime') {
          await this.episodicService.advanceEntry(entry.id, newTriggeredCount);
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

        this.logger?.info(`AutoDownloadSubmitter: Successfully triggered auto-download for "${entry.title}" (HTTP 201).`);
        return { success: true };
      } else {
        // Main API returned 4xx or 5xx error
        const errorText = await res.text();
        this.logger?.error(`AutoDownloadSubmitter: POST /requests failed for "${entry.title}" (${entry.id}) with status ${res.status}: ${errorText}`);

        const newFailureCount = (entry.failureCount || 0) + 1;
        const nowIso = new Date().toISOString();

        if (newFailureCount >= 3) {
          // 3 consecutive failures: transition to error status and send admin notification
          await sendWaitlistErrorNotification({
            id: entry.id,
            title: entry.title,
            year: entry.year,
            mediaType: entry.mediaType,
            errorMessage: `HTTP ${res.status}: ${errorText}`,
            webhookUrl: this.webhookUrl,
            adminRoleMention: this.adminRoleMention,
            logger: this.logger,
          });

          this.db
            .update(watchRequests)
            .set({
              status: 'error',
              failureCount: newFailureCount,
              updatedAt: nowIso,
            })
            .where(eq(watchRequests.id, entry.id))
            .run();

          this.logger?.error(`AutoDownloadSubmitter: Entry "${entry.title}" reached 3 failures -> transitioned to 'error' status.`);
        } else {
          // Less than 3 failures: stay notified, increment failureCount, retry on next cycle
          this.db
            .update(watchRequests)
            .set({
              failureCount: newFailureCount,
              updatedAt: nowIso,
            })
            .where(eq(watchRequests.id, entry.id))
            .run();
        }

        return { success: false, error: `HTTP ${res.status}: ${errorText}` };
      }
    } catch (fetchErr) {
      // Network or unexpected error
      this.logger?.error(`AutoDownloadSubmitter: Network exception calling Main API for "${entry.title}":`, fetchErr);
      const newFailureCount = (entry.failureCount || 0) + 1;
      const nowIso = new Date().toISOString();

      if (newFailureCount >= 3) {
        await sendWaitlistErrorNotification({
          id: entry.id,
          title: entry.title,
          year: entry.year,
          mediaType: entry.mediaType,
          errorMessage: (fetchErr as Error).message || 'Network exception',
          webhookUrl: this.webhookUrl,
          adminRoleMention: this.adminRoleMention,
          logger: this.logger,
        });

        this.db
          .update(watchRequests)
          .set({
            status: 'error',
            failureCount: newFailureCount,
            updatedAt: nowIso,
          })
          .where(eq(watchRequests.id, entry.id))
          .run();
      } else {
        this.db
          .update(watchRequests)
          .set({
            failureCount: newFailureCount,
            updatedAt: nowIso,
          })
          .where(eq(watchRequests.id, entry.id))
          .run();
      }

      return { success: false, error: (fetchErr as Error).message || 'Network exception' };
    }
  }

  start(): void {
    if (this.task) return;
    this.task = cron.schedule(this.schedule, async () => {
      try {
        await this.submitOnce();
      } catch (err) {
        this.logger?.error('Auto-download submitter: unhandled error in cron job:', err);
      }
    });
    this.logger?.info(`Auto-download submitter started with schedule: ${this.schedule}`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      this.logger?.info('Auto-download submitter stopped.');
    }
  }
}
