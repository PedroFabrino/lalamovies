<template>
  <div
    class="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all duration-200 shadow-md hover:shadow-indigo-500/10 hover:shadow-xl cursor-pointer"
    data-testid="anime-card"
    @click="$emit('select', anime)"
  >
    <!-- Poster Artwork Container -->
    <div class="relative aspect-[3/4] w-full overflow-hidden bg-zinc-950">
      <img
        v-if="posterUrl"
        :src="posterUrl"
        :alt="displayTitle"
        loading="lazy"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-zinc-600 font-medium text-xs p-2 text-center"
      >
        No Image Available
      </div>

      <!-- Gradient overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30 pointer-events-none" />

      <!-- Top Badges Row -->
      <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
        <span
          class="px-2 py-0.5 text-[10px] font-semibold rounded-full border shadow-sm"
          :class="statusBadgeClasses"
        >
          {{ statusLabel }}
        </span>

        <span
          v-if="anime.averageScore"
          class="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700/60 text-amber-400 shadow-sm"
        >
          ★ {{ anime.averageScore }}%
        </span>
      </div>

      <!-- Returning Show Badge (Anticipated Sequels) -->
      <div
        v-if="prequelTitle"
        class="absolute bottom-2.5 left-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 backdrop-blur border border-indigo-700/60 text-indigo-200 text-xs font-medium flex items-center gap-1.5 truncate shadow"
        :title="prequelTitle"
      >
        <span class="text-indigo-400">↩</span>
        <span class="truncate">{{ prequelTitle }}</span>
      </div>

      <!-- Quick Action Overlay on Card Hover -->
      <div
        class="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2.5 p-4"
        @click.stop
      >
        <p class="text-xs font-semibold text-white text-center line-clamp-2 mb-1">
          {{ displayTitle }}
        </p>

        <!-- Airing / Finished Quick Actions -->
        <template v-if="isAiringOrFinished">
          <button
            type="button"
            class="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow transition"
            @click.stop="$emit('download', anime)"
          >
            <span>⬇️</span> Download
          </button>

          <button
            v-if="isStreamingEnabled"
            type="button"
            class="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white flex items-center justify-center gap-1.5 shadow transition"
            @click.stop="$emit('stream', anime)"
          >
            <span>🎬</span> Instant Stream
          </button>

          <button
            type="button"
            class="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center gap-1.5 border border-zinc-700/60 transition"
            @click.stop="$emit('waitlist', anime)"
          >
            <span>+</span> Waitlist
          </button>
        </template>

        <!-- Upcoming Quick Action -->
        <template v-else>
          <button
            type="button"
            class="w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow-lg transition"
            @click.stop="$emit('waitlist', anime)"
          >
            <span>+</span> Add to Waitlist
          </button>
        </template>

        <button
          type="button"
          class="text-[11px] text-zinc-400 hover:text-white underline mt-1"
          @click.stop="$emit('select', anime)"
        >
          View Details
        </button>
      </div>
    </div>

    <!-- Card Info -->
    <div class="p-3 flex flex-col flex-1 justify-between gap-1">
      <div>
        <h4
          class="font-semibold text-sm text-zinc-100 group-hover:text-indigo-400 transition line-clamp-1"
          :title="displayTitle"
        >
          {{ displayTitle }}
        </h4>
        <p
          v-if="subTitle && subTitle !== displayTitle"
          class="text-[11px] text-zinc-500 truncate"
          :title="subTitle"
        >
          {{ subTitle }}
        </p>
      </div>

      <div class="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
        <span>{{ anime.format || 'TV' }}</span>
        <span v-if="anime.episodes">{{ anime.episodes }} eps</span>
        <span v-else>TBA</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SeasonalAnimeItem } from '../../composables/useSeasonalAnime';

const props = withDefaults(
  defineProps<{
    anime: SeasonalAnimeItem;
    prequelTitle?: string;
    isStreamingEnabled?: boolean;
  }>(),
  {
    prequelTitle: undefined,
    isStreamingEnabled: true,
  }
);

defineEmits<{
  (e: 'select', anime: SeasonalAnimeItem): void;
  (e: 'download', anime: SeasonalAnimeItem): void;
  (e: 'stream', anime: SeasonalAnimeItem): void;
  (e: 'waitlist', anime: SeasonalAnimeItem): void;
}>();

const posterUrl = computed(() => {
  return (
    props.anime.coverImage?.extraLarge ||
    props.anime.coverImage?.large ||
    props.anime.coverImage?.medium ||
    null
  );
});

const displayTitle = computed(() => {
  return props.anime.title?.english || props.anime.title?.romaji || 'Untitled';
});

const subTitle = computed(() => {
  return props.anime.title?.romaji || props.anime.title?.native || '';
});

const isAiringOrFinished = computed(() => {
  return props.anime.status === 'RELEASING' || props.anime.status === 'FINISHED';
});

const statusLabel = computed(() => {
  switch (props.anime.status) {
    case 'RELEASING':
      return 'Airing';
    case 'FINISHED':
      return 'Completed';
    case 'NOT_YET_RELEASED':
      return 'Upcoming';
    default:
      return props.anime.status || 'Anime';
  }
});

const statusBadgeClasses = computed(() => {
  switch (props.anime.status) {
    case 'RELEASING':
      return 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400';
    case 'NOT_YET_RELEASED':
      return 'bg-indigo-950/70 border-indigo-700/60 text-indigo-300';
    case 'FINISHED':
      return 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300';
    default:
      return 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400';
  }
});
</script>
