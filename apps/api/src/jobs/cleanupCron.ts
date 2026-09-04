import cron, { ScheduledTask } from 'node-cron';
import { ICleanupService } from '../services/cleanup';

export interface CleanupCronLogger {
  info: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface CleanupCronOptions {
  cleanupService: ICleanupService;
  schedule?: string;
  logger?: CleanupCronLogger;
}

export class CleanupCron {
  private task: ScheduledTask | null = null;
  private isRunning = false;
  private cleanupService: ICleanupService;
  private schedule: string;
  private logger?: CleanupCronLogger;

  constructor(options: CleanupCronOptions) {
    this.cleanupService = options.cleanupService;
    this.schedule = options.schedule || '0 2 * * *';
    this.logger = options.logger;
  }

  async runOnce(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.logger?.info('Starting nightly cleanup job...');
      // 1. Execute any cleanups whose 24h delay has passed
      if (this.cleanupService.executePendingCleanups) {
        await this.cleanupService.executePendingCleanups();
      }

      // 2. Check disk and schedule candidates if free space < warn threshold
      if (this.cleanupService.checkDiskAndClean) {
        await this.cleanupService.checkDiskAndClean();
      }
      this.logger?.info('Nightly cleanup job completed.');
    } catch (err) {
      this.logger?.error('Error running nightly cleanup cron:', err);
    } finally {
      this.isRunning = false;
    }
  }

  start(): void {
    if (this.task) return;
    this.task = cron.schedule(this.schedule, () => {
      this.runOnce().catch((err) => {
        this.logger?.error('Unhandled error in CleanupCron:', err);
      });
    });
    this.logger?.info(`CleanupCron scheduled with expression: ${this.schedule}`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }
}
