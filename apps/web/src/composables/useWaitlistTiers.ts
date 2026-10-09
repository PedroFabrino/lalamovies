import { reactive, computed, watch, type Ref } from 'vue';
import type { WaitlistEntry } from '../stores/waitlist';

export type WaitlistTierKey =
  | 'awaiting'
  | 'released'
  | 'upcoming'
  | 'unscheduled'
  | 'archive';

export interface WaitlistTierState {
  awaiting: boolean;
  released: boolean;
  upcoming: boolean;
  unscheduled: boolean;
  archive: boolean;
}

export interface WaitlistTierDefinition {
  key: WaitlistTierKey;
  title: string;
  icon: string;
  emptyMessage: string;
}

export const WAITLIST_TIER_DEFINITIONS: WaitlistTierDefinition[] = [
  {
    key: 'awaiting',
    title: 'Awaiting Confirmation',
    icon: '⚡',
    emptyMessage: 'No releases awaiting confirmation',
  },
  {
    key: 'released',
    title: 'Released — Searching',
    icon: '🔍',
    emptyMessage: 'No released media currently searching',
  },
  {
    key: 'upcoming',
    title: 'Upcoming — Scheduled',
    icon: '📅',
    emptyMessage: 'No upcoming scheduled releases',
  },
  {
    key: 'unscheduled',
    title: 'Announced — Unscheduled',
    icon: '📢',
    emptyMessage: 'No announced unscheduled releases',
  },
  {
    key: 'archive',
    title: 'Archive',
    icon: '📦',
    emptyMessage: 'No archived entries',
  },
];

export const STORAGE_KEY = 'mdm_waitlist_tier_collapse';

export const DEFAULT_TIER_STATE: WaitlistTierState = {
  awaiting: true,
  released: true,
  upcoming: true,
  unscheduled: true,
  archive: false,
};

export function classifyWaitlistEntry(
  entry: WaitlistEntry,
  today = new Date().toISOString().slice(0, 10)
): WaitlistTierKey {
  if (entry.status === 'notified' || entry.status === 'triggered') {
    return 'awaiting';
  }

  if (
    entry.status === 'completed' ||
    entry.status === 'cancelled' ||
    entry.status === 'rejected' ||
    entry.status === 'error'
  ) {
    return 'archive';
  }

  // Active entries (pending_release, checking)
  const releaseDate = entry.tmdbReleaseDate?.trim();
  if (!releaseDate) {
    return 'unscheduled';
  }

  const dateOnly = releaseDate.slice(0, 10);
  if (dateOnly <= today) {
    return 'released';
  }

  return 'upcoming';
}

export function partitionWaitlistEntries(
  entries: WaitlistEntry[],
  today = new Date().toISOString().slice(0, 10)
): Record<WaitlistTierKey, WaitlistEntry[]> {
  const result: Record<WaitlistTierKey, WaitlistEntry[]> = {
    awaiting: [],
    released: [],
    upcoming: [],
    unscheduled: [],
    archive: [],
  };

  for (const entry of entries) {
    const tier = classifyWaitlistEntry(entry, today);
    result[tier].push(entry);
  }

  return result;
}

export function loadSavedTierState(): WaitlistTierState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_TIER_STATE };
    const parsed = JSON.parse(raw);
    return {
      awaiting: typeof parsed.awaiting === 'boolean' ? parsed.awaiting : DEFAULT_TIER_STATE.awaiting,
      released: typeof parsed.released === 'boolean' ? parsed.released : DEFAULT_TIER_STATE.released,
      upcoming: typeof parsed.upcoming === 'boolean' ? parsed.upcoming : DEFAULT_TIER_STATE.upcoming,
      unscheduled: typeof parsed.unscheduled === 'boolean' ? parsed.unscheduled : DEFAULT_TIER_STATE.unscheduled,
      archive: typeof parsed.archive === 'boolean' ? parsed.archive : DEFAULT_TIER_STATE.archive,
    };
  } catch {
    return { ...DEFAULT_TIER_STATE };
  }
}

export function saveTierState(state: WaitlistTierState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export function useWaitlistTiers(entriesRef: Ref<WaitlistEntry[]>) {
  const tierStates = reactive<WaitlistTierState>(loadSavedTierState());

  function persist() {
    saveTierState(tierStates);
  }

  watch(
    tierStates,
    (newState) => {
      saveTierState(newState);
    },
    { deep: true, flush: 'sync' }
  );

  const partitioned = computed(() => {
    return partitionWaitlistEntries(entriesRef.value);
  });

  const allExpanded = computed(() => {
    return Object.values(tierStates).every(Boolean);
  });

  function toggleTier(key: WaitlistTierKey) {
    tierStates[key] = !tierStates[key];
    persist();
  }

  function expandAll() {
    Object.assign(tierStates, {
      awaiting: true,
      released: true,
      upcoming: true,
      unscheduled: true,
      archive: true,
    });
    persist();
  }

  function collapseAll() {
    Object.assign(tierStates, {
      awaiting: false,
      released: false,
      upcoming: false,
      unscheduled: false,
      archive: false,
    });
    persist();
  }

  function toggleAll() {
    if (allExpanded.value) {
      collapseAll();
    } else {
      expandAll();
    }
  }

  return {
    tierStates,
    partitioned,
    allExpanded,
    toggleTier,
    expandAll,
    collapseAll,
    toggleAll,
    tierDefinitions: WAITLIST_TIER_DEFINITIONS,
  };
}
