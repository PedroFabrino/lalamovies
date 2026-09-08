export interface ReleaseCandidate {
  guid: string;
  title: string;
  sizeBytes: number;
  formattedSize: string;
  seeders: number;
  leechers: number;
  downloadUrl: string;
  indexer: string;
  resolution: string;
  codec: string;
  source: string;
  score: number;
  isLowHealth: boolean;
}

export type CandidateSortOption = 'score' | 'seeders' | 'size_asc' | 'size_desc';

export const SORT_OPTIONS: { value: CandidateSortOption; label: string }[] = [
  { value: 'score', label: 'Recommended (Score)' },
  { value: 'seeders', label: 'Seeders (High to Low)' },
  { value: 'size_asc', label: 'File Size (Smallest)' },
  { value: 'size_desc', label: 'File Size (Largest)' },
];

/**
 * Sorts release candidates by selected sorting criterion.
 */
export function sortReleaseCandidates(
  candidates: ReleaseCandidate[],
  sortBy: CandidateSortOption
): ReleaseCandidate[] {
  const list = [...candidates];
  switch (sortBy) {
    case 'score':
      return list.sort((a, b) => b.score - a.score);
    case 'seeders':
      return list.sort((a, b) => b.seeders - a.seeders);
    case 'size_asc':
      return list.sort((a, b) => a.sizeBytes - b.sizeBytes);
    case 'size_desc':
      return list.sort((a, b) => b.sizeBytes - a.sizeBytes);
    default:
      return list;
  }
}
