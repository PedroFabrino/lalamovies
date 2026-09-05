import path from 'node:path';
import fs from 'node:fs';
import { eq, asc } from 'drizzle-orm';
import { AppDatabase, downloadRequests, systemConfig, users } from '../db';
import { IQBittorrentService } from '../services/qbittorrent';
import { IFileSystemService } from '../services/fileSystem';
import { IJellyfinService } from '../services/jellyfin';
import { INotificationService } from '../services/notifications';

export interface PollerLogger {
  info: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface DownloadPollerOptions {
  db: AppDatabase;
  qbittorrent: IQBittorrentService;
  fileSystem: IFileSystemService;
  jellyfin: IJellyfinService;
  notificationService?: INotificationService;
  stagingPath?: string;
  intervalMs?: number;
  logger?: PollerLogger;
  broadcast?: (msg: object) => void;
}

export class DownloadPoller {
  private timer: NodeJS.Timeout | null = null;
  private isPolling = false;
  private db: AppDatabase;
  private qbittorrent: IQBittorrentService;
  private fileSystem: IFileSystemService;
  private jellyfin: IJellyfinService;
  private notificationService?: INotificationService;
  private stagingPath: string;
  private intervalMs: number;
  private logger?: PollerLogger;
  private broadcast?: (msg: object) => void;

  constructor(options: DownloadPollerOptions) {
    this.db = options.db;
    this.qbittorrent = options.qbittorrent;
    this.fileSystem = options.fileSystem;
    this.jellyfin = options.jellyfin;
    this.notificationService = options.notificationService;
    this.stagingPath = options.stagingPath || process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads/staging');
    this.intervalMs = options.intervalMs || 5000;
    this.logger = options.logger;
    this.broadcast = options.broadcast;
  }

  async pollOnce(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // 1. Process active downloads
      const activeRequests = this.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.status, 'downloading'))
        .all();

      for (const req of activeRequests) {
        if (!req.qbTorrentHash) continue;

        try {
          const torrentStatus = await this.qbittorrent.getTorrentStatus(req.qbTorrentHash);
          if (!torrentStatus) continue;

          const isCompleted =
            torrentStatus.progress >= 1 ||
            ['uploading', 'pausedUP', 'queuedUP', 'stalledUP', 'forcedUP', 'completed'].includes(
              torrentStatus.state
            );

          if (isCompleted) {
            this.logger?.info(`Torrent ${req.title} completed downloading. Transitioning to hardlinking.`);

            // Transition status to hardlinking
            this.db
              .update(downloadRequests)
              .set({ status: 'hardlinking' })
              .where(eq(downloadRequests.id, req.id))
              .run();

            // Locate source file or directory in Staging Area
            const sourceItem = path.join(this.stagingPath, torrentStatus.name);
            const isDirectory = fs.existsSync(sourceItem) && fs.statSync(sourceItem).isDirectory();
            const ext = path.extname(torrentStatus.name) || '.mkv';

            const destPath = this.fileSystem.buildLibraryPath({
              mediaType: req.mediaType,
              title: req.title,
              year: req.year,
              seasonNumber: req.seasonNumber,
              isSeasonPack: isDirectory || (req.mediaType !== 'movie' && !ext),
              ext,
            });

            // Perform Hardlink Move
            if (isDirectory) {
              this.fileSystem.hardlinkDirectory(sourceItem, destPath);
            } else {
              this.fileSystem.hardlink(sourceItem, destPath);
            }

            // Refresh Jellyfin library
            if (this.jellyfin.refreshLibrary) {
              await this.jellyfin.refreshLibrary();
            }

            // Mark status as seeding
            this.db
              .update(downloadRequests)
              .set({
                status: 'seeding',
                jellyfinPath: destPath,
                downloadedAt: new Date().toISOString(),
                sizeBytes: torrentStatus.size,
              })
              .where(eq(downloadRequests.id, req.id))
              .run();

            this.broadcast?.({
              type: 'status',
              requestId: req.id,
              status: 'seeding',
            });

            if (this.notificationService) {
              let requestedBy: string | undefined;
              if (req.userId) {
                const reqUser = this.db
                  .select({ username: users.username })
                  .from(users)
                  .where(eq(users.id, req.userId))
                  .get();
                requestedBy = reqUser?.username;
              }

              await this.notificationService.send('download.completed', {
                title: req.title,
                requestId: req.id,
                mediaType: req.mediaType,
                requestedBy,
                path: destPath,
                jellyfinUrl: process.env.JELLYFIN_URL || undefined,
              });
            }

            this.logger?.info(`Torrent ${req.title} successfully hardlinked to ${destPath} and set to seeding.`);
          }
        } catch (itemErr) {
          this.logger?.error(`Error processing download completion for ${req.title}:`, itemErr);
          this.db
            .update(downloadRequests)
            .set({
              status: 'error',
              errorMessage: (itemErr as Error).message || 'Failed to complete download processing',
            })
            .where(eq(downloadRequests.id, req.id))
            .run();

          this.broadcast?.({
            type: 'status',
            requestId: req.id,
            status: 'error',
          });
        }
      }

      // 2. Check for queued items to start if concurrent limit allows
      const configRow = this.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'concurrent_limit'))
        .get();

      const concurrentLimit = configRow ? parseInt(configRow.value, 10) : 2;
      const activeCount = await this.qbittorrent.getActiveTorrentCount();

      if (activeCount < concurrentLimit) {
        const slotsAvailable = concurrentLimit - activeCount;
        const queuedRequests = this.db
          .select()
          .from(downloadRequests)
          .where(eq(downloadRequests.status, 'queued'))
          .orderBy(asc(downloadRequests.requestedAt))
          .limit(slotsAvailable)
          .all();

        for (const queuedReq of queuedRequests) {
          try {
            let hash: string;
            if (queuedReq.torrentFilePath && fs.existsSync(queuedReq.torrentFilePath)) {
              const torrentBuffer = fs.readFileSync(queuedReq.torrentFilePath);
              hash = await this.qbittorrent.addTorrentFile(
                torrentBuffer,
                this.stagingPath,
                path.basename(queuedReq.torrentFilePath)
              );
              try {
                fs.unlinkSync(queuedReq.torrentFilePath);
              } catch (unlinkErr) {
                this.logger?.error(`Failed to delete temp torrent file ${queuedReq.torrentFilePath}:`, unlinkErr);
              }
            } else {
              hash = await this.qbittorrent.addTorrent(queuedReq.magnetLink, this.stagingPath);
            }

            this.db
              .update(downloadRequests)
              .set({
                status: 'downloading',
                qbTorrentHash: hash,
                torrentFilePath: null,
                deferredReason: null,
              })
              .where(eq(downloadRequests.id, queuedReq.id))
              .run();

            this.broadcast?.({
              type: 'status',
              requestId: queuedReq.id,
              status: 'downloading',
            });

            this.logger?.info(`Started queued request: ${queuedReq.title} (hash: ${hash})`);
          } catch (err) {
            this.logger?.error(`Failed to start queued request ${queuedReq.title}:`, err);
          }
        }
      }
    } catch (pollErr) {
      this.logger?.error('Error in DownloadPoller loop:', pollErr);
    } finally {
      this.isPolling = false;
    }
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.pollOnce().catch((err) => {
        this.logger?.error('Unhandled error in DownloadPoller interval:', err);
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}