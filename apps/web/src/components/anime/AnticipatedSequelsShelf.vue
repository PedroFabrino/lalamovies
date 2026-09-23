<template>
  <section
    v-if="items.length > 0"
    class="mb-10 p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900 border border-indigo-900/40 shadow-xl"
    data-testid="anticipated-sequels-shelf"
  >
    <!-- Shelf Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
          ⚡
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-white tracking-tight">
              Anticipated Sequels
            </h2>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
              {{ items.length }}
            </span>
          </div>
          <p class="text-xs text-zinc-400 mt-0.5">
            Returning series from your download requests and Jellyfin watch history
          </p>
        </div>
      </div>

      <!-- Scroll Buttons -->
      <div class="hidden sm:flex items-center gap-1.5">
        <button
          type="button"
          class="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700/60 transition"
          :disabled="!canScrollLeft"
          aria-label="Scroll left"
          @click="scrollShelf('left')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          class="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700/60 transition"
          :disabled="!canScrollRight"
          aria-label="Scroll right"
          @click="scrollShelf('right')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Horizontal Carousel Container -->
    <div
      ref="carouselRef"
      class="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent snap-x snap-mandatory"
      @scroll="checkScrollBounds"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="flex-shrink-0 w-48 sm:w-52 snap-start"
      >
        <AnimeCard
          :anime="item"
          :prequel-title="item.prequelTitle"
          :is-streaming-enabled="isStreamingEnabled"
          @select="$emit('select', $event)"
          @download="$emit('download', $event)"
          @stream="$emit('stream', $event)"
          @waitlist="$emit('waitlist', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { AnticipatedSequelItem, SeasonalAnimeItem } from '../../composables/useSeasonalAnime';
import AnimeCard from './AnimeCard.vue';

defineProps<{
  items: AnticipatedSequelItem[];
  isStreamingEnabled?: boolean;
}>();

defineEmits<{
  (e: 'select', anime: SeasonalAnimeItem): void;
  (e: 'download', anime: SeasonalAnimeItem): void;
  (e: 'stream', anime: SeasonalAnimeItem): void;
  (e: 'waitlist', anime: SeasonalAnimeItem): void;
}>();

const carouselRef = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(true);

function checkScrollBounds() {
  if (!carouselRef.value) return;
  const { scrollLeft, scrollWidth, clientWidth } = carouselRef.value;
  canScrollLeft.value = scrollLeft > 10;
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 10;
}

function scrollShelf(direction: 'left' | 'right') {
  if (!carouselRef.value) return;
  const scrollOffset = direction === 'left' ? -380 : 380;
  carouselRef.value.scrollBy({ left: scrollOffset, behavior: 'smooth' });
}

onMounted(() => {
  checkScrollBounds();
});
</script>
