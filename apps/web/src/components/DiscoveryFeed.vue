<template>
  <section
    v-if="available && (loading || currentItems.length > 0 || isCollapsed)"
    class="mb-8 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-xl transition-all"
    data-testid="discovery-feed-section"
  >
    <!-- Header with Tabs and Collapse Toggle -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Discovery Feed
            <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Curated
            </span>
          </h2>
          <p v-if="!isCollapsed" class="text-xs text-zinc-400 mt-0.5">
            Top healthy releases available right now across verified indexers
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Category Tabs (visible when expanded) -->
        <div v-if="!isCollapsed" class="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer"
            :class="activeCategory === 'movies'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
            data-testid="tab-movies"
            @click="switchCategory('movies')"
          >
            Movies
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer"
            :class="activeCategory === 'tv'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
            data-testid="tab-tv"
            @click="switchCategory('tv')"
          >
            TV Shows
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer"
            :class="activeCategory === 'anime'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
            data-testid="tab-anime"
            @click="switchCategory('anime')"
          >
            Anime
          </button>
        </div>

        <!-- Collapse / Expand Toggle Button -->
        <button
          type="button"
          class="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          :title="isCollapsed ? 'Expand Discovery Feed' : 'Collapse Discovery Feed'"
          data-testid="toggle-collapse"
          @click="toggleCollapse"
        >
          <svg
            class="w-4 h-4 transition-transform duration-200"
            :class="{ '-rotate-90': isCollapsed }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Feed Content (when expanded) -->
    <div v-if="!isCollapsed" class="mt-5">
      <!-- Loading State -->
      <div v-if="loading && currentItems.length === 0" class="flex items-center justify-center py-12 text-zinc-400">
        <svg class="w-6 h-6 animate-spin mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span class="text-sm">Finding top healthy releases...</span>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="currentItems.length === 0"
        class="text-center py-10 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 text-zinc-400 text-sm"
      >
        No healthy releases found for this category right now.
      </div>

      <!-- Horizontal Cards Slider -->
      <div
        v-else
        class="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent snap-x"
        data-testid="discovery-cards-container"
      >
        <div
          v-for="item in currentItems"
          :key="item.id"
          class="group relative flex flex-col w-44 sm:w-48 shrink-0 bg-zinc-900/90 border border-zinc-800 hover:border-indigo-500/60 rounded-xl overflow-hidden transition-all duration-200 shadow-md hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer snap-start"
          data-testid="discovery-card"
          @click="selectItem(item)"
        >
          <!-- Poster Container -->
          <div class="relative w-full aspect-[2/3] bg-zinc-800/80 overflow-hidden">
            <img
              v-if="item.posterUrl"
              :src="item.posterUrl"
              :alt="item.title"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div
              v-else
              class="w-full h-full flex flex-col items-center justify-center p-3 text-zinc-500 text-center"
            >
              <svg class="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <span class="text-xs font-medium text-zinc-400 line-clamp-3">{{ item.title }}</span>
            </div>

            <!-- Resolution Badge (Top-Left) -->
            <div
              v-if="item.resolution && item.resolution !== 'unknown'"
              class="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[11px] font-bold bg-black/75 backdrop-blur-md text-white border border-white/10 shadow-sm"
              data-testid="badge-resolution"
            >
              {{ item.resolution }}
            </div>

            <!-- Rating Badge (Top-Right) -->
            <div
              v-if="item.rating"
              class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[11px] font-bold bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/20 shadow-sm flex items-center gap-1"
              data-testid="badge-rating"
            >
              <svg class="w-3 h-3 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{{ item.rating }}</span>
            </div>

            <!-- Seeders Badge (Bottom-Right) -->
            <div
              class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 shadow-sm flex items-center gap-1"
              data-testid="badge-seeders"
            >
              <svg class="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>{{ item.seeders }}</span>
            </div>
          </div>

          <!-- Card Details -->
          <div class="p-3 flex flex-col flex-1 justify-between gap-1.5">
            <div>
              <h3
                class="text-xs font-semibold text-zinc-100 group-hover:text-indigo-400 transition line-clamp-2"
                :title="item.title"
              >
                {{ item.title }}
              </h3>

              <div class="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
                <span v-if="item.episodeNumber !== null && item.episodeNumber !== undefined" class="font-medium text-indigo-300">
                  S{{ String(item.seasonNumber ?? 1).padStart(2, '0') }}E{{ String(item.episodeNumber).padStart(2, '0') }}
                </span>
                <span v-else-if="item.seasonNumber !== null && item.seasonNumber !== undefined" class="font-medium text-indigo-300">
                  Season {{ item.seasonNumber }}
                </span>
                <span v-else-if="item.year">{{ item.year }}</span>
                <span class="text-zinc-600">•</span>
                <span>{{ item.formattedSize }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px] text-zinc-500">
              <span class="truncate max-w-[90px]">{{ item.indexer }}</span>
              <span class="text-indigo-400 font-medium group-hover:underline flex items-center gap-0.5">
                Request
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../lib/api';

export type CategoryTab = 'movies' | 'tv' | 'anime';

export interface DiscoveryItem {
  id: string;
  title: string;
  rawTitle: string;
  mediaType: 'movie' | 'tv_show' | 'anime';
  year: number | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  posterUrl: string | null;
  rating: number | null;
  overview: string | null;
  resolution: string;
  sizeBytes: number;
  formattedSize: string;
  seeders: number;
  indexer: string;
  downloadUrl: string;
  score: number;
  metadataId: string | null;
  metadataSource: 'tmdb' | 'anilist' | null;
}

interface DiscoveryFeedResponse {
  available: boolean;
  items: DiscoveryItem[];
  error?: string;
}

const router = useRouter();

const available = ref(true);
const loading = ref(false);
const activeCategory = ref<CategoryTab>('movies');
const categoryCache = ref<Record<CategoryTab, DiscoveryItem[]>>({
  movies: [],
  tv: [],
  anime: [],
});

const isCollapsed = ref(localStorage.getItem('mdm_discovery_collapsed') === 'true');

const currentItems = computed(() => categoryCache.value[activeCategory.value] || []);

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem('mdm_discovery_collapsed', String(isCollapsed.value));
}

async function fetchFeed(category: CategoryTab) {
  if (categoryCache.value[category].length > 0) return;

  loading.value = true;
  try {
    const res = await api.get<DiscoveryFeedResponse>(`/discovery/feed?category=${category}`);
    if (res.available === false) {
      // If Prowlarr is disabled/offline, hide feed
      available.value = false;
      return;
    }
    available.value = true;
    categoryCache.value[category] = res.items || [];
  } catch {
    // Gracefully hide on network/API failure
    available.value = false;
  } finally {
    loading.value = false;
  }
}

async function switchCategory(category: CategoryTab) {
  activeCategory.value = category;
  await fetchFeed(category);
}

function selectItem(item: DiscoveryItem) {
  router.push({
    path: '/request',
    query: {
      title: item.title,
      metadataId: item.metadataId || '',
      metadataSource: item.metadataSource || (item.mediaType === 'anime' ? 'anilist' : 'tmdb'),
      mediaType: item.mediaType,
      year: item.year !== null && item.year !== undefined ? String(item.year) : undefined,
      seasonNumber: item.seasonNumber !== null && item.seasonNumber !== undefined ? String(item.seasonNumber) : undefined,
      episodeNumber: item.episodeNumber !== null && item.episodeNumber !== undefined ? String(item.episodeNumber) : undefined,
      downloadUrl: item.downloadUrl,
      releaseTitle: item.rawTitle,
      resolution: item.resolution,
      seeders: String(item.seeders),
      indexer: item.indexer,
      sizeBytes: String(item.sizeBytes),
      posterUrl: item.posterUrl || undefined,
      overview: item.overview || undefined,
    },
    state: {
      title: item.title,
      metadataId: item.metadataId || '',
      metadataSource: item.metadataSource || (item.mediaType === 'anime' ? 'anilist' : 'tmdb'),
      mediaType: item.mediaType,
      year: item.year,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
      downloadUrl: item.downloadUrl,
      releaseTitle: item.rawTitle,
      resolution: item.resolution,
      seeders: item.seeders,
      indexer: item.indexer,
      sizeBytes: item.sizeBytes,
      posterUrl: item.posterUrl,
      overview: item.overview,
    },
  });
}

onMounted(() => {
  fetchFeed(activeCategory.value);
});
</script>
