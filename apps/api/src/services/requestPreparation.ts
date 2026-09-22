import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { AppDatabase } from '../db';
import { systemConfig, DownloadRequest } from '../db/schema';
import { RequestStatus } from './requestStateMachine';

export interface DiskSafetyCheckResult {
  sufficient: boolean;
  message?: string;
}

export function checkDiskSafety(cleanup: {
  isHostDiskSafe?: () => boolean;
  isSpaceSufficient?: () => { sufficient: boolean; percentFree: number; threshold: number };
}): DiskSafetyCheckResult {
  const hostDiskSafe = cleanup.isHostDiskSafe ? cleanup.isHostDiskSafe() : true;
  const space = cleanup.isSpaceSufficient
    ? cleanup.isSpaceSufficient()
    : { sufficient: true, percentFree: 100, threshold: 15 };

  if (!hostDiskSafe || !space.sufficient) {
    return {
      sufficient: false,
      message: !hostDiskSafe
        ? 'Insufficient host disk space (< 10 GB free)'
        : `Insufficient disk space (${space.percentFree}% free, minimum required is ${space.threshold}%)`,
    };
  }

  return { sufficient: true };
}

export async function isStorageQuotaExceeded(
  db: AppDatabase,
  fileSystem: { getStorageFootprintBytes?: () => Promise<number> }
): Promise<boolean> {
  const quotaRow = db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, 'storage_quota_gb'))
    .get();

  const storageQuotaGb = quotaRow
    ? parseInt(quotaRow.value, 10)
    : parseInt(process.env.STORAGE_QUOTA_GB || '150', 10);
  const storageQuotaBytes = storageQuotaGb * 1024 * 1024 * 1024;
  const currentFootprintBytes = fileSystem.getStorageFootprintBytes
    ? await fileSystem.getStorageFootprintBytes()
    : 0;

  return storageQuotaBytes > 0 && currentFootprintBytes / storageQuotaBytes >= 0.85;
}

export function getConcurrentLimit(db: AppDatabase): number {
  const configRow = db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, 'concurrent_limit'))
    .get();

  return configRow ? parseInt(configRow.value, 10) : 2;
}

export function stageTorrentFile(
  stagingPath: string,
  requestId: string,
  torrentBuffer: Buffer
): string {
  const torrentsDir = path.resolve(path.dirname(stagingPath), 'torrents');
  if (!fs.existsSync(torrentsDir)) {
    fs.mkdirSync(torrentsDir, { recursive: true });
  }

  const torrentFilePath = path.join(torrentsDir, `${requestId}.torrent`);
  fs.writeFileSync(torrentFilePath, torrentBuffer);
  return torrentFilePath;
}

export interface BuildInitialRequestParams {
  requestId: string;
  userId: string;
  effectiveMagnetLink: string;
  mediaType: 'movie' | 'tv_show' | 'anime' | 'private';
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  sizeBytes?: number | null;
  torrentFilePath?: string | null;
  deferredReason?: 'waiting_for_space' | 'waiting_for_slot' | null;
}

export function buildInitialDownloadRequest(params: BuildInitialRequestParams): DownloadRequest {
  return {
    id: params.requestId,
    userId: params.userId,
    magnetLink: params.effectiveMagnetLink,
    mediaType: params.mediaType,
    status: RequestStatus.QUEUED,
    metadataId: params.metadataId,
    metadataSource: params.metadataSource,
    title: params.title,
    year: params.year ?? null,
    seasonNumber: params.seasonNumber ?? null,
    episodeNumber: params.episodeNumber ?? null,
    jellyfinPath: null,
    keepFlag: params.mediaType === 'private',
    qbTorrentHash: null,
    errorMessage: null,
    requestedAt: new Date().toISOString(),
    downloadedAt: null,
    lastPlayedAt: null,
    scheduledDeleteAt: null,
    sizeBytes: params.sizeBytes ?? null,
    torrentFilePath: params.torrentFilePath ?? null,
    deferredReason: params.deferredReason ?? null,
    transcriptionStatus: 'none',
    transcriptionError: null,
  };
}
