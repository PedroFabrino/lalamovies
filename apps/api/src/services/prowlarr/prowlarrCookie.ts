import { isPreferredIndexer } from '../../utils/preferredIndexer';
import {
  PreferredIndexerCookieStatus,
  PreferredIndexerCookieResult,
} from './prowlarrTypes';

interface ProwlarrIndexerField {
  name: string;
  value?: unknown;
}

interface ProwlarrIndexer {
  id: number;
  name: string;
  definitionName?: string;
  fields?: ProwlarrIndexerField[];
  [key: string]: unknown;
}

interface ProwlarrIndexerStatus {
  indexerId: number;
  disabledTill?: string;
  lastFailure?: string;
  mostRecentFailure?: string;
}

let cachedStatus: { status: PreferredIndexerCookieStatus; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export function invalidatePreferredIndexerCookieCache(): void {
  cachedStatus = null;
}

export function maskCookie(cookie: string): string {
  const trimmed = cookie.trim();
  if (trimmed.length <= 24) {
    return '********';
  }
  const prefix = trimmed.slice(0, 14);
  const suffix = trimmed.slice(-10);
  return `${prefix}...${suffix}`;
}

export async function fetchAllIndexers(
  prowlarrUrl: string,
  apiKey: string
): Promise<ProwlarrIndexer[]> {
  const res = await fetch(`${prowlarrUrl}/api/v1/indexer`, {
    headers: {
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch indexers from Prowlarr (HTTP ${res.status})`);
  }
  return (await res.json()) as ProwlarrIndexer[];
}

export async function findPreferredIndexer(
  prowlarrUrl: string,
  apiKey: string
): Promise<ProwlarrIndexer | null> {
  const indexers = await fetchAllIndexers(prowlarrUrl, apiKey);
  const matched = indexers.find(
    (idx) =>
      isPreferredIndexer(idx.name) ||
      (idx.definitionName ? isPreferredIndexer(idx.definitionName) : false)
  );
  return matched || null;
}

export async function getPreferredIndexerCookieStatus(
  prowlarrUrl: string,
  apiKey: string,
  forceRefresh = false
): Promise<PreferredIndexerCookieStatus> {
  const now = Date.now();
  if (!forceRefresh && cachedStatus && cachedStatus.expiresAt > now) {
    return cachedStatus.status;
  }

  if (!prowlarrUrl || !apiKey) {
    return {
      configured: false,
      hasCookie: false,
      isExpired: false,
      status: 'not_configured',
      message: 'Prowlarr is not configured with URL or API key.',
    };
  }

  try {
    const indexer = await findPreferredIndexer(prowlarrUrl, apiKey);
    if (!indexer) {
      const result: PreferredIndexerCookieStatus = {
        configured: false,
        hasCookie: false,
        isExpired: false,
        status: 'not_configured',
        message: 'No preferred indexer (matching PREFERRED_INDEXER_REGEX) found in Prowlarr.',
        lastChecked: new Date().toISOString(),
      };
      cachedStatus = { status: result, expiresAt: now + CACHE_TTL_MS };
      return result;
    }

    const cookieField = indexer.fields?.find((f) => f.name === 'cookie');
    const cookieValue = typeof cookieField?.value === 'string' ? cookieField.value.trim() : '';

    if (!cookieValue) {
      const result: PreferredIndexerCookieStatus = {
        configured: true,
        indexerId: indexer.id,
        indexerName: indexer.name,
        hasCookie: false,
        isExpired: true,
        status: 'missing',
        message: `No cookie is configured for ${indexer.name}.`,
        lastChecked: new Date().toISOString(),
      };
      cachedStatus = { status: result, expiresAt: now + CACHE_TTL_MS };
      return result;
    }

    // Check indexer status (disabled or recent failure)
    let isFailing = false;
    let failureMessage: string | undefined;

    try {
      const statusRes = await fetch(`${prowlarrUrl}/api/v1/indexerstatus`, {
        headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
      });
      if (statusRes.ok) {
        const statuses = (await statusRes.json()) as ProwlarrIndexerStatus[];
        const idxStatus = statuses.find((s) => s.indexerId === indexer.id);
        if (idxStatus?.disabledTill && new Date(idxStatus.disabledTill) > new Date()) {
          isFailing = true;
          failureMessage = idxStatus.mostRecentFailure || idxStatus.lastFailure || 'Indexer is in temporary backoff.';
        }
      }
    } catch {
      // Continue if status check fails
    }

    const result: PreferredIndexerCookieStatus = {
      configured: true,
      indexerId: indexer.id,
      indexerName: indexer.name,
      hasCookie: true,
      cookiePreview: maskCookie(cookieValue),
      isExpired: isFailing,
      status: isFailing ? 'expired' : 'ok',
      message: failureMessage || (isFailing ? 'Session cookie has expired or failed.' : 'Cookie is active and valid.'),
      lastChecked: new Date().toISOString(),
    };

    cachedStatus = { status: result, expiresAt: now + CACHE_TTL_MS };
    return result;
  } catch (err) {
    return {
      configured: false,
      hasCookie: false,
      isExpired: false,
      status: 'unreachable',
      message: `Failed to connect to Prowlarr: ${(err as Error).message}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function testPreferredIndexerCookie(
  prowlarrUrl: string,
  apiKey: string,
  cookieOverride?: string
): Promise<PreferredIndexerCookieResult> {
  const indexer = await findPreferredIndexer(prowlarrUrl, apiKey);
  if (!indexer) {
    return {
      ok: false,
      message: 'No preferred indexer found in Prowlarr.',
    };
  }

  // Clone indexer payload
  const payload = JSON.parse(JSON.stringify(indexer)) as ProwlarrIndexer;
  if (cookieOverride !== undefined) {
    if (!payload.fields) {
      payload.fields = [];
    }
    const cookieField = payload.fields.find((f) => f.name === 'cookie');
    if (cookieField) {
      cookieField.value = cookieOverride.trim();
    } else {
      payload.fields.push({ name: 'cookie', value: cookieOverride.trim() });
    }
  }

  const res = await fetch(`${prowlarrUrl}/api/v1/indexer/test`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    return { ok: true, message: `Cookie verified successfully for ${indexer.name}.` };
  }

  let errorMessage = `Test failed with HTTP ${res.status}`;
  try {
    const errorBody = await res.json() as unknown;
    if (Array.isArray(errorBody) && errorBody.length > 0) {
      const first = errorBody[0] as { errorMessage?: string };
      if (first.errorMessage) {
        errorMessage = first.errorMessage;
      }
    } else if (typeof errorBody === 'object' && errorBody && 'message' in errorBody) {
      errorMessage = String((errorBody as { message: unknown }).message);
    }
  } catch {
    // Non-JSON fallback
  }

  return { ok: false, message: errorMessage };
}

export async function updatePreferredIndexerCookie(
  prowlarrUrl: string,
  apiKey: string,
  newCookie: string
): Promise<PreferredIndexerCookieResult> {
  const trimmed = newCookie.trim();
  if (!trimmed) {
    return { ok: false, message: 'Cookie string cannot be empty.' };
  }

  const indexers = await fetchAllIndexers(prowlarrUrl, apiKey);
  const indexer = indexers.find(
    (idx) =>
      isPreferredIndexer(idx.name) ||
      (idx.definitionName ? isPreferredIndexer(idx.definitionName) : false)
  );

  if (!indexer) {
    return { ok: false, message: 'No preferred indexer found in Prowlarr.' };
  }

  // Fetch full single indexer JSON to get full settings/capabilities
  const singleRes = await fetch(`${prowlarrUrl}/api/v1/indexer/${indexer.id}`, {
    headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
  });
  if (!singleRes.ok) {
    return { ok: false, message: `Failed to fetch indexer details (HTTP ${singleRes.status})` };
  }

  const fullIndexer = (await singleRes.json()) as ProwlarrIndexer;
  if (!fullIndexer.fields) {
    fullIndexer.fields = [];
  }

  const cookieField = fullIndexer.fields.find((f) => f.name === 'cookie');
  if (cookieField) {
    cookieField.value = trimmed;
  } else {
    fullIndexer.fields.push({ name: 'cookie', value: trimmed });
  }

  const putRes = await fetch(`${prowlarrUrl}/api/v1/indexer/${fullIndexer.id}`, {
    method: 'PUT',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify(fullIndexer),
  });

  if (putRes.ok) {
    invalidatePreferredIndexerCookieCache();
    return { ok: true, message: `Cookie updated and verified for ${fullIndexer.name}.` };
  }

  let errorMessage = `Update rejected by Prowlarr (HTTP ${putRes.status})`;
  try {
    const errorBody = await putRes.json() as unknown;
    if (Array.isArray(errorBody) && errorBody.length > 0) {
      const first = errorBody[0] as { errorMessage?: string };
      if (first.errorMessage) {
        errorMessage = first.errorMessage;
      }
    } else if (typeof errorBody === 'object' && errorBody && 'message' in errorBody) {
      errorMessage = String((errorBody as { message: unknown }).message);
    }
  } catch {
    // Non-JSON fallback
  }

  return { ok: false, message: errorMessage };
}
