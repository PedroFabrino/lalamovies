import path from 'node:path';
import fs from 'node:fs';
import { eq, inArray } from 'drizzle-orm';
import { AppDatabase, downloadRequests, users } from '../db';
import { IUnarchiveService, UnarchiveService } from '../services/unarchive';
import { IFileSystemService } from '../services/fileSystem';
import { IJellyfinService } from '../services/jellyfin';
import { IQBittorrentService } from '../services/qbittorrent';
import { ISubtitleInspectionService } from '../services/subtitleInspection';
import { INotificationService } from '../services/notifications';
import { IRequestStateMachine, RequestStateMachine, RequestStatus } from '../services/requestStateMachine';
import { RequestsRepository } from '../services/requestsRepository';
import { PollerLogger } from './downloadPoller';

export interface UnarchiveDaemonOptions {
  db: AppDatabase;
  unarchiveService: IUnarchiveService;
  fileSystem: IFileSystemService;
  jellyfin: IJellyfinService;
  stateMachine?: IRequestStateMachine;
  qbittorrent?: IQBittorrentService;
  subtitleInspection?: ISubtitleInspectionService;
  notificationService?: INotificationService;
  stagingPath?: string;
  intervalMs?: number;
  logger?: PollerLogger;
  broadcast?: (msg: object) => void;
}

export class UnarchiveDaemon {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private db: AppDatabase;
  private unarchiveService: IUnarchiveService;
  private fileSystem: IFileSystemService;
  private jellyfin: IJellyfinService;
  private stateMachine: IRequestStateMachine;
  private qbittorrent?: IQBittorrentService;
  private subtitleInspection?: ISubtitleInspectionService;
  private notificationService?: INotificationService;
  private stagingPath: string;
  private intervalMs: number;
  private logger?: PollerLogger;
  private broadcast?: (msg: object) => void;

  constructor(options: UnarchiveDaemonOptions) {
    this.db = options.db;
    this.unarchiveService = options.unarchiveService;
    this.fileSystem = options.fileSystem;
    this.jellyfin = options.jellyfin;
    this.stateMachine =
      options.stateMachine ||
      new RequestStateMachine(
        new RequestsRepository(options.db),
        options.broadcast,
        options.jellyfin,
        options.notificationService
      );
    this.qbittorrent = options.qbittorrent;
    this.subtitleInspection = options.subtitleInspection;
    this.notificationService = options.notificationService;
    this.stagingPath = options.stagingPath || process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads/staging');
    this.intervalMs = options.intervalMs || 5000;
    this.logger = options.logger;
    this.broadcast = options.broadcast;
  }

  private extractDnFromMagnet(magnet?: string | null): string | null {
    if (!magnet) return null;
    const match = magnet.match(/[?&]dn=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async processRequest(reqId: string): Promise<void> {
    const req = this.db
      .select()
      .from(downloadRequests)
      .where(eq(downloadRequests.id, reqId))
      .get();

    if (!req) return;

    let torrentName: string | undefined;
    if (req.qbTorrentHash && this.qbittorrent) {
      try {
        const torrentStatus = await this.qbittorrent.getTorrentStatus(req.qbTorrentHash);
        if (torrentStatus) {
          torrentName = torrentStatus.name;
        }
      } catch (err) {
        this.logger?.error(`Failed to get torrent status for hash ${req.qbTorrentHash}`, err);
      }
    }

    const disambiguatorCandidate = torrentName || this.extractDnFromMagnet(req.magnetLink) || req.title;

    // Locate archive file in staging area
    let archiveFile: string | null = null;

    // Check directory matching torrent name
    if (torrentName) {
      const torrentDir = path.join(this.stagingPath, torrentName);
      if (fs.existsSync(torrentDir)) {
        if (fs.statSync(torrentDir).isDirectory()) {
          const files = fs.readdirSync(torrentDir);
          const found = this.unarchiveService.findHeadArchive(files);
          if (found) {
            archiveFile = path.join(torrentDir, found);
          }
        } else if (this.unarchiveService.isArchiveFile(torrentDir)) {
          archiveFile = torrentDir;
        }
      }
    }

    // Check disambiguator folder if still not found
    if (!archiveFile && disambiguatorCandidate) {
      const candidateDir = path.join(this.stagingPath, disambiguatorCandidate);
      if (fs.existsSync(candidateDir)) {
        if (fs.statSync(candidateDir).isDirectory()) {
          const files = fs.readdirSync(candidateDir);
          const found = this.unarchiveService.findHeadArchive(files);
          if (found) {
            archiveFile = path.join(candidateDir, found);
          }
        } else if (this.unarchiveService.isArchiveFile(candidateDir)) {
          archiveFile = candidateDir;
        }
      }
    }

    // Check staging root for matches
    if (!archiveFile && fs.existsSync(this.stagingPath)) {
      const entries = fs.readdirSync(this.stagingPath);
      const cleanTarget = disambiguatorCandidate.toLowerCase().replace(/[^a-z0-9]/g, '');

      for (const entry of entries) {
        const cleanEntry = entry.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanEntry.includes(cleanTarget) || cleanTarget.includes(cleanEntry)) {
          const entryPath = path.join(this.stagingPath, entry);
          if (fs.statSync(entryPath).isDirectory()) {
            const subEntries = fs.readdirSync(entryPath);
            const found = this.unarchiveService.findHeadArchive(subEntries);
            if (found) {
              archiveFile = path.join(entryPath, found);
              break;
            }
          } else if (this.unarchiveService.isArchiveFile(entryPath)) {
            archiveFile = entryPath;
            break;
          }
        }
      }
    }

    if (!archiveFile || !fs.existsSync(archiveFile)) {
      throw new Error(`Archive file not found in staging area for request ${req.title} (${req.id})`);
    }

    const extractAndDeploy =
      typeof this.unarchiveService.extractAndDeployMedia === 'function'
        ? this.unarchiveService.extractAndDeployMedia.bind(this.unarchiveService)
        : UnarchiveService.prototype.extractAndDeployMedia.bind(this.unarchiveService);

    const destPath = await extractAndDeploy(archiveFile, req, {
      fileSystem: this.fileSystem,
      stagingPath: this.stagingPath,
      disambiguator:
        req.mediaType === 'private' && req.seasonNumber == null && req.episodeNumber == null
          ? disambiguatorCandidate
          : undefined,
      logger: this.logger,
    });

    const sizeBytes = fs.existsSync(destPath) ? fs.statSync(destPath).size : (req.sizeBytes ?? 0);

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
        sizeBytes,
        transcriptionStatus,
        errorMessage: null,
      },
      extraBroadcastFields: {
        transcriptionStatus,
      },
      sendNotification: this.notificationService ? 'download.completed' : undefined,
      notificationPayload: this.notificationService
        ? {
            title: req.title,
            requestId: req.id,
            mediaType: req.mediaType,
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

    this.logger?.info(`Successfully unarchived ${req.title} to ${destPath}`);
  }

  async processOnce(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const unarchivingRequests = this.db
        .select()
        .from(downloadRequests)
        .where(eq(downloadRequests.status, RequestStatus.UNARCHIVING))
        .all();

      for (const req of unarchivingRequests) {
        try {
          await this.processRequest(req.id);
        } catch (itemErr) {
          this.logger?.error(`Error unarchiving request ${req.title} (${req.id}):`, itemErr);
          await this.stateMachine.transition(req.id, RequestStatus.ERROR, {
            extraFields: {
              errorMessage: (itemErr as Error).message || 'Unarchiving failed',
            },
          });
        }
      }
    } catch (err) {
      this.logger?.error('Error in UnarchiveDaemon loop:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processOnce().catch((err) => {
        this.logger?.error('Unhandled error in UnarchiveDaemon interval:', err);
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
