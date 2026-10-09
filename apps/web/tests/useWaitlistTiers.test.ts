import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import {
  classifyWaitlistEntry,
  partitionWaitlistEntries,
  useWaitlistTiers,
  STORAGE_KEY,
  DEFAULT_TIER_STATE,
} from '../src/composables/useWaitlistTiers';
import type { WaitlistEntry } from '../src/stores/waitlist';

function makeEntry(overrides: Partial<WaitlistEntry> = {}): WaitlistEntry {
  return {
    id: 'test-id',
    userId: 'user-1',
    mediaType: 'movie',
    metadataId: '100',
    metadataSource: 'tmdb',
    title: 'Test Title',
    status: 'pending_release',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('useWaitlistTiers composable & partitioning', () => {
  const TODAY = '2026-10-09';

  beforeEach(() => {
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
    });
  });

  describe('classifyWaitlistEntry', () => {
    it('classifies notified and triggered into awaiting confirmation', () => {
      expect(classifyWaitlistEntry(makeEntry({ status: 'notified' }), TODAY)).toBe('awaiting');
      expect(classifyWaitlistEntry(makeEntry({ status: 'triggered' }), TODAY)).toBe('awaiting');
    });

    it('classifies completed, cancelled, rejected, and error into archive', () => {
      expect(classifyWaitlistEntry(makeEntry({ status: 'completed' }), TODAY)).toBe('archive');
      expect(classifyWaitlistEntry(makeEntry({ status: 'cancelled' }), TODAY)).toBe('archive');
      expect(classifyWaitlistEntry(makeEntry({ status: 'rejected' }), TODAY)).toBe('archive');
      expect(classifyWaitlistEntry(makeEntry({ status: 'error' }), TODAY)).toBe('archive');
    });

    it('classifies active entries without release dates into announced unscheduled', () => {
      expect(classifyWaitlistEntry(makeEntry({ status: 'pending_release', tmdbReleaseDate: null }), TODAY)).toBe('unscheduled');
      expect(classifyWaitlistEntry(makeEntry({ status: 'checking', tmdbReleaseDate: undefined }), TODAY)).toBe('unscheduled');
      expect(classifyWaitlistEntry(makeEntry({ status: 'pending_release', tmdbReleaseDate: '   ' }), TODAY)).toBe('unscheduled');
    });

    it('classifies active entries with past or today air dates into released searching', () => {
      expect(classifyWaitlistEntry(makeEntry({ status: 'pending_release', tmdbReleaseDate: '2026-10-08' }), TODAY)).toBe('released');
      expect(classifyWaitlistEntry(makeEntry({ status: 'checking', tmdbReleaseDate: '2026-10-09' }), TODAY)).toBe('released');
      expect(classifyWaitlistEntry(makeEntry({ status: 'checking', tmdbReleaseDate: '2025-01-01' }), TODAY)).toBe('released');
    });

    it('classifies active entries with future air dates into upcoming scheduled', () => {
      expect(classifyWaitlistEntry(makeEntry({ status: 'pending_release', tmdbReleaseDate: '2026-10-10' }), TODAY)).toBe('upcoming');
      expect(classifyWaitlistEntry(makeEntry({ status: 'checking', tmdbReleaseDate: '2027-01-15' }), TODAY)).toBe('upcoming');
    });

    it('evaluates episodic specific air dates correctly', () => {
      const episodeEntry = makeEntry({
        mediaType: 'tv_show',
        seasonNumber: 6,
        targetEpisode: 4,
        status: 'pending_release',
        tmdbReleaseDate: '2026-10-12',
      });
      expect(classifyWaitlistEntry(episodeEntry, TODAY)).toBe('upcoming');

      const airedEpisodeEntry = makeEntry({
        mediaType: 'tv_show',
        seasonNumber: 6,
        targetEpisode: 3,
        status: 'checking',
        tmdbReleaseDate: '2026-10-05',
      });
      expect(classifyWaitlistEntry(airedEpisodeEntry, TODAY)).toBe('released');
    });
  });

  describe('partitionWaitlistEntries', () => {
    it('partitions a mixed list into 5 tier buckets', () => {
      const entries = [
        makeEntry({ id: '1', status: 'notified' }),
        makeEntry({ id: '2', status: 'checking', tmdbReleaseDate: '2026-10-01' }),
        makeEntry({ id: '3', status: 'pending_release', tmdbReleaseDate: '2026-12-01' }),
        makeEntry({ id: '4', status: 'pending_release', tmdbReleaseDate: null }),
        makeEntry({ id: '5', status: 'completed' }),
      ];

      const partitioned = partitionWaitlistEntries(entries, TODAY);
      expect(partitioned.awaiting.map((e) => e.id)).toEqual(['1']);
      expect(partitioned.released.map((e) => e.id)).toEqual(['2']);
      expect(partitioned.upcoming.map((e) => e.id)).toEqual(['3']);
      expect(partitioned.unscheduled.map((e) => e.id)).toEqual(['4']);
      expect(partitioned.archive.map((e) => e.id)).toEqual(['5']);
    });
  });

  describe('useWaitlistTiers reactive state & storage persistence', () => {
    it('initializes with default expansion state (1-4 expanded, archive collapsed)', () => {
      const entriesRef = ref<WaitlistEntry[]>([]);
      const { tierStates, allExpanded } = useWaitlistTiers(entriesRef);

      expect(tierStates).toEqual(DEFAULT_TIER_STATE);
      expect(tierStates.archive).toBe(false);
      expect(tierStates.awaiting).toBe(true);
      expect(allExpanded.value).toBe(false);
    });

    it('loads saved state from localStorage if valid', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          awaiting: false,
          released: true,
          upcoming: false,
          unscheduled: true,
          archive: true,
        })
      );

      const entriesRef = ref<WaitlistEntry[]>([]);
      const { tierStates } = useWaitlistTiers(entriesRef);

      expect(tierStates.awaiting).toBe(false);
      expect(tierStates.archive).toBe(true);
    });

    it('toggles tier state and persists changes', async () => {
      const entriesRef = ref<WaitlistEntry[]>([]);
      const { tierStates, toggleTier } = useWaitlistTiers(entriesRef);

      toggleTier('archive');
      expect(tierStates.archive).toBe(true);

      // Verify localStorage was updated
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.archive).toBe(true);
    });

    it('supports expandAll, collapseAll, and toggleAll', () => {
      const entriesRef = ref<WaitlistEntry[]>([]);
      const { tierStates, expandAll, collapseAll, toggleAll, allExpanded } = useWaitlistTiers(entriesRef);

      expandAll();
      expect(allExpanded.value).toBe(true);
      expect(tierStates.archive).toBe(true);

      collapseAll();
      expect(allExpanded.value).toBe(false);
      expect(tierStates.awaiting).toBe(false);

      // toggleAll should expand all when not all expanded
      toggleAll();
      expect(allExpanded.value).toBe(true);

      // toggleAll should collapse all when all expanded
      toggleAll();
      expect(allExpanded.value).toBe(false);
      expect(tierStates.released).toBe(false);
    });
  });
});
