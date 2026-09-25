import fs from 'node:fs';
import path from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import { AppDatabase, systemConfig, users } from '../db';
import { IRequestsRepository } from './requestsRepository';
import { IQBittorrentService } from './qbittorrent';
import { IFileSystemService } from './fileSystem';
import { IRequestStateMachine, RequestStatus } from './requestStateMachine';

export function resolvePollerNotificationRecipients(
  db: AppDatabase,
  req: { userId: string | null; mediaType: string }
): { requestedBy?: string; recipientEmails?: string[] } {
  let requestedBy: string | undefined;
  let reqUserEmail: string | null | undefined;
  if (req.userId) {
    const reqUser = db
      .select({ username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, req.userId))
      .get();
    requestedBy = reqUser?.username;
    reqUserEmail = reqUser?.email;
  }

  let recipientEmails: string[] | undefined;
  if (req.mediaType === 'private') {
    const recipients = db
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

  return { requestedBy, recipientEmails };
}

export interface PollerLogger {
  info: (msg: string) => void;
  warn?: (msg: string) => void;
  error: (msg: string, err?: unknown) => void;
}

export interface QueuePromoterOptions {
  db: AppDatabase;
  requestsRepo: IRequestsRepository;
  qbittorrent: IQBittorrentService;
  fileSystem: IFileSystemService;
  stateMachine: IRequestStateMachine;
  stagingPath: string;
  logger?: PollerLogger;
}

export async function promoteQueuedRequests(options: QueuePromoterOptions): Promise<void> {
  const { db, requestsRepo, qbittorrent, fileSystem, stateMachine, stagingPath, logger } = options;

  const quotaRow = db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, 'storage_quota_gb'))
    .get();

  const storageQuotaGb = quotaRow ? parseInt(quotaRow.value, 10) : parseInt(process.env.STORAGE_QUOTA_GB || '150', 10);
  const storageQuotaBytes = storageQuotaGb * 1024 * 1024 * 1024;
  const currentFootprintBytes = fileSystem.getStorageFootprintBytes ? await fileSystem.getStorageFootprintBytes() : 0;

  const quotaCapBytes = storageQuotaBytes > 0 ? Math.floor(storageQuotaBytes * 0.85) : Infinity;
  let availableHeadroom = quotaCapBytes === Infinity ? Infinity : Math.max(0, quotaCapBytes - currentFootprintBytes);

  const configRow = db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, 'concurrent_limit'))
    .get();

  const concurrentLimit = configRow ? parseInt(configRow.value, 10) : 2;
  const activeCount = await qbittorrent.getActiveTorrentCount();
  let slotsAvailable = Math.max(0, concurrentLimit - activeCount);

  if (availableHeadroom <= 0) {
    const queuedItems = requestsRepo.findByStatus(RequestStatus.QUEUED);
    for (const item of queuedItems) {
      if (item.deferredReason !== 'waiting_for_space') {
        requestsRepo.update(item.id, { deferredReason: 'waiting_for_space' });
      }
    }
  } else if (slotsAvailable > 0) {
    const queuedRequests = requestsRepo.findByStatus(RequestStatus.QUEUED, 'requestedAtAsc');

    for (const queuedReq of queuedRequests) {
      if (slotsAvailable <= 0) break;

      const reqSize = queuedReq.sizeBytes ?? 0;

      if (reqSize > availableHeadroom) {
        if (queuedReq.deferredReason !== 'waiting_for_space') {
          requestsRepo.update(queuedReq.id, { deferredReason: 'waiting_for_space' });
        }
        continue;
      }

      try {
        let hash: string;
        if (queuedReq.torrentFilePath && fs.existsSync(queuedReq.torrentFilePath)) {
          const torrentBuffer = fs.readFileSync(queuedReq.torrentFilePath);
          hash = await qbittorrent.addTorrentFile(
            torrentBuffer,
            stagingPath,
            path.basename(queuedReq.torrentFilePath)
          );
          try {
            fs.unlinkSync(queuedReq.torrentFilePath);
          } catch (unlinkErr) {
            logger?.error(`Failed to delete temp torrent file ${queuedReq.torrentFilePath}:`, unlinkErr);
          }
        } else {
          hash = await qbittorrent.addTorrent(queuedReq.magnetLink, stagingPath);
        }

        await stateMachine.transition(queuedReq.id, RequestStatus.DOWNLOADING, {
          extraFields: {
            qbTorrentHash: hash,
            torrentFilePath: null,
            deferredReason: null,
          },
        });

        logger?.info(`Started queued request: ${queuedReq.title} (hash: ${hash})`);

        if (availableHeadroom !== Infinity) {
          availableHeadroom -= reqSize;
        }
        slotsAvailable--;
      } catch (err) {
        logger?.error(`Failed to start queued request ${queuedReq.title}:`, err);
      }
    }
  }
}
