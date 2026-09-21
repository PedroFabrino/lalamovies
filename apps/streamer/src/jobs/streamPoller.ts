import { eq } from 'drizzle-orm';
import { StreamerDatabase, ephemeralStreams } from '../db';
import { IDebridService } from '../services/debrid';
import { IStreamerJellyfinService } from '../services/jellyfin';
import { SymlinkManager } from '../services/symlinkManager';

export interface StreamPollerOptions {
  db: StreamerDatabase;
  debrid: IDebridService;
  jellyfin: IStreamerJellyfinService;
  symlinkManager?: SymlinkManager;
  mainApiUrl?: string;
  serviceApiKey?: string;
  pollIntervalMs?: number;
  maxPollTimeMs?: number;
}

export class StreamPoller {
  private db: StreamerDatabase;
  private debrid: IDebridService;
  private jellyfin: IStreamerJellyfinService;
  private symlinkManager: SymlinkManager;
  private mainApiUrl: string;
  private serviceApiKey: string;
  private pollIntervalMs: number;
  private maxPollTimeMs: number;

  constructor(options: StreamPollerOptions) {
    this.db = options.db;
    this.debrid = options.debrid;
    this.jellyfin = options.jellyfin;
    this.symlinkManager = options.symlinkManager || new SymlinkManager();
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

        if (
          info.status === 'error' ||
          info.status === 'virus' ||
          info.status === 'dead' ||
          info.status === 'magnet_error'
        ) {
          const reason = `Torrent failed on Real-Debrid with status: ${info.status}`;
          await this.debrid.deleteTorrent(stream.debridTorrentId).catch(() => {});
          this.db
            .update(ephemeralStreams)
            .set({ status: 'error', errorMessage: reason })
            .where(eq(ephemeralStreams.id, streamId))
            .run();

          await this.broadcastStreamReady({
            type: 'stream_error',
            streamId: stream.id,
            title: stream.title,
            error: reason,
          });
          return;
        }

        if (info.status === 'waiting_files_selection') {
          try {
            await this.debrid.selectFiles(stream.debridTorrentId, 'all');
          } catch {
            // Will retry on next poll cycle
          }
        }

        if (info.status === 'downloaded') {
          // Verify that Real-Debrid actually allows unrestricting the links (i.e. not DMCA 451 infringing_file)
          try {
            const unrestricted = await this.debrid.getUnrestrictedLinks(stream.debridTorrentId);
            if (!unrestricted || unrestricted.length === 0) {
              throw new Error('No playable stream links returned by Real-Debrid');
            }
          } catch (unrestrictErr: unknown) {
            const errMessage = (unrestrictErr as Error)?.message || '';
            const isInfringing = errMessage.includes('infringing_file') || errMessage.includes('451');
            const userReason = isInfringing
              ? 'This release has been blocked by Real-Debrid (DMCA takedown: infringing file). Please choose another release.'
              : `Real-Debrid error: ${errMessage}`;

            // Extract infoHash from magnetLink if available
            const hashMatch = stream.magnetLink?.match(/urn:btih:([a-zA-Z0-9]+)/i);
            const infoHash = hashMatch ? hashMatch[1].toLowerCase() : undefined;

            // Delete dead torrent from Real-Debrid immediately so Zurg doesn't keep failing
            await this.debrid.deleteTorrent(stream.debridTorrentId).catch(() => {});

            this.db
              .update(ephemeralStreams)
              .set({
                status: 'error',
                errorMessage: userReason,
              })
              .where(eq(ephemeralStreams.id, streamId))
              .run();

            await this.broadcastStreamReady({
              type: 'stream_error',
              streamId: stream.id,
              title: stream.title,
              error: userReason,
              isInfringing,
              infoHash,
            });

            return;
          }

          const folderName = info.filename || stream.title;
          this.symlinkManager.createStreamSymlink(folderName);

          await this.jellyfin.refreshStreamLibrary();

          const path = `/media_data/stream/${folderName}`;
          let itemId: string | null = null;
          const waitStepMs = Math.min(1500, this.pollIntervalMs);

          for (let attempt = 0; attempt < 8; attempt++) {
            itemId = await this.jellyfin.findItemByPath(path);
            if (!itemId) {
              itemId = await this.jellyfin.findItemByPath(folderName);
            }
            if (!itemId) {
              itemId = await this.jellyfin.findItemByPath(stream.title);
            }
            if (itemId) {
              break;
            }
            if (attempt < 7) {
              await new Promise((r) => setTimeout(r, waitStepMs));
            }
          }

          const resolvedItemId = itemId || `jellyfin-${stream.id}`;

          this.db
            .update(ephemeralStreams)
            .set({
              status: 'ready',
              jellyfinItemId: resolvedItemId,
              folderName,
            })
            .where(eq(ephemeralStreams.id, streamId))
            .run();

          const publicUrl = (process.env.JELLYFIN_PUBLIC_URL || '').replace(/\/+$/, '');
          const jellyfinUrl = resolvedItemId
            ? `${publicUrl}/web/index.html#!/item?id=${resolvedItemId}`
            : (publicUrl ? `${publicUrl}/web/index.html` : '/web/index.html');

          await this.broadcastStreamReady({
            type: 'stream_ready',
            streamId: stream.id,
            jellyfinItemId: resolvedItemId,
            title: stream.title,
            jellyfinUrl,
          });

          return;
        }
      } catch {
        // Retry on next cycle
      }

      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }

    // If poll loop timed out and stream is still pending, expire it
    const remaining = this.db
      .select()
      .from(ephemeralStreams)
      .where(eq(ephemeralStreams.id, streamId))
      .get();
    if (remaining && remaining.status === 'pending') {
      const timeoutReason = 'Stream setup timed out waiting for cloud conversion.';
      this.db
        .update(ephemeralStreams)
        .set({ status: 'error', errorMessage: timeoutReason })
        .where(eq(ephemeralStreams.id, streamId))
        .run();

      await this.broadcastStreamReady({
        type: 'stream_error',
        streamId,
        title: remaining.title,
        error: timeoutReason,
      });
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
