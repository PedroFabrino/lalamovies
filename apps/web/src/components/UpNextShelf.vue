<template>
  <section
    v-if="available && items.length > 0"
    class="mb-8 bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-zinc-900/40 border border-indigo-500/20 rounded-2xl p-5 shadow-xl transition-all"
    data-testid="up-next-section"
  >
    <!-- Shelf Header -->
    <div class="flex items-center justify-between gap-4 mb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Up Next
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {{ items.length }} {{ items.length === 1 ? 'Show' : 'Shows' }}
            </span>
          </h2>
          <p class="text-xs text-zinc-400 mt-0.5">
            Next episodes ready to download for series you're watching
          </p>
        </div>
      </div>
    </div>

    <!-- Horizontal Cards Slider -->
    <div
      class="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent snap-x"
      data-testid="up-next-cards-container"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="group relative flex flex-col w-44 sm:w-48 shrink-0 bg-zinc-900/90 border border-zinc-800 hover:border-indigo-500/70 rounded-xl overflow-hidden transition-all duration-200 shadow-md hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer snap-start"
        data-testid="up-next-card"
        @click="selectItem(item)"
      >
        <!-- Poster Container -->
        <div class="relative w-full aspect-[2/3] bg-zinc-800/80 overflow-hidden">
          <img
            v-if="item.posterUrl"
            :src="item.posterUrl"
            :alt="item.showTitle"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div
            v-else
            class="w-full h-full flex flex-col items-center justify-center p-3 text-zinc-500 text-center"
          >
            <svg class="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span class="text-xs font-medium text-zinc-400 line-clamp-3">{{ item.showTitle }}</span>
          </div>

          <!-- Prominent Episode Badge (Top-Left) -->
          <div
            class="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-extrabold bg-indigo-600 text-white shadow-md border border-indigo-400/40"
            data-testid="badge-episode"
          >
            <span v-if="item.episodeNumber !== null && item.episodeNumber !== undefined">
              S{{ String(item.seasonNumber).padStart(2, '0') }}E{{ String(item.episodeNumber).padStart(2, '0') }}
            </span>
            <span v-else>
              Season {{ item.seasonNumber }}
            </span>
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
              :title="item.showTitle"
            >
              {{ item.showTitle }}
            </h3>

            <div class="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
              <span class="font-medium text-zinc-300">{{ item.resolution }}</span>
              <span class="text-zinc-600">•</span>
              <span>{{ item.formattedSize }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px] text-zinc-500">
            <span class="truncate max-w-[80px]">{{ item.indexer }}</span>
            <span class="text-indigo-400 font-semibold group-hover:underline flex items-center gap-0.5">
              Download Next
              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../lib/api';

export interface UpNextItem {
  id: string;
  showTitle: string;
  releaseTitle: string;
  mediaType: 'tv_show' | 'anime';
  seasonNumber: number;
  episodeNumber: number | null;
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
  metadataId: string;
  metadataSource: 'tmdb' | 'anilist';
  year: number | null;
}

interface UpNextResponse {
  available: boolean;
  items: UpNextItem[];
  error?: string;
}

const router = useRouter();

const available = ref(true);
const items = ref<UpNextItem[]>([]);

async function fetchUpNext() {
  try {
    const res = await api.get<UpNextResponse>('/discovery/up-next');
    if (res.available === false) {
      available.value = false;
      return;
    }
    available.value = true;
    items.value = res.items || [];
  } catch {
    available.value = false;
  }
}

function selectItem(item: UpNextItem) {
  router.push({
    path: '/request',
    query: {
      title: item.showTitle,
      metadataId: item.metadataId,
      metadataSource: item.metadataSource,
      mediaType: item.mediaType,
      year: item.year !== null && item.year !== undefined ? String(item.year) : undefined,
      seasonNumber: String(item.seasonNumber),
      episodeNumber: item.episodeNumber !== null && item.episodeNumber !== undefined ? String(item.episodeNumber) : undefined,
      downloadUrl: item.downloadUrl,
      releaseTitle: item.releaseTitle,
      resolution: item.resolution,
      seeders: String(item.seeders),
      indexer: item.indexer,
      sizeBytes: String(item.sizeBytes),
    },
  });
}

onMounted(() => {
  fetchUpNext();
});
</script>
