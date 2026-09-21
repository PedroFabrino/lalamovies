import cron, { ScheduledTask } from 'node-cron';
import { eq, and, lte } from 'drizzle-orm';
import { StreamerDatabase, ephemeralStreams } from '../db';
import { IDebridService } from '../services/debrid';
import { IStreamerJellyfinService } from '../services/jellyfin';
import { SymlinkManager } from '../services/symlinkManager';

export interface EphemeralEvictionCronOptions {
  db: StreamerDatabase;
  debrid: IDebridService;
  jellyfin: IStreamerJellyfinService;
  symlinkManager?: SymlinkManager;
  cronSchedule?: string;
  logger?: {
    info: (msg: string) => void;
    error: (msg: string, err?: unknown) => void;
  };
}

export class EphemeralEvictionCron {
  private db: StreamerDatabase;
  private debrid: IDebridService;
  private jellyfin: IStreamerJellyfinService;
  private symlinkManager: SymlinkManager;
  private cronSchedule: string;
  private task: ScheduledTask | null = null;
  private logger?: { info: (msg: string) => void; error: (msg: string, err?: unknown) => void };

  constructor(options: EphemeralEvictionCronOptions) {
    this.db = options.db;
    this.debrid = options.debrid;
    this.jellyfin = options.jellyfin;
    this.symlinkManager = options.symlinkManager || new SymlinkManager();
    this.cronSchedule = options.cronSchedule || '*/15 * * * *';
    this.logger = options.logger;
  }

  start(): void {
    if (this.task) return;
    this.task = cron.schedule(this.cronSchedule, async () => {
      try {
        await this.evictExpired();
      } catch (err) {
        this.logger?.error('Error in EphemeralEvictionCron cycle', err);
      }
    });
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  async evictExpired(): Promise<{ evicted: string[]; deferred: string[] }> {
    const nowIso = new Date().toISOString();

    const expiredCandidates = this.db
      .select()
      .from(ephemeralStreams)
      .where(
        and(
          eq(ephemeralStreams.status, 'ready'),
          lte(ephemeralStreams.expiresAt, nowIso)
        )
      )
      .all();

    if (expiredCandidates.length === 0) {
      return { evicted: [], deferred: [] };
    }

    const activeItemIds = new Set<string>();
    try {
      const activeSessions = await this.jellyfin.getActiveSessions();
      for (const session of activeSessions) {
        if (session.NowPlayingItem?.Id) {
          activeItemIds.add(session.NowPlayingItem.Id);
        }
      }
    } catch (err) {
      this.logger?.error('Failed to get Jellyfin active sessions during eviction', err);
    }

    const evicted: string[] = [];
    const deferred: string[] = [];

    for (const stream of expiredCandidates) {
      if (stream.jellyfinItemId && activeItemIds.has(stream.jellyfinItemId)) {
        deferred.push(stream.id);
        this.logger?.info(`Deferred eviction for stream ${stream.id} (${stream.title}) — actively playing`);
        continue;
      }

      try {
        const folder = stream.folderName || stream.title;
        if (folder) {
          this.symlinkManager.removeStreamSymlink(folder);
        }

        await this.debrid.deleteTorrent(stream.debridTorrentId);

        this.db
          .update(ephemeralStreams)
          .set({ status: 'expired' })
          .where(eq(ephemeralStreams.id, stream.id))
          .run();

        evicted.push(stream.id);
      } catch (err) {
        this.logger?.error(`Failed to evict stream ${stream.id}`, err);
      }
    }

    if (evicted.length > 0) {
      try {
        await this.jellyfin.refreshStreamLibrary();
      } catch (err) {
        this.logger?.error('Failed to refresh Jellyfin library after eviction', err);
      }
    }

    return { evicted, deferred };
  }

  async evictNow(streamId: string): Promise<boolean> {
    const stream = this.db
      .select()
      .from(ephemeralStreams)
      .where(eq(ephemeralStreams.id, streamId))
      .get();

    if (!stream) {
      return false;
    }

    try {
      const folder = stream.folderName || stream.title;
      if (folder) {
        this.symlinkManager.removeStreamSymlink(folder);
      }
      await this.debrid.deleteTorrent(stream.debridTorrentId);
    } catch {
      // Non-blocking
    }

    this.db
      .update(ephemeralStreams)
      .set({ status: 'expired' })
      .where(eq(ephemeralStreams.id, streamId))
      .run();

    try {
      await this.jellyfin.refreshStreamLibrary();
    } catch {
      // Non-blocking
    }

    return true;
  }
}
