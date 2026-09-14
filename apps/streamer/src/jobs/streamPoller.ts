import { eq } from 'drizzle-orm';
import { StreamerDatabase, ephemeralStreams } from '../db';
import { IDebridService } from '../services/debrid';
import { IStreamerJellyfinService } from '../services/jellyfin';

export interface StreamPollerOptions {
  db: StreamerDatabase;
  debrid: IDebridService;
  jellyfin: IStreamerJellyfinService;
  mainApiUrl?: string;
  serviceApiKey?: string;
  pollIntervalMs?: number;
  maxPollTimeMs?: number;
}

export class StreamPoller {
  private db: StreamerDatabase;
  private debrid: IDebridService;
  private jellyfin: IStreamerJellyfinService;
  private mainApiUrl: string;
  private serviceApiKey: string;
  private pollIntervalMs: number;
  private maxPollTimeMs: number;

  constructor(options: StreamPollerOptions) {
    this.db = options.db;
    this.debrid = options.debrid;
    this.jellyfin = options.jellyfin;
    this.mainApiUrl = (options.mainApiUrl || process.env.MAIN_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
    this.serviceApiKey = options.serviceApiKey || process.env.SERVICE_API_KEY || '';
    this.pollIntervalMs = options.pollIntervalMs || 2000;
    this.maxPollTimeMs = options.maxPollTimeMs || 5 * 60 * 1000;
  }

  async poll(streamId: string): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.maxPollTimeMs) {
      const stream = this.db
        .select()
        .from(ephemeralStreams)
        .where(eq(ephemeralStreams.id, streamId))
        .get();

      if (!stream || stream.status !== 'pending') {
        return;
      }

      try {
        const info = await this.debrid.getTorrentInfo(stream.debridTorrentId);

        if (info.status === 'error' || info.status === 'virus' || info.status === 'dead') {
          this.db
            .update(ephemeralStreams)
            .set({ status: 'expired' })
            .where(eq(ephemeralStreams.id, streamId))
            .run();
          return;
        }

        if (info.status === 'downloaded') {
          await this.jellyfin.refreshStreamLibrary();

          const path = `/media_data/stream/${stream.title}`;
          let itemId = await this.jellyfin.findItemByPath(path);
          if (!itemId) {
            itemId = await this.jellyfin.findItemByPath(stream.title);
          }

          const resolvedItemId = itemId || `jellyfin-${stream.id}`;

          this.db
            .update(ephemeralStreams)
            .set({
              status: 'ready',
              jellyfinItemId: resolvedItemId,
            })
            .where(eq(ephemeralStreams.id, streamId))
            .run();

          await this.broadcastStreamReady({
            type: 'stream_ready',
            streamId: stream.id,
            jellyfinItemId: resolvedItemId,
            title: stream.title,
            jellyfinUrl: `/web/index.html#!/item?id=${resolvedItemId}`,
          });

          return;
        }
      } catch {
        // Retry on next cycle
      }

      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
  }

  private async broadcastStreamReady(payload: object): Promise<void> {
    if (!this.mainApiUrl) return;
    try {
      await fetch(`${this.mainApiUrl}/api/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': this.serviceApiKey,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // Non-blocking fallback
    }
  }
}
