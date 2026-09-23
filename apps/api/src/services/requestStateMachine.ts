import { IRequestsRepository } from './requestsRepository';
import { IJellyfinService } from './jellyfin';
import { INotificationService } from './notifications';
import { DownloadRequest } from '../db';

// ── Status constants ─────────────────────────────────────────────────────────

export const RequestStatus = {
  QUEUED: 'queued',
  DOWNLOADING: 'downloading',
  HARDLINKING: 'hardlinking',
  UNARCHIVING: 'unarchiving',
  SEEDING: 'seeding',
  DONE: 'done',
  ERROR: 'error',
  DELETED: 'deleted',
} as const;

export type RequestStatusValue = (typeof RequestStatus)[keyof typeof RequestStatus];

// ── Errors ───────────────────────────────────────────────────────────────────

export class InvalidTransitionError extends Error {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
    requestId: string
  ) {
    super(
      `Invalid status transition for request ${requestId}: ${fromStatus} → ${toStatus}`
    );
    this.name = 'InvalidTransitionError';
  }
}

// ── Transition map ───────────────────────────────────────────────────────────
//
// Reflects the spec from #114:
//   queued      → downloading | error | deleted
//   downloading → hardlinking | unarchiving | error | deleted
//   hardlinking → seeding | error
//   unarchiving → seeding | error
//   seeding     → done | error | deleted
//   done        → deleted
//   error       → queued | deleted
//   deleted     → (none)

const VALID_TRANSITIONS: Record<RequestStatusValue, ReadonlyArray<RequestStatusValue>> = {
  [RequestStatus.QUEUED]: [
    RequestStatus.QUEUED,
    RequestStatus.DOWNLOADING,
    RequestStatus.ERROR,
    RequestStatus.DELETED,
  ],
  [RequestStatus.DOWNLOADING]: [
    RequestStatus.DOWNLOADING,
    RequestStatus.QUEUED,
    RequestStatus.HARDLINKING,
    RequestStatus.UNARCHIVING,
    RequestStatus.ERROR,
    RequestStatus.DELETED,
  ],
  [RequestStatus.HARDLINKING]: [RequestStatus.SEEDING, RequestStatus.ERROR],
  [RequestStatus.UNARCHIVING]: [RequestStatus.SEEDING, RequestStatus.ERROR],
  [RequestStatus.SEEDING]: [RequestStatus.DONE, RequestStatus.ERROR, RequestStatus.DELETED],
  [RequestStatus.DONE]: [RequestStatus.DELETED],
  [RequestStatus.ERROR]: [
    RequestStatus.QUEUED,
    RequestStatus.DOWNLOADING,
    RequestStatus.SEEDING,
    RequestStatus.DELETED,
  ],
  [RequestStatus.DELETED]: [],
};

// ── Options bag ──────────────────────────────────────────────────────────────

export interface TransitionOptions {
  /**
   * Fire a WebSocket broadcast after the transition. Default: true.
   * Pass false to suppress (e.g., bulk internal updates that don't need UI refresh).
   */
  broadcast?: boolean;

  /**
   * Call jellyfin.safeRefresh() after the transition.
   * Default: false.
   */
  refreshJellyfin?: boolean;

  /**
   * Send a notification via notificationService.send() after the transition.
   * The value is the notification event name.
   */
  sendNotification?: Parameters<INotificationService['send']>[0];

  /**
   * Notification payload forwarded verbatim to notificationService.send().
   * Required when sendNotification is set.
   */
  notificationPayload?: Parameters<INotificationService['send']>[1];

  /**
   * Additional database fields to update atomically with the status transition.
   */
  extraFields?: Partial<Omit<DownloadRequest, 'id' | 'status'>>;

  /**
   * Additional fields to include in the WebSocket broadcast message.
   */
  extraBroadcastFields?: Record<string, unknown>;
}

// ── Interface ────────────────────────────────────────────────────────────────

export interface IRequestStateMachine {
  transition(
    id: string,
    toStatus: RequestStatusValue,
    options?: TransitionOptions
  ): Promise<DownloadRequest>;
}

// ── Implementation ───────────────────────────────────────────────────────────

export interface RequestStateMachineLogger {
  error: (msg: unknown, ...args: unknown[]) => void;
  warn?: (msg: string) => void;
  info?: (msg: string) => void;
}

export class RequestStateMachine implements IRequestStateMachine {
  constructor(
    private requestsRepo: IRequestsRepository,
    private broadcastFn?: (msg: object) => void,
    private jellyfin?: IJellyfinService,
    private notifications?: INotificationService,
    private logger?: RequestStateMachineLogger,
    private retryDelayMs: number = 2000
  ) {}

  async transition(
    id: string,
    toStatus: RequestStatusValue,
    options: TransitionOptions = {}
  ): Promise<DownloadRequest> {
    const {
      broadcast = true,
      refreshJellyfin = false,
      sendNotification,
      notificationPayload,
      extraFields,
      extraBroadcastFields,
    } = options;

    const request = this.requestsRepo.findById(id);
    if (!request) {
      throw new Error(`Request not found: ${id}`);
    }

    const fromStatus = request.status as RequestStatusValue;
    const allowed = VALID_TRANSITIONS[fromStatus] ?? [];

    if (!allowed.includes(toStatus)) {
      throw new InvalidTransitionError(fromStatus, toStatus, id);
    }

    // Committed first step: database status update
    this.requestsRepo.setStatus(id, toStatus, extraFields);

    // WebSocket push is fire-and-forget; clients recover on next poll
    if (broadcast && this.broadcastFn) {
      this.broadcastFn({
        type: 'status',
        requestId: id,
        status: toStatus,
        ...(extraBroadcastFields || {}),
      });
    }

    if (refreshJellyfin && this.jellyfin) {
      const doRefresh = async () => {
        if (typeof this.jellyfin!.safeRefresh === 'function') {
          await this.jellyfin!.safeRefresh();
        } else if (typeof this.jellyfin!.refreshLibrary === 'function') {
          await this.jellyfin!.refreshLibrary();
        }
      };

      try {
        await doRefresh();
      } catch (firstErr) {
        try {
          if (this.retryDelayMs > 0) {
            await new Promise((r) => setTimeout(r, this.retryDelayMs));
          }
          await doRefresh();
        } catch (secondErr) {
          const errMsg = (secondErr as Error).message || String(secondErr);
          const structuredLog = {
            message: 'Jellyfin refresh failed after retry',
            requestId: id,
            toStatus,
            error: errMsg,
          };
          if (this.logger?.error) {
            this.logger.error(structuredLog);
          } else {
            console.error(JSON.stringify(structuredLog));
          }
        }
      }
    }

    if (sendNotification && this.notifications && notificationPayload) {
      try {
        await this.notifications.send(sendNotification, notificationPayload);
      } catch (firstErr) {
        try {
          if (this.retryDelayMs > 0) {
            await new Promise((r) => setTimeout(r, this.retryDelayMs));
          }
          await this.notifications.send(sendNotification, notificationPayload);
        } catch (secondErr) {
          const errMsg = (secondErr as Error).message || String(secondErr);
          const structuredLog = {
            message: 'Notification delivery failed after retry',
            requestId: id,
            toStatus,
            error: errMsg,
          };
          if (this.logger?.error) {
            this.logger.error(structuredLog);
          } else {
            console.error(JSON.stringify(structuredLog));
          }
        }
      }
    }

    const updated = this.requestsRepo.findById(id);
    if (!updated) {
      throw new Error(`Request disappeared after transition: ${id}`);
    }
    return updated;
  }
}
