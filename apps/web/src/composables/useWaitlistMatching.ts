import { computed } from 'vue';
import { useWaitlistStore, type WaitlistEntry, type WaitlistStatus } from '../stores/waitlist';
import { parseAnimeTitleAndSeason } from '../lib/animeTitleCleaner';

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

function isSeries(mediaType?: string | null): boolean {
  if (!mediaType) return true;
  return mediaType === 'tv_show' || mediaType === 'anime' || mediaType === 'tv';
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
    let detectedSeasonFromTitle: number | null = null;

    const addTitle = (raw?: string | null) => {
      if (!raw || typeof raw !== 'string' || !raw.trim()) return;
      candidateTitles.add(normalizeTitle(raw));
      const parsed = parseAnimeTitleAndSeason(raw);
      if (parsed.cleanTitle) {
        candidateTitles.add(normalizeTitle(parsed.cleanTitle));
        if (parsed.seasonNumber > 1 && detectedSeasonFromTitle === null) {
          detectedSeasonFromTitle = parsed.seasonNumber;
        }
      }
    };

    if (typeof item.title === 'string') {
      addTitle(item.title);
    } else if (item.title && typeof item.title === 'object') {
      addTitle(item.title.english);
      addTitle(item.title.romaji);
      if (item.title.native) candidateTitles.add(normalizeTitle(item.title.native));
    }
    if (item.showTitle) {
      addTitle(item.showTitle);
    }

    const itemEffectiveSeason = typeof item.seasonNumber === 'number'
      ? item.seasonNumber
      : (detectedSeasonFromTitle ?? 1);

    return activeEntries.value.some((entry: WaitlistEntry) => {
      // 1. Check ID equality if available
      const idMatch = Boolean(entry.metadataId && targetMetadataIds.has(String(entry.metadataId)));

      // 2. Check title equality if ID did not match (check raw and cleaned title)
      const entryTitleNorm = normalizeTitle(entry.title);
      const parsedEntry = parseAnimeTitleAndSeason(entry.title);
      const entryCleanNorm = normalizeTitle(parsedEntry.cleanTitle);
      const titleMatch = (entryTitleNorm && candidateTitles.has(entryTitleNorm)) ||
                         (entryCleanNorm && candidateTitles.has(entryCleanNorm));

      if (!idMatch && !titleMatch) {
        return false;
      }

      // 3. For series (tv_show / anime), match on season number
      const isEntrySeries = isSeries(entry.mediaType);
      const isItemSeries = isSeries(item.mediaType);

      if (isEntrySeries && isItemSeries) {
        const entryEffectiveSeason = typeof entry.seasonNumber === 'number'
          ? entry.seasonNumber
          : parsedEntry.seasonNumber;
        return entryEffectiveSeason === itemEffectiveSeason;
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
