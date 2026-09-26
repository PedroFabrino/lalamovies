import { computed } from 'vue';
import { useWaitlistStore, type WaitlistEntry, type WaitlistStatus } from '../stores/waitlist';

export interface MatchableMediaItem {
  id?: number | string | null;
  metadataId?: string | number | null;
  title?: string | { english?: string | null; romaji?: string | null; native?: string | null } | null;
  showTitle?: string | null;
  mediaType?: string | null;
  seasonNumber?: number | null;
}

const ACTIVE_STATUSES: readonly WaitlistStatus[] = ['pending_release', 'checking', 'notified', 'triggered'];

export function normalizeTitle(value?: string | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useWaitlistMatching() {
  let waitlistStore: ReturnType<typeof useWaitlistStore> | null = null;
  try {
    waitlistStore = useWaitlistStore();
  } catch {
    waitlistStore = null;
  }

  const activeEntries = computed(() => {
    if (!waitlistStore) return [];
    return waitlistStore.entries.filter((e) => ACTIVE_STATUSES.includes(e.status));
  });

  async function ensureWaitlistLoaded(): Promise<void> {
    if (waitlistStore && waitlistStore.entries.length === 0 && !waitlistStore.loading) {
      await waitlistStore.fetchAll();
    }
  }

  function isItemWaitlisted(item?: MatchableMediaItem | null): boolean {
    if (!item) return false;

    const targetMetadataIds = new Set<string>();
    if (item.id !== undefined && item.id !== null) {
      targetMetadataIds.add(String(item.id));
    }
    if (item.metadataId !== undefined && item.metadataId !== null) {
      targetMetadataIds.add(String(item.metadataId));
    }

    const candidateTitles = new Set<string>();
    if (typeof item.title === 'string' && item.title.trim()) {
      candidateTitles.add(normalizeTitle(item.title));
    } else if (item.title && typeof item.title === 'object') {
      if (item.title.english) candidateTitles.add(normalizeTitle(item.title.english));
      if (item.title.romaji) candidateTitles.add(normalizeTitle(item.title.romaji));
      if (item.title.native) candidateTitles.add(normalizeTitle(item.title.native));
    }
    if (item.showTitle && item.showTitle.trim()) {
      candidateTitles.add(normalizeTitle(item.showTitle));
    }

    return activeEntries.value.some((entry: WaitlistEntry) => {
      // 1. Check ID equality if available
      const idMatch = entry.metadataId && targetMetadataIds.has(String(entry.metadataId));

      // 2. Check title equality if ID did not match
      const entryTitleNorm = normalizeTitle(entry.title);
      const titleMatch = entryTitleNorm && candidateTitles.has(entryTitleNorm);

      if (!idMatch && !titleMatch) {
        return false;
      }

      // 3. For episodic media (tv/anime), if season is specified on both, verify season match
      if (
        entry.mediaType !== 'movie' &&
        typeof entry.seasonNumber === 'number' &&
        typeof item.seasonNumber === 'number'
      ) {
        return entry.seasonNumber === item.seasonNumber;
      }

      return true;
    });
  }

  return {
    activeEntries,
    ensureWaitlistLoaded,
    isItemWaitlisted,
  };
}
