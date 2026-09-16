import cron, { ScheduledTask } from 'node-cron';
import { eq, and, ne, asc } from 'drizzle-orm';
import { AppDatabase, downloadRequests, systemConfig } from '../db';
import { ISubgenService } from '../services/subgen';

export interface TranscriptionCronLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface TranscriptionCronOptions {
  db: AppDatabase;
  subgen: ISubgenService;
  schedule?: string;
  logger?: TranscriptionCronLogger;
  isTranscriptionEnabled?: () => Promise<boolean> | boolean;
  broadcast?: (msg: object) => void;
  nowProvider?: () => Date;
}

export function getLocalTimeInTimezone(date: Date, timeZone: string): { hour: number; minute: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hourVal = parts.find((p) => p.type === 'hour')?.value ?? '0';
    // '24' can occasionally occur depending on ICU locale rules for midnight
    const hour = parseInt(hourVal, 10) % 24;
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    return { hour, minute };
  } catch {
    // Fallback to UTC if timezone is invalid
    return { hour: date.getUTCHours(), minute: date.getUTCMinutes() };
  }
}

export function isInsideWindow(
  time: { hour: number; minute: number },
  windowStart: string,
  windowEnd: string
): boolean {
  const [sH, sM] = windowStart.split(':').map((v) => parseInt(v, 10) || 0);
  const [eH, eM] = windowEnd.split(':').map((v) => parseInt(v, 10) || 0);

  const currentMinutes = time.hour * 60 + time.minute;
  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // 00:00 to 00:00 covers 24h
    return true;
  }
}

export class TranscriptionCron {
  private task: ScheduledTask | null = null;
  private isRunning = false;
  private db: AppDatabase;
  private subgen: ISubgenService;
  private schedule: string;
  private logger?: TranscriptionCronLogger;
  private isTranscriptionEnabled?: () => Promise<boolean> | boolean;
  private broadcast?: (msg: object) => void;
  private nowProvider: () => Date;

  constructor(options: TranscriptionCronOptions) {
    this.db = options.db;
    this.subgen = options.subgen;
    this.schedule = options.schedule || '*/5 * * * *';
    this.logger = options.logger;
    this.isTranscriptionEnabled = options.isTranscriptionEnabled;
    this.broadcast = options.broadcast;
    this.nowProvider = options.nowProvider || (() => new Date());
  }

  async runOnce(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // 1. Check feature flag
      if (this.isTranscriptionEnabled) {
        const enabled = await this.isTranscriptionEnabled();
        if (!enabled) {
          this.logger?.info('Subtitle transcription feature is disabled. Skipping schedule run.');
          return;
        }
      }

      // 2. Load window config & timezone
      const configs = this.db.select().from(systemConfig).all();
      const configMap: Record<string, string> = {};
      for (const row of configs) {
        configMap[row.key] = row.value;
      }

      const windowStart = configMap['transcription_window_start'] || '02:00';
      const windowEnd = configMap['transcription_window_end'] || '07:00';
      const timezone = configMap['transcription_timezone'] || process.env.TZ || 'America/Sao_Paulo';

      // 3. Evaluate if current time falls within window
      const now = this.nowProvider();
      const localTime = getLocalTimeInTimezone(now, timezone);
      const inWindow = isInsideWindow(localTime, windowStart, windowEnd);

      if (!inWindow) {
        this.logger?.info(
          `Current time ${localTime.hour.toString().padStart(2, '0')}:${localTime.minute
            .toString()
            .padStart(2, '0')} (${timezone}) is outside transcription window [${windowStart} - ${windowEnd}). Sleeping.`
        );
        return;
      }

      // 4. Enforce single concurrency
      const activeJob = this.db
        .select()
        .from(downloadRequests)
        .where(
          and(
            eq(downloadRequests.transcriptionStatus, 'transcribing'),
            ne(downloadRequests.status, 'deleted')
          )
        )
        .get();

      if (activeJob) {
        this.logger?.info(
          `Active transcription already in progress for request ${activeJob.id}. Single concurrency enforced.`
        );
        return;
      }

      // 5. Select oldest pending private request
      const candidate = this.db
        .select()
        .from(downloadRequests)
        .where(
          and(
            eq(downloadRequests.transcriptionStatus, 'pending'),
            eq(downloadRequests.mediaType, 'private'),
            ne(downloadRequests.status, 'deleted')
          )
        )
        .orderBy(asc(downloadRequests.requestedAt))
        .get();

      if (!candidate) {
        return;
      }

      if (!candidate.jellyfinPath) {
        this.logger?.warn(`Candidate request ${candidate.id} has no jellyfinPath. Skipping.`);
        return;
      }

      // 6. Transition to transcribing and dispatch
      this.db
        .update(downloadRequests)
        .set({
          transcriptionStatus: 'transcribing',
          transcriptionError: null,
        })
        .where(eq(downloadRequests.id, candidate.id))
        .run();

      this.broadcast?.({
        type: 'transcription_updated',
        requestId: candidate.id,
        status: 'transcribing',
      });

      try {
        await this.subgen.triggerBatch(candidate.jellyfinPath);
        this.logger?.info(
          `Dispatched transcription batch to Subgen for request ${candidate.id} (${candidate.title})`
        );
      } catch (err) {
        const errorMsg = (err as Error).message || 'Failed to dispatch to Subgen';
        this.logger?.error(`Failed to dispatch transcription for ${candidate.id}:`, err);

        this.db
          .update(downloadRequests)
          .set({
            transcriptionStatus: 'failed',
            transcriptionError: errorMsg,
          })
          .where(eq(downloadRequests.id, candidate.id))
          .run();

        this.broadcast?.({
          type: 'transcription_updated',
          requestId: candidate.id,
          status: 'failed',
          error: errorMsg,
        });
      }
    } catch (err) {
      this.logger?.error('Error in TranscriptionCron.runOnce:', err);
    } finally {
      this.isRunning = false;
    }
  }

  start(): void {
    if (this.task) return;
    this.task = cron.schedule(this.schedule, () => {
      this.runOnce().catch((err) => {
        this.logger?.error('Unhandled error in TranscriptionCron:', err);
      });
    });
    this.logger?.info(`TranscriptionCron scheduled with expression: ${this.schedule}`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }
}
