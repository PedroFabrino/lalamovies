export function hasPasskey(urlOrMagnet: string): boolean {
  if (!urlOrMagnet) return false;
  try {
    const decoded = decodeURIComponent(urlOrMagnet);
    const patterns = [
      /[?&](passkey|authkey|torrent_pass|auth|key|uk)=[a-zA-Z0-9]+/i,
      /\/announce\/[a-zA-Z0-9]{16,}/i,
      /[a-zA-Z0-9]{16,}\/announce/i,
      /announce\?.*?(passkey|authkey)/i,
    ];
    return patterns.some((p) => p.test(decoded));
  } catch {
    return false;
  }
}

export function isKnownPrivateIndexer(indexerName?: string): boolean {
  if (!indexerName) return false;
  const name = indexerName.toLowerCase().trim();
  return (
    name.includes('bj-share') ||
    name.includes('bjshare') ||
    name.includes('iptorrents') ||
    name.includes('torrentleech') ||
    name.includes('gazelle') ||
    name.includes('filelist') ||
    name.includes('redacted') ||
    name.includes('ops') ||
    name.includes('btn') ||
    name.includes('ptp')
  );
}

export class IndexerPrivacyCache {
  private cache: Map<string | number, boolean> = new Map();
  private expiresAt = 0;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  has(key: string | number): boolean {
    return this.cache.has(key);
  }

  get(key: string | number): boolean | undefined {
    return this.cache.get(key);
  }

  set(key: string | number, value: boolean): void {
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  isExpired(): boolean {
    return Date.now() >= this.expiresAt || this.cache.size === 0;
  }

  setFreshExpires(): void {
    this.expiresAt = Date.now() + this.CACHE_TTL_MS;
  }

  isPrivate(indexerId?: number, indexerName?: string, downloadUrl?: string): boolean {
    if (indexerId !== undefined && this.cache.has(indexerId)) {
      return this.cache.get(indexerId)!;
    }
    if (indexerName && this.cache.has(indexerName.toLowerCase().trim())) {
      return this.cache.get(indexerName.toLowerCase().trim())!;
    }
    if ((downloadUrl && hasPasskey(downloadUrl)) || isKnownPrivateIndexer(indexerName)) {
      return true;
    }
    return false;
  }
}
