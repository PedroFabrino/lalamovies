<template>
  <section
    class="transition-all"
    :class="isCollapsed ? 'mb-6' : 'mb-12'"
    :data-testid="testId || 'seasonal-anime-grid'"
  >
    <!-- Section Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      :class="{ 'mb-5': !isCollapsed }"
    >
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex items-center gap-2 text-left group focus:outline-none"
          :aria-expanded="!isCollapsed"
          data-testid="section-collapse-toggle"
          @click="toggleCollapse"
        >
          <span
            class="p-1 rounded-md text-zinc-400 group-hover:text-zinc-200 hover:bg-zinc-800 transition"
            :aria-label="isCollapsed ? 'Expand section' : 'Collapse section'"
          >
            <svg
              class="w-4 h-4 transition-transform duration-200"
              :class="{ '-rotate-90': isCollapsed }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
          <h3 class="text-xl font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
            {{ title }}
          </h3>
        </button>

        <span
          v-if="!isLoading && items.length > 0"
          class="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60"
        >
          {{ items.length }}
        </span>
        <span
          v-if="isCollapsed"
          class="text-xs text-zinc-500 italic"
        >
          (Collapsed)
        </span>
      </div>

      <!-- Optional Controls: Library Filter Pill -->
      <div
        v-if="showLibraryFilter && !isCollapsed"
        class="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs"
      >
        <button
          type="button"
          class="px-3 py-1 rounded-lg font-medium transition"
          :class="currentFilter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'"
          @click="$emit('update:filter', 'all')"
        >
          All Upcoming
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded-lg font-medium transition flex items-center gap-1"
          :class="currentFilter === 'library' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'"
          @click="$emit('update:filter', 'library')"
        >
          <span>From My Library</span>
          <span
            v-if="libraryCount"
            class="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-900/80 text-indigo-200"
          >
            {{ libraryCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Collapsible Body -->
    <div
      v-show="!isCollapsed"
      data-testid="grid-content"
    >
      <!-- Loading Skeleton Grid -->
      <div
        v-if="isLoading"
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <div
          v-for="i in 12"
          :key="i"
          class="rounded-xl overflow-hidden bg-zinc-900/60 border border-zinc-800/80 animate-pulse flex flex-col"
        >
          <div class="aspect-[3/4] bg-zinc-800/60" />
          <div class="p-3 space-y-2">
            <div class="h-3.5 bg-zinc-800 rounded w-4/5" />
            <div class="h-2.5 bg-zinc-800/60 rounded w-2/3" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="items.length === 0"
        class="py-12 px-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 text-center flex flex-col items-center justify-center gap-2"
      >
        <span class="text-3xl text-zinc-600">⛩️</span>
        <p class="text-sm font-medium text-zinc-300">
          {{ emptyText || 'No anime found for this category.' }}
        </p>
        <p
          v-if="currentFilter === 'library'"
          class="text-xs text-zinc-500"
        >
          Try switching back to "All Upcoming" to explore new series.
        </p>
      </div>

      <!-- Cards Grid -->
      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <AnimeCard
          v-for="anime in items"
          :key="anime.id"
          :anime="anime"
          :is-streaming-enabled="isStreamingEnabled"
          @select="$emit('select', $event)"
          @download="$emit('download', $event)"
          @stream="$emit('stream', $event)"
          @waitlist="$emit('waitlist', $event)"
        />
      </div>

      <!-- Pagination Controls (Archive Browsing) -->
      <div
        v-if="pageInfo && (pageInfo.total > pageInfo.perPage || pageInfo.currentPage > 1)"
        class="mt-8 flex items-center justify-center gap-3"
      >
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
          :disabled="pageInfo.currentPage <= 1 || isLoading"
          @click="$emit('page-change', pageInfo.currentPage - 1)"
        >
          Previous
        </button>

        <span class="text-xs text-zinc-400 font-medium">
          Page {{ pageInfo.currentPage }} of {{ pageInfo.lastPage || 1 }}
        </span>

        <button
          type="button"
          class="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
          :disabled="!pageInfo.hasNextPage || isLoading"
          @click="$emit('page-change', pageInfo.currentPage + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { SeasonalAnimeItem, PageInfo } from '../../composables/useSeasonalAnime';
import AnimeCard from './AnimeCard.vue';

const props = withDefaults(
  defineProps<{
    title: string;
    items: SeasonalAnimeItem[];
    isLoading?: boolean;
    emptyText?: string;
    testId?: string;
    showLibraryFilter?: boolean;
    currentFilter?: 'all' | 'library';
    libraryCount?: number;
    pageInfo?: PageInfo | null;
    isStreamingEnabled?: boolean;
    defaultCollapsed?: boolean;
    storageKey?: string;
  }>(),
  {
    isLoading: false,
    emptyText: undefined,
    testId: undefined,
    showLibraryFilter: false,
    currentFilter: 'all',
    libraryCount: 0,
    pageInfo: null,
    isStreamingEnabled: true,
    defaultCollapsed: false,
    storageKey: undefined,
  }
);

defineEmits<{
  (e: 'select', anime: SeasonalAnimeItem): void;
  (e: 'download', anime: SeasonalAnimeItem): void;
  (e: 'stream', anime: SeasonalAnimeItem): void;
  (e: 'waitlist', anime: SeasonalAnimeItem): void;
  (e: 'update:filter', filter: 'all' | 'library'): void;
  (e: 'page-change', page: number): void;
}>();

const isCollapsed = ref(props.defaultCollapsed);

const resolvedStorageKey = computed(() => {
  if (props.storageKey) return props.storageKey;
  if (props.testId) return `mdm:anime-section:${props.testId}:collapsed`;
  return null;
});

onMounted(() => {
  if (resolvedStorageKey.value && typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(resolvedStorageKey.value);
      if (saved !== null) {
        isCollapsed.value = saved === 'true';
      }
    } catch {
      // ignore storage access errors
    }
  }
});

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  if (resolvedStorageKey.value && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(resolvedStorageKey.value, String(isCollapsed.value));
    } catch {
      // ignore storage access errors
    }
  }
}
</script>
