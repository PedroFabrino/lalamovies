export interface WaitlistTriggerParams {
  userId: string;
  mediaType: string;
  metadataId: string;
  metadataSource: string;
  title: string;
  year?: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  waitlistNextSeason?: boolean;
  watcherUrl?: string | (() => string | undefined);
  serviceApiKey?: string | (() => string | undefined);
  logger?: {
    warn: (msg: string | object, ...args: unknown[]) => void;
  };
}

export async function callWatcherEndpoint(params: {
  endpoint: string;
  watcherUrl?: string | (() => string | undefined);
  serviceApiKey?: string | (() => string | undefined);
  body?: unknown;
  headers?: Record<string, string>;
  actionDescription: string;
  logger?: { warn: (msg: string | object, ...args: unknown[]) => void };
}): Promise<void> {
  const { endpoint, watcherUrl: rawUrl, serviceApiKey: rawKey, body, headers, actionDescription, logger } = params;
  const watcherUrl = typeof rawUrl === 'function' ? rawUrl() : rawUrl || process.env.WATCHER_URL;
  const serviceApiKey = typeof rawKey === 'function' ? rawKey() : rawKey || process.env.SERVICE_API_KEY;
  if (!watcherUrl) return;

  try {
    const cleanUrl = watcherUrl.replace(/\/+$/, '');
    const hasBody = body !== undefined;
    const res = await fetch(`${cleanUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(serviceApiKey ? { 'x-service-key': serviceApiKey } : {}),
        ...headers,
      },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger?.warn(`Failed to ${actionDescription}: HTTP ${res.status} ${errText}`);
    }
  } catch (err) {
    logger?.warn(err as object, `Failed to reach Watcher service for ${actionDescription}`);
  }
}

export async function triggerNextSeasonWaitlist(params: WaitlistTriggerParams): Promise<void> {
  const {
    userId,
    mediaType,
    metadataId,
    metadataSource,
    title,
    year,
    seasonNumber,
    episodeNumber,
    waitlistNextSeason,
    watcherUrl,
    serviceApiKey,
    logger,
  } = params;

  if (
    waitlistNextSeason &&
    ['tv_show', 'anime'].includes(mediaType) &&
    seasonNumber !== undefined &&
    seasonNumber !== null &&
    (episodeNumber === undefined || episodeNumber === null)
  ) {
    await callWatcherEndpoint({
      endpoint: '/waitlist',
      watcherUrl,
      serviceApiKey,
      headers: { 'x-user-id': userId },
      body: {
        userId,
        mediaType,
        metadataId,
        metadataSource,
        title,
        year,
        seasonNumber: seasonNumber + 1,
        isNextSeason: true,
      },
      actionDescription: 'create next-season waitlist entry',
      logger,
    });
  }
}

export async function advanceWaitlistIfNeeded(params: {
  waitlistId?: string;
  watcherUrl?: string | (() => string | undefined);
  serviceApiKey?: string | (() => string | undefined);
  logger?: { warn: (msg: string | object, ...args: unknown[]) => void };
}): Promise<void> {
  if (!params.waitlistId) return;
  await callWatcherEndpoint({
    endpoint: `/waitlist/${encodeURIComponent(params.waitlistId)}/advance`,
    watcherUrl: params.watcherUrl,
    serviceApiKey: params.serviceApiKey,
    actionDescription: 'advance waitlist entry',
    logger: params.logger,
  });
}

export function triggerWaitlistActions(params: {
  waitlistParams: WaitlistTriggerParams;
  waitlistId?: string;
  watcherUrl?: string;
  serviceApiKey?: string;
  logger?: { warn: (msg: string | object, ...args: unknown[]) => void };
}): void {
  triggerNextSeasonWaitlist(params.waitlistParams).catch((err) => {
    params.logger?.warn(err as object, 'Failed to trigger next season waitlist');
  });

  if (params.waitlistId) {
    advanceWaitlistIfNeeded({
      waitlistId: params.waitlistId,
      watcherUrl: params.watcherUrl,
      serviceApiKey: params.serviceApiKey,
      logger: params.logger,
    }).catch((err) => {
      params.logger?.warn(err as object, `Failed to advance waitlist entry ${params.waitlistId}`);
    });
  }
}
