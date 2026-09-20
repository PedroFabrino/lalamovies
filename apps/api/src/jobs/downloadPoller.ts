import path from 'node:path';
import fs from 'node:fs';
import { eq, asc, and, ne, isNotNull, inArray } from 'drizzle-orm';
import { AppDatabase, downloadRequests, DownloadRequest, systemConfig, users } from '../db';
import { IQBittorrentService } from '../services/qbittorrent';
import { IFileSystemService, FileSystemService } from '../services/fileSystem';
import { IJellyfinService } from '../services/jellyfin';
import { INotificationService } from '../services/notifications';
import { ISubtitleInspectionService } from '../services/subtitleInspection';
import { OpenSubtitlesService } from '../services/openSubtitles';
import { IUnarchiveService, UnarchiveService } from '../services/unarchive';
import { IRequestStateMachine, RequestStateMachine, RequestStatus } from '../services/requestStateMachine';
import { RequestsRepository } from '../services/requestsRepository';

export type PollerLogger = {
  info: (msg: string) => void;
  warn?: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
};

export interface DownloadPollerOptions {
  db: AppDatabase;
  qbittorrent: IQBittorrentService;
  fileSystem: IFileSystemService;
  jellyfin: IJellyfinService;
  stateMachine?: IRequestStateMachine;
  subtitleInspection?: ISubtitleInspectionService;
  openSubtitles?: OpenSubtitlesService;
  notificationService?: INotificationService;
  unarchiveService?: IUnarchiveService;
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
  private unarchiveService: IUnarchiveService;
  private stateMachine: IRequestStateMachine;
  private subtitleInspection?: ISubtitleInspectionService;
  private openSubtitles?: OpenSubtitlesService;
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
    this.unarchiveService = options.unarchiveService || new UnarchiveService();
    this.stateMachine =
      options.stateMachine ||
      new RequestStateMachine(
        new RequestsRepository(options.db),
        options.broadcast,
        options.jellyfin,
        options.notificationService
      );
    this.subtitleInspection = options.subtitleInspection;
    this.openSubtitles = options.openSubtitles;
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
        .where(eq(downloadRequests.status, RequestStatus.DOWNLOADING))
        .all();

      for (const req of activeRequests) {
        if (!req.qbTorrentHash) {
          if (this.qbittorrent.getAllTorrents) {
            try {
              const allTorrents = await this.qbittorrent.getAllTorrents();
              const reqCleanTitle = req.title.toLowerCase().replace(/[^a-z0-9]/g, '');
              const matched = allTorrents.find((t) => {
                const tCleanName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return tCleanName.includes(reqCleanTitle) || reqCleanTitle.includes(tCleanName);
              });

              if (matched) {
                this.logger?.info(
                  `Self-healed orphan download request ${req.title} (${req.id}) with hash ${matched.hash}`
                );
                this.db
                  .update(downloadRequests)
                  .set({ qbTorrentHash: matched.hash })
                  .where(eq(downloadRequests.id, req.id))
                  .run();
                req.qbTorrentHash = matched.hash;
              } else {
                continue;
              }
            } catch (err) {
              this.logger?.error(`Failed to reconcile missing qbTorrentHash for ${req.id}`, err);
              continue;
            }
          } else {
            continue;
          }
        }

        let completedDestPath: string | null = null;
        try {
          const torrentStatus = await this.qbittorrent.getTorrentStatus(req.qbTorrentHash);
          if (!torrentStatus) continue;

          const isCompleted =
            torrentStatus.progress >= 1 ||
            ['uploading', 'pausedUP', 'queuedUP', 'stalledUP', 'forcedUP', 'completed'].includes(
              torrentStatus.state
            );

          if (isCompleted) {
            // Locate source file or directory in Staging Area
            let files: Array<{ name: string; size: number }> = [];
            if (this.qbittorrent.getTorrentFiles) {
              try {
                files = await this.qbittorrent.getTorrentFiles(req.qbTorrentHash);
              } catch (err) {
                this.logger?.error(`Failed to get files for torrent ${req.qbTorrentHash}`, err);
              }
            }

            if (files.length === 0) {
              const torrentDir = path.join(this.stagingPath, torrentStatus.name);
              if (fs.existsSync(torrentDir)) {
                if (fs.statSync(torrentDir).isDirectory()) {
                  try {
                    const entries = fs.readdirSync(torrentDir);
                    files = entries.map((e) => ({
                      name: path.join(torrentStatus.name, e),
                      size: fs.statSync(path.join(torrentDir, e)).size,
                    }));
                  } catch {
                    // ignore
                  }
                } else {
                  files = [{ name: torrentStatus.name, size: torrentStatus.size }];
                }
              }
            }

            if (this.unarchiveService.isArchiveOnly(files)) {
              this.logger?.info(
                `Torrent ${req.title} (${req.id}) contains only compressed archives. Handing off to unarchive daemon.`
              );
              await this.stateMachine.transition(req.id, RequestStatus.UNARCHIVING, {
                extraFields: {
                  sizeBytes: torrentStatus.size,
                },
              });
              continue;
            }

            this.logger?.info(`Torrent ${req.title} completed downloading. Transitioning to hardlinking.`);

            // Transition status to hardlinking
            await this.stateMachine.transition(req.id, RequestStatus.HARDLINKING);

            const processAndHardlink =
              typeof this.fileSystem.processAndHardlinkTorrent === 'function'
                ? this.fileSystem.processAndHardlinkTorrent.bind(this.fileSystem)
                : FileSystemService.prototype.processAndHardlinkTorrent.bind(this.fileSystem);

            const result = await processAndHardlink({
              request: req,
              torrentStatus,
              files,
              stagingPath: this.stagingPath,
              db: this.db,
              subtitleInspection: this.subtitleInspection,
              logger: this.logger,
            });

            const { destPath, isDirectory, transcriptionStatus, targetMediaType, effectiveTitle } = result;
            completedDestPath = destPath;


            // Auto-fetch subtitle from OpenSubtitles (fire-and-forget)
            if (
              this.openSubtitles &&
              this.openSubtitles.isConfigured() &&
              req.mediaType !== 'private' &&
              !isDirectory
            ) {
              const subtitleDestPath = destPath.replace(/\.[a-zA-Z0-9]{2,4}$/, '.pt-BR.srt');
              this.openSubtitles
                .fetchBest(
                  {
                    tmdbId: req.metadataSource === 'tmdb' ? req.metadataId : undefined,
                    title: effectiveTitle,
                    year: req.year,
                    seasonNumber: req.seasonNumber,
                    episodeNumber: req.episodeNumber,
                  },
                  subtitleDestPath
                )
                .then(async (fetched) => {
                  if (fetched && this.jellyfin.refreshLibrary) {
                    await this.jellyfin.refreshLibrary();
                  }
                })
                .catch((err) => {
                  this.logger?.warn?.(
                    `Auto-fetch subtitle failed for ${req.id}: ${(err as Error).message}`
                  );
                });
            }

            let requestedBy: string | undefined;
            let reqUserEmail: string | null | undefined;
            if (req.userId) {
              const reqUser = this.db
                .select({ username: users.username, email: users.email })
                .from(users)
                .where(eq(users.id, req.userId))
                .get();
              requestedBy = reqUser?.username;
              reqUserEmail = reqUser?.email;
            }

            let recipientEmails: string[] | undefined;
            if (req.mediaType === 'private') {
              const recipients = this.db
                .select({ email: users.email })
                .from(users)
                .where(inArray(users.role, ['admin', 'trusted']))
                .all();
              const allEmails = recipients
                .map((r) => r.email)
                .filter((e): e is string => Boolean(e));
              if (reqUserEmail && !allEmails.includes(reqUserEmail)) {
                allEmails.push(reqUserEmail);
              }
              recipientEmails = allEmails;
            }

            await this.stateMachine.transition(req.id, RequestStatus.SEEDING, {
              refreshJellyfin: true,
              extraFields: {
                jellyfinPath: destPath,
                downloadedAt: new Date().toISOString(),
                sizeBytes: torrentStatus.size,
                transcriptionStatus,
                mediaType: targetMediaType,
                title: effectiveTitle,
              },
              extraBroadcastFields: {
                transcriptionStatus,
              },
              sendNotification: this.notificationService ? 'download.completed' : undefined,
              notificationPayload: this.notificationService
                ? {
                    title: effectiveTitle,
                    requestId: req.id,
                    mediaType: targetMediaType,
                    year: req.year,
                    seasonNumber: req.seasonNumber,
                    episodeNumber: req.episodeNumber,
                    requestedBy,
                    recipientEmails,
                    path: destPath,
                    jellyfinUrl:
                      typeof this.jellyfin.getPublicJellyfinUrl === 'function'
                        ? this.jellyfin.getPublicJellyfinUrl()
                        : undefined,
                  }
                : undefined,
            });

            this.logger?.info(`Torrent ${req.title} successfully hardlinked to ${destPath} and set to seeding.`);
          }
        } catch (itemErr) {
          this.logger?.error(`Error processing download completion for ${req.title}:`, itemErr);
          const errorUpdate: Partial<Omit<DownloadRequest, 'id' | 'status'>> = {
            errorMessage: (itemErr as Error).message || 'Failed to complete download processing',
          };
          if (completedDestPath && fs.existsSync(completedDestPath)) {
            errorUpdate.jellyfinPath = completedDestPath;
          }
          await this.stateMachine.transition(req.id, RequestStatus.ERROR, {
            extraFields: errorUpdate,
          });
        }
      }

      // 2. Check for queued items to start if quota headroom and concurrent limit allow
      const quotaRow = this.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'storage_quota_gb'))
        .get();

      const storageQuotaGb = quotaRow ? parseInt(quotaRow.value, 10) : parseInt(process.env.STORAGE_QUOTA_GB || '150', 10);
      const storageQuotaBytes = storageQuotaGb * 1024 * 1024 * 1024;
      const currentFootprintBytes = this.fileSystem.getStorageFootprintBytes ? this.fileSystem.getStorageFootprintBytes() : 0;

      const quotaCapBytes = storageQuotaBytes > 0 ? Math.floor(storageQuotaBytes * 0.85) : Infinity;
      let availableHeadroom = quotaCapBytes === Infinity ? Infinity : Math.max(0, quotaCapBytes - currentFootprintBytes);

      const configRow = this.db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'concurrent_limit'))
        .get();

      const concurrentLimit = configRow ? parseInt(configRow.value, 10) : 2;
      const activeCount = await this.qbittorrent.getActiveTorrentCount();
      let slotsAvailable = Math.max(0, concurrentLimit - activeCount);

      if (availableHeadroom <= 0) {
        // Quota usage >= 85%, cannot promote any requests; mark non-deferred items as waiting_for_space
        const queuedItems = this.db
          .select({ id: downloadRequests.id, deferredReason: downloadRequests.deferredReason })
          .from(downloadRequests)
          .where(eq(downloadRequests.status, RequestStatus.QUEUED))
          .all();

        for (const item of queuedItems) {
          if (item.deferredReason !== 'waiting_for_space') {
            this.db
              .update(downloadRequests)
              .set({ deferredReason: 'waiting_for_space' })
              .where(eq(downloadRequests.id, item.id))
              .run();
          }
        }
      } else if (slotsAvailable > 0) {
        // Query all queued requests in FIFO order
        const queuedRequests = this.db
          .select()
          .from(downloadRequests)
          .where(eq(downloadRequests.status, RequestStatus.QUEUED))
          .orderBy(asc(downloadRequests.requestedAt))
          .all();

        for (const queuedReq of queuedRequests) {
          if (slotsAvailable <= 0) break;

          const reqSize = queuedReq.sizeBytes ?? 0;

          // Greedy Best-Fit: if item exceeds remaining headroom, skip it and continue checking smaller items
          if (reqSize > availableHeadroom) {
            if (queuedReq.deferredReason !== 'waiting_for_space') {
              this.db
                .update(downloadRequests)
                .set({ deferredReason: 'waiting_for_space' })
                .where(eq(downloadRequests.id, queuedReq.id))
                .run();
            }
            continue;
          }

          // Item fits within available headroom and slot available! Promote to downloading
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

            await this.stateMachine.transition(queuedReq.id, RequestStatus.DOWNLOADING, {
              extraFields: {
                qbTorrentHash: hash,
                torrentFilePath: null,
                deferredReason: null,
              },
            });

            this.logger?.info(`Started queued request: ${queuedReq.title} (hash: ${hash})`);

            if (availableHeadroom !== Infinity) {
              availableHeadroom -= reqSize;
            }
            slotsAvailable--;
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