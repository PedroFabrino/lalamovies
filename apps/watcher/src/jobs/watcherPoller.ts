import cron, { ScheduledTask } from 'node-cron';
import { eq } from 'drizzle-orm';
import { WatcherDatabase } from '../db';
import { watchRequests, WatchRequest } from '../db/schema';
import { WatcherProwlarrService } from '../services/prowlarr';
import { sendWaitlistNotification, deleteDiscordMessage } from '../services/notifications';
import { ReleaseGatingService } from '../services/releaseGating';
import { resolveTitleAliases } from '../services/titleAliasResolver';
import { computeGraceHours } from '../utils/gracePeriod';
import { evaluateCandidatesDiagnostic } from '../utils/candidateDiagnostics';
import { isQualifiedPreferred } from '../utils/preferredIndexer';
import type { AutoDownloadSubmitter } from './autoDownloadSubmitter';

export interface WatcherPollerLogger {
  info: (msg: string | object, ...args: unknown[]) => void;
  warn: (msg: string | object, ...args: unknown[]) => void;
  error: (msg: string | object, err?: unknown) => void;
}

export interface WatcherPollerOptions {
  db: WatcherDatabase;
  prowlarrService: WatcherProwlarrService;
  submitter?: AutoDownloadSubmitter;
  pollIntervalHours?: number;
  schedule?: string;
  magicLinkSecret?: string;
  webhookUrl?: string;
  frontendUrl?: string;
  graceHours?: number;
  movieGraceHours?: number;
  episodeGraceHours?: number;
  newReleaseThresholdDays?: number;
  releaseGatingService?: ReleaseGatingService;
  tmdbApiKey?: string;
  logger?: WatcherPollerLogger;
  mainApiUrl?: string;
  isWaitlistEnabled?: () => Promise<boolean> | boolean;
}

export interface PollEntryOptions {
  fromWaterfall?: boolean;
}

export class WatcherPoller {
  private db: WatcherDatabase;
  private prowlarr: WatcherProwlarrService;
  private submitter?: AutoDownloadSubmitter;
  private logger?: WatcherPollerLogger;
  private schedule: string;
  private magicLinkSecret?: string;
  private webhookUrl?: string;
  private frontendUrl?: string;
  private graceHours: number;
  private movieGraceHours: number;
  private episodeGraceHours: number;
  private newReleaseThresholdDays: number;
  private releaseGating?: ReleaseGatingService;
  private task: ScheduledTask | null = null;
  private isPolling = false;
  private mainApiUrl?: string;
  private isWaitlistEnabledChecker?: () => Promise<boolean> | boolean;
  private tmdbApiKey?: string;

  constructor(options: WatcherPollerOptions) {
    this.db = options.db;
    this.prowlarr = options.prowlarrService;
    this.submitter = options.submitter;
    this.logger = options.logger;
    this.magicLinkSecret = options.magicLinkSecret;
    this.webhookUrl = options.webhookUrl;
    this.frontendUrl = options.frontendUrl;
    this.tmdbApiKey = options.tmdbApiKey || process.env.TMDB_API_KEY;
    this.graceHours = options.graceHours || Number(process.env.NOTIFY_GRACE_HOURS) || 6;
    this.movieGraceHours =
      options.movieGraceHours ?? (process.env.MOVIE_GRACE_HOURS !== undefined ? Number(process.env.MOVIE_GRACE_HOURS) : 6);
    this.episodeGraceHours =
      options.episodeGraceHours ?? (process.env.EPISODE_GRACE_HOURS !== undefined ? Number(process.env.EPISODE_GRACE_HOURS) : 0);
    this.newReleaseThresholdDays =
      options.newReleaseThresholdDays ??
      (process.env.NEW_RELEASE_THRESHOLD_DAYS !== undefined ? Number(process.env.NEW_RELEASE_THRESHOLD_DAYS) : 30);
    this.releaseGating =
      options.releaseGatingService ??
      (options.tmdbApiKey
        ? new ReleaseGatingService({
            db: this.db,
            tmdbApiKey: options.tmdbApiKey,
            logger: this.logger,
          })
        : undefined);

    if (options.schedule) {
      this.schedule = options.schedule;
    } else {
      const hours = options.pollIntervalHours || Number(process.env.POLL_INTERVAL_HOURS) || 6;
      this.schedule = `0 */${hours} * * *`;
    }
    const rawUrl = options.mainApiUrl || process.env.MAIN_API_URL;
    this.mainApiUrl = rawUrl ? rawUrl.replace(/\/+$/, '') : undefined;
    this.isWaitlistEnabledChecker = options.isWaitlistEnabled;
  }

  setSubmitter(submitter: AutoDownloadSubmitter): void {
    this.submitter = submitter;
  }

  private async checkWaitlistEnabled(): Promise<boolean> {
    if (this.isWaitlistEnabledChecker) {
      return await this.isWaitlistEnabledChecker();
    }
    if (!this.mainApiUrl) {
      return true;
    }
    try {
      const res = await fetch(`${this.mainApiUrl}/features`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = (await res.json()) as Record<string, boolean>;
        return data.waitlist !== false;
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Self-heals entries that transitioned to `status = 'error'` during a transient
   * outage or disk-space gate so the next poll cycle retries them automatically.
   */
  private healTransientErrors(): void {
    const errorEntries = this.db
      .select()
      .from(watchRequests)
      .where(eq(watchRequests.status, 'error'))
      .all();

    if (errorEntries.length === 0) return;

    const now = new Date().toISOString();
    for (const entry of errorEntries) {
      this.db
        .update(watchRequests)
        .set({
          status: 'checking',
          failureCount: 0,
          notifyAt: null,
          updatedAt: now,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();
      this.logger?.info(`WatcherPoller: Self-healed entry "${entry.title}" (${entry.id}) from 'error' -> 'checking'.`);
    }
  }

  async pollOnce(): Promise<{ polled: number; notified: number }> {
    if (this.isPolling) {
      this.logger?.info('Watcher poller: tick skipped, previous run in progress.');
      return { polled: 0, notified: 0 };
    }
    this.isPolling = true;

    try {
      const waitlistEnabled = await this.checkWaitlistEnabled();
      if (!waitlistEnabled) {
        this.logger?.info('Watcher poller: waitlist feature disabled by kill switch, sleeping polling loop.');
        return { polled: 0, notified: 0 };
      }

      this.healTransientErrors();

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
          const res = await this.pollEntry(entry);
          if (res.notified) {
            notifiedCount++;
          }
        } catch (err) {
          this.logger?.error(`Watcher: error searching releases for "${entry.title}":`, err);
        }
      }

      return { polled: checkingEntries.length, notified: notifiedCount };
    } finally {
      this.isPolling = false;
    }
  }

  async pollEntry(
    entry: WatchRequest,
    options?: PollEntryOptions
  ): Promise<{ notified: boolean; triggered?: boolean; diagnostic: string }> {
    if (this.submitter?.isEntrySubmitting(entry.id)) {
      return { notified: false, diagnostic: 'Submission already in progress' };
    }

    const alternateTitles =
      (entry.mediaType === 'anime' || entry.mediaType === 'tv_show') && entry.metadataId && this.tmdbApiKey
        ? await resolveTitleAliases(entry, this.tmdbApiKey)
        : { aliases: [] };

    const candidates = await this.prowlarr.searchForEntry({
      mediaType: entry.mediaType,
      title: entry.title,
      year: entry.year,
      seasonNumber: entry.seasonNumber,
      targetEpisode: entry.targetEpisode,
      englishTitle: alternateTitles.englishTitle,
      romajiTitle: alternateTitles.romajiTitle,
      aliases: alternateTitles.aliases,
    });

    const { qualifying, diagnostic } = evaluateCandidatesDiagnostic(entry, candidates);
    const now = new Date().toISOString();

    if (qualifying.length === 0) {
      this.db
        .update(watchRequests)
        .set({
          lastCheckResult: diagnostic,
          updatedAt: now,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();
      this.logger?.info(
        { title: entry.title, diagnostic, entryId: entry.id },
        `WatcherPoller: "${entry.title}" - ${diagnostic}`
      );
      return { notified: false, diagnostic };
    }

    qualifying.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.seeders - a.seeders;
    });

    const winner = qualifying[0];

    let graceOverrideHours = entry.graceOverrideHours;
    if (graceOverrideHours === null || graceOverrideHours === undefined) {
      if (isQualifiedPreferred(winner)) {
        graceOverrideHours = 0;
      } else {
        try {
          if (this.releaseGating) {
            const fetchedDate = await this.releaseGating.fetchReleaseDate(
              entry.mediaType as 'movie' | 'tv_show' | 'anime',
              entry.metadataId,
              entry.seasonNumber,
              entry.targetEpisode
            );
            if (fetchedDate) {
              graceOverrideHours = computeGraceHours(entry.mediaType, fetchedDate, {
                movieGraceHours: this.movieGraceHours,
                episodeGraceHours: this.episodeGraceHours,
                thresholdDays: this.newReleaseThresholdDays,
              });
            } else {
              this.logger?.warn(`TMDB release date not found for "${entry.title}", defaulting grace to ${this.episodeGraceHours}h`);
              graceOverrideHours = this.episodeGraceHours;
            }
          } else {
            this.logger?.warn(`No release gating service available to fetch TMDB date for "${entry.title}", defaulting grace to ${this.episodeGraceHours}h`);
            graceOverrideHours = this.episodeGraceHours;
          }
        } catch (err) {
          this.logger?.warn(`Failed to fetch TMDB release date for "${entry.title}": ${(err as Error).message}`);
          graceOverrideHours = this.episodeGraceHours;
        }
      }
    }

    const effectiveGraceHours = graceOverrideHours ?? this.graceHours;

    // Zero-grace immediate execution: submit right away without sending "Auto-downloading in 0 hours" prompt
    if (effectiveGraceHours === 0 && this.submitter) {
      this.db
        .update(watchRequests)
        .set({
          status: 'notified',
          prowlarrReleaseTitle: winner.title,
          prowlarrReleaseMagnet: winner.downloadUrl,
          prowlarrReleaseScore: winner.score,
          notifyAt: now,
          updatedAt: now,
          graceOverrideHours: 0,
          lastCheckResult: diagnostic,
        })
        .where(eq(watchRequests.id, entry.id))
        .run();

      const updatedEntry = this.db
        .select()
        .from(watchRequests)
        .where(eq(watchRequests.id, entry.id))
        .get();

      if (updatedEntry) {
        const submitResult = await this.submitter.submitEntry(updatedEntry, {
          fromWaterfall: options?.fromWaterfall,
          sendStartedNotification: true,
        });
        return {
          notified: true,
          triggered: submitResult.success,
          diagnostic,
        };
      }
    }

    let discordMessageId: string | null = null;
    const secret = this.magicLinkSecret || process.env.MAGIC_LINK_SECRET || 'magic-link-secret-default-change-me';
    if (secret) {
      try {
        if (entry.discordMessageId) {
          await deleteDiscordMessage(
            entry.discordMessageId,
            this.webhookUrl,
            this.logger
          );
        }

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
          graceHours: effectiveGraceHours,
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
        graceOverrideHours,
        lastCheckResult: diagnostic,
      })
      .where(eq(watchRequests.id, entry.id))
      .run();

    this.logger?.info(`Watcher: found qualifying release for "${entry.title}" (score: ${winner.score}, seeders: ${winner.seeders}). Status -> notified.`);
    return { notified: true, triggered: false, diagnostic };
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
    this.logger?.info(`Watcher poller scheduled (${this.schedule})`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }
}
