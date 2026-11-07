export function isPreferredIndexer(indexerName?: string): boolean {
  if (!indexerName) return false;
  const pattern = process.env.PREFERRED_INDEXER_REGEX?.trim();
  if (!pattern) return false;

  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(indexerName);
  } catch {
    return false;
  }
}

export interface PreferredCandidateLike {
  indexer?: string;
  seeders?: number;
  source?: string;
}

export function getPreferredIndexerMinSeeders(): number {
  const raw = process.env.PREFERRED_INDEXER_MIN_SEEDERS;
  if (!raw) return 1;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) || parsed < 0 ? 1 : parsed;
}

export function isQualifiedPreferred(candidate: PreferredCandidateLike): boolean {
  if (!candidate) return false;
  if (!isPreferredIndexer(candidate.indexer)) return false;
  if ((candidate.seeders ?? 0) < getPreferredIndexerMinSeeders()) return false;
  if (candidate.source === 'cam') return false;
  return true;
}
