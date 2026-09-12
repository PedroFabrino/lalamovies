import cron, { ScheduledTask } from 'node-cron';
import { eq } from 'drizzle-orm';
import { WatcherDatabase } from '../db';
import { watchRequests, WatchRequest } from '../db/schema';
import { WatcherProwlarrService, CAM_REGEX } from '../services/prowlarr';
import { sendWaitlistNotification } from '../services/notifications';
import { matchesTarget } from '../utils/torrentTitleCleaner';

export interface WatcherPollerLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface WatcherPollerOptions {
  db: WatcherDatabase;
  prowlarrService: WatcherProwlarrService;
  pollIntervalHours?: number;
  schedule?: string;
  magicLinkSecret?: string;
  webhookUrl?: string;
  frontendUrl?: string;
  graceHours?: number;
  logger?: WatcherPollerLogger;
}

export class WatcherPoller {
  private db: WatcherDatabase;
  private prowlarr: WatcherProwlarrService;
  private logger?: WatcherPollerLogger;
  private schedule: string;
  private magicLinkSecret?: string;
  private webhookUrl?: string;
  private frontendUrl?: string;
  private graceHours: number;
  private task: ScheduledTask | null = null;
  private isPolling = false;

  constructor(options: WatcherPollerOptions) {
    this.db = options.db;
    this.prowlarr = options.prowlarrService;
    this.logger = options.logger;
    this.magicLinkSecret = options.magicLinkSecret;
    this.webhookUrl = options.webhookUrl;
    this.frontendUrl = options.frontendUrl;
    this.graceHours = options.graceHours || Number(process.env.NOTIFY_GRACE_HOURS) || 6;

    if (options.schedule) {
      this.schedule = options.schedule;
    } else {
      const hours = options.pollIntervalHours || Number(process.env.POLL_INTERVAL_HOURS) || 6;
      this.schedule = `0 */${hours} * * *`;
    }
  }

  async pollOnce(): Promise<{ polled: number; notified: number }> {
    if (this.isPolling) {
      this.logger?.info('Watcher poller: tick skipped, previous run in progress.');
      return { polled: 0, notified: 0 };
    }

    this.isPolling = true;
    try {
      const checkingEntries = this.db
        .select()
        .from(watchRequests)
        .where(eq(watchRequests.status, 'checking'))
        .all();

      if (checkingEntries.length === 0) {
        return { polled: 0, notified: 0 };
      }

      let notifiedCount = 0;

      for (const entry of checkingEntries) {
        try {
          const candidates = await this.prowlarr.searchForEntry({
            mediaType: entry.mediaType,
            title: entry.title,
            year: entry.year,
            seasonNumber: entry.seasonNumber,
            targetEpisode: entry.targetEpisode,
          });

          // Quality gate: score >= 100 AND seeders >= 10 AND source != cam AND !CAM_REGEX AND matches target episode
          const qualifying = candidates.filter((c) => {
            if (c.score < 100) return false;
            if (c.seeders < 10) return false;
            if (c.source === 'cam') return false;
            if (CAM_REGEX.test(c.title)) return false;
            if (entry.mediaType === 'tv_show' || entry.mediaType === 'anime') {
              const sNum = entry.seasonNumber ?? 1;
              const targetEp = entry.targetEpisode ?? null;
              if (!matchesTarget(c.title, sNum, targetEp)) {
                return false;
              }
            }
            return true;
          });

          if (qualifying.length === 0) {
            continue;
          }

          qualifying.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.seeders - a.seeders;
          });

          const winner = qualifying[0];
          const now = new Date().toISOString();

          let discordMessageId: string | null = null;
          const secret = this.magicLinkSecret || process.env.MAGIC_LINK_SECRET || 'magic-link-secret-default-change-me';
          if (secret) {
            try {
              discordMessageId = await sendWaitlistNotification({
                id: entry.id,
                title: entry.title,
                year: entry.year,
                mediaType: entry.mediaType,
                releaseTitle: winner.title,
                score: winner.score,
                notifyAt: now,
                secret,
                webhookUrl: this.webhookUrl,
                frontendUrl: this.frontendUrl,
                graceHours: this.graceHours,
                logger: this.logger,
              });
            } catch (err) {
              this.logger?.warn(`Failed to send Discord notification for "${entry.title}": ${(err as Error).message}`);
            }
          }

          this.db
            .update(watchRequests)
            .set({
              status: 'notified',
              prowlarrReleaseTitle: winner.title,
              prowlarrReleaseMagnet: winner.downloadUrl,
              prowlarrReleaseScore: winner.score,
              discordMessageId,
              notifyAt: now,
              updatedAt: now,
            })
            .where(eq(watchRequests.id, entry.id))
            .run();

          notifiedCount++;
          this.logger?.info(`Watcher: found qualifying release for "${entry.title}" (score: ${winner.score}, seeders: ${winner.seeders}). Status -> notified.`);
        } catch (err) {
          this.logger?.error(`Watcher: error searching releases for "${entry.title}":`, err);
        }
      }

      return { polled: checkingEntries.length, notified: notifiedCount };
    } finally {
      this.isPolling = false;
    }
  }

  start(): void {
    if (this.task) return;
    this.task = cron.schedule(this.schedule, async () => {
      try {
        await this.pollOnce();
      } catch (err) {
        this.logger?.error('Watcher poller: unhandled error in cron job:', err);
      }
    });
    this.logger?.info(`Watcher poller started with schedule: ${this.schedule}`);

    // Trigger initial check asynchronously on startup
    this.pollOnce().catch((err) => {
      this.logger?.error('Watcher poller: initial startup poll failed:', err);
    });
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      this.logger?.info('Watcher poller stopped.');
    }
  }
}