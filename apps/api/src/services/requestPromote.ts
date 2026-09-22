import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DownloadRequest } from '../db/schema';
import { IRequestsRepository } from './requestsRepository';
import { IRequestStateMachine, RequestStatus } from './requestStateMachine';
import { IFileSystemService } from './fileSystem';
import { PromoteStreamInput, PromoteStreamResult } from './requestServiceTypes';

export interface ExecutePromoteParams {
  input: PromoteStreamInput;
  requestsRepo: IRequestsRepository;
  stateMachine: IRequestStateMachine;
  fileSystem: IFileSystemService;
  logger: {
    warn: (msg: string | object, ...args: unknown[]) => void;
  };
}

export async function executePromoteFromStream(params: ExecutePromoteParams): Promise<PromoteStreamResult> {
  const { input, requestsRepo, stateMachine, fileSystem, logger } = params;
  const requestId = randomUUID();
  const now = new Date().toISOString();

  const ext = path.extname(input.stagingPath) || '.mkv';
  let destPath = '';
  try {
    destPath = fileSystem.buildLibraryPath({
      mediaType: input.mediaType,
      title: input.title,
      year: input.year,
      seasonNumber: input.seasonNumber,
      episodeNumber: input.episodeNumber,
      ext,
    });

    if (fs.existsSync(input.stagingPath)) {
      await fileSystem.hardlink(input.stagingPath, destPath);
    }
  } catch (err) {
    logger.warn(err as object, 'Failed to hardlink stream promotion file');
  }

  const initialRequest: DownloadRequest = {
    id: requestId,
    userId: input.userId,
    magnetLink: 'promoted-from-stream',
    mediaType: input.mediaType,
    status: RequestStatus.SEEDING,
    metadataId: input.metadataId,
    metadataSource: input.metadataSource,
    title: input.title,
    year: input.year ?? null,
    seasonNumber: input.seasonNumber ?? null,
    episodeNumber: input.episodeNumber ?? null,
    jellyfinPath: destPath || null,
    keepFlag: false,
    qbTorrentHash: null,
    errorMessage: null,
    requestedAt: now,
    downloadedAt: now,
    lastPlayedAt: null,
    scheduledDeleteAt: null,
    sizeBytes: input.sizeBytes ?? null,
    torrentFilePath: null,
    deferredReason: null,
    transcriptionStatus: 'none',
    transcriptionError: null,
  };

  requestsRepo.create(initialRequest);

  try {
    await stateMachine.transition(requestId, RequestStatus.DONE, {
      refreshJellyfin: true,
      broadcast: true,
    });
  } catch (transitionErr) {
    logger.warn(transitionErr as object, 'State machine transition for promoted stream encountered non-fatal error');
  }

  return {
    requestId,
    jellyfinPath: destPath,
    status: 'completed',
  };
}
