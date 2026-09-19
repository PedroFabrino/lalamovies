import path from 'node:path';
import fs from 'node:fs';
import { eq, asc, and, ne, isNotNull, inArray } from 'drizzle-orm';
import { AppDatabase, downloadRequests, systemConfig, users } from '../db';
import { IQBittorrentService } from '../services/qbittorrent';
import { IFileSystemService } from '../services/fileSystem';
import { IJellyfinService } from '../services/jellyfin';
import { INotificationService } from '../services/notifications';
import { ISubtitleInspectionService } from '../services/subtitleInspection';

export interface PollerLogger {
  info: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface DownloadPollerOptions {
  db: AppDatabase;
  qbittorrent: IQBittorrentService;
  fileSystem: IFileSystemService;
  jellyfin: IJellyfinService;
  subtitleInspection?: ISubtitleInspectionService;
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
  private subtitleInspection?: ISubtitleInspectionService;
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
    this.subtitleInspection = options.subtitleInspection;
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
            this.logger?.info(`Torrent ${req.title} completed downloading. Transitioning to hardlinking.`);

            // Transition status to hardlinking
            this.db
              .update(downloadRequests)
              .set({ status: 'hardlinking' })
              .where(eq(downloadRequests.id, req.id))
              .run();

            // Locate source file or directory in Staging Area
            let files: Array<{ name: string; size: number }> = [];
            if (this.qbittorrent.getTorrentFiles) {
              try {
                files = await this.qbittorrent.getTorrentFiles(req.qbTorrentHash);
              } catch (err) {
                this.logger?.error(`Failed to get files for torrent ${req.qbTorrentHash}`, err);
              }
            }

            let sourceItem = path.join(this.stagingPath, torrentStatus.name);
            let isDirectory = false;
            let ext = path.extname(torrentStatus.name) || '.mkv';

            if (files.length > 0) {
              const videoExtensions = ['.mkv', '.mp4', '.avi', '.ts', '.mov', '.webm', '.m4v'];
              const videoFiles = files
                .filter((f) => videoExtensions.includes(path.extname(f.name).toLowerCase()))
                .sort((a, b) => b.size - a.size);

              const firstSegment = files[0].name.split('/')[0];
              const rootDir = path.join(this.stagingPath, firstSegment);

              if (req.mediaType === 'movie' || (req.mediaType === 'private' && req.seasonNumber == null && req.episodeNumber == null)) {
                if (videoFiles.length > 0) {
                  sourceItem = path.join(this.stagingPath, videoFiles[0].name);
                  ext = path.extname(videoFiles[0].name) || '.mkv';
                  isDirectory = false;
                } else if (fs.existsSync(rootDir) && fs.statSync(rootDir).isDirectory()) {
                  sourceItem = rootDir;
                  isDirectory = true;
                }
              } else {
                if (req.episodeNumber != null && videoFiles.length === 1) {
                  sourceItem = path.join(this.stagingPath, videoFiles[0].name);
                  ext = path.extname(videoFiles[0].name) || '.mkv';
                  isDirectory = false;
                } else if (fs.existsSync(rootDir) && fs.statSync(rootDir).isDirectory()) {
                  sourceItem = rootDir;
                  isDirectory = true;
                }
              }
            } else if (!fs.existsSync(sourceItem)) {
              const entries = fs.readdirSync(this.stagingPath);
              const cleanTorrentName = torrentStatus.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const matched = entries.find((e) => {
                const cleanEntry = e.toLowerCase().replace(/[^a-z0-9]/g, '');
                return cleanEntry.includes(cleanTorrentName) || cleanTorrentName.includes(cleanEntry);
              });
              if (matched) {
                sourceItem = path.join(this.stagingPath, matched);
                isDirectory = fs.statSync(sourceItem).isDirectory();
                ext = path.extname(matched) || '.mkv';
              }
            } else {
              isDirectory = fs.statSync(sourceItem).isDirectory();
            }

            if (!fs.existsSync(sourceItem)) {
              throw new Error(`Source file does not exist for hardlink: ${sourceItem}`);
            }

            // Check if existing requests for this series already established a show directory
            let existingShowFolder: string | undefined;
            let targetMediaType = req.mediaType;
            let effectiveTitle = req.title;

            if (['tv_show', 'anime'].includes(req.mediaType)) {
              try {
                const conditions = [
                  ne(downloadRequests.id, req.id),
                  ne(downloadRequests.status, 'deleted'),
                  inArray(downloadRequests.mediaType, ['tv_show', 'anime']),
                  isNotNull(downloadRequests.jellyfinPath),
                ];
                if (req.metadataId) {
                  conditions.push(eq(downloadRequests.metadataId, req.metadataId));
                }

                const existingSeries = this.db
                  .select({
                    jellyfinPath: downloadRequests.jellyfinPath,
                    mediaType: downloadRequests.mediaType,
                    title: downloadRequests.title,
                  })
                  .from(downloadRequests)
                  .where(and(...conditions))
                  .get();

                if (existingSeries?.jellyfinPath) {
                  const parts = existingSeries.jellyfinPath.split(/[\\/]/);
                  const animeIdx = parts.indexOf('anime');
                  const showsIdx = parts.indexOf('shows');
                  const targetIdx = animeIdx !== -1 ? animeIdx : showsIdx;
                  if (targetIdx !== -1 && parts[targetIdx + 1]) {
                    existingShowFolder = parts[targetIdx + 1];
                    targetMediaType = (animeIdx !== -1 ? 'anime' : 'tv_show') as 'anime' | 'tv_show';
                    effectiveTitle = existingSeries.title || existingShowFolder.replace(/\s*\(\d{4}\)$/, '').trim();
                  }
                }
              } catch {
                // Non-fatal
              }

              // If no existing series found in DB, check on disk across anime and shows
              if (!existingShowFolder) {
                try {
                  const mediaBase =
                    (this.fileSystem.getMediaBasePath ? this.fileSystem.getMediaBasePath() : null) ||
                    process.env.MEDIA_PATH ||
                    path.resolve(process.cwd(), 'media');
                  const cleanReqTitle = req.title.replace(/[<>:"/\\|?*]/g, '').trim();
                  const baseClean = cleanReqTitle.replace(/\s*-\s*\d+$/, '').trim() || cleanReqTitle;
                  const candidates = [req.year ? `${baseClean} (${req.year})` : baseClean, baseClean];
                  for (const folder of candidates) {
                    if (fs.existsSync(path.join(mediaBase, 'anime', folder))) {
                      existingShowFolder = folder;
                      targetMediaType = 'anime';
                      effectiveTitle = folder.replace(/\s*\(\d{4}\)$/, '').trim();
                      break;
                    }
                    if (fs.existsSync(path.join(mediaBase, 'shows', folder))) {
                      existingShowFolder = folder;
                      targetMediaType = 'tv_show';
                      effectiveTitle = folder.replace(/\s*\(\d{4}\)$/, '').trim();
                      break;
                    }
                  }
                } catch {
                  // Non-fatal
                }
              }
            }

            const destPath = this.fileSystem.buildLibraryPath({
              mediaType: targetMediaType,
              title: effectiveTitle,
              year: req.year,
              seasonNumber: req.seasonNumber,
              episodeNumber: req.episodeNumber,
              isSeasonPack: isDirectory || (targetMediaType !== 'movie' && !ext),
              ext,
              existingShowFolder,
            });

            // Perform Hardlink Move
            if (isDirectory) {
              this.fileSystem.hardlinkDirectory(sourceItem, destPath);
            } else {
              this.fileSystem.hardlink(sourceItem, destPath);
            }
            completedDestPath = destPath;

            // Hardlink subtitles for movies if available
            if (req.mediaType === 'movie' && !isDirectory && files.length > 0) {
              const subFiles = files.filter((f) => {
                const subExt = path.extname(f.name).toLowerCase();
                return subExt === '.srt' || subExt === '.vtt';
              });
              for (const sub of subFiles) {
                const subSrc = path.join(this.stagingPath, sub.name);
                if (fs.existsSync(subSrc)) {
                  const subExt = path.extname(sub.name);
                  const destDir = path.dirname(destPath);
                  const baseName = path.basename(destPath, path.extname(destPath));
                  const langMatch = sub.name.match(/\.([a-z]{2,3})\.(srt|vtt)$/i);
                  const subDest = langMatch
                    ? path.join(destDir, `${baseName}.${langMatch[1]}${subExt}`)
                    : path.join(destDir, `${baseName}${subExt}`);
                  try {
                    this.fileSystem.hardlink(subSrc, subDest);
                  } catch {
                    // non-fatal
                  }
                }
              }
            }

            // Subtitle inspection for private library
            let transcriptionStatus: 'none' | 'pending' = 'none';
            if (req.mediaType === 'private') {
              if (this.subtitleInspection) {
                try {
                  const inspection = await this.subtitleInspection.inspect(destPath);
                  transcriptionStatus = inspection.hasSubtitles ? 'none' : 'pending';
                } catch (err) {
                  this.logger?.error(`Subtitle inspection failed for ${destPath}`, err);
                  transcriptionStatus = 'pending';
                }
              } else {
                transcriptionStatus = 'pending';
              }
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
                transcriptionStatus,
                mediaType: targetMediaType,
                title: effectiveTitle,
              })
              .where(eq(downloadRequests.id, req.id))
              .run();

            this.broadcast?.({
              type: 'status',
              requestId: req.id,
              status: 'seeding',
              transcriptionStatus,
            });

            if (this.notificationService) {
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

              await this.notificationService.send('download.completed', {
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
                  process.env.JELLYFIN_PUBLIC_URL ||
                  (process.env.JELLYFIN_DOMAIN ? `https://${process.env.JELLYFIN_DOMAIN}` : undefined) ||
                  process.env.JELLYFIN_URL ||
                  undefined,
              });
            }

            this.logger?.info(`Torrent ${req.title} successfully hardlinked to ${destPath} and set to seeding.`);
          }
        } catch (itemErr) {
          this.logger?.error(`Error processing download completion for ${req.title}:`, itemErr);
          const errorUpdate: Record<string, unknown> = {
            status: 'error',
            errorMessage: (itemErr as Error).message || 'Failed to complete download processing',
          };
          if (completedDestPath && fs.existsSync(completedDestPath)) {
            errorUpdate.jellyfinPath = completedDestPath;
          }
          this.db
            .update(downloadRequests)
            .set(errorUpdate)
            .where(eq(downloadRequests.id, req.id))
            .run();

          this.broadcast?.({
            type: 'status',
            requestId: req.id,
            status: 'error',
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
          .where(eq(downloadRequests.status, 'queued'))
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
          .where(eq(downloadRequests.status, 'queued'))
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