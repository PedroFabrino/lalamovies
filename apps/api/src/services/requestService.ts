import path from 'node:path';
import { AppDatabase } from '../db';
import { IRequestsRepository } from './requestsRepository';
import { IRequestStateMachine } from './requestStateMachine';
import { ICleanupService } from './cleanup';
import { IFileSystemService } from './fileSystem';
import { IQBittorrentService } from './qbittorrent';
import { IJellyfinService } from './jellyfin';
import { INotificationService } from './notifications';
import { ISubtitleInspectionService } from './subtitleInspection';
import { executeCreateRequest } from './requestCreate';
import { executeBatchRequests } from './requestBatch';
import { executeRetryRequest } from './requestRetry';
import { executePromoteFromStream } from './requestPromote';
import { executeReplaceTorrent } from './requestReplaceTorrent';
import {
  IRequestService,
  CreateRequestInput,
  CreateRequestResult,
  BatchRequestInput,
  BatchRequestResult,
  RetryRequestResult,
  PromoteStreamInput,
  PromoteStreamResult,
  ReplaceTorrentInput,
  ReplaceTorrentResult,
} from './requestServiceTypes';

export interface RequestServiceOptions {
  db: AppDatabase;
  requestsRepo: IRequestsRepository;
  stateMachine: IRequestStateMachine;
  cleanup: ICleanupService;
  fileSystem: IFileSystemService;
  qbittorrent: IQBittorrentService;
  jellyfin: IJellyfinService;
  notifications?: INotificationService;
  subtitleInspection?: ISubtitleInspectionService;
  stagingPath?: string;
  watcherUrl?: string | (() => string | undefined);
  serviceApiKey?: string | (() => string | undefined);
  logger?: {
    warn: (msg: string | object, ...args: unknown[]) => void;
    error: (msg: string | object, ...args: unknown[]) => void;
  };
}

export class RequestService implements IRequestService {
  private db: AppDatabase;
  private requestsRepo: IRequestsRepository;
  private stateMachine: IRequestStateMachine;
  private cleanup: ICleanupService;
  private fileSystem: IFileSystemService;
  private qbittorrent: IQBittorrentService;
  private jellyfin: IJellyfinService;
  private notifications?: INotificationService;
  private subtitleInspection?: ISubtitleInspectionService;
  private stagingPath: string;
  private watcherUrl?: string | (() => string | undefined);
  private serviceApiKey?: string | (() => string | undefined);
  private logger: {
    warn: (msg: string | object, ...args: unknown[]) => void;
    error: (msg: string | object, ...args: unknown[]) => void;
  };

  constructor(options: RequestServiceOptions) {
    this.db = options.db;
    this.requestsRepo = options.requestsRepo;
    this.stateMachine = options.stateMachine;
    this.cleanup = options.cleanup;
    this.fileSystem = options.fileSystem;
    this.qbittorrent = options.qbittorrent;
    this.jellyfin = options.jellyfin;
    this.notifications = options.notifications;
    this.subtitleInspection = options.subtitleInspection;
    this.stagingPath = options.stagingPath || process.env.STAGING_PATH || path.resolve(process.cwd(), 'downloads', 'staging');
    this.watcherUrl = options.watcherUrl;
    this.serviceApiKey = options.serviceApiKey;
    this.logger = options.logger || {
      warn: (msg, ...args) => console.warn(msg, ...args),
      error: (msg, ...args) => console.error(msg, ...args),
    };
  }

  async createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
    return executeCreateRequest({
      input,
      db: this.db,
      requestsRepo: this.requestsRepo,
      stateMachine: this.stateMachine,
      cleanup: this.cleanup,
      fileSystem: this.fileSystem,
      qbittorrent: this.qbittorrent,
      stagingPath: this.stagingPath,
      watcherUrl: this.watcherUrl,
      serviceApiKey: this.serviceApiKey,
      logger: this.logger,
    });
  }

  async createBatchRequests(input: BatchRequestInput): Promise<BatchRequestResult> {
    return executeBatchRequests({
      input,
      db: this.db,
      requestsRepo: this.requestsRepo,
      stateMachine: this.stateMachine,
      cleanup: this.cleanup,
      fileSystem: this.fileSystem,
      qbittorrent: this.qbittorrent,
      stagingPath: this.stagingPath,
      logger: this.logger,
    });
  }

  async retryRequest(id: string): Promise<RetryRequestResult> {
    return executeRetryRequest({
      id,
      requestsRepo: this.requestsRepo,
      stateMachine: this.stateMachine,
      fileSystem: this.fileSystem,
      qbittorrent: this.qbittorrent,
      jellyfin: this.jellyfin,
      notifications: this.notifications,
      subtitleInspection: this.subtitleInspection,
      stagingPath: this.stagingPath,
      logger: this.logger,
    });
  }

  async promoteFromStream(input: PromoteStreamInput): Promise<PromoteStreamResult> {
    return executePromoteFromStream({
      input,
      requestsRepo: this.requestsRepo,
      stateMachine: this.stateMachine,
      fileSystem: this.fileSystem,
      logger: this.logger,
    });
  }

  async replaceTorrent(input: ReplaceTorrentInput): Promise<ReplaceTorrentResult> {
    return executeReplaceTorrent({
      input,
      db: this.db,
      requestsRepo: this.requestsRepo,
      stateMachine: this.stateMachine,
      cleanup: this.cleanup,
      fileSystem: this.fileSystem,
      qbittorrent: this.qbittorrent,
      stagingPath: this.stagingPath,
      logger: this.logger,
    });
  }
}
