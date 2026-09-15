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

export function isQualifiedPreferred(candidate: PreferredCandidateLike): boolean {
  if (!candidate) return false;
  if (!isPreferredIndexer(candidate.indexer)) return false;
  if ((candidate.seeders ?? 0) < 3) return false;
  if (candidate.source === 'cam') return false;
  return true;
}
