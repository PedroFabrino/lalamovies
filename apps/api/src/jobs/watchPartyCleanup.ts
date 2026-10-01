import cron, { ScheduledTask } from 'node-cron';
import { IWatchPartyRepository } from '../services/watchPartyRepository';
import { IJellyfinSyncPlayService } from '../services/jellyfinSyncPlay';
import { resolveDiscordWebhookUrl } from '../services/notifications';
import { buildWatchPartyEndedPayload } from '../services/watchPartyNotifications';
import { BroadcastFunction } from '../routes/ws';

export interface WatchPartyCleanupLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface WatchPartyCleanupOptions {
  watchPartyRepo: IWatchPartyRepository;
  syncPlay: IJellyfinSyncPlayService;
  schedule?: string;
  broadcast?: BroadcastFunction;
  logger?: WatchPartyCleanupLogger;
}

export class WatchPartyCleanupJob {
  private task: ScheduledTask | null = null;
  private isRunning = false;
  private watchPartyRepo: IWatchPartyRepository;
  private syncPlay: IJellyfinSyncPlayService;
  private schedule: string;
  private broadcast?: BroadcastFunction;
  private logger?: WatchPartyCleanupLogger;

  constructor(options: WatchPartyCleanupOptions) {
    this.watchPartyRepo = options.watchPartyRepo;
    this.syncPlay = options.syncPlay;
    this.schedule = options.schedule || '*/5 * * * *'; // Run every 5 minutes
    this.broadcast = options.broadcast;
    this.logger = options.logger;
  }

  async runOnce(): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;
    let cleanedCount = 0;

    try {
      const activeRooms = this.watchPartyRepo.findActive();
      const now = Date.now();
      const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
      const THIRTY_MINS_MS = 30 * 60 * 1000;

      for (const room of activeRooms) {
        const createdAtMs = new Date(room.createdAt).getTime();
        const ageMs = now - createdAtMs;

        let shouldEnd = false;

        if (ageMs >= TWELVE_HOURS_MS) {
          shouldEnd = true;
          this.logger?.info(`Ending room ${room.id} (${room.title}): Exceeded 12h max session window.`);
        } else if (ageMs >= THIRTY_MINS_MS) {
          try {
            const group = await this.syncPlay.getSyncPlayGroup(room.jellyfinGroupId);
            if (!group || !group.participants || group.participants.length === 0) {
              shouldEnd = true;
              this.logger?.info(`Ending room ${room.id} (${room.title}): Inactive for >30m with 0 participants.`);
            }
          } catch (err) {
            this.logger?.warn(`Failed to inspect Jellyfin group for room ${room.id}: ${(err as Error).message}`);
          }
        }

        if (shouldEnd) {
          cleanedCount++;
          // 1. Mark room ended
          this.watchPartyRepo.update(room.id, {
            status: 'ended',
            endedAt: new Date().toISOString(),
          });

          // 2. Teardown SyncPlay group
          if (this.syncPlay.leaveSyncPlayGroup) {
            await this.syncPlay.leaveSyncPlayGroup(room.jellyfinGroupId).catch(() => {});
          }

          // 3. Update Discord Card
          const webhookUrl = resolveDiscordWebhookUrl('watch_party');
          if (webhookUrl && room.discordMessageId) {
            let historyCount = 1;
            try {
              historyCount = 1 + (JSON.parse(room.historyJson || '[]') as unknown[]).length;
            } catch {
              historyCount = 1;
            }

            const endedPayload = buildWatchPartyEndedPayload({
              roomId: room.id,
              hostUsername: room.hostUsername,
              title: room.title,
              mediaType: room.mediaType,
              year: room.year,
              seasonNumber: room.seasonNumber,
              episodeNumber: room.episodeNumber,
              controlMode: room.controlMode as 'everyone' | 'host_only',
              historyCount,
            });

            fetch(`${webhookUrl}/messages/${room.discordMessageId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(endedPayload),
            }).catch(() => {});
          }

          // 4. Broadcast event
          if (typeof this.broadcast === 'function') {
            this.broadcast({
              type: 'watch_party_ended',
              partyId: room.id,
            });
          }
        }
      }
    } catch (err) {
      this.logger?.error('Error running Watch Party cleanup job:', err);
    } finally {
      this.isRunning = false;
    }

    return cleanedCount;
  }

  start(): void {
    if (this.task) return;
    this.task = cron.schedule(this.schedule, () => {
      this.runOnce().catch((err) => {
        this.logger?.error('Unhandled error in Watch Party cleanup job:', err);
      });
    });
    this.logger?.info(`Watch Party cleanup job scheduled: ${this.schedule}`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }
}
