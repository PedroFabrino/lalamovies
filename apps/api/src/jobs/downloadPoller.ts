import path from 'node:path';
import fs from 'node:fs';
import { AppDatabase, DownloadRequest } from '../db';
import { IQBittorrentService } from '../services/qbittorrent';
import { IFileSystemService } from '../services/fileSystem';
import { IJellyfinService } from '../services/jellyfin';
import { INotificationService } from '../services/notifications';
import { ISubtitleInspectionService } from '../services/subtitleInspection';
import { OpenSubtitlesService } from '../services/openSubtitles';
import { IUnarchiveService, UnarchiveService } from '../services/unarchive';
import { IRequestStateMachine, RequestStateMachine, RequestStatus } from '../services/requestStateMachine';
import { IRequestsRepository, RequestsRepository } from '../services/requestsRepository';
import { IEpisodesRepository, EpisodesRepository } from '../services/episodesRepository';
import { promoteQueuedRequests, resolvePollerNotificationRecipients } from '../services/queuePromoter';

export type PollerLogger = {
  info: (msg: string) => void;
  warn?: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
};

export interface DownloadPollerOptions {
  db: AppDatabase;
  requestsRepo?: IRequestsRepository;
  episodesRepo?: IEpisodesRepository;
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
  private requestsRepo: IRequestsRepository;
  private episodesRepo: IEpisodesRepository;
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
    this.requestsRepo = options.requestsRepo || new RequestsRepository(options.db);
    this.episodesRepo = options.episodesRepo || new EpisodesRepository(options.db);
    this.qbittorrent = options.qbittorrent;
    this.fileSystem = options.fileSystem;
    this.jellyfin = options.jellyfin;
    this.unarchiveService = options.unarchiveService || new UnarchiveService();
    this.stateMachine =
      options.stateMachine ||
      new RequestStateMachine(
        this.requestsRepo,
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
      const activeRequests = this.requestsRepo.findByStatus(RequestStatus.DOWNLOADING);

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
                this.requestsRepo.update(req.id, { qbTorrentHash: matched.hash });
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
                  } catch (readErr) {
                    this.logger?.warn?.(
                      `Failed to read staging directory ${torrentDir}: ${(readErr as Error).message}`
                    );
                    continue;
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

            const existingShowFolder = this.requestsRepo.findExistingSeriesFolder({
              metadataId: req.metadataId,
              mediaType: req.mediaType,
              excludeRequestId: req.id,
            });

            const result = await this.fileSystem.processAndHardlinkTorrent({
              request: req,
              torrentStatus,
              files,
              stagingPath: this.stagingPath,
              existingShowFolder,
              subtitleInspection: this.subtitleInspection,
              logger: this.logger,
            });

            const { destPath, isDirectory, transcriptionStatus, targetMediaType, effectiveTitle, episodes } = result;
            completedDestPath = destPath;

            if (episodes && episodes.length > 0) {
              for (const ep of episodes) {
                const epId = `${req.id}-s${ep.seasonNumber}e${ep.episodeNumber}`;
                const existing = this.episodesRepo.findById(epId);
                if (!existing) {
                  this.episodesRepo.create({
                    id: epId,
                    requestId: req.id,
                    seasonNumber: ep.seasonNumber,
                    episodeNumber: ep.episodeNumber,
                    fileIndex: ep.fileIndex,
                    relativePath: ep.relativePath,
                    jellyfinPath: ep.jellyfinPath,
                    sizeBytes: ep.sizeBytes,
                    status: 'downloaded',
                    keepFlag: false,
                    lastPlayedAt: null,
                    prunedAt: null,
                  });
                }
              }
            }


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

            const { requestedBy, recipientEmails } = resolvePollerNotificationRecipients(this.db, req);

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
      await promoteQueuedRequests({
        db: this.db,
        requestsRepo: this.requestsRepo,
        qbittorrent: this.qbittorrent,
        fileSystem: this.fileSystem,
        stateMachine: this.stateMachine,
        stagingPath: this.stagingPath,
        logger: this.logger,
      });
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